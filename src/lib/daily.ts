import { CENTER_TZ, awaitingReply, endOfToday, learnerState, nextScheduled } from "./logic";
import { DAY, HOUR, zonedParts } from "./time";
import type { Beneficiary, DB, Message, Task, User } from "./types";

/**
 * Today's call list: one ordered list per caller or teacher of who to reach and why,
 * built from everything the platform knows. People for whom it is night now go lower,
 * with the time they can be reached.
 */

export type Reason =
  | { kind: "waiting"; since: string; text: string }
  | { kind: "task"; task: Task; late: boolean }
  | { kind: "learner"; level: "red" | "yellow"; days: number }
  | { kind: "note"; text: string }
  | { kind: "lesson"; at: number; reminder: boolean }
  | { kind: "new" }
  | { kind: "cold"; days: number };

export type CallItem = {
  b: Beneficiary;
  reasons: Reason[];
  score: number;
  /** The beneficiary's local hour now, and whether it is a good time to reach them. */
  localHour: number;
  goodNow: boolean;
  /** Next good time (local hour) when it is not a good time now. */
  fromHour: number;
  doneToday: boolean;
  task: Task | null;
};

/** Reasonable hours to message someone, in their own time zone. */
export const GOOD_FROM = 9;
export const GOOD_TO = 21;
/** Days without contact after which a dawah conversation counts as going cold. */
const COLD_DAYS = 5;

const ms = (iso: string) => new Date(iso).getTime();

export function callList(db: DB, user: User, now = Date.now()): CallItem[] {
  const mine = db.beneficiaries.filter((b) => b.assignedTo === user.id && b.stage !== "closed" && b.stage !== "paused" && !b.optedOut);
  const ids = new Set(mine.map((b) => b.id));
  const startOfDay = endOfToday(new Date(now)) + 1 - DAY;
  const eod = startOfDay + DAY - 1;

  const lastOut = new Map<string, Message>();
  const outToday = new Set<string>();
  for (const m of db.messages) {
    if (!ids.has(m.beneficiaryId) || m.direction !== "out" || !m.authorId) continue;
    const prev = lastOut.get(m.beneficiaryId);
    if (!prev || m.at > prev.at) lastOut.set(m.beneficiaryId, m);
    if (m.authorId === user.id && ms(m.at) >= startOfDay) outToday.add(m.beneficiaryId);
  }
  const lastTouch = new Map<string, number>();
  const touchedToday = new Set<string>();
  for (const t of db.touches) {
    if (!ids.has(t.beneficiaryId)) continue;
    const at = ms(t.at);
    if (t.kind !== "no_reply") lastTouch.set(t.beneficiaryId, Math.max(lastTouch.get(t.beneficiaryId) ?? 0, at));
    if (t.userId === user.id && at >= startOfDay) touchedToday.add(t.beneficiaryId);
  }
  const openTasks = new Map<string, Task[]>();
  for (const t of db.tasks) {
    if (!ids.has(t.beneficiaryId) || t.doneAt || ms(t.due) > eod) continue;
    if (!openTasks.has(t.beneficiaryId)) openTasks.set(t.beneficiaryId, []);
    openTasks.get(t.beneficiaryId)!.push(t);
  }
  const notes = new Map<string, string>();
  for (const n of db.notes) {
    if (ids.has(n.beneficiaryId) && n.needsContact && now - ms(n.at) < 7 * DAY) {
      const out = lastOut.get(n.beneficiaryId);
      if (!out || out.at < n.at) notes.set(n.beneficiaryId, n.text);
    }
  }

  const items = mine.map<CallItem>((b) => {
    const reasons: Reason[] = [];
    let score = 0;
    const waiting = awaitingReply(db, b);
    if (waiting) {
      reasons.push({ kind: "waiting", since: waiting.at, text: waiting.translation ?? waiting.text });
      score += 100 + Math.min(48, (now - ms(waiting.at)) / HOUR);
    }
    const tasks = (openTasks.get(b.id) ?? []).sort((a, c) => a.due.localeCompare(c.due));
    const task = tasks[0] ?? null;
    if (task) {
      const late = ms(task.due) < now;
      reasons.push({ kind: "task", task, late });
      score += late ? 80 : 60;
    }
    if (b.stage === "muslim") {
      const s = learnerState(db, b, now);
      if (s.level !== "green") {
        reasons.push({ kind: "learner", level: s.level, days: Math.floor(s.daysSince) });
        score += s.level === "red" ? 70 : 40;
      }
      const next = nextScheduled(db, b, now);
      if (next && next.at <= eod) {
        reasons.push({ kind: "lesson", at: next.at, reminder: next.kind === "reminder" });
        score += 30;
      }
    }
    const note = notes.get(b.id);
    if (note) {
      reasons.push({ kind: "note", text: note });
      score += 50;
    }
    const contact = Math.max(lastTouch.get(b.id) ?? 0, lastOut.get(b.id) ? ms(lastOut.get(b.id)!.at) : 0);
    if (b.stage === "new" && !contact) {
      reasons.push({ kind: "new" });
      score += 65;
    } else if ((b.stage === "contacted" || b.stage === "interested" || b.stage === "learning") && contact && now - contact > COLD_DAYS * DAY && !task) {
      const days = Math.floor((now - contact) / DAY);
      reasons.push({ kind: "cold", days });
      score += 35 + Math.min(20, days);
    }

    const localHour = zonedParts(now, b.timezone).h;
    const goodNow = localHour >= GOOD_FROM && localHour < GOOD_TO;
    const doneToday = (touchedToday.has(b.id) || outToday.has(b.id)) && !waiting;
    return { b, reasons, score, localHour, goodNow, fromHour: GOOD_FROM, doneToday, task };
  });

  return items
    .filter((i) => i.reasons.length > 0 || i.doneToday)
    .sort((a, c) => Number(a.doneToday) - Number(c.doneToday) || Number(c.goodNow) - Number(a.goodNow) || c.score - a.score);
}

/** The hour of the center's clock when it becomes a good time for this person. */
export function centerHourFor(b: Beneficiary, localHour: number, now = Date.now()) {
  const center = zonedParts(now, CENTER_TZ).h;
  const diff = center - zonedParts(now, b.timezone).h;
  return (((localHour + diff) % 24) + 24) % 24;
}
