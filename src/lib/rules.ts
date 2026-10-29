import { learnerState } from "./logic";
import { DAY, HOUR } from "./time";
import type { Beneficiary, DB, Task, TaskKind } from "./types";

/**
 * Follow-up rules: tasks the platform creates on its own, so nobody has to remember them.
 * Runs after every change (and so at least every few minutes while anyone uses the platform).
 * Every rule is idempotent: a task it created, done or not, is never created again.
 */

const newId = () => `TK-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ms = (iso: string) => new Date(iso).getTime();

/** Rules only look this far back, so turning one on never floods anyone with old tasks. */
const LOOKBACK = 7 * DAY;

export const RULE_TITLES = {
  afterContact: "متابعة الحوار",
  retry: "محاولة تواصل ثانية",
  retryMany: (n: number) => `لم يرد ${n} مرات: جرّب وقتًا آخر أو أبلغ المشرف`,
  checkin: (d: number) => (d === 1 ? "اطمئنان بعد أول يوم من الإسلام" : `اطمئنان بعد ${d} يومًا من الإسلام`),
  silent: "اطمئنان على متعلم منقطع",
  newCase: "أول تواصل",
};

export function applyRules(db: DB, now = Date.now()) {
  const r = db.settings?.rules;
  if (!r) return 0;

  // One pass over messages, contact logs and tasks.
  const lastContact = new Map<string, number>();
  const lastIn = new Map<string, number>();
  const bump = (m: Map<string, number>, id: string, at: number) => m.set(id, Math.max(m.get(id) ?? 0, at));
  for (const m of db.messages) {
    if (m.direction === "in") bump(lastIn, m.beneficiaryId, ms(m.at));
    else if (m.authorId) bump(lastContact, m.beneficiaryId, ms(m.at));
  }
  const noAnswers = new Map<string, { id: string; at: number }[]>();
  for (const t of db.touches) {
    if (t.kind === "no_reply") {
      if (!noAnswers.has(t.beneficiaryId)) noAnswers.set(t.beneficiaryId, []);
      noAnswers.get(t.beneficiaryId)!.push({ id: t.id, at: ms(t.at) });
    } else bump(lastContact, t.beneficiaryId, ms(t.at));
  }
  const tasksOf = new Map<string, Task[]>();
  for (const t of db.tasks) {
    if (!tasksOf.has(t.beneficiaryId)) tasksOf.set(t.beneficiaryId, []);
    tasksOf.get(t.beneficiaryId)!.push(t);
  }

  let created = 0;
  const add = (b: Beneficiary, title: string, kind: TaskKind, due: number, rule: string) => {
    const task: Task = { id: newId(), beneficiaryId: b.id, assigneeId: b.assignedTo, title, kind, due: new Date(due).toISOString(), createdAt: new Date(now).toISOString(), doneAt: null, rule };
    db.tasks.push(task);
    if (!tasksOf.has(b.id)) tasksOf.set(b.id, []);
    tasksOf.get(b.id)!.push(task);
    created++;
  };

  for (const b of db.beneficiaries) {
    if (b.stage === "closed" || b.stage === "paused" || b.optedOut) continue;
    const tasks = tasksOf.get(b.id) ?? [];
    const hasOpen = tasks.some((t) => !t.doneAt);
    const createdSince = (at: number) => tasks.some((t) => ms(t.createdAt) >= at);
    const contact = lastContact.get(b.id) ?? 0;

    // "No answer": try again, and raise it after several tries in a row.
    if (r.noAnswer.on) {
      const since = Math.max(contact, lastIn.get(b.id) ?? 0);
      const streak = (noAnswers.get(b.id) ?? []).filter((x) => x.at > since).sort((a, c) => a.at - c.at);
      const last = streak[streak.length - 1];
      const n = streak.length;
      const handled = tasks.some((t) => t.rule === `no_answer:${last?.id}`);
      // An open task already covers it, unless the tries have run out and it needs raising.
      if (last && now - last.at < LOOKBACK && !handled && (!hasOpen || n >= r.noAnswer.tries)) {
        add(b, n >= r.noAnswer.tries ? RULE_TITLES.retryMany(n) : RULE_TITLES.retry, "followup", last.at + r.noAnswer.days * DAY, `no_answer:${last.id}`);
        continue;
      }
    }

    // After a contact in the dawah stages: the next step is never left without a date.
    if (r.afterContact.on && (b.stage === "contacted" || b.stage === "interested" || b.stage === "learning")) {
      if (contact && now - contact < LOOKBACK && !hasOpen && !createdSince(contact)) {
        add(b, RULE_TITLES.afterContact, "followup", contact + r.afterContact[b.stage] * DAY, "after_contact");
      }
      continue;
    }

    // Someone new nobody has reached yet.
    if (r.newCase.on && b.stage === "new") {
      const age = now - ms(b.createdAt);
      if (!contact && age >= r.newCase.hours * HOUR && age < 14 * DAY && !hasOpen && !tasks.some((t) => t.kind === "first_contact")) {
        add(b, RULE_TITLES.newCase, "first_contact", now, "new_case");
      }
      continue;
    }

    if (b.stage === "muslim" && b.convertedAt) {
      // Check-ins on fixed days after embracing Islam, created a day ahead.
      if (r.newMuslim.on) {
        for (const d of r.newMuslim.days) {
          const target = ms(b.convertedAt) + d * DAY;
          if (target < now - DAY || target > now + DAY) continue;
          const exists = tasks.some((t) => t.rule === `checkin:${d}` || (t.kind === "checkin" && Math.abs(ms(t.due) - target) < 1.5 * DAY));
          if (!exists) add(b, RULE_TITLES.checkin(d), "checkin", target, `checkin:${d}`);
        }
      }
      // A learner who has gone quiet.
      if (r.silentLearner.on && !tasks.some((t) => !t.doneAt)) {
        const s = learnerState(db, b, now);
        if (s.level === "red" && !tasks.some((t) => t.rule === "silent" && t.createdAt >= s.lastActivity)) {
          add(b, RULE_TITLES.silent, "checkin", now, "silent");
        }
      }
    }
  }
  return created;
}
