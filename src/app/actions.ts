"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BENEFICIARY_LINES, TEMPLATES, fillTemplate, guessCountryFromPhone, type TemplateId } from "@/lib/content";
import { missingLanguages } from "@/lib/curriculum";
import { loadDb, mutate, newId, readDb, resetDb } from "@/lib/db";
import {
  DAY,
  HOUR,
  buildSummary,
  canAct,
  endOfToday,
  canManageUser,
  canOpen,
  firstName,
  groupForMember,
  nextScheduled,
  suggestAssignee,
  windowOpen,
} from "@/lib/logic";
import { applyImport, guessBeneficiarySender, parseWhatsAppExport, stageShare, textFromFile } from "@/lib/chat-import";
import { AFTER_LOGIN_COOKIE, LANG_COOKIE, USER_COOKIE, getUiLang, requireUser } from "@/lib/session";
import { addDays, fromHijri, isoDay } from "@/lib/hijri";
import { CONVERTED, DEFAULT_RECONTACT_DAYS, FOLLOWUP_LABELS, applyHidayaLog, emptyHidaya, emptyMuslim, langCodeFor, langCodeOf, nextSerial, recontactDays } from "@/lib/programs";
import type { Beneficiary, DB, HidayaFollowup, Lang, Lesson, Message, Stage, StaffRole, Touch, TouchKind, User, Weekday } from "@/lib/types";
import { HIDAYA_FOLLOWUPS, LANGS, LIST_KEYS, MUSLIM_LESSONS, STAGES, TOUCH_KINDS } from "@/lib/types";

function audit(db: DB, user: User | null, action: string, target: string) {
  db.audit.unshift({ id: newId("AU"), userId: user?.id ?? "beneficiary", action, target, at: new Date().toISOString() });
  db.audit.length = Math.min(db.audit.length, 500);
}

function getBeneficiary(db: DB, user: User, id: string, write = true): Beneficiary {
  const b = db.beneficiaries.find((x) => x.id === id);
  if (!b || !canOpen(db, user, b) || (write && !canAct(db, user, b))) throw new Error("Not allowed");
  return b;
}

function refresh() {
  revalidatePath("/", "layout");
}

/** Back to the page the action came from, with a notice in the URL. */
async function backWith(params: Record<string, string | number>, fallback = "/") {
  const ref = (await headers()).get("referer");
  const url = new URL(ref ?? fallback, "http://local");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}

// ---------- Session ----------

export async function login(formData: FormData) {
  const id = String(formData.get("userId"));
  const user = (await loadDb()).users.find((u) => u.id === id);
  if (!user) return;
  const jar = await cookies();
  // Stay signed in on the phone, so chats shared from WhatsApp land straight in the platform.
  jar.set(USER_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 86_400 });
  await mutate((db) => {
    const u = db.users.find((x) => x.id === id)!;
    u.lastSeenAt = new Date().toISOString();
  });
  const next = jar.get(AFTER_LOGIN_COOKIE)?.value;
  jar.delete(AFTER_LOGIN_COOKIE);
  redirect(next?.startsWith("/share/") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(USER_COOKIE);
  redirect("/login");
}

export async function toggleLang() {
  const current = await getUiLang();
  (await cookies()).set(LANG_COOKIE, current === "ar" ? "en" : "ar", { sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

export async function resetDemo() {
  const user = await requireUser();
  if (user.role !== "admin") return;
  await resetDb();
  refresh();
  redirect("/");
}

// ---------- Messaging ----------

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (!windowOpen(db, b)) throw new Error("24h window closed: use a template");
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text, translation: null, at: new Date().toISOString(), authorId: user.id, status: "sent", kind: "text" });
    audit(db, user, "send_message", b.id);
  });
  refresh();
}

export async function sendTemplate(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const templateId = String(formData.get("templateId")) as TemplateId;
  const tpl = TEMPLATES[templateId];
  if (!tpl || templateId.startsWith("lesson")) return;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const vars = { name: firstName(b), caller: user.name.split(" ")[0] };
    db.messages.push({
      id: newId("M"),
      beneficiaryId: b.id,
      direction: "out",
      text: fillTemplate(tpl[b.language], vars),
      translation: fillTemplate(tpl.ar, vars),
      at: new Date().toISOString(),
      authorId: user.id,
      status: "sent",
      kind: "template",
    });
    audit(db, user, `send_template:${templateId}`, b.id);
  });
  refresh();
}

/** Demo only: plays the beneficiary's side of the conversation. */
export async function simulateReply(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const line = BENEFICIARY_LINES[1 + Math.floor(Math.random() * (BENEFICIARY_LINES.length - 1))];
    db.messages.forEach((m) => {
      if (m.beneficiaryId === b.id && m.direction === "out") m.status = "read";
    });
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "in", text: line[b.language], translation: line.ar, at: new Date().toISOString(), authorId: null, status: null, kind: "text" });
  });
  refresh();
}

// ---------- Lessons on WhatsApp ----------

