import { COUNTRIES } from "./content";
import { LANG_LABELS, STAGE_LABELS } from "./i18n";
import { DAY, HOUR, nextSlot, zonedParts, zonedToUtc } from "./time";
import type { Beneficiary, DB, Gender, Group, Lang, Lesson, LessonEvent, Message, StaffRole, Stage, Task, UiLang, User } from "./types";

export { DAY, HOUR };

/** Staff work in the center's time zone, whatever the server runs in. */
export const CENTER_TZ = "Asia/Riyadh";

// ---------- Structure and access ----------

export const isStaff = (u: User) => u.role === "caller" || u.role === "teacher";

export function teamOf(db: DB, user: User) {
  return db.teams.find((t) => t.id === user.teamId) ?? null;
}

export function supervisorIdFor(db: DB, staffId: string) {
  const staff = db.users.find((u) => u.id === staffId);
  return db.teams.find((t) => t.id === staff?.teamId)?.supervisorId ?? null;
}

/** Callers and teachers this user is responsible for (themselves for staff). */
export function staffUnder(db: DB, user: User): User[] {
  if (user.role === "admin") return db.users.filter(isStaff);
  if (user.role === "supervisor") return db.users.filter((u) => isStaff(u) && u.teamId === user.teamId);
  return [user];
}

export function canManageUser(db: DB, user: User, target: User) {
  if (user.role === "admin") return true;
  if (user.role === "supervisor") return target.teamId === user.teamId && target.id !== user.id;
  return false;
}

export function visibleBeneficiaries(db: DB, user: User): Beneficiary[] {
  if (user.role === "admin") return db.beneficiaries;
  if (user.role === "supervisor") {
    const team = new Set(staffUnder(db, user).map((u) => u.id));
    return db.beneficiaries.filter((b) => team.has(b.assignedTo));
  }
  return db.beneficiaries.filter((b) => b.assignedTo === user.id || b.introducedBy === user.id);
}

export function canOpen(db: DB, user: User, b: Beneficiary) {
  return visibleBeneficiaries(db, user).some((v) => v.id === b.id);
}

/** The caller who introduced a new Muslim can follow the file but not act on it. */
export function canAct(db: DB, user: User, b: Beneficiary) {
  if (user.role === "admin") return true;
  if (user.role === "supervisor") return supervisorIdFor(db, b.assignedTo) === user.id;
  return b.assignedTo === user.id;
}

/** Real name only for the people responsible when the case is sensitive. */
export function canSeeName(db: DB, user: User, b: Beneficiary) {
  if (!b.sensitive) return true;
  return b.assignedTo === user.id || b.introducedBy === user.id || supervisorIdFor(db, b.assignedTo) === user.id;
}

export function displayName(db: DB, user: User, b: Beneficiary) {
  return canSeeName(db, user, b) ? b.name : b.alias;
}

export function firstName(b: Beneficiary) {
  return b.name.split(" ")[0];
}

export function visibleGroups(db: DB, user: User): Group[] {
  const ids = new Set(staffUnder(db, user).map((u) => u.id));
  return db.groups.filter((g) => ids.has(g.ownerId));
}

export function groupMembers(db: DB, groupId: string) {
  return db.beneficiaries.filter((b) => b.groupId === groupId && b.stage !== "closed");
}

// ---------- Messages ----------

export function messagesOf(db: DB, beneficiaryId: string): Message[] {
  return db.messages.filter((m) => m.beneficiaryId === beneficiaryId).sort((a, b) => a.at.localeCompare(b.at));
}

export function lastMessage(db: DB, beneficiaryId: string): Message | undefined {
  let last: Message | undefined;
  for (const m of db.messages) if (m.beneficiaryId === beneficiaryId && (!last || m.at > last.at)) last = m;
  return last;
}

export function lastInbound(db: DB, beneficiaryId: string): Message | undefined {
  let last: Message | undefined;
  for (const m of db.messages) if (m.beneficiaryId === beneficiaryId && m.direction === "in" && (!last || m.at > last.at)) last = m;
  return last;
}

