import { DAY, HOUR, eventsOf, groupMembers, learnerState, localHour, trackLessons, visibleGroups } from "./logic";
import type { Beneficiary, DB, Group, Lesson, User } from "./types";

/**
 * The teacher's board: when lessons get opened, how each learner is doing, and which
 * lessons people get stuck on. Everything comes from the lesson links already sent.
 */

/** A lesson counts as "opened quickly" when the learner opens it within this time. */
export const QUICK_OPEN = 6 * HOUR;
/** Fewer lessons than this at an hour are not enough to judge it. */
export const MIN_SENT = 3;

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

export type HourStat = { hour: number; sent: number; quick: number; pct: number };

/** Lessons sent at each local hour of the learner, and how many were opened quickly. */
export function hourStats(db: DB, learners: Beneficiary[]): HourStat[] {
  const byId = new Map(learners.map((b) => [b.id, b]));
  const hours = new Map<number, { sent: number; quick: number }>();
  for (const e of db.events) {
    const b = byId.get(e.beneficiaryId);
    if (!b) continue;
    const h = localHour(e.sentAt, b.timezone);
    const bucket = hours.get(h) ?? { sent: 0, quick: 0 };
    bucket.sent++;
    if (e.openedAt && new Date(e.openedAt).getTime() - new Date(e.sentAt).getTime() <= QUICK_OPEN) bucket.quick++;
    hours.set(h, bucket);
  }
  return [...hours.entries()].map(([hour, v]) => ({ hour, ...v, pct: pct(v.quick, v.sent) ?? 0 })).sort((a, c) => a.hour - c.hour);
}

/** The hour with the best quick-open rate among hours with enough lessons. */
export function bestHour(stats: HourStat[]) {
  return [...stats].filter((s) => s.sent >= MIN_SENT).sort((a, c) => c.pct - a.pct || c.sent - a.sent)[0] ?? null;
}

export type LearnerRow = {
  b: Beneficiary;
  state: ReturnType<typeof learnerState>;
  opened: number;
  sent: number;
  correctPct: number | null;
  /** Average hours from sending a lesson to opening it. */
  hoursToOpen: number | null;
  quickPct: number | null;
};

export function learnerRows(db: DB, learners: Beneficiary[], now = Date.now()): LearnerRow[] {
  return learners
    .map((b) => {
      const ev = eventsOf(db, b.id);
      const opened = ev.filter((e) => e.openedAt);
      const done = ev.filter((e) => e.completedAt);
      const waits = opened.map((e) => (new Date(e.openedAt!).getTime() - new Date(e.sentAt).getTime()) / HOUR);
      return {
        b,
        state: learnerState(db, b, now),
        opened: opened.length,
        sent: ev.length,
        correctPct: pct(done.filter((e) => e.correct).length, done.length),
        hoursToOpen: waits.length ? Math.round((waits.reduce((a, c) => a + c, 0) / waits.length) * 10) / 10 : null,
        quickPct: pct(waits.filter((w) => w * HOUR <= QUICK_OPEN).length, ev.length),
      };
    })
    .sort((a, c) => ({ red: 0, yellow: 1, green: 2 })[a.state.level] - ({ red: 0, yellow: 1, green: 2 })[c.state.level] || c.state.daysSince - a.state.daysSince);
}

export type LessonRow = { lesson: Lesson; sent: number; completed: number; wrongPct: number | null; stuck: number; score: number };

/** Lessons ordered by how hard they are for these learners: wrong answers and lessons left open. */
export function hardLessons(db: DB, learners: Beneficiary[], now = Date.now()): LessonRow[] {
  const ids = new Set(learners.map((b) => b.id));
  return trackLessons(db, "TR1")
    .map((lesson) => {
      const ev = db.events.filter((e) => e.lessonId === lesson.id && ids.has(e.beneficiaryId));
      const completed = ev.filter((e) => e.completedAt);
      const wrong = completed.filter((e) => e.correct === false).length;
      const stuck = ev.filter((e) => !e.completedAt && now - new Date(e.sentAt).getTime() > 3 * DAY).length;
      const wrongPct = pct(wrong, completed.length);
      return { lesson, sent: ev.length, completed: completed.length, wrongPct, stuck, score: (wrongPct ?? 0) + stuck * 15 };
    })
    .filter((r) => r.sent > 0)
    .sort((a, c) => c.score - a.score);
}

export type GroupBoard = {
  group: Group;
  learners: Beneficiary[];
  hours: HourStat[];
  best: HourStat | null;
  /** The hour the group sends at now, or null when each learner gets their own hour. */
  current: number | null;
  /** Quick-open rate at the hours the group sends today, to compare with the best hour. */
  currentPct: number | null;
  /** Worth suggesting: enough data and clearly better than what the group does now. */
  suggest: boolean;
};

export function groupBoards(db: DB, user: User): GroupBoard[] {
  const groups = visibleGroups(db, user).filter((g) => g.kind === "learning" && (user.role !== "teacher" || g.ownerId === user.id));
  return groups.map((group) => {
    const learners = groupMembers(db, group.id).filter((b) => b.stage === "muslim");
    const hours = hourStats(db, learners);
    const best = bestHour(hours);
    const current = group.schedule.hour;
    const usedHours = current !== null ? hours.filter((h) => h.hour === current) : hours.filter((h) => h.hour !== best?.hour);
    const sent = usedHours.reduce((n, h) => n + h.sent, 0);
    const currentPct = pct(
      usedHours.reduce((n, h) => n + h.quick, 0),
      sent,
    );
    const suggest = !!best && best.hour !== current && (currentPct === null || best.pct - currentPct >= 15);
    return { group, learners, hours, best, current, currentPct, suggest };
  });
}