/** Sends the learner's next item now: their next lesson, or a reminder for the one still open. */
function sendNext(db: DB, user: User, b: Beneficiary): boolean {
  const item = nextScheduled(db, b, Date.now() - 30 * DAY);
  if (!item) return false;
  const now = new Date().toISOString();
  const lesson = item.lesson;
  const vars = { name: firstName(b), title: lesson.title[b.language] ?? lesson.title.en, link: "{link}" };
  if (item.kind === "reminder" && item.event) {
    const tpl = TEMPLATES.lesson_reminder;
    item.event.remindedAt = now;
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(tpl[b.language], vars), translation: fillTemplate(tpl.ar, { ...vars, title: lesson.title.ar }), at: now, authorId: user.id, status: "sent", kind: "lesson", eventId: item.event.id });
    audit(db, user, "send_reminder", b.id);
    return true;
  }
  const eventId = `ev_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  db.events.push({ id: eventId, beneficiaryId: b.id, lessonId: lesson.id, sentAt: now, sentBy: user.id, remindedAt: null, openedAt: null, completedAt: null, correct: null });
  const tpl = TEMPLATES.lesson_ready;
  db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(tpl[b.language], vars), translation: fillTemplate(tpl.ar, { ...vars, title: lesson.title.ar }), at: now, authorId: user.id, status: "sent", kind: "lesson", eventId });
  audit(db, user, `send_lesson:${lesson.id}`, b.id);
  return true;
}

export async function sendLessonNow(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  let sent = 0;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (sendNext(db, user, b)) sent = 1;
  });
  refresh();
  await backWith({ sent });
}

export async function sendGroupNow(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId"));
  let sent = 0;
  await mutate((db) => {
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) return;
    for (const b of db.beneficiaries.filter((x) => x.groupId === groupId)) {
      if (!canOpen(db, user, b) || !canAct(db, user, b)) continue;
      if (sendNext(db, user, b)) sent++;
    }
  });
  refresh();
  await backWith({ sent });
}

/** Sends one specific lesson from the library to one learner. */
export async function sendSpecificLesson(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const lessonId = String(formData.get("lessonId"));
  let sent = 0;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const lesson = db.lessons.find((l) => l.id === lessonId && l.status === "ready");
    if (!lesson) return;
    const now = new Date().toISOString();
    const eventId = `ev_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    db.events.push({ id: eventId, beneficiaryId: b.id, lessonId, sentAt: now, sentBy: user.id, remindedAt: null, openedAt: null, completedAt: null, correct: null });
    const tpl = TEMPLATES.lesson_ready;
    const vars = { name: firstName(b), title: lesson.title[b.language] ?? lesson.title.en, link: "{link}" };
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(tpl[b.language], vars), translation: fillTemplate(tpl.ar, { ...vars, title: lesson.title.ar }), at: now, authorId: user.id, status: "sent", kind: "lesson", eventId });
    audit(db, user, `send_lesson:${lessonId}`, b.id);
    sent = 1;
  });
  refresh();
  await backWith({ sent });
}

// ---------- The learner's lesson page (no login) ----------

export async function learnerOpened(eventId: string) {
  await mutate((db) => {
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev || ev.openedAt) return;
    ev.openedAt = new Date().toISOString();
    db.messages.forEach((m) => {
      if (m.eventId === eventId) m.status = "read";
    });
  });
  refresh();
}

export async function learnerAnswer(formData: FormData) {
  const eventId = String(formData.get("eventId"));
  const answer = formData.get("answer") === "yes";
  await mutate((db) => {
    const ev = db.events.find((e) => e.id === eventId);
    if (!ev || ev.completedAt) return;
    const lesson = db.lessons.find((l) => l.id === ev.lessonId);
    const now = new Date().toISOString();
    ev.openedAt ??= now;
    ev.completedAt = now;
    ev.correct = lesson ? lesson.answer === answer : null;
    audit(db, null, "lesson_completed", ev.beneficiaryId);
  });
  refresh();
  redirect(`/l/${eventId}`);
}

/** The learner taps "ask my teacher": the question lands in the chat, then WhatsApp opens. */
export async function learnerAsk(formData: FormData) {
  const eventId = String(formData.get("eventId"));
  let text = "";
  await mutate((db) => {
    const ev = db.events.find((e) => e.id === eventId);
    const b = ev && db.beneficiaries.find((x) => x.id === ev.beneficiaryId);
    const lesson = ev && db.lessons.find((l) => l.id === ev.lessonId);
    if (!ev || !b || !lesson) return;
    const line = BENEFICIARY_LINES[3];
    text = `${line[b.language]} (${lesson.title[b.language] ?? lesson.title.en})`;
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "in", text, translation: `${line.ar} (${lesson.title.ar})`, at: new Date().toISOString(), authorId: null, status: null, kind: "text" });
  });
  refresh();
  redirect(`https://wa.me/966500000000?text=${encodeURIComponent(text)}`);
}

// ---------- Lesson library ----------

function canEditLessons(user: User) {
  return user.role !== "caller";
}

export async function saveLesson(formData: FormData) {
  const user = await requireUser();
  if (!canEditLessons(user)) throw new Error("Not allowed");
  const id = String(formData.get("lessonId") ?? "");
  const trackId = String(formData.get("trackId") ?? "TR1");
  const read = (field: string, lang: string) => String(formData.get(`${field}_${lang}`) ?? "").trim();
  let savedId = id;
  await mutate((db) => {
    let lesson = db.lessons.find((l) => l.id === id);
    if (!lesson) {
      const order = Math.max(0, ...db.lessons.filter((l) => l.trackId === trackId).map((l) => l.order)) + 1;
      lesson = { id: newId("L"), trackId, order, status: "draft", title: { ar: "", en: "" }, point: { ar: "", en: "" }, question: { ar: "", en: "" }, practice: { ar: "", en: "" }, answer: true, audioSec: 0, updatedAt: "", updatedBy: "" };
      db.lessons.push(lesson);
      savedId = lesson.id;
    }
    for (const field of ["title", "point", "question", "practice"] as const) {
      for (const lang of ["ar", "en", ...LANGS]) {
        if (formData.has(`${field}_${lang}`)) (lesson[field] as Record<string, string>)[lang] = read(field, lang);
      }
    }
    if (formData.has("answer")) lesson.answer = formData.get("answer") === "yes";
    lesson.updatedAt = new Date().toISOString();
    lesson.updatedBy = user.id;
    // An approved lesson that loses a translation goes back to draft.
    if (lesson.status === "ready" && missingLanguages(lesson, LANGS).length) lesson.status = "draft";
    audit(db, user, "save_lesson", lesson.id);
  });
  refresh();
  const tab = String(formData.get("tab") ?? "");
  redirect(`/lessons/${savedId}?saved=1${tab ? `&l=${encodeURIComponent(tab)}` : ""}`);
}

