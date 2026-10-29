import { CENTER_TZ, pct } from "./logic";
import { DAY, HOUR, zonedParts } from "./time";
import type { Beneficiary, DB, Message, TouchKind, User } from "./types";
import { TOUCH_KINDS } from "./types";

/**
 * Conversation statistics that work whether the conversation happened on the center's number
 * or on a staff member's personal WhatsApp: they read every message in the file (sent from the
 * platform, or brought in by export, share or paste) and the one-tap contact log.
 */

function median(values: number[]) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const ms = (iso: string) => new Date(iso).getTime();

/** Days after which a beneficiary with no message from them counts as silent. */
export const SILENT_DAYS = 14;
/** Data older than this means the staff member has not brought their chats in lately. */
export const STALE_DAYS = 7;

type PerBen = {
  b: Beneficiary;
  messages: Message[];
  lastIn: number | null;
  lastData: number | null;
};

function perBeneficiary(db: DB, list: Beneficiary[]) {
  const ids = new Set(list.map((b) => b.id));
  const byBen = new Map<string, Message[]>();
  for (const m of db.messages) {
    if (!ids.has(m.beneficiaryId)) continue;
    if (!byBen.has(m.beneficiaryId)) byBen.set(m.beneficiaryId, []);
    byBen.get(m.beneficiaryId)!.push(m);
  }
  const lastTouch = new Map<string, number>();
  for (const t of db.touches) if (ids.has(t.beneficiaryId)) lastTouch.set(t.beneficiaryId, Math.max(lastTouch.get(t.beneficiaryId) ?? 0, ms(t.at)));
  return list.map<PerBen>((b) => {
    const messages = (byBen.get(b.id) ?? []).sort((x, y) => x.at.localeCompare(y.at));
    const ins = messages.filter((m) => m.direction === "in");
    const lastMsg = messages.length ? ms(messages[messages.length - 1].at) : null;
    const lastData = Math.max(lastMsg ?? 0, lastTouch.get(b.id) ?? 0) || null;
    return { b, messages, lastIn: ins.length ? ms(ins[ins.length - 1].at) : null, lastData };
  });
}

/** Reply times (hours) and whether staff messages got an answer within three days, per staff member. */
function turns(rows: PerBen[], since: number, now: number) {
  const reply = new Map<string, number[]>();
  const asked = new Map<string, { sent: number; answered: number }>();
  for (const { b, messages } of rows) {
    let waitingSince: Message | null = null;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.direction === "in") {
        waitingSince ??= m;
        continue;
      }
      if (m.kind === "lesson") continue;
      const who = m.authorId ?? b.assignedTo;
      if (waitingSince) {
        if (ms(waitingSince.at) >= since) {
          if (!reply.has(who)) reply.set(who, []);
          reply.get(who)!.push((ms(m.at) - ms(waitingSince.at)) / HOUR);
        }
        waitingSince = null;
      }
      // Start of a staff turn: did the beneficiary answer within three days?
      const prev = messages[i - 1];
      const at = ms(m.at);
      if (at >= since && at <= now - 3 * DAY && (!prev || prev.direction === "in")) {
        const next = messages.slice(i + 1).find((x) => x.direction === "in");
        const s = asked.get(who) ?? { sent: 0, answered: 0 };
        s.sent++;
        if (next && ms(next.at) - at <= 3 * DAY) s.answered++;
        asked.set(who, s);
      }
    }
  }
  return { reply, asked };
}

export type Insights = ReturnType<typeof conversationInsights>;

