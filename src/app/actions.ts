"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BENEFICIARY_LINES, TEMPLATES, fillTemplate, guessCountryFromPhone, type TemplateId } from "@/lib/content";
import { mutate, newId, readDb, resetDb } from "@/lib/db";
import {
  DAY,
  HOUR,
  buildSummary,
  canOpen,
  firstName,
  learnerState,
  parseWhatsAppExport,
  suggestAssignee,
  supervisorIdFor,
  windowOpen,
} from "@/lib/logic";
import { LANG_COOKIE, USER_COOKIE, getUiLang, requireUser } from "@/lib/session";
import type { Beneficiary, DB, Gender, Lang, Stage, User } from "@/lib/types";
import { LANGS, STAGES } from "@/lib/types";

function audit(db: DB, user: User, action: string, target: string) {
  db.audit.unshift({ id: newId("AU"), userId: user.id, action, target, at: new Date().toISOString() });
  db.audit.length = Math.min(db.audit.length, 500);
}

function getBeneficiary(db: DB, user: User, id: string): Beneficiary {
  const b = db.beneficiaries.find((x) => x.id === id);
  if (!b || !canOpen(db, user, b)) throw new Error("Not allowed");
  return b;
}

function refresh(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/beneficiaries/${id}`);
}

// ---------- Session ----------

export async function login(formData: FormData) {
  const id = String(formData.get("userId"));
  const user = readDb().users.find((u) => u.id === id);
  if (!user) return;
  (await cookies()).set(USER_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  mutate((db) => {
    const u = db.users.find((x) => x.id === id)!;
    u.lastSeenAt = new Date().toISOString();
  });
  redirect(user.role === "admin" ? "/dashboard" : "/");
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
  resetDb();
  refresh();
}

// ---------- Messaging ----------

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (!windowOpen(db, b)) throw new Error("24h window closed: use a template");
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text, translation: null, at: new Date().toISOString(), authorId: user.id, status: "sent", kind: "text" });
    audit(db, user, "send_message", b.id);
  });
  refresh(id);
}

export async function sendTemplate(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const templateId = String(formData.get("templateId")) as TemplateId;
  const tpl = TEMPLATES[templateId];
  if (!tpl) return;
  mutate((db) => {
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
  refresh(id);
}

/** Demo only: plays the beneficiary's side of the conversation. */
export async function simulateReply(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const line = BENEFICIARY_LINES[1 + Math.floor(Math.random() * (BENEFICIARY_LINES.length - 1))];
    db.messages.forEach((m) => {
      if (m.beneficiaryId === b.id && m.direction === "out") m.status = "read";
    });
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "in", text: line[b.language], translation: line.ar, at: new Date().toISOString(), authorId: null, status: null, kind: "text" });
  });
  refresh(id);
}

// ---------- File ----------

export async function addNote(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    db.notes.push({ id: newId("N"), beneficiaryId: b.id, authorId: user.id, text, at: new Date().toISOString(), needsContact: formData.get("needsContact") === "on" });
    audit(db, user, "add_note", b.id);
  });
  refresh(id);
}

export async function addTask(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const title = String(formData.get("title") ?? "").trim();
  const due = String(formData.get("due") ?? "");
  if (!title || !due) return;
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    db.tasks.push({ id: newId("TK"), beneficiaryId: b.id, assigneeId: b.assignedTo, title, kind: "followup", due: new Date(due).toISOString(), createdAt: new Date().toISOString(), doneAt: null });
    audit(db, user, "add_task", b.id);
  });
  refresh(id);
}

export async function completeTask(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId"));
  let bId = "";
  mutate((db) => {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return;
    getBeneficiary(db, user, task.beneficiaryId);
    task.doneAt = new Date().toISOString();
    bId = task.beneficiaryId;
    audit(db, user, "complete_task", task.beneficiaryId);
  });
  refresh(bId);
}

export async function changeStage(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const stage = String(formData.get("stage")) as Stage;
  if (!STAGES.includes(stage)) return;
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (b.stage === stage) return;
    const now = new Date();
    b.stage = stage;
    b.stageHistory.push({ stage, at: now.toISOString() });
    if (stage === "muslim" && !b.convertedAt) {
      b.convertedAt = now.toISOString();
      if (!db.progress.some((p) => p.beneficiaryId === b.id)) db.progress.push({ beneficiaryId: b.id, events: [] });
      // Check-ins at the critical points after embracing Islam.
      for (const day of [14, 30, 90]) {
        db.tasks.push({ id: newId("TK"), beneficiaryId: b.id, assigneeId: b.assignedTo, title: `اطمئنان بعد ${day} يومًا من الإسلام`, kind: "checkin", due: new Date(now.getTime() + day * DAY).toISOString(), createdAt: now.toISOString(), doneAt: null });
      }
    }
    audit(db, user, `stage:${stage}`, b.id);
  });
  refresh(id);
}

export async function regenerateSummary(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const lang = await getUiLang();
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    b.summary = { text: buildSummary(db, b, lang), generatedAt: new Date().toISOString(), reviewed: false };
  });
  refresh(id);
}

export async function markSummaryReviewed(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const text = String(formData.get("text") ?? "").trim();
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    if (!b.summary) return;
    if (text) b.summary.text = text;
    b.summary.reviewed = true;
    audit(db, user, "review_summary", b.id);
  });
  refresh(id);
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    b.background = String(formData.get("background") ?? b.background);
    b.needs = String(formData.get("needs") ?? b.needs);
    b.objections = String(formData.get("objections") ?? "").split(/[،,]/).map((s) => s.trim()).filter(Boolean);
    const hour = Number(formData.get("preferredHour"));
    if (hour >= 0 && hour < 24) b.preferredHour = hour;
    b.sensitive = formData.get("sensitive") === "on";
    audit(db, user, "update_profile", b.id);
  });
  refresh(id);
}

export async function addBeneficiary(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const language = String(formData.get("language")) as Lang;
  const gender = String(formData.get("gender")) as Gender;
  if (!name || !phone || !LANGS.includes(language)) return;
  const digits = (s: string) => s.replace(/\D/g, "");
  const dup = readDb().beneficiaries.find((b) => digits(b.phone) === digits(phone));
  if (dup) redirect(`/beneficiaries/new?dup=${encodeURIComponent(dup.sensitive ? dup.alias : dup.name)}`);
  let newBenId = "";
  let assigneeName = "";
  mutate((db) => {
    const country = guessCountryFromPhone(phone);
    // A caller keeps the case only when language and gender match; otherwise it goes to the best match.
    const selfFits = user.role === "caller" && user.gender === gender && user.languages.includes(language);
    const assignee =
      (selfFits ? user : suggestAssignee(db, { language, gender })) ??
      db.users.find((u) => u.role === "caller" && u.gender === gender && u.languages.includes(language)) ??
      db.users.find((u) => u.role === "caller" && u.languages.includes(language))!;
    assigneeName = assignee.name;
    const now = new Date().toISOString();
    newBenId = `B-${1000 + db.beneficiaries.length + 1}`;
    db.beneficiaries.push({
      id: newBenId,
      name,
      alias: newBenId,
      gender,
      language,
      country: country?.code ?? "",
      timezone: country?.tz ?? "UTC",
      phone,
      preferredHour: 19,
      stage: "new",
      stageHistory: [{ stage: "new", at: now }],
      assignedTo: assignee.id,
      sensitive: formData.get("sensitive") === "on",
      background: String(formData.get("background") ?? ""),
      needs: "",
      objections: [],
      source: String(formData.get("source") ?? "") || "—",
      createdAt: now,
      convertedAt: null,
      summary: null,
      optedOut: false,
    });
    db.assignments.push({ id: newId("A"), beneficiaryId: newBenId, fromId: null, toId: assignee.id, byId: user.id, reason: "إسناد أولي", at: now });
    db.tasks.push({ id: newId("TK"), beneficiaryId: newBenId, assigneeId: assignee.id, title: "أول تواصل", kind: "first_contact", due: new Date(Date.now() + 4 * HOUR).toISOString(), createdAt: now, doneAt: null });
    audit(db, user, "add_beneficiary", newBenId);
  });
  refresh();
  const created = readDb().beneficiaries.find((b) => b.id === newBenId)!;
  // A caller who handed the case to someone else can no longer open it, so show where it went.
  if (canOpen(readDb(), user, created)) redirect(`/beneficiaries/${newBenId}`);
  redirect(`/beneficiaries?added=${encodeURIComponent(name)}&to=${encodeURIComponent(assigneeName)}`);
}

export async function importChat(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const file = formData.get("file");
  const nameInFile = String(formData.get("nameInFile") ?? "").trim().toLowerCase();
  if (!(file instanceof File) || file.size === 0) return;
  const raw = await file.text();
  const lines = parseWhatsAppExport(raw);
  let added = 0;
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const senders = [...new Set(lines.map((l) => l.sender))];
    const first = b.name.split(" ")[0].toLowerCase();
    const benSender =
      senders.find((s) => nameInFile && s.toLowerCase().includes(nameInFile)) ??
      senders.find((s) => s.toLowerCase().includes(first)) ??
      senders.find((s) => /\d{6,}/.test(s.replace(/\s/g, ""))) ??
      senders[0];
    const existing = new Set(db.messages.filter((m) => m.beneficiaryId === b.id).map((m) => `${m.at}|${m.text}`));
    for (const l of lines) {
      const at = l.at.toISOString();
      if (existing.has(`${at}|${l.text}`)) continue;
      existing.add(`${at}|${l.text}`);
      db.messages.push({
        id: newId("M"),
        beneficiaryId: b.id,
        direction: l.sender === benSender ? "in" : "out",
        text: l.text,
        translation: null,
        at,
        authorId: l.sender === benSender ? null : b.assignedTo,
        status: l.sender === benSender ? null : "read",
        kind: "imported",
      });
      added++;
    }
    audit(db, user, `import_chat:${added}`, b.id);
  });
  refresh(id);
  redirect(`/beneficiaries/${id}?imported=${added}`);
}

// ---------- New Muslims ----------

export async function sendNextLesson(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const state = learnerState(db, b);
    if (state.waitingOnLesson || state.completed >= state.total) return;
    let p = db.progress.find((x) => x.beneficiaryId === b.id);
    if (!p) {
      p = { beneficiaryId: b.id, events: [] };
      db.progress.push(p);
    }
    const now = new Date().toISOString();
    p.events.push({ lesson: state.completed + 1, sentAt: now, startedAt: null, completedAt: null, correct: null });
    const vars = { name: firstName(b) };
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(TEMPLATES.lesson_ready[b.language], vars), translation: fillTemplate(TEMPLATES.lesson_ready.ar, vars), at: now, authorId: null, status: "sent", kind: "template" });
    audit(db, user, `send_lesson:${state.completed + 1}`, b.id);
  });
  refresh(id);
}

/** Demo only: the learner taps Start, reads the lesson and answers the quiz. */
export async function simulateLesson(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("beneficiaryId"));
  const correct = formData.get("correct") !== "no";
  mutate((db) => {
    const b = getBeneficiary(db, user, id);
    const p = db.progress.find((x) => x.beneficiaryId === b.id);
    const current = p?.events[p.events.length - 1];
    if (!current || current.completedAt) return;
    const now = new Date().toISOString();
    current.startedAt = now;
    current.completedAt = now;
    current.correct = correct;
    db.messages.forEach((m) => {
      if (m.beneficiaryId === b.id && m.direction === "out") m.status = "read";
    });
    const lesson = db.lessons.find((l) => l.order === current.lesson);
    db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "in", text: correct ? "✅" : "❌", translation: `${lesson?.title.ar ?? ""}: ${correct ? "إجابة صحيحة" : "إجابة خاطئة"}`, at: now, authorId: null, status: null, kind: "quiz" });
  });
  refresh(id);
}

// ---------- Team ----------

export async function handover(formData: FormData) {
  const user = await requireUser();
  if (user.role === "caller") return;
  const fromId = String(formData.get("fromId"));
  const newStatus = String(formData.get("newStatus") ?? "leave") as User["status"];
  let moved = 0;
  mutate((db) => {
    const from = db.users.find((u) => u.id === fromId);
    if (!from) return;
    if (user.role === "supervisor" && supervisorIdFor(db, fromId) !== user.id) return;
    const now = new Date();
    for (const b of db.beneficiaries.filter((x) => x.assignedTo === fromId && x.stage !== "closed")) {
      const toId = String(formData.get(`to_${b.id}`) ?? "");
      const to = db.users.find((u) => u.id === toId && u.role === "caller");
      if (!to || to.id === fromId) continue;
      // Make sure the new caller starts from an up-to-date summary.
      if (!b.summary) b.summary = { text: buildSummary(db, b, "ar"), generatedAt: now.toISOString(), reviewed: false };
      b.assignedTo = to.id;
      db.tasks.filter((t) => t.beneficiaryId === b.id && !t.doneAt).forEach((t) => (t.assigneeId = to.id));
      db.tasks.push({ id: newId("TK"), beneficiaryId: b.id, assigneeId: to.id, title: "أول تواصل بعد التسليم: اقرأ الملخص وعرّف بنفسك", kind: "first_contact", due: new Date(now.getTime() + DAY).toISOString(), createdAt: now.toISOString(), doneAt: null });
      db.assignments.push({ id: newId("A"), beneficiaryId: b.id, fromId, toId: to.id, byId: user.id, reason: newStatus === "left" ? "مغادرة الداعية" : "إجازة الداعية", at: now.toISOString() });
      moved++;
    }
    if (["available", "leave", "left"].includes(newStatus)) from.status = newStatus;
    audit(db, user, `handover:${moved}`, fromId);
  });
  refresh();
  redirect(`/team?moved=${moved}`);
}

export async function setUserStatus(formData: FormData) {
  const user = await requireUser();
  if (user.role === "caller") return;
  const id = String(formData.get("userId"));
  const status = String(formData.get("status")) as User["status"];
  mutate((db) => {
    const u = db.users.find((x) => x.id === id);
    if (u && ["available", "leave", "left"].includes(status)) u.status = status;
    audit(db, user, `status:${status}`, id);
  });
  refresh();
}