export async function setLessonStatus(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "supervisor" && user.role !== "admin") throw new Error("Not allowed");
  const id = String(formData.get("lessonId"));
  const status = String(formData.get("status")) as Lesson["status"];
  await mutate((db) => {
    const lesson = db.lessons.find((l) => l.id === id);
    if (!lesson) return;
    if (status === "ready" && missingLanguages(lesson, LANGS).length) return;
    lesson.status = status;
    lesson.updatedAt = new Date().toISOString();
    lesson.updatedBy = user.id;
    audit(db, user, `lesson_status:${status}`, lesson.id);
  });
  refresh();
}

/** Demo stand-in for recording or uploading the voice note. */
export async function recordVoice(formData: FormData) {
  const user = await requireUser();
  if (!canEditLessons(user)) throw new Error("Not allowed");
  const id = String(formData.get("lessonId"));
  await mutate((db) => {
    const lesson = db.lessons.find((l) => l.id === id);
    if (!lesson) return;
    lesson.audioSec = 60 + Math.floor(Math.random() * 60);
    lesson.updatedAt = new Date().toISOString();
    lesson.updatedBy = user.id;
  });
  refresh();
}

// ---------- Groups ----------

export async function updateGroupSchedule(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId"));
  await mutate((db) => {
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) return;
    const owner = db.users.find((u) => u.id === group.ownerId);
    if (!owner || (owner.id !== user.id && !canManageUser(db, user, owner))) throw new Error("Not allowed");
    group.schedule.days = formData.getAll("days").map(Number).filter((d) => d >= 0 && d <= 6) as Weekday[];
    const hour = String(formData.get("hour") ?? "");
    group.schedule.hour = hour === "" ? null : Math.max(0, Math.min(23, Number(hour)));
    group.schedule.paused = formData.get("paused") === "on";
    const name = String(formData.get("name") ?? "").trim();
    if (name) group.name = name;
    audit(db, user, "update_group", group.id);
  });
  refresh();
  await backWith({ saved: 1 });
}

export async function moveToGroup(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const groupId = String(formData.get("groupId"));
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const group = db.groups.find((g) => g.id === groupId);
    if (!group || group.ownerId !== b.assignedTo) return;
    b.groupId = group.id;
    audit(db, user, "move_group", b.id);
  });
  refresh();
}

// ---------- File ----------

export async function addNote(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id, false);
    db.notes.push({ id: newId("N"), beneficiaryId: b.id, authorId: user.id, text, at: new Date().toISOString(), needsContact: formData.get("needsContact") === "on" });
    audit(db, user, "add_note", b.id);
  });
  refresh();
}

export async function addTask(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due") ?? "");
  if (!title || !due) return;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    db.tasks.push({ id: newId("TK"), beneficiaryId: b.id, assigneeId: b.assignedTo, title, kind: "followup", due: new Date(due).toISOString(), createdAt: new Date().toISOString(), doneAt: null });
    audit(db, user, "add_task", b.id);
  });
  refresh();
}

export async function completeTask(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId"));
  await mutate((db) => {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return;
    getBeneficiary(db, user, task.beneficiaryId);
    task.doneAt = new Date().toISOString();
    audit(db, user, "complete_task", task.beneficiaryId);
  });
  refresh();
}

/** Moving someone to "embraced Islam" hands them to a teacher and their learning circle. */
function handToTeacher(db: DB, user: User, b: Beneficiary) {
  const caller = db.users.find((u) => u.id === b.assignedTo);
  const teacher = suggestAssignee(db, b, "teacher", [], caller?.teamId);
  if (!teacher) return null;
  const now = new Date();
  let group = groupForMember(db, teacher.id, "learning", b.language);
  if (!group) {
    group = { id: newId("G"), name: `حلقة جديدة · ${b.language}`, ownerId: teacher.id, kind: "learning", language: b.language, trackId: "TR1", schedule: { days: [0, 3], hour: null, paused: false }, createdAt: now.toISOString() };
    db.groups.push(group);
  }
  db.assignments.push({ id: newId("A"), beneficiaryId: b.id, fromId: b.assignedTo, toId: teacher.id, byId: user.id, reason: "انتقل إلى التعليم بعد إسلامه", at: now.toISOString() });
  b.introducedBy = b.assignedTo;
  b.assignedTo = teacher.id;
  b.groupId = group.id;
  const tpl = TEMPLATES.new_caller;
  const vars = { name: firstName(b), caller: teacher.name.split(" ")[0] };
  db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(tpl[b.language], vars), translation: fillTemplate(tpl.ar, vars), at: now.toISOString(), authorId: teacher.id, status: "sent", kind: "template" });
  for (const day of [14, 30, 90]) {
    db.tasks.push({ id: newId("TK"), beneficiaryId: b.id, assigneeId: teacher.id, title: `اطمئنان بعد ${day} يومًا من الإسلام`, kind: "checkin", due: new Date(now.getTime() + day * DAY).toISOString(), createdAt: now.toISOString(), doneAt: null });
  }
  db.tasks.forEach((t) => {
    if (t.beneficiaryId === b.id && !t.doneAt && t.assigneeId === b.introducedBy) t.doneAt = now.toISOString();
  });
  return { teacher, group };
}

export async function changeStage(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const stage = String(formData.get("stage")) as Stage;
  if (!STAGES.includes(stage)) return;
  let moved: { teacher: string; group: string } | null = null;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (b.stage === stage) return;
    const now = new Date();
    b.stage = stage;
    b.stageHistory.push({ stage, at: now.toISOString() });
    if (stage === "muslim" && b.program !== "muslim") {
      const result = convertToMuslim(db, user, b, isoDay(now));
      if (result) moved = { teacher: result.teacher.name, group: result.group.name };
    }
    audit(db, user, `stage:${stage}`, b.id);
  });
  refresh();
  if (moved) {
    const m = moved as { teacher: string; group: string };
    redirect(`/beneficiaries/${id}?movedTo=${encodeURIComponent(m.teacher)}&group=${encodeURIComponent(m.group)}`);
  }
}