export function awaitingReply(db: DB, b: Beneficiary) {
  const last = lastMessage(db, b.id);
  return last?.direction === "in" ? last : null;
}

/** WhatsApp allows free-form messages only within 24 hours of the beneficiary's last message. */
export function windowOpen(db: DB, b: Beneficiary, now = Date.now()) {
  const last = lastInbound(db, b.id);
  return !!last && now - new Date(last.at).getTime() < DAY;
}

// ---------- Lessons and learners ----------

export function trackLessons(db: DB, trackId: string, onlyReady = true): Lesson[] {
  return db.lessons.filter((l) => l.trackId === trackId && (!onlyReady || l.status === "ready")).sort((a, b) => a.order - b.order);
}

export function groupOf(db: DB, b: Beneficiary) {
  return db.groups.find((g) => g.id === b.groupId) ?? null;
}

export function trackIdFor(db: DB, b: Beneficiary) {
  return groupOf(db, b)?.trackId ?? "TR1";
}

export function eventsOf(db: DB, beneficiaryId: string): LessonEvent[] {
  const order = new Map(db.lessons.map((l) => [l.id, l.order]));
  return db.events.filter((e) => e.beneficiaryId === beneficiaryId).sort((a, b) => (order.get(a.lessonId) ?? 0) - (order.get(b.lessonId) ?? 0));
}

export type Level = "green" | "yellow" | "red";

export function learnerState(db: DB, b: Beneficiary, now = Date.now()) {
  const lessons = trackLessons(db, trackIdFor(db, b));
  const events = eventsOf(db, b.id);
  const completed = events.filter((e) => e.completedAt).length;
  const current = events[events.length - 1];
  const times = [b.convertedAt, lastInbound(db, b.id)?.at, ...events.flatMap((e) => [e.openedAt, e.completedAt])].filter((v): v is string => !!v);
  const lastActivity = times.sort().pop() ?? b.createdAt;
  const daysSince = (now - new Date(lastActivity).getTime()) / DAY;
  const wrongRecent = events.filter((e) => e.completedAt).slice(-3).filter((e) => e.correct === false).length;
  let level: Level = "green";
  if (completed < lessons.length) {
    if (daysSince >= 7) level = "red";
    else if (daysSince >= 4 || wrongRecent >= 2) level = "yellow";
  }
  const waitingOnLesson = !!current && !current.completedAt;
  return { lessons, events, completed, total: lessons.length, current, lastActivity, daysSince, wrongRecent, level, waitingOnLesson };
}

export type ScheduleItem = {
  beneficiary: Beneficiary;
  group: Group;
  kind: "lesson" | "reminder";
  lesson: Lesson;
  at: number;
  event: LessonEvent | null;
};

/** What goes out next to a learner: the next lesson on the group's days, or a gentle reminder for an open one. */
export function nextScheduled(db: DB, b: Beneficiary, now = Date.now()): ScheduleItem | null {
  const group = groupOf(db, b);
  if (!group || group.kind !== "learning" || !group.trackId || group.schedule.paused || b.stage !== "muslim" || b.optedOut) return null;
  const hour = group.schedule.hour ?? b.preferredHour;
  const lessons = trackLessons(db, group.trackId);
  const events = eventsOf(db, b.id);
  const current = events[events.length - 1];
  if (current && !current.completedAt) {
    const lesson = db.lessons.find((l) => l.id === current.lessonId);
    if (!lesson) return null;
    const lastPing = Math.max(new Date(current.sentAt).getTime(), current.remindedAt ? new Date(current.remindedAt).getTime() : 0);
    const at = nextSlot(Math.max(now, lastPing + 2 * DAY), b.timezone, group.schedule.days, hour);
    return at ? { beneficiary: b, group, kind: "reminder", lesson, at, event: current } : null;
  }
  const done = new Set(events.map((e) => e.lessonId));
  const lesson = lessons.find((l) => !done.has(l.id));
  if (!lesson) return null;
  const after = current?.completedAt ? new Date(current.completedAt).getTime() + 12 * HOUR : b.convertedAt ? new Date(b.convertedAt).getTime() + DAY : now;
  const at = nextSlot(Math.max(now, after), b.timezone, group.schedule.days, hour);
  return at ? { beneficiary: b, group, kind: "lesson", lesson, at, event: null } : null;
}