export function conversationInsights(db: DB, list: Beneficiary[], staff: User[], days: number, now = Date.now()) {
  const since = now - days * DAY;
  const open = list.filter((b) => b.stage !== "closed");
  const rows = perBeneficiary(db, open);
  const ids = new Set(open.map((b) => b.id));
  const inWindow = (iso: string) => ms(iso) >= since && ms(iso) <= now;

  const msgs = rows.flatMap((r) => r.messages).filter((m) => inWindow(m.at));
  const touches = db.touches.filter((t) => ids.has(t.beneficiaryId) && inWindow(t.at));
  const activeIds = new Set([...msgs.map((m) => m.beneficiaryId), ...touches.map((t) => t.beneficiaryId)]);
  const { reply, asked } = turns(rows, since, now);
  const allReplies = [...reply.values()].flat();
  const allAsked = [...asked.values()].reduce((a, s) => ({ sent: a.sent + s.sent, answered: a.answered + s.answered }), { sent: 0, answered: 0 });

  const isSilent = (r: PerBen) =>
    r.b.stage !== "paused" && now - ms(r.b.createdAt) > SILENT_DAYS * DAY && (r.lastIn === null || now - r.lastIn > SILENT_DAYS * DAY);
  const silent = rows.filter(isSilent).sort((a, c) => (a.lastIn ?? 0) - (c.lastIn ?? 0));
  const fresh = rows.filter((r) => r.lastData !== null && now - r.lastData <= STALE_DAYS * DAY).length;

  // Activity over time: one bar per day up to a month, one per week beyond.
  const step = days <= 31 ? DAY : 7 * DAY;
  const buckets = Math.ceil(days / (step / DAY));
  const startOfToday = (() => {
    const p = zonedParts(now, CENTER_TZ);
    return now - (p.h * HOUR + p.min * 60_000);
  })();
  const first = startOfToday - (buckets - 1) * step;
  const activity = Array.from({ length: buckets }, (_, i) => ({ start: first + i * step, in: 0, out: 0, touches: 0 }));
  const bucketOf = (t: number) => Math.floor((t - first) / step);
  for (const m of msgs) {
    const i = bucketOf(ms(m.at));
    if (activity[i]) activity[i][m.direction]++;
  }
  for (const t of touches) {
    const i = bucketOf(ms(t.at));
    if (activity[i]) activity[i].touches++;
  }

  // When beneficiaries write, by the center's clock.
  const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, n: 0 }));
  for (const m of msgs) if (m.direction === "in") byHour[zonedParts(ms(m.at), CENTER_TZ).h].n++;

  const kinds = TOUCH_KINDS.map((kind) => ({ kind, n: touches.filter((t) => t.kind === kind).length }));
  const sources = {
    imported: msgs.filter((m) => m.kind === "imported" || m.via === "phone").length,
    platform: msgs.filter((m) => m.kind !== "imported" && m.via !== "phone").length,
    touches: touches.length,
  };

  const perStaff = staff.map((u) => {
    const mine = rows.filter((r) => r.b.assignedTo === u.id);
    const mineIds = new Set(mine.map((r) => r.b.id));
    const myMsgs = msgs.filter((m) => mineIds.has(m.beneficiaryId));
    const myTouches = touches.filter((t) => t.userId === u.id);
    const lastImport = db.imports.filter((x) => x.userId === u.id).reduce((a, x) => Math.max(a, ms(x.at)), 0);
    const lastTouch = db.touches.filter((x) => x.userId === u.id).reduce((a, x) => Math.max(a, ms(x.at)), 0);
    const lastOwnMessage = db.messages.filter((m) => m.authorId === u.id && m.kind !== "lesson" && m.kind !== "imported").reduce((a, m) => Math.max(a, ms(m.at)), 0);
    const lastUpdate = Math.max(lastImport, lastTouch, lastOwnMessage) || null;
    const a = asked.get(u.id);
    return {
      user: u,
      cases: mine.length,
      active: mine.filter((r) => activeIds.has(r.b.id)).length,
      in: myMsgs.filter((m) => m.direction === "in").length,
      out: myMsgs.filter((m) => m.direction === "out").length,
      touches: myTouches.length,
      replyH: median(reply.get(u.id) ?? []),
      answeredPct: a ? pct(a.answered, a.sent) : null,
      silent: mine.filter(isSilent).length,
      lastUpdate,
      stale: mine.length > 0 && (lastUpdate === null || now - lastUpdate > STALE_DAYS * DAY),
    };
  });

  return {
    days,
    active: activeIds.size,
    open: open.length,
    messagesIn: msgs.filter((m) => m.direction === "in").length,
    messagesOut: msgs.filter((m) => m.direction === "out").length,
    touches: touches.length,
    replyH: median(allReplies),
    answeredPct: pct(allAsked.answered, allAsked.sent),
    silent: silent.map((r) => ({ b: r.b, lastIn: r.lastIn })),
    freshPct: pct(fresh, rows.length),
    activity,
    byHour,
    kinds,
    sources,
    perStaff,
  };
}

/** The last contact log entry for a beneficiary, and today's entries, for the one-tap buttons. */
export function touchState(db: DB, beneficiaryId: string, now = Date.now()) {
  const list = db.touches.filter((t) => t.beneficiaryId === beneficiaryId).sort((a, c) => c.at.localeCompare(a.at));
  return { last: list[0] ?? null, recent: list.slice(0, 5), today: list.filter((t) => now - ms(t.at) < DAY).map((t) => t.kind as TouchKind) };
}