export async function regenerateSummary(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const lang = await getUiLang();
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    b.summary = { text: buildSummary(db, b, lang), generatedAt: new Date().toISOString(), reviewed: false };
  });
  refresh();
}

export async function markSummaryReviewed(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const text = String(formData.get("text") ?? "").trim();
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (!b.summary) return;
    if (text) b.summary.text = text;
    b.summary.reviewed = true;
    audit(db, user, "review_summary", b.id);
  });
  refresh();
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    b.background = String(formData.get("background") ?? b.background);
    b.needs = String(formData.get("needs") ?? b.needs);
    b.objections = String(formData.get("objections") ?? "").split(/[،,]/).map((s) => s.trim()).filter(Boolean);
    const hour = Number(formData.get("preferredHour"));
    if (hour >= 0 && hour < 24) b.preferredHour = hour;
    b.sensitive = formData.get("sensitive") === "on";
    audit(db, user, "update_profile", b.id);
  });
  refresh();
}

// ---------- The association's files: هداية and المسلم الجديد ----------

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Reads a date entered as Hijri day / month / year (fields `<name>_d`, `_m`, `_y`). */
function readHijri(fd: FormData, name: string): string | null {
  const d = Number(fd.get(`${name}_d`));
  const m = Number(fd.get(`${name}_m`));
  const y = Number(fd.get(`${name}_y`));
  if (!d || !m || !y) return null;
  return fromHijri(d, m, y) ?? fromHijri(d - 1, m, y);
}

/** Fields both sheets share. */
function readCommon(fd: FormData, b: Beneficiary) {
  const name = str(fd, "name");
  if (name) b.name = name;
  const phone = str(fd, "phone");
  if (phone) b.phone = phone;
  b.city = str(fd, "city");
  b.workplace = str(fd, "workplace");
  b.profession = str(fd, "profession");
  b.nationality = str(fd, "nationality");
  const languageLabel = str(fd, "languageLabel");
  if (languageLabel) {
    b.languageLabel = languageLabel;
    b.language = langCodeFor(languageLabel, b.language);
  }
  const gender = str(fd, "gender");
  if (gender === "m" || gender === "f") b.gender = gender;
}

function blankBeneficiary(db: DB, user: User, program: "hidaya" | "muslim"): Beneficiary {
  const id = `B-${1000 + db.beneficiaries.length + 1}`;
  const now = new Date().toISOString();
  return {
    id,
    program,
    city: "",
    workplace: "",
    profession: "",
    nationality: "",
    languageLabel: "",
    hidaya: null,
    muslim: null,
    name: "",
    alias: id,
    gender: user.gender,
    language: user.languages[0] ?? "hi",
    country: "SA",
    timezone: "Asia/Riyadh",
    phone: "",
    preferredHour: 19,
    stage: program === "muslim" ? "muslim" : "new",
    stageHistory: [{ stage: program === "muslim" ? "muslim" : "new", at: now }],
    assignedTo: user.id,
    introducedBy: null,
    groupId: null,
    sensitive: false,
    background: "",
    needs: "",
    objections: [],
    source: "",
    createdAt: now,
    convertedAt: program === "muslim" ? now : null,
    summary: null,
    optedOut: false,
  };
}

function staffPick(db: DB, user: User, id: string, role: StaffRole | null) {
  const u = db.users.find((x) => x.id === id && (role ? x.role === role : x.role === "caller" || x.role === "teacher"));
  if (!u) return null;
  if (user.role === "admin" || u.id === user.id) return u;
  if (user.role === "supervisor" && u.teamId === user.teamId) return u;
  return null;
}

function duplicateOf(db: DB, phone: string, except?: string) {
  const digits = (s: string) => s.replace(/\D/g, "").replace(/^(966|0)/, "");
  const p = digits(phone);
  return p.length >= 7 ? db.beneficiaries.find((x) => x.id !== except && digits(x.phone) === p) : undefined;
}

export async function addHidaya(formData: FormData) {
  const user = await requireUser();
  if (!str(formData, "name")) return;
  const dup = duplicateOf(readDb(), str(formData, "phone"));
  if (dup) redirect(`/hidaya/new?dup=${encodeURIComponent(dup.sensitive ? dup.alias : dup.name)}&dupId=${dup.id}`);
  let id = "";
  await mutate((db) => {
    const b = blankBeneficiary(db, user, "hidaya");
    readCommon(formData, b);
    const owner = staffPick(db, user, str(formData, "assignedTo"), "caller") ?? (user.role === "caller" ? user : suggestAssignee(db, b, "caller", [], user.teamId) ?? user);
    b.assignedTo = owner.id;
    if (owner.languages.length && !langCodeOf(b.languageLabel)) b.language = owner.languages[0];
    b.hidaya = emptyHidaya(nextSerial(db, "hidaya"));
    readHidayaFields(formData, b, user);
    b.hidaya.firstContact = readHijri(formData, "firstContact") ?? b.hidaya.firstContact;
    b.groupId = groupForMember(db, owner.id, "dawah", b.language)?.id ?? null;
    db.beneficiaries.push(b);
    db.assignments.push({ id: newId("A"), beneficiaryId: b.id, fromId: null, toId: owner.id, byId: user.id, reason: "إسناد أولي", at: b.createdAt });
    id = b.id;
    audit(db, user, "add_hidaya", b.id);
  });
  refresh();
  redirect(`/hidaya/${id}?added=1`);
}