export function upcoming(db: DB, list: Beneficiary[], now = Date.now(), days = 7) {
  return list
    .map((b) => nextScheduled(db, b, now))
    .filter((x): x is ScheduleItem => !!x && x.at < now + days * DAY)
    .sort((a, b) => a.at - b.at);
}

// ---------- Time ----------

const locale = (lang: UiLang) => (lang === "ar" ? "ar-u-nu-latn" : "en");

export function localHour(iso: string, tz: string) {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date(iso))) % 24;
}

export function localTime(tz: string, lang: UiLang, at: Date | number = new Date()) {
  return new Intl.DateTimeFormat(locale(lang), { hour: "numeric", minute: "2-digit", weekday: "short", timeZone: tz }).format(at);
}

export function formatHour(h: number, lang: UiLang) {
  const d = new Date(Date.UTC(2026, 0, 1, h));
  return new Intl.DateTimeFormat(locale(lang), { hour: "numeric", timeZone: "UTC" }).format(d);
}

export function weekdayName(day: number, lang: UiLang, style: "long" | "short" = "long") {
  // 2026-01-04 is a Sunday.
  return new Intl.DateTimeFormat(locale(lang), { weekday: style, timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 4 + day)));
}

export function relTime(iso: string | number | null | undefined, lang: UiLang, now = Date.now()) {
  if (iso === null || iso === undefined) return "—";
  const diff = new Date(iso).getTime() - now;
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < HOUR) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), "hour");
  return rtf.format(Math.round(diff / DAY), "day");
}

export function formatDate(iso: string | number, lang: UiLang) {
  return new Intl.DateTimeFormat(locale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: CENTER_TZ }).format(new Date(iso));
}

export function formatDay(ms: number, lang: UiLang) {
  return new Intl.DateTimeFormat(locale(lang), { weekday: "long", day: "numeric", month: "long", timeZone: CENTER_TZ }).format(new Date(ms));
}

/** Clock time in the center's time zone. */
export function centerTime(ms: number, lang: UiLang) {
  return new Intl.DateTimeFormat(locale(lang), { hour: "numeric", minute: "2-digit", timeZone: CENTER_TZ }).format(new Date(ms));
}

export function dayKey(ms: number) {
  const p = zonedParts(ms, CENTER_TZ);
  return `${p.y}-${p.m}-${p.d}`;
}

// ---------- Assignment ----------

export function activeLoad(db: DB, userId: string) {
  return db.beneficiaries.filter((b) => b.assignedTo === userId && b.stage !== "closed").length;
}

/** Same role, same language, same gender, available, lowest load. */
export function suggestAssignee(db: DB, b: { language: Lang; gender: Gender }, role: StaffRole, exclude: string[] = [], teamId?: string | null) {
  const options = eligibleStaff(db, b, role)
    .filter((u) => !exclude.includes(u.id))
    .map((u) => ({ user: u, load: activeLoad(db, u.id), sameTeam: teamId ? u.teamId === teamId : false }))
    .sort((a, c) => Number(c.sameTeam) - Number(a.sameTeam) || a.load - c.load);
  return options[0]?.user ?? null;
}

export function eligibleStaff(db: DB, b: { language: Lang; gender: Gender }, role: StaffRole) {
  return db.users.filter((u) => u.role === role && u.status === "available" && u.gender === b.gender && u.languages.includes(b.language));
}

