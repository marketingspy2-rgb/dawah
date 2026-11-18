import { TEMPLATES, fillTemplate } from "./content";
import { newId } from "./db";
import { auditEntry } from "./intake";
import { DAY, HOUR, canAct, firstName, nextScheduled } from "./logic";
import type { Beneficiary, DB, User } from "./types";

/**
 * Sends the learner's next item now: their next lesson, or a reminder for the one still open.
 * `due` limits it to an item whose scheduled time has come, for the scheduler.
 */
export function sendNext(db: DB, user: User, b: Beneficiary, due?: number): boolean {
  const item = nextScheduled(db, b, due ? due - 3 * HOUR : Date.now() - 30 * DAY);
  if (!item || (due && item.at > due)) return false;
  const now = new Date().toISOString();
  const lesson = item.lesson;
  const vars = { name: firstName(b), title: lesson.title[b.language] ?? lesson.title.en, link: "{link}" };
  if (item.kind === "reminder" && item.event) {
    const tpl = TEMPLATES.lesson_reminder;
    item.event.remindedAt = now;
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(tpl[b.language], vars), translation: fillTemplate(tpl.ar, { ...vars, title: lesson.title.ar }), at: now, authorId: user.id, status: "sent", kind: "lesson", eventId: item.event.id });
    auditEntry(db, user, "send_reminder", b.id);
    return true;
  }
  const eventId = `ev_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  db.events.push({ id: eventId, beneficiaryId: b.id, lessonId: lesson.id, sentAt: now, sentBy: user.id, remindedAt: null, openedAt: null, completedAt: null, correct: null });
  const tpl = TEMPLATES.lesson_ready;
  db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(tpl[b.language], vars), translation: fillTemplate(tpl.ar, { ...vars, title: lesson.title.ar }), at: now, authorId: user.id, status: "sent", kind: "lesson", eventId });
  auditEntry(db, user, `send_lesson:${lesson.id}`, b.id);
  return true;
}

/**
 * The scheduler's round: every learner whose lesson or reminder time has come gets it,
 * sent in the name of their circle's owner. Returns how many went out.
 */
export function sendDue(db: DB, now = Date.now()) {
  let sent = 0;
  for (const g of db.groups) {
    if (g.kind !== "learning" || g.schedule.paused) continue;
    const owner = db.users.find((u) => u.id === g.ownerId && u.status !== "left") ?? db.users.find((u) => u.role === "admin" && u.status !== "left");
    if (!owner) continue;
    for (const b of db.beneficiaries.filter((x) => x.groupId === g.id)) {
      if (owner.role !== "admin" && !canAct(db, owner, b)) continue;
      if (sendNext(db, owner, b, now)) sent++;
    }
  }
  return sent;
}