function readHidayaFields(fd: FormData, b: Beneficiary, user: User) {
  const h = b.hidaya!;
  if (fd.has("source")) h.source = str(fd, "source");
  if (fd.has("result") && h.result !== CONVERTED) h.result = str(fd, "result");
  if (fd.has("religion")) h.religion = str(fd, "religion");
  if (fd.has("doubts")) h.doubts = str(fd, "doubts");
  if (fd.has("interests")) h.interests = str(fd, "interests");
  if (fd.has("visits")) h.visits = Math.max(0, Math.round(Number(fd.get("visits")) || 0));
  if (fd.has("followupForm")) for (const k of HIDAYA_FOLLOWUPS) h.followup[k] = fd.get(`f_${k}`) === "on";
  if (fd.has("category")) setCategory(h, str(fd, "category"), user);
}

function setCategory(h: NonNullable<Beneficiary["hidaya"]>, value: string, user: User) {
  if (value === h.category) return;
  h.category = value;
  if (value) h.categoryHistory.push({ value, at: new Date().toISOString(), by: user.id });
}

export async function updateHidaya(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "beneficiaryId");
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (!b.hidaya) return;
    readCommon(formData, b);
    readHidayaFields(formData, b, user);
    if (formData.has("firstContact_y")) b.hidaya.firstContact = readHijri(formData, "firstContact");
    if (formData.has("lastContact_y")) b.hidaya.lastContact = readHijri(formData, "lastContact");
    if (formData.has("nextContact_y")) b.hidaya.nextContact = readHijri(formData, "nextContact");
    const owner = formData.has("assignedTo") ? staffPick(db, user, str(formData, "assignedTo"), null) : null;
    if (owner && owner.id !== b.assignedTo && b.program === "hidaya") {
      db.assignments.push({ id: newId("A"), beneficiaryId: b.id, fromId: b.assignedTo, toId: owner.id, byId: user.id, reason: "تغيير الداعية المتابع", at: new Date().toISOString() });
      b.assignedTo = owner.id;
    }
    audit(db, user, "update_hidaya", b.id);
  });
  refresh();
  await backWith({ saved: 1 }, `/hidaya/${id}`);
}

/** Classification only, from the file header or the follow-up list. */
export async function setHidayaCategory(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "beneficiaryId");
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (b.hidaya) setCategory(b.hidaya, str(formData, "category"), user);
  });
  refresh();
}

/** One contact: a call, books, a visit or a gift, with an optional note and the next date. */
export async function logHidaya(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "beneficiaryId");
  const kind = str(formData, "kind") as HidayaFollowup;
  if (!HIDAYA_FOLLOWUPS.includes(kind)) return;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (!b.hidaya) return;
    const now = new Date();
    const day = isoDay(now);
    const note = str(formData, "note");
    db.hidayaLogs.push({ id: newId("HL"), beneficiaryId: b.id, userId: user.id, kind, at: now.toISOString(), note });
    applyHidayaLog(db, b, kind, day);
    const result = str(formData, "result");
    if (result && b.hidaya.result !== CONVERTED) b.hidaya.result = result;
    const next = readHijri(formData, "nextContact");
    b.hidaya.nextContact = next ?? (b.hidaya.nextContact && b.hidaya.nextContact > day ? b.hidaya.nextContact : addDays(day, recontactDays(db, b.hidaya.category)));
    if (note) db.notes.push({ id: newId("N"), beneficiaryId: b.id, authorId: user.id, text: `${FOLLOWUP_LABELS[kind].ar}: ${note}`, at: now.toISOString(), needsContact: false });
    // A contact settles today's follow-up tasks for this person.
    const eod = endOfToday(now);
    db.tasks.forEach((t) => {
      if (t.beneficiaryId === b.id && !t.doneAt && new Date(t.due).getTime() <= eod) t.doneAt = now.toISOString();
    });
    audit(db, user, `hidaya:${kind}`, b.id);
  });
  refresh();
  await backWith({ logged: kind }, `/hidaya/${id}`);
}

export async function undoHidayaLog(formData: FormData) {
  const user = await requireUser();
  const logId = str(formData, "logId");
  await mutate((db) => {
    const log = db.hidayaLogs.find((l) => l.id === logId);
    if (!log || log.userId !== user.id || Date.now() - new Date(log.at).getTime() > 10 * 60_000) return;
    db.hidayaLogs = db.hidayaLogs.filter((l) => l.id !== logId);
    const b = db.beneficiaries.find((x) => x.id === log.beneficiaryId);
    if (!b?.hidaya) return;
    if (log.kind === "visit") b.hidaya.visits = Math.max(0, b.hidaya.visits - 1);
    const rest = db.hidayaLogs.filter((l) => l.beneficiaryId === b.id);
    b.hidaya.followup[log.kind] = rest.some((l) => l.kind === log.kind);
    b.hidaya.lastContact = rest.length ? isoDay(rest[rest.length - 1].at) : null;
  });
  refresh();
}

/** Embraced Islam: the هداية file stays with the result «أسلم» and a new Muslim file opens. */
function convertToMuslim(db: DB, user: User, b: Beneficiary, islamDay: string) {
  const now = new Date();
  b.program = "muslim";
  if (b.stage !== "muslim") {
    b.stage = "muslim";
    b.stageHistory.push({ stage: "muslim", at: now.toISOString() });
  }
  b.convertedAt = b.convertedAt ?? now.toISOString();
  if (b.hidaya) b.hidaya.result = CONVERTED;
  if (!b.muslim) b.muslim = emptyMuslim(nextSerial(db, "muslim"), islamDay);
  else b.muslim.islamDate = islamDay;
  const result = handToTeacher(db, user, b);
  if (!result && !b.introducedBy) b.introducedBy = b.assignedTo;
  return result;
}