/** The receiving person's open group in that language, or a new one. */
export function groupForMember(db: DB, ownerId: string, kind: Group["kind"], language: Lang) {
  return db.groups.filter((g) => g.ownerId === ownerId && g.kind === kind && g.language === language).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

// ---------- Tasks ----------

export function openTasks(db: DB, beneficiaryId?: string) {
  return db.tasks.filter((t) => !t.doneAt && (!beneficiaryId || t.beneficiaryId === beneficiaryId)).sort((a, b) => a.due.localeCompare(b.due));
}

export function endOfToday(now = new Date()) {
  const p = zonedParts(now.getTime(), CENTER_TZ);
  return zonedToUtc(p.y, p.m, p.d + 1, 0, CENTER_TZ) - 1;
}

export function taskBuckets(tasks: Task[], now = Date.now()) {
  const eod = endOfToday(new Date(now));
  return {
    overdue: tasks.filter((t) => new Date(t.due).getTime() < now),
    today: tasks.filter((t) => new Date(t.due).getTime() >= now && new Date(t.due).getTime() <= eod),
    upcoming: tasks.filter((t) => new Date(t.due).getTime() > eod && new Date(t.due).getTime() <= eod + 3 * DAY),
  };
}

// ---------- Handover summary ----------

export function buildSummary(db: DB, b: Beneficiary, lang: UiLang) {
  const country = COUNTRIES.find((c) => c.code === b.country);
  const stageSince = b.stageHistory[b.stageHistory.length - 1]?.at ?? b.createdAt;
  const days = Math.max(0, Math.round((Date.now() - new Date(stageSince).getTime()) / DAY));
  const lastIn = lastInbound(db, b.id);
  const next = openTasks(db, b.id)[0];
  const note = db.notes.filter((n) => n.beneficiaryId === b.id).sort((a, c) => c.at.localeCompare(a.at))[0];
  const learner = b.stage === "muslim" ? learnerState(db, b) : null;
  const levelWord = learner ? { green: lang === "ar" ? "مستمر" : "on track", yellow: lang === "ar" ? "يتباطأ" : "slowing", red: lang === "ar" ? "منقطع" : "silent" }[learner.level] : "";

  if (lang === "en") {
    return [
      `Who: ${b.name}, from ${country?.en ?? b.country}, speaks ${LANG_LABELS[b.language].en}. Came via ${b.source}.`,
      `Background: ${b.background}`,
      `Needs: ${b.needs}`,
      `Where they are: ${STAGE_LABELS[b.stage].en} for ${days} days.${learner ? ` Completed ${learner.completed} of ${learner.total} lessons, ${levelWord}.` : ""}`,
      `Holding back: ${b.objections.join(", ") || "nothing recorded"}.`,
      `Last message from them: ${lastIn ? `${relTime(lastIn.at, "en")}: “${lastIn.translation ?? lastIn.text}”` : "none yet"}.`,
      note ? `Latest note: ${note.text}` : null,
      `Next step: ${next ? `${next.title} (${relTime(next.due, "en")})` : learner ? "send the next lesson and check in" : "agree a follow-up time"}.`,
    ].filter(Boolean).join("\n");
  }
  return [
    `من هو: ${b.name}، من ${country?.ar ?? b.country}، لغته ${LANG_LABELS[b.language].ar}. جاء عن طريق ${b.source}.`,
    `الخلفية: ${b.background}`,
    `ما يحتاجه: ${b.needs}`,
    `أين وصل: ${STAGE_LABELS[b.stage].ar} منذ ${days} يومًا.${learner ? ` أكمل ${learner.completed} من ${learner.total} دروس، والحالة: ${levelWord}.` : ""}`,
    `ما يمنعه: ${b.objections.join("، ") || "لا شيء مسجل"}.`,
    `آخر رسالة منه: ${lastIn ? `${relTime(lastIn.at, "ar")}: «${lastIn.translation ?? lastIn.text}»` : "لا يوجد بعد"}.`,
    note ? `آخر ملاحظة: ${note.text}` : null,
    `الخطوة التالية: ${next ? `${next.title} (${relTime(next.due, "ar")})` : learner ? "إرسال الدرس التالي والاطمئنان عليه" : "الاتفاق على موعد متابعة"}.`,
  ].filter(Boolean).join("\n");
}

// ---------- WhatsApp export import ----------

export type ParsedLine = { at: Date; sender: string; text: string };

const LINE_RE = /^‎?\[?(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\]?\s*(?:-\s*)?([^:]{1,60}?):\s([\s\S]*)$/;

/** Parses Android and iPhone "Export chat" text files. */
export function parseWhatsAppExport(raw: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const line of raw.replace(/\r/g, "").split("\n")) {
    const m = line.match(LINE_RE);
    if (!m) {
      if (out.length && line.trim()) out[out.length - 1].text += `\n${line}`;
      continue;
    }
    const [, a, b, c, hh, mm, ss, ampm, sender, text] = m;
    let year: number, month: number, day: number;
    if (a.length === 4) {
      year = +a; month = +b; day = +c;
    } else {
      year = +c < 100 ? 2000 + +c : +c;
      if (+a > 12) { day = +a; month = +b; }
      else if (+b > 12) { month = +a; day = +b; }
      else { day = +a; month = +b; }
    }
    let hour = +hh;
    if (ampm) {
      const pm = /p/i.test(ampm);
      if (pm && hour < 12) hour += 12;
      if (!pm && hour === 12) hour = 0;
    }
    const at = new Date(year, month - 1, day, hour, +mm, ss ? +ss : 0);
    if (Number.isNaN(at.getTime())) continue;
    if (/omitted|محذوف|<Media/i.test(text)) continue;
    out.push({ at, sender: sender.replace(/^‎/, "").trim(), text: text.trim() });
  }
  return out;
}

// ---------- Metrics ----------

function median(values: number[]) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

/** Reply times per author: from the first message of a beneficiary's turn to the next human reply. */
export function replyTimes(db: DB, sinceMs: number) {
  const byAuthor = new Map<string, number[]>();
  const byBen = new Map<string, Message[]>();
  for (const m of db.messages) {
    if (!byBen.has(m.beneficiaryId)) byBen.set(m.beneficiaryId, []);
    byBen.get(m.beneficiaryId)!.push(m);
  }
  for (const list of byBen.values()) {
    list.sort((a, b) => a.at.localeCompare(b.at));
    let turnStart: Message | null = null;
    for (const m of list) {
      if (m.direction === "in") {
        if (!turnStart) turnStart = m;
      } else if (turnStart && m.authorId && m.kind !== "imported" && m.kind !== "lesson") {
        if (new Date(turnStart.at).getTime() >= sinceMs) {
          const h = (new Date(m.at).getTime() - new Date(turnStart.at).getTime()) / HOUR;
          if (!byAuthor.has(m.authorId)) byAuthor.set(m.authorId, []);
          byAuthor.get(m.authorId)!.push(h);
        }
        turnStart = null;
      }
    }
  }
  return byAuthor;
}

export function staffMetrics(db: DB, staff: User[], now = Date.now()) {
  const since = now - 30 * DAY;
  const replies = replyTimes(db, since);
  return staff.map((user) => {
    const mine = db.beneficiaries.filter((b) => b.assignedTo === user.id);
    const dueTasks = db.tasks.filter((t) => t.assigneeId === user.id && new Date(t.due).getTime() >= since && new Date(t.due).getTime() <= now);
    const onTime = dueTasks.filter((t) => t.doneAt && new Date(t.doneAt).getTime() <= new Date(t.due).getTime() + 12 * HOUR).length;
    const moves = mine.reduce((n, b) => n + b.stageHistory.filter((h) => h.stage !== "new" && new Date(h.at).getTime() >= since).length, 0);
    const conversions = db.beneficiaries.filter((b) => b.introducedBy === user.id && b.convertedAt && new Date(b.convertedAt).getTime() >= now - 90 * DAY).length;
    const learners = mine.filter((b) => b.stage === "muslim");
    const states = learners.map((b) => learnerState(db, b, now));
    const mature = learners.filter((b) => b.convertedAt && now - new Date(b.convertedAt).getTime() >= 21 * DAY);
    const matureActive = mature.filter((b) => learnerState(db, b, now).level !== "red").length;
    const sent = states.reduce((n, s) => n + s.events.length, 0);
    const completed = states.reduce((n, s) => n + s.completed, 0);
    return {
      user,
      firstResponseH: median(replies.get(user.id) ?? []),
      onTimePct: pct(onTime, dueTasks.length),
      load: mine.filter((b) => b.stage !== "closed").length,
      stageMoves: moves,
      conversions,
      learners: learners.length,
      completionPct: pct(completed, sent),
      retentionPct: pct(matureActive, mature.length),
      red: states.filter((s) => s.level === "red").length,
      yellow: states.filter((s) => s.level === "yellow").length,
      waiting: mine.filter((b) => awaitingReply(db, b)).length,
      overdue: db.tasks.filter((t) => t.assigneeId === user.id && !t.doneAt && new Date(t.due).getTime() < now).length,
    };
  });
}

export type StaffMetric = ReturnType<typeof staffMetrics>[number];

export function supervisorMetrics(db: DB, now = Date.now()) {
  return db.teams.map((team) => {
    const staff = db.users.filter((u) => u.teamId === team.id && isStaff(u));
    const loads = staff.filter((c) => c.status === "available").map((c) => activeLoad(db, c.id));
    const reds = db.beneficiaries
      .filter((b) => staff.some((c) => c.id === b.assignedTo) && b.stage === "muslim")
      .filter((b) => learnerState(db, b, now).level === "red");
    const untouched = reds.filter((b) => !db.messages.some((m) => m.beneficiaryId === b.id && m.direction === "out" && m.authorId && m.kind !== "lesson" && now - new Date(m.at).getTime() < 3 * DAY));
    const handovers = db.assignments.filter((a) => a.fromId && staff.some((c) => c.id === a.toId) && now - new Date(a.at).getTime() < 30 * DAY);
    const handoverOk = handovers.filter((a) =>
      db.messages.some((m) => m.beneficiaryId === a.beneficiaryId && m.authorId === a.toId && new Date(m.at).getTime() - new Date(a.at).getTime() < DAY && m.at >= a.at),
    ).length;
    const onLeaveWithCases = staff.filter((c) => c.status !== "available" && activeLoad(db, c.id) > 0);
    return {
      team,
      supervisor: db.users.find((u) => u.id === team.supervisorId)!,
      staff,
      balance: loads.length ? Math.max(...loads) - Math.min(...loads) : 0,
      reds: reds.length,
      untouchedReds: untouched.length,
      handovers: handovers.length,
      handoverPct: pct(handoverOk, handovers.length),
      onLeaveWithCases,
    };
  });
}

export function funnelMetrics(db: DB, list: Beneficiary[]) {
  const order: Stage[] = ["new", "contacted", "interested", "learning", "muslim"];
  const reached = (b: Beneficiary, s: Stage) => b.stageHistory.some((h) => h.stage === s);
  const counts = order.map((s) => ({ stage: s, reached: list.filter((b) => reached(b, s)).length, current: list.filter((b) => b.stage === s).length }));
  const conversions = order.slice(0, -1).map((s, i) => ({ from: s, to: order[i + 1], pct: pct(counts[i + 1].reached, counts[i].reached) }));
  const timeInStage = order.slice(0, -1).map((s) => {
    const durations: number[] = [];
    for (const b of list) {
      const i = b.stageHistory.findIndex((h) => h.stage === s);
      if (i >= 0 && b.stageHistory[i + 1]) durations.push((new Date(b.stageHistory[i + 1].at).getTime() - new Date(b.stageHistory[i].at).getTime()) / DAY);
    }
    return { stage: s, days: durations.length ? Math.round(durations.reduce((a, c) => a + c, 0) / durations.length) : null };
  });
  const sources = [...new Set(list.map((b) => b.source))]
    .map((source) => {
      const all = list.filter((b) => b.source === source);
      return { source, total: all.length, muslim: all.filter((b) => reached(b, "muslim")).length, pct: pct(all.filter((b) => reached(b, "muslim")).length, all.length) };
    })
    .sort((a, c) => (c.pct ?? 0) - (a.pct ?? 0));
  const objections = new Map<string, number>();
  list.forEach((b) => b.objections.forEach((o) => objections.set(o, (objections.get(o) ?? 0) + 1)));
  return { counts, conversions, timeInStage, sources, objections: [...objections.entries()].sort((a, c) => c[1] - a[1]) };
}

export function lessonStats(db: DB, lessonId: string, ids?: Set<string>) {
  const ev = db.events.filter((e) => e.lessonId === lessonId && (!ids || ids.has(e.beneficiaryId)));
  const completed = ev.filter((e) => e.completedAt);
  return {
    sent: ev.length,
    opened: ev.filter((e) => e.openedAt).length,
    completed: completed.length,
    completionPct: pct(completed.length, ev.length),
    wrongPct: pct(completed.filter((e) => e.correct === false).length, completed.length),
  };
}

export function learningMetrics(db: DB, list: Beneficiary[]) {
  const learners = list.filter((b) => b.stage === "muslim");
  const ids = new Set(learners.map((b) => b.id));
  const byId = new Map(learners.map((b) => [b.id, b]));
  const perLesson = trackLessons(db, "TR1").map((lesson) => ({ lesson, ...lessonStats(db, lesson.id, ids) }));
  const hours = new Map<number, { sent: number; quick: number }>();
  for (const e of db.events) {
    const b = byId.get(e.beneficiaryId);
    if (!b) continue;
    const h = localHour(e.sentAt, b.timezone);
    const bucket = hours.get(h) ?? { sent: 0, quick: 0 };
    bucket.sent++;
    if (e.openedAt && new Date(e.openedAt).getTime() - new Date(e.sentAt).getTime() <= 6 * HOUR) bucket.quick++;
    hours.set(h, bucket);
  }
  const byHour = [...hours.entries()].map(([hour, v]) => ({ hour, sent: v.sent, pct: pct(v.quick, v.sent) ?? 0 })).sort((a, c) => a.hour - c.hour);
  const states = learners.map((b) => learnerState(db, b));
  return {
    perLesson,
    byHour,
    levels: { green: states.filter((s) => s.level === "green").length, yellow: states.filter((s) => s.level === "yellow").length, red: states.filter((s) => s.level === "red").length },
    learners: states.length,
  };
}

export function platformMetrics(db: DB, now = Date.now()) {
  const people = db.users.filter((u) => u.role !== "admin");
  const active = db.beneficiaries.filter((b) => b.stage !== "closed");
  const complete = active.filter((b) => b.summary && (b.stage === "muslim" || openTasks(db, b.id).length > 0)).length;
  const failed = db.messages.filter((m) => m.direction === "out" && m.status === "sent" && now - new Date(m.at).getTime() > DAY).length;
  return {
    usage: people
      .map((u) => ({ user: u, lastSeenAt: u.lastSeenAt, daysAway: u.lastSeenAt ? (now - new Date(u.lastSeenAt).getTime()) / DAY : null }))
      .sort((a, c) => (c.daysAway ?? 99) - (a.daysAway ?? 99)),
    completePct: pct(complete, active.length),
    failed,
    messages30: db.messages.filter((m) => now - new Date(m.at).getTime() < 30 * DAY).length,
  };
}