export async function convertHidaya(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "beneficiaryId");
  const day = readHijri(formData, "islamDate") ?? isoDay();
  let teacher = "";
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (b.program !== "hidaya") return;
    const res = convertToMuslim(db, user, b, day);
    teacher = res?.teacher.name ?? "";
    audit(db, user, "convert", b.id);
  });
  refresh();
  redirect(`/beneficiaries/${id}?converted=1${teacher ? `&movedTo=${encodeURIComponent(teacher)}` : ""}`);
}

/** A new Muslim added directly, without going through هداية. */
export async function addMuslim(formData: FormData) {
  const user = await requireUser();
  if (!str(formData, "name")) return;
  const dup = duplicateOf(readDb(), str(formData, "phone"));
  if (dup) redirect(`/beneficiaries/new?dup=${encodeURIComponent(dup.sensitive ? dup.alias : dup.name)}&dupId=${dup.id}`);
  let id = "";
  await mutate((db) => {
    const b = blankBeneficiary(db, user, "muslim");
    readCommon(formData, b);
    const follower = staffPick(db, user, str(formData, "assignedTo"), null) ?? suggestAssignee(db, b, "teacher", [], user.teamId) ?? user;
    const caller = staffPick(db, user, str(formData, "introducedBy"), null) ?? db.users.find((u) => u.id === str(formData, "introducedBy")) ?? null;
    b.assignedTo = follower.id;
    b.introducedBy = caller?.id ?? null;
    if (!langCodeOf(b.languageLabel) && follower.languages.length) b.language = follower.languages[0];
    const day = readHijri(formData, "islamDate") ?? isoDay();
    b.convertedAt = new Date(`${day}T12:00:00Z`).toISOString();
    b.muslim = emptyMuslim(nextSerial(db, "muslim"), day);
    readMuslimFields(formData, b);
    b.groupId = groupForMember(db, follower.id, "learning", b.language)?.id ?? null;
    db.beneficiaries.push(b);
    db.assignments.push({ id: newId("A"), beneficiaryId: b.id, fromId: null, toId: follower.id, byId: user.id, reason: "إسناد أولي", at: b.createdAt });
    id = b.id;
    audit(db, user, "add_muslim", b.id);
  });
  refresh();
  redirect(`/beneficiaries/${id}?added=1`);
}

function readMuslimFields(fd: FormData, b: Beneficiary) {
  const m = b.muslim!;
  for (const k of ["iqama", "sponsorName", "sponsorPhone", "status", "contactMethod"] as const) if (fd.has(k)) m[k] = str(fd, k);
  if (fd.has("lessonsForm")) {
    m.lessons = m.lessons.map((_, i) => fd.get(`lesson_${i + 1}`) === "on");
    m.certificate = fd.get("certificate") === "on";
  }
}

export async function updateMuslim(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "beneficiaryId");
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (!b.muslim) return;
    readCommon(formData, b);
    readMuslimFields(formData, b);
    if (formData.has("islamDate_y")) {
      const day = readHijri(formData, "islamDate");
      if (day) {
        b.muslim.islamDate = day;
        b.convertedAt = new Date(`${day}T12:00:00Z`).toISOString();
      }
    }
    if (formData.has("introducedBy")) b.introducedBy = db.users.find((u) => u.id === str(formData, "introducedBy"))?.id ?? b.introducedBy;
    const follower = formData.has("assignedTo") ? staffPick(db, user, str(formData, "assignedTo"), null) : null;
    if (follower && follower.id !== b.assignedTo) {
      db.assignments.push({ id: newId("A"), beneficiaryId: b.id, fromId: b.assignedTo, toId: follower.id, byId: user.id, reason: "تغيير المتابع", at: new Date().toISOString() });
      b.assignedTo = follower.id;
    }
    audit(db, user, "update_muslim", b.id);
  });
  refresh();
  await backWith({ saved: 1 }, `/beneficiaries/${id}`);
}

/** Tick or untick one of the 18 lessons from the file. */
export async function toggleMuslimLesson(formData: FormData) {
  const user = await requireUser();
  const id = str(formData, "beneficiaryId");
  const n = Number(formData.get("lesson"));
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (!b.muslim) return;
    if (n === 0) b.muslim.certificate = !b.muslim.certificate;
    else if (n >= 1 && n <= MUSLIM_LESSONS) b.muslim.lessons[n - 1] = !b.muslim.lessons[n - 1];
    if (b.muslim.lessons.some((x) => !x)) b.muslim.certificate = false;
  });
  refresh();
}

export async function saveLists(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Not allowed");
  await mutate((db) => {
    for (const k of LIST_KEYS) {
      const items = [...new Set(String(formData.get(k) ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean))];
      if (items.length) db.settings.lists[k] = items;
    }
    const days: Record<string, number> = {};
    for (const c of db.settings.lists.category) {
      const n = Math.round(Number(formData.get(`days_${c}`)));
      days[c] = Number.isFinite(n) && n >= 1 && n <= 365 ? n : db.settings.recontactDays[c] ?? DEFAULT_RECONTACT_DAYS;
    }
    db.settings.recontactDays = days;
    audit(db, user, "lists", "settings");
  });
  refresh();
  redirect("/lists?saved=1");
}

export async function importChat(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const file = formData.get("file");
  const pasted = String(formData.get("raw") ?? "");
  const raw = file instanceof File && file.size ? await textFromFile(file) : pasted;
  const lines = parseWhatsAppExport(raw);
  const added = await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const them = guessBeneficiarySender(lines, b, db.users.find((u) => u.id === b.assignedTo) ?? null);
    if (!them) return 0;
    const n = applyImport(db, user, b, lines, them, file instanceof File && file.size ? "file" : "paste");
    audit(db, user, `import_chat:${n}`, b.id);
    return n;
  });
  refresh();
  redirect(`/beneficiaries/${id}?imported=${added}${lines.length ? "" : "&unreadable=1"}`);
}

/** Saves a chat shared from the phone to the file the staff member picked. */
export async function importShared(formData: FormData) {
  const user = await requireUser();
  const shareId = String(formData.get("shareId"));
  const id = String(formData.get("otherBeneficiaryId") || formData.get("beneficiaryId") || "");
  const them = String(formData.get("them") ?? "");
  if (!id) return;
  const added = await mutate((db) => {
    const share = db.shares.find((s) => s.id === shareId);
    if (!share) return null;
    const b = getBeneficiary(db, user, id);
    const lines = parseWhatsAppExport(share.text);
    let n = 0;
    if (lines.length) {
      n = applyImport(db, user, b, lines, them || guessBeneficiarySender(lines, b, user) || "", "share");
    } else {
      // Plain text without WhatsApp dates: keep it as a note rather than losing it.
      db.notes.push({ id: newId("N"), beneficiaryId: b.id, authorId: user.id, text: share.text.slice(0, 2000), at: new Date().toISOString(), needsContact: false });
      n = -1;
    }
    db.shares = db.shares.filter((s) => s.id !== shareId);
    audit(db, user, n < 0 ? "share_as_note" : `import_share:${n}`, b.id);
    return n;
  });
  refresh();
  if (added === null) redirect("/share");
  redirect(`/beneficiaries/${id}?${added < 0 ? "noted=1" : `imported=${added}`}`);
}

export async function discardShare(formData: FormData) {
  await requireUser();
  const shareId = String(formData.get("shareId"));
  await mutate((db) => {
    db.shares = db.shares.filter((s) => s.id !== shareId);
  });
  redirect("/share");
}

/** Pasted text from the "add a chat" page becomes a share, then follows the same steps. */
export async function stagePaste(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file");
  const text = file instanceof File && file.size ? await textFromFile(file) : String(formData.get("raw") ?? "");
  if (!text.trim()) redirect("/share");
  const id = await mutate((db) => stageShare(db, text, file instanceof File && file.size ? file.name : null, user.id));
  redirect(`/share/${id}`);
}

// ---------- Sending from the staff member's own WhatsApp ----------

/**
 * Records a message the staff member is sending from their own WhatsApp (the platform opened
 * WhatsApp with the text ready). A lesson message also creates the lesson link it carries.
 */
export async function recordPhoneSend(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const text = String(formData.get("text") ?? "").trim();
  const option = String(formData.get("option") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  if (!text) return;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const now = new Date().toISOString();
    let stored = text;
    let kind: Message["kind"] = option === "checkin" || option === "followup" ? "template" : "text";
    let linkedEvent: string | undefined;
    if ((option === "lesson" || option === "reminder") && /^ev_[a-z0-9]{10,16}$/.test(eventId) && text.includes(`/l/${eventId}`)) {
      let event = db.events.find((e) => e.id === eventId);
      if (!event && option === "lesson" && db.lessons.some((l) => l.id === lessonId)) {
        event = { id: eventId, beneficiaryId: b.id, lessonId, sentAt: now, sentBy: user.id, remindedAt: null, openedAt: null, completedAt: null, correct: null };
        db.events.push(event);
      }
      if (event && event.beneficiaryId === b.id) {
        if (option === "reminder") event.remindedAt = now;
        stored = text.replace(new RegExp(String.raw`\S*/l/${eventId}`), "{link}");
        kind = "lesson";
        linkedEvent = event.id;
      }
    }
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text: stored, translation: null, at: now, authorId: user.id, status: null, kind, eventId: linkedEvent, via: "phone" });
    if (b.stage === "new") {
      b.stage = "contacted";
      b.stageHistory.push({ stage: "contacted", at: now });
    }
    // Writing to them settles today's follow-ups, as a logged contact does.
    const eod = endOfToday(new Date());
    db.tasks.filter((t) => t.beneficiaryId === b.id && !t.doneAt && new Date(t.due).getTime() <= eod).forEach((t) => (t.doneAt = now));
    audit(db, user, `phone_send:${option}`, b.id);
  });
  refresh();
}

// ---------- Contact log ----------

/**
 * One tap after talking to someone outside the platform. A first chat or call moves a new
 * person to "contacted", and no answer puts a follow-up on tomorrow's list.
 */
export async function logTouch(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const kind = String(formData.get("kind")) as TouchKind;
  if (!TOUCH_KINDS.includes(kind)) return;
  await mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const now = new Date();
    const touch: Touch = { id: newId("TO"), beneficiaryId: b.id, userId: user.id, kind, at: now.toISOString() };
    if ((kind === "chat" || kind === "call") && b.stage === "new") {
      b.stage = "contacted";
      b.stageHistory.push({ stage: "contacted", at: now.toISOString() });
      touch.movedStage = true;
    }
    // Reaching them settles today's follow-ups, and so does a try with no answer when the
    // "no answer" rule is on to set the next try. The rules then set the next step.
    if (kind !== "no_reply" || db.settings.rules.noAnswer.on) {
      const eod = endOfToday(now);
      const settled = db.tasks.filter((t) => t.beneficiaryId === b.id && !t.doneAt && new Date(t.due).getTime() <= eod);
      settled.forEach((t) => (t.doneAt = now.toISOString()));
      if (settled.length) touch.closedTasks = settled.map((t) => t.id);
    }
    // "No answer" → try again, and a contact → next step: both come from the rules after saving.
    db.touches.push(touch);
    audit(db, user, `touch:${kind}`, b.id);
  });
  refresh();
}

/** Undo the last contact this person recorded, within ten minutes. */
export async function undoTouch(formData: FormData) {
  const user = await requireUser();
  const touchId = String(formData.get("touchId"));
  await mutate((db) => {
    const t = db.touches.find((x) => x.id === touchId);
    if (!t || t.userId !== user.id || Date.now() - new Date(t.at).getTime() > 10 * 60_000) return;
    db.touches = db.touches.filter((x) => x.id !== touchId);
    const b = db.beneficiaries.find((x) => x.id === t.beneficiaryId);
    if (b && t.movedStage && b.stage === "contacted") {
      b.stage = "new";
      const last = b.stageHistory[b.stageHistory.length - 1];
      if (last?.stage === "contacted" && last.at === t.at) b.stageHistory.pop();
    }
    for (const id of t.closedTasks ?? []) {
      const task = db.tasks.find((x) => x.id === id);
      if (task) task.doneAt = null;
    }
    // Drop the follow-ups the rules created because of this tap.
    db.tasks = db.tasks.filter((x) => !(x.beneficiaryId === t.beneficiaryId && x.rule && !x.doneAt && x.createdAt >= t.at));
  });
  refresh();
}

// ---------- Team ----------

/** Moves each case to the person picked on the handover page and introduces them on WhatsApp. */
export async function handover(formData: FormData) {
  const user = await requireUser();
  const fromId = String(formData.get("fromId"));
  const newStatus = String(formData.get("newStatus") ?? "") as User["status"] | "";
  let moved = 0;
  await mutate((db) => {
    const from = db.users.find((u) => u.id === fromId);
    if (!from || !canManageUser(db, user, from)) throw new Error("Not allowed");
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("to_")) continue;
      const b = db.beneficiaries.find((x) => x.id === key.slice(3) && x.assignedTo === fromId);
      const to = db.users.find((u) => u.id === String(value) && u.role === from.role);
      if (!b || !to) continue;
      const now = new Date().toISOString();
      db.assignments.push({ id: newId("A"), beneficiaryId: b.id, fromId, toId: to.id, byId: user.id, reason: newStatus === "left" ? "مغادرة" : "إجازة", at: now });
      b.assignedTo = to.id;
      if (b.groupId) b.groupId = groupForMember(db, to.id, b.stage === "muslim" ? "learning" : "dawah", b.language)?.id ?? b.groupId;
      if (!b.summary) b.summary = { text: buildSummary(db, b, "ar"), generatedAt: now, reviewed: false };
      db.tasks.forEach((t) => {
        if (t.beneficiaryId === b.id && !t.doneAt) t.assigneeId = to.id;
      });
      db.tasks.push({ id: newId("TK"), beneficiaryId: b.id, assigneeId: to.id, title: "تعارف بعد الاستلام", kind: "first_contact", due: new Date(Date.now() + 12 * HOUR).toISOString(), createdAt: now, doneAt: null });
      const tpl = TEMPLATES.new_caller;
      const vars = { name: firstName(b), caller: to.name.split(" ")[0] };
      db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(tpl[b.language], vars), translation: fillTemplate(tpl.ar, vars), at: now, authorId: to.id, status: "sent", kind: "template" });
      moved++;
    }
    if (newStatus) from.status = newStatus;
    audit(db, user, `handover:${moved}`, fromId);
  });
  refresh();
  redirect(`/team?moved=${moved}`);
}

export async function setUserStatus(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("userId"));
  const status = String(formData.get("status")) as User["status"];
  await mutate((db) => {
    const target = db.users.find((u) => u.id === id);
    if (!target || !canManageUser(db, user, target)) throw new Error("Not allowed");
    target.status = status;
    audit(db, user, `status:${status}`, id);
  });
  refresh();
}

export async function saveRules(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "supervisor") throw new Error("Not allowed");
  const on = (k: string) => formData.get(k) === "on";
  const num = (k: string, min: number, max: number, fallback: number) => {
    const n = Math.round(Number(formData.get(k)));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  const days = [...new Set(String(formData.get("newMuslimDays") ?? "").split(/[,،\s]+/).map((x) => Math.round(Number(x.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))))).filter((n) => Number.isFinite(n) && n >= 1 && n <= 365))].sort((a, b) => a - b);
  await mutate((db) => {
    const r = db.settings.rules;
    db.settings.rules = {
      afterContact: { on: on("afterContact"), contacted: num("contacted", 1, 30, r.afterContact.contacted), interested: num("interested", 1, 30, r.afterContact.interested), learning: num("learning", 1, 30, r.afterContact.learning) },
      noAnswer: { on: on("noAnswer"), days: num("noAnswerDays", 1, 14, r.noAnswer.days), tries: num("noAnswerTries", 2, 10, r.noAnswer.tries) },
      newMuslim: { on: on("newMuslim"), days: days.length ? days : r.newMuslim.days },
      silentLearner: { on: on("silentLearner") },
      newCase: { on: on("newCase"), hours: num("newCaseHours", 1, 72, r.newCase.hours) },
    };
    db.settings.rulesUpdatedAt = new Date().toISOString();
    db.settings.rulesUpdatedBy = user.id;
    audit(db, user, "rules", "settings");
  });
  refresh();
  redirect("/rules?saved=1");
}

export async function createGroup(formData: FormData) {
  const user = await requireUser();
  const ownerId = String(formData.get("ownerId") || user.id);
  const name = String(formData.get("name") ?? "").trim();
  const language = String(formData.get("language")) as Lang;
  if (!name || !LANGS.includes(language)) return;
  let id = "";
  await mutate((db) => {
    const owner = db.users.find((u) => u.id === ownerId);
    if (!owner || (owner.id !== user.id && !canManageUser(db, user, owner))) throw new Error("Not allowed");
    const role = owner.role as StaffRole;
    id = newId("G");
    db.groups.push({ id, name, ownerId, kind: role === "teacher" ? "learning" : "dawah", language, trackId: role === "teacher" ? "TR1" : null, schedule: { days: role === "teacher" ? [0, 3] : [], hour: null, paused: false }, createdAt: new Date().toISOString() });
    audit(db, user, "create_group", id);
  });
  refresh();
  redirect(`/groups/${id}`);
}

