import { BENEFICIARY_LINES, CALLER_LINES, COUNTRIES, TEMPLATES, fillTemplate } from "./content";
import { SEED_LESSONS, TRACKS } from "./curriculum";
import { DAY, HOUR, nextSlot } from "./time";
import { addDays, isoDay } from "./hijri";
import { CONVERTED, DEFAULT_LISTS, DEFAULT_RECONTACT, LANG_LABEL_FOR, applyHidayaLog, emptyHidaya, emptyMuslim, langCodeFor } from "./programs";
import type {
  Assignment,
  Beneficiary,
  ChatImport,
  DB,
  Gender,
  Group,
  HidayaFollowup,
  HidayaLog,
  Lang,
  LessonEvent,
  Message,
  Note,
  Settings,
  Stage,
  StaffRole,
  Task,
  Team,
  Touch,
  TouchKind,
  User,
  Weekday,
} from "./types";

export const DB_VERSION = 5;

export function defaultSettings(): Settings {
  return {
    rules: {
      afterContact: { on: true, contacted: 2, interested: 2, learning: 3 },
      noAnswer: { on: true, days: 1, tries: 3 },
      newMuslim: { on: true, days: [1, 3, 7, 14, 30, 60, 90] },
      silentLearner: { on: true },
      newCase: { on: true, hours: 4 },
    },
    rulesUpdatedAt: null,
    rulesUpdatedBy: null,
    lists: structuredClone(DEFAULT_LISTS),
    recontactDays: { ...DEFAULT_RECONTACT },
  };
}

/** Brings saved demo data from an older version up to date without losing what people entered. */
export function migrate(db: DB): DB | null {
  // Version 5 rebuilt the files on the association's two programs: older demo data starts fresh.
  return db.version === DB_VERSION ? db : null;
}

/** Small deterministic random generator so every reset gives the same demo. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES: Record<Lang, Record<Gender, string[]>> = {
  es: {
    m: ["Carlos Mendoza", "Diego Ramírez", "José Herrera", "Luis Torres", "Andrés Castillo", "Miguel Ruiz", "Javier Morales", "Ricardo Flores", "Pablo Navarro", "Héctor Silva", "Fernando Ortiz", "Raúl Medina", "Sergio Peña", "Adrián Vega", "Mateo Rivas", "Tomás Aguilar"],
    f: ["María Gómez", "Lucía Fernández", "Sofía Rojas", "Carmen Vargas", "Valentina Cruz", "Isabel Romero", "Paula Díaz", "Gabriela Soto", "Daniela Ibáñez", "Elena Campos"],
  },
  fil: {
    m: ["Juan dela Cruz", "Mark Santos", "Rodel Bautista", "Paolo Reyes", "Jomar Aquino", "Ramon Castro", "Noel Pascual", "Edgar Lim", "Arnel Domingo", "Ben Salazar"],
    f: ["Maricel Garcia", "Joy Villanueva", "Angelica Ramos", "Kristine Mendoza", "Liza Navarro", "Rowena Dizon", "Jenny Uy", "Grace Tan", "Mae Fernandez", "Clarissa Ocampo"],
  },
  ur: {
    m: ["Arjun Masih", "Samuel Gill", "Daniel Bhatti", "Kashif Masih", "Peter Sandhu", "Javed Masih"],
    f: ["Sana Gill", "Rubina Masih", "Naila Bhatti", "Shazia Sandhu"],
  },
  bn: {
    m: ["Rahul Das", "Sujon Roy", "Amit Barua", "Tapan Mondal", "Bijoy Saha", "Partha Ghosh", "Ratan Pal", "Sanjoy Kar", "Dipok Nath", "Subrata Sen"],
    f: ["Priya Sarkar", "Mitali Das", "Rupa Biswas", "Shila Roy", "Tania Paul", "Moumita Dey", "Rina Saha"],
  },
  hi: {
    m: ["Rajesh Kumar", "Vikram Singh", "Suresh Patel", "Anil Sharma", "Deepak Yadav", "Manoj Tiwari", "Ravi Nair"],
    f: ["Pooja Verma", "Neha Gupta", "Kavita Joshi", "Sunita Rao", "Anjali Mehta"],
  },
  fr: {
    m: ["Jean Dupont", "Koffi Kouassi", "Thomas Martin", "Serge Mbarga", "Yves Konan", "Paul Essomba", "Luc Girard"],
    f: ["Claire Moreau", "Nadège Ekotto", "Brigitte Yao", "Élodie Bernard", "Awa Koné", "Sophie Laurent"],
  },
};

const LANG_AR: Record<Lang, string> = { es: "الإسبانية", fil: "الفلبينية", ur: "الأردية", bn: "البنغالية", hi: "الهندية", fr: "الفرنسية" };

const BACKGROUNDS = [
  "نشأ مسيحيًا كاثوليكيًا، ويحب القراءة.",
  "من أسرة هندوسية محافظة.",
  "لا ديني، يبحث عن معنى للحياة.",
  "مسيحي بروتستانتي، يعمل في التمريض.",
  "طالب جامعي، تعرّف على الإسلام عن طريق زميل.",
  "عامل في الخليج سابقًا، رأى المسلمين عن قرب.",
];
const NEEDS = [
  "يفضّل الرسائل الصوتية القصيرة.",
  "يحتاج شرحًا مبسطًا جدًا.",
  "يريد مصادر مكتوبة بلغته.",
  "يسأل كثيرًا عن مقارنة الأديان.",
  "متاح فقط في المساء بعد العمل.",
  "إنترنته ضعيف، يفتح الرسائل مرة في اليوم.",
];
const OBJECTIONS = ["الخوف من رفض الأسرة", "أسئلة عن الثالوث", "صعوبة الصلاة في مكان العمل", "صورة الإسلام في الإعلام", "تعلّم العربية للصلاة", "الالتزام بالصيام"];
const SOURCES = ["إعلان فيسبوك", "صفحة المركز", "إحالة صديق", "زيارة المركز", "تيك توك"];

type StaffSeed = { id: string; name: string; role: StaffRole; gender: Gender; languages: Lang[]; teamId: string; quality: number };

/** Each supervisor leads callers (part one) and teachers (part two). The women's section has its own supervisor. */
/** Callers and teachers who use their own phone number rather than the center's. */
export const PERSONAL_NUMBER_STAFF = new Set(["U-C01", "U-C04", "U-C06", "U-C08", "U-C10", "U-C03", "U-C11"]);

const STAFF: StaffSeed[] = [
  // Team 1: Spanish and French, brothers
  { id: "U-C01", name: "مجيب", role: "caller", gender: "m", languages: ["es"], teamId: "T1", quality: 0.6 },
  { id: "U-C02", name: "منصور", role: "caller", gender: "m", languages: ["es"], teamId: "T1", quality: 1.3 },
  { id: "U-C04", name: "عبدالرحمن", role: "caller", gender: "m", languages: ["fr", "es"], teamId: "T1", quality: 1.0 },
  { id: "U-T01", name: "زبير", role: "teacher", gender: "m", languages: ["es"], teamId: "T1", quality: 0.8 },
  { id: "U-T02", name: "السبيل", role: "teacher", gender: "m", languages: ["fr"], teamId: "T1", quality: 1.0 },
  // Team 2: Asia, brothers
  { id: "U-C06", name: "حمدان", role: "caller", gender: "m", languages: ["fil"], teamId: "T2", quality: 0.9 },
  { id: "U-C08", name: "شرف", role: "caller", gender: "m", languages: ["ur", "hi"], teamId: "T2", quality: 1.1 },
  { id: "U-C10", name: "عبدالماجد", role: "caller", gender: "m", languages: ["bn"], teamId: "T2", quality: 1.6 },
  { id: "U-T03", name: "الحريقي", role: "teacher", gender: "m", languages: ["fil"], teamId: "T2", quality: 1.2 },
  { id: "U-T04", name: "عمر", role: "teacher", gender: "m", languages: ["hi", "ur"], teamId: "T2", quality: 1.0 },
  { id: "U-T05", name: "سليمان", role: "teacher", gender: "m", languages: ["bn"], teamId: "T2", quality: 0.9 },
  // Team 3: women's section, all languages
  { id: "U-C03", name: "ثناء", role: "caller", gender: "f", languages: ["es"], teamId: "T3", quality: 0.8 },
  { id: "U-C05", name: "رحمة", role: "caller", gender: "f", languages: ["fr", "es"], teamId: "T3", quality: 0.7 },
  { id: "U-C07", name: "مريم", role: "caller", gender: "f", languages: ["fil"], teamId: "T3", quality: 0.6 },
  { id: "U-C11", name: "هيا", role: "caller", gender: "f", languages: ["bn", "hi"], teamId: "T3", quality: 0.9 },
  { id: "U-T06", name: "أسماء", role: "teacher", gender: "f", languages: ["fil"], teamId: "T3", quality: 1.0 },
  { id: "U-T07", name: "هند", role: "teacher", gender: "f", languages: ["hi", "ur"], teamId: "T3", quality: 0.8 },
  { id: "U-T08", name: "سارة", role: "teacher", gender: "f", languages: ["bn"], teamId: "T3", quality: 0.7 },
  { id: "U-T09", name: "لطيفة", role: "teacher", gender: "f", languages: ["es", "fr"], teamId: "T3", quality: 0.9 },
];

/** Stages of each caller's four open conversations. */
const CALLER_PATTERNS: Stage[][] = [
  ["new", "contacted", "interested", "learning"],
  ["contacted", "interested", "learning", "paused"],
  ["new", "interested", "learning", "contacted"],
  ["contacted", "learning", "interested", "new"],
];

const GROUP_DAYS: Weekday[][] = [
  [0, 3],
  [1, 4],
  [2, 5],
];

export function createSeed(now = new Date()): DB {
  const r = rng(1447);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const between = (a: number, b: number) => a + r() * (b - a);
  const nowMs = now.getTime();
  const iso = (ms: number) => new Date(Math.min(ms, nowMs)).toISOString();
  let idCounter = 1000;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;
  const token = () => `ev_${Array.from({ length: 10 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[Math.floor(r() * 31)]).join("")}`;

  const users: User[] = [
    { id: "U-A01", name: "عبدالله (الإدارة)", role: "admin", gender: "m", languages: [], teamId: null, status: "available", lastSeenAt: iso(nowMs - 2 * HOUR) },
    { id: "U-S01", name: "خالد العتيبي", role: "supervisor", gender: "m", languages: ["es", "fr"], teamId: "T1", status: "available", lastSeenAt: iso(nowMs - 5 * HOUR) },
    { id: "U-S02", name: "يوسف القحطاني", role: "supervisor", gender: "m", languages: ["ur", "hi"], teamId: "T2", status: "available", lastSeenAt: iso(nowMs - 20 * HOUR) },
    { id: "U-S03", name: "نورة السبيعي", role: "supervisor", gender: "f", languages: ["es", "fr"], teamId: "T3", status: "available", lastSeenAt: iso(nowMs - 3 * HOUR) },
    ...STAFF.map<User>((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      gender: s.gender,
      languages: s.languages,
      teamId: s.teamId,
      status: s.id === "U-C02" ? "leave" : "available",
      lastSeenAt: iso(nowMs - (s.id === "U-C10" ? 9 * DAY : between(1, 60) * HOUR)),
    })),
  ];

  const teams: Team[] = [
    { id: "T1", name: "فريق الإسبانية والفرنسية", supervisorId: "U-S01" },
    { id: "T2", name: "فريق آسيا", supervisorId: "U-S02" },
    { id: "T3", name: "القسم النسائي", supervisorId: "U-S03" },
  ];
  const supervisorOf = (teamId: string) => teams.find((t) => t.id === teamId)!.supervisorId;

  const groups: Group[] = [];
  const beneficiaries: Beneficiary[] = [];
  const messages: Message[] = [];
  const tasks: Task[] = [];
  const events: LessonEvent[] = [];
  const assignments: Assignment[] = [];
  const notes: Note[] = [];
  const usedNames = new Set<string>();
  const lessons = SEED_LESSONS.filter((l) => l.trackId === "TR1").sort((a, b) => a.order - b.order);

  const takeName = (lang: Lang, gender: Gender) => {
    const name = NAMES[lang][gender].find((n) => !usedNames.has(n)) ?? `${pick(NAMES[lang][gender])} ${usedNames.size}`;
    usedNames.add(name);
    return name;
  };

  const msg = (b: Beneficiary, direction: "in" | "out", at: number, line: { ar: string } & Record<Lang, string>, authorId: string | null, kind: Message["kind"] = "text"): Message => ({
    id: nextId("M"),
    beneficiaryId: b.id,
    direction,
    text: line[b.language],
    translation: line.ar,
    at: iso(at),
    authorId,
    status: direction === "out" ? "read" : null,
    kind,
  });

  const groupFor = (ownerId: string, kind: Group["kind"], lang: Lang, cohort: number, createdMs: number) => {
    const existing = groups.find((g) => g.ownerId === ownerId && g.language === lang && g.kind === kind && g.id.endsWith(`-${cohort}`));
    if (existing) return existing;
    const index = groups.filter((g) => g.ownerId === ownerId).length;
    const g: Group = {
      id: `G-${ownerId.slice(2)}-${lang}-${cohort}`,
      name: kind === "dawah" ? `الحوار · ${LANG_AR[lang]}` : `حلقة ${LANG_AR[lang]} · ${cohort === 1 ? "المجموعة الأولى" : "المجموعة الثانية"}`,
      ownerId,
      kind,
      language: lang,
      trackId: kind === "learning" ? "TR1" : null,
      schedule: { days: kind === "learning" ? GROUP_DAYS[index % GROUP_DAYS.length] : [], hour: null, paused: false },
      createdAt: iso(createdMs),
    };
    groups.push(g);
    return g;
  };

  const newBeneficiary = (lang: Lang, gender: Gender, stage: Stage, assignedTo: string, createdMs: number, extra: Partial<Beneficiary> = {}): Beneficiary => {
    const country = pick(COUNTRIES.filter((c) => c.lang === lang));
    const id = `B-${1000 + beneficiaries.length + 1}`;
    const b: Beneficiary = {
      id,
      program: stage === "muslim" ? "muslim" : "hidaya",
      city: "",
      workplace: "",
      profession: "",
      nationality: country.code === "BD" ? "البنقالية" : country.code === "PK" ? "باكستان" : country.ar,
      languageLabel: LANG_LABEL_FOR[lang],
      hidaya: null,
      muslim: null,
      name: takeName(lang, gender),
      alias: id,
      gender,
      language: lang,
      country: country.code,
      timezone: country.tz,
      phone: `${country.dial} ${Math.floor(100 + r() * 899)} ${Math.floor(100 + r() * 899)} ${Math.floor(1000 + r() * 8999)}`,
      preferredHour: pick([8, 12, 18, 19, 20, 21]),
      stage,
      stageHistory: [],
      assignedTo,
      introducedBy: null,
      groupId: null,
      sensitive: r() < 0.2,
      background: pick(BACKGROUNDS),
      needs: pick(NEEDS),
      objections: [pick(OBJECTIONS), pick(OBJECTIONS)].filter((v, i, a) => a.indexOf(v) === i),
      source: pick(SOURCES),
      createdAt: iso(createdMs),
      convertedAt: null,
      summary: null,
      optedOut: false,
      ...extra,
    };
    beneficiaries.push(b);
    return b;
  };

  /** Alternating dawah conversation between a person and a caller, between two instants. */
  const conversation = (b: Beneficiary, caller: StaffSeed, fromMs: number, toMs: number, turns: number, leaveLastOpen: boolean) => {
    const span = (toMs - fromMs) / (turns + 1);
    let t = fromMs;
    for (let k = 0; k < turns; k++) {
      messages.push(msg(b, "in", t, k === 0 ? BENEFICIARY_LINES[0] : pick(BENEFICIARY_LINES.slice(1)), null));
      const replyH = between(0.3, 14) * caller.quality * (r() < 0.15 ? 3 : 1);
      if (!(leaveLastOpen && k === turns - 1)) messages.push(msg(b, "out", t + replyH * HOUR, k === 0 ? CALLER_LINES[0] : pick(CALLER_LINES.slice(1)), caller.id));
      t += span;
    }
  };

  /** Past and next follow-up tasks; late ones depend on the person's quality. */
  const followups = (b: Beneficiary, person: StaffSeed, count: number) => {
    for (let k = 0; k < count; k++) {
      const due = nowMs - between(1, 30) * DAY;
      const late = r() < 0.06 + 0.16 * (person.quality - 0.6);
      tasks.push({
        id: nextId("TK"),
        beneficiaryId: b.id,
        assigneeId: person.id,
        title: person.role === "teacher" ? "اطمئنان أسبوعي" : "متابعة دورية",
        kind: person.role === "teacher" ? "checkin" : "followup",
        due: iso(due),
        createdAt: iso(due - 3 * DAY),
        doneAt: late ? (r() < 0.5 ? iso(due + between(1, 3) * DAY) : null) : iso(due - between(0, 20) * HOUR),
      });
    }
  };

  // ---------- Part one: callers and their open conversations ----------
  const callers = STAFF.filter((s) => s.role === "caller");
  callers.forEach((caller, ci) => {
    const pattern = CALLER_PATTERNS[ci % CALLER_PATTERNS.length];
    pattern.forEach((stage, bi) => {
      const lang = caller.languages[bi % caller.languages.length];
      const createdMs = nowMs - between(stage === "new" ? 1 : 15, stage === "new" ? 4 : 90) * DAY;
      const b = newBeneficiary(lang, caller.gender, stage, caller.id, createdMs);
      b.groupId = groupFor(caller.id, "dawah", lang, 1, createdMs - 30 * DAY).id;
      const order: Stage[] = ["new", "contacted", "interested", "learning"];
      const reached = stage === "paused" ? "interested" : stage;
      const steps = order.slice(0, order.indexOf(reached) + 1);
      b.stageHistory = steps.map((s, i) => ({ stage: s, at: iso(createdMs + ((nowMs - createdMs) * 0.8 * i) / Math.max(steps.length, 2)) }));
      if (stage === "paused") b.stageHistory.push({ stage: "paused", at: iso(nowMs - between(5, 20) * DAY) });
      assignments.push({ id: nextId("A"), beneficiaryId: b.id, fromId: null, toId: caller.id, byId: supervisorOf(caller.teamId), reason: "إسناد أولي", at: b.createdAt });

      const turns = stage === "new" ? 1 : Math.floor(between(3, 7));
      const endMs = nowMs - between(2, stage === "paused" ? 15 * 24 : 80) * HOUR;
      conversation(b, caller, Math.max(createdMs, nowMs - 25 * DAY), endMs, turns, r() < 0.35 && stage !== "paused");
      if (stage !== "paused" && stage !== "new" && r() < 0.3) messages.push(msg(b, "in", nowMs - between(1, 20) * HOUR, pick(BENEFICIARY_LINES.slice(1)), null));

      followups(b, caller, stage === "new" ? 0 : Math.floor(between(2, 6)));
      const due = stage === "new" ? nowMs - between(1, 10) * HOUR : nowMs + between(-2.5, 2.5) * DAY;
      tasks.push({
        id: nextId("TK"),
        beneficiaryId: b.id,
        assigneeId: caller.id,
        title: stage === "new" ? "أول تواصل" : stage === "paused" ? "محاولة إعادة التواصل" : "متابعة الحوار",
        kind: stage === "new" ? "first_contact" : "followup",
        due: iso(due),
        createdAt: iso(due - 2 * DAY),
        doneAt: null,
      });
      if (bi === 1 && ci % 2 === 0) notes.push({ id: nextId("N"), beneficiaryId: b.id, authorId: caller.id, text: "طلب مقطعًا صوتيًا قصيرًا يشرح التوحيد بلغته.", at: iso(nowMs - between(2, 30) * HOUR), needsContact: true });
    });
  });

  // ---------- Part two: teachers and their new Muslims ----------
  const teachers = STAFF.filter((s) => s.role === "teacher");
  teachers.forEach((teacher) => {
    const count = 5;
    for (let k = 0; k < count; k++) {
      const lang = teacher.languages[k % teacher.languages.length];
      const caller =
        callers.find((c) => c.gender === teacher.gender && c.languages.includes(lang)) ??
        callers.find((c) => c.gender === teacher.gender && c.teamId === teacher.teamId) ??
        callers[0];
      // Older learners in the first group, newer ones in the second.
      const cohort = teacher.languages.length > 1 ? 1 : k < 3 ? 1 : 2;
      const convertedMs = nowMs - (cohort === 1 ? between(28, 70) : between(4, 20)) * DAY;
      const createdMs = convertedMs - between(15, 60) * DAY;
      const b = newBeneficiary(lang, teacher.gender, "muslim", teacher.id, createdMs, { introducedBy: caller.id, convertedAt: iso(convertedMs) });
      const group = groupFor(teacher.id, "learning", lang, cohort, convertedMs - 3 * DAY);
      b.groupId = group.id;
      const order: Stage[] = ["new", "contacted", "interested", "learning", "muslim"];
      b.stageHistory = order.map((s, i) => ({ stage: s, at: iso(createdMs + ((convertedMs - createdMs) * i) / (order.length - 1)) }));

      assignments.push({ id: nextId("A"), beneficiaryId: b.id, fromId: null, toId: caller.id, byId: supervisorOf(caller.teamId), reason: "إسناد أولي", at: b.createdAt });
      const handoverMs = convertedMs + between(2, 20) * HOUR;
      assignments.push({ id: nextId("A"), beneficiaryId: b.id, fromId: caller.id, toId: teacher.id, byId: supervisorOf(teacher.teamId), reason: "انتقل إلى التعليم بعد إسلامه", at: iso(handoverMs) });

      // How the person came to Islam: a short conversation with the caller.
      conversation(b, caller, Math.max(createdMs, convertedMs - 20 * DAY), convertedMs, 3, false);
      const welcome = TEMPLATES.new_caller;
      const vars = { name: b.name.split(" ")[0], caller: teacher.name.split(" ")[0] };
      messages.push({ id: nextId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(welcome[lang], vars), translation: fillTemplate(welcome.ar, vars), at: iso(handoverMs + HOUR), authorId: teacher.id, status: "read", kind: "template" });
      messages.push(msg(b, "in", handoverMs + between(2, 10) * HOUR, BENEFICIARY_LINES[2], null));

      // Lessons go out on the group's days at the learner's preferred local hour.
      const roll = r();
      const state = roll < 0.55 ? "green" : roll < 0.8 ? "yellow" : "red";
      const own: LessonEvent[] = [];
      // Slowing and silent learners went quiet some days ago: nothing from them after this.
      const cutoff = state === "green" ? nowMs : nowMs - (state === "yellow" ? between(1, 2.5) : between(8, 15)) * DAY;
      let from = convertedMs + DAY;
      for (const lesson of lessons) {
        const slot = nextSlot(from, b.timezone, group.schedule.days, b.preferredHour);
        if (!slot || slot > cutoff) break;
        const sentAt = slot + Math.floor(r() * 8) * 60_000;
        const ev: LessonEvent = { id: token(), beneficiaryId: b.id, lessonId: lesson.id, sentAt: iso(sentAt), sentBy: null, remindedAt: null, openedAt: null, completedAt: null, correct: null };
        own.push(ev);
        const evening = b.preferredHour >= 18;
        const openedAt = sentAt + (r() < (evening ? 0.9 : 0.6) ? between(0.2, 5) : between(10, 40)) * HOUR;
        const nextSlotMs = nextSlot(sentAt + HOUR, b.timezone, group.schedule.days, b.preferredHour) ?? Infinity;
        const isLast = nextSlotMs > cutoff;
        if (isLast && state !== "green") {
          // Slowing and silent learners stop at the last lesson sent.
          if (state === "red") ev.remindedAt = iso(nowMs - between(2, 4) * DAY);
          break;
        }
        if (openedAt > cutoff) break;
        ev.openedAt = iso(openedAt);
        ev.completedAt = iso(openedAt + between(4, 15) * 60_000);
        ev.correct = r() < (lesson.order === 4 || lesson.order === 7 ? 0.55 : 0.88);
        from = Math.max(ev.completedAt ? new Date(ev.completedAt).getTime() : sentAt, sentAt + HOUR);
      }
      if (state === "yellow") own.slice(-3).forEach((e) => e.completedAt && (e.correct = false));
      events.push(...own);

      for (const ev of own) {
        const lesson = lessons.find((l) => l.id === ev.lessonId)!;
        const tpl = TEMPLATES.lesson_ready;
        const v = { name: b.name.split(" ")[0], title: lesson.title[lang] ?? lesson.title.en, link: "{link}" };
        messages.push({
          id: nextId("M"),
          beneficiaryId: b.id,
          direction: "out",
          text: fillTemplate(tpl[lang], v),
          translation: fillTemplate(tpl.ar, { ...v, title: lesson.title.ar }),
          at: ev.sentAt,
          authorId: null,
          status: ev.openedAt ? "read" : state === "red" ? "delivered" : "read",
          kind: "lesson",
          eventId: ev.id,
        });
        if (ev.remindedAt) {
          const rt = TEMPLATES.lesson_reminder;
          messages.push({ id: nextId("M"), beneficiaryId: b.id, direction: "out", text: fillTemplate(rt[lang], v), translation: fillTemplate(rt.ar, { ...v, title: lesson.title.ar }), at: ev.remindedAt, authorId: teacher.id, status: "delivered", kind: "lesson", eventId: ev.id });
        }
        if (ev.completedAt && r() < 0.25) messages.push(msg(b, "in", new Date(ev.completedAt).getTime() + between(0.1, 2) * HOUR, pick([BENEFICIARY_LINES[2], BENEFICIARY_LINES[3]]), null));
      }
      if (state === "green" && r() < 0.3) messages.push(msg(b, "in", nowMs - between(1, 18) * HOUR, pick([BENEFICIARY_LINES[3], BENEFICIARY_LINES[5]]), null));

      followups(b, teacher, Math.floor(between(1, 4)));
      for (const day of [14, 30, 90]) {
        const dueMs = convertedMs + day * DAY;
        if (Math.abs(dueMs - nowMs) < 3 * DAY) {
          tasks.push({ id: nextId("TK"), beneficiaryId: b.id, assigneeId: teacher.id, title: `اطمئنان بعد ${day} يومًا من الإسلام`, kind: "checkin", due: iso(dueMs), createdAt: iso(dueMs - 7 * DAY), doneAt: null });
        }
      }
      if (k === 1) notes.push({ id: nextId("N"), beneficiaryId: b.id, authorId: teacher.id, text: "ذكر أن أخاه غاضب منه بعد أن عرف بإسلامه. يحتاج اتصالًا للاطمئنان.", at: iso(nowMs - between(3, 40) * HOUR), needsContact: true });
      if (k === 3) notes.push({ id: nextId("N"), beneficiaryId: b.id, authorId: teacher.id, text: "يتعلم الصلاة ببطء، يفضّل المقاطع الصوتية على النص.", at: iso(nowMs - between(2, 9) * DAY), needsContact: false });
    }
  });

  messages.sort((a, b) => a.at.localeCompare(b.at));
  const seededAt = now.toISOString();

  // Callers who work from their personal WhatsApp: their conversations reach the platform
  // as exported chats, plus the one-tap contact log.
  const touches: Touch[] = [];
  const imports: ChatImport[] = [];
  const kinds: TouchKind[] = ["chat", "chat", "chat", "call", "no_reply", "question", "lesson"];
  for (const s of STAFF) {
    const personal = PERSONAL_NUMBER_STAFF.has(s.id);
    const theirs = beneficiaries.filter((b) => b.assignedTo === s.id && b.stage !== "closed");
    // How long ago this person last brought their chats in: one caller has fallen behind.
    const lastSync = s.id === "U-C10" ? 12 * DAY : between(0.3, 4) * DAY;
    for (const b of theirs) {
      const n = Math.round(between(0, 9) / s.quality);
      for (let i = 0; i < n; i++) {
        const kind = b.stage === "muslim" ? pick(["chat", "call", "lesson", "lesson", "question", "no_reply"] as TouchKind[]) : pick(kinds);
        touches.push({ id: nextId("TO"), beneficiaryId: b.id, userId: s.id, kind, at: iso(nowMs - between(0.05, 30) * DAY) });
      }
      if (!personal) continue;
      let added = 0;
      for (const m of messages) {
        if (m.beneficiaryId !== b.id || m.kind !== "text" || nowMs - new Date(m.at).getTime() < lastSync) continue;
        m.kind = "imported";
        added++;
      }
      if (added) imports.push({ id: nextId("IM"), beneficiaryId: b.id, userId: s.id, source: r() < 0.6 ? "share" : "file", added, at: iso(nowMs - lastSync - between(0, 0.5) * DAY) });
    }
  }
  touches.sort((a, b) => a.at.localeCompare(b.at));

  const hidayaLogs = associationFiles({ r, pick, between, nowMs, iso, nextId, beneficiaries, tasks, assignments, notes, callers, teachers, supervisorOf });

  return {
    version: DB_VERSION,
    seededAt,
    users,
    teams,
    groups,
    beneficiaries,
    messages,
    notes,
    tasks,
    tracks: TRACKS,
    lessons: SEED_LESSONS.map((l) => ({ ...l, updatedAt: iso(nowMs - 20 * DAY), updatedBy: "U-S01" })),
    events,
    assignments,
    touches,
    hidayaLogs,
    imports,
    shares: [],
    settings: defaultSettings(),
    audit: [],
  };
}


// ---------- The association's two programs ----------

const CITIES = ["عنيزة", "عنيزة", "عنيزة", "عنيزة", "بريدة", "الرس", "البكيرية"];
const WORKPLACES = ["مزرعة نخيل", "مصنع تمور", "فندق بودل", "محطة وقود", "مستشفى عنيزة", "ورشة سيارات", "شركة نظافة", "سوق الخضار", "مطعم", "المدينة الصناعية", "مغسلة ملابس", "شركة مقاولات"];
const PROFESSIONS = ["عامل", "سائق", "مزارع", "طباخ", "ممرض", "فني صيانة", "عامل نظافة", "حلاق", "مهندس", "راعي غنم", "كهربائي", "نجار", "محاسب", "عاملة منزلية"];
const RELIGIONS = ["مسيحي", "مسيحي", "هندوسي", "هندوسي", "بوذي", "سيخي", "لا ديني"];
const DOUBTS = ["يسأل عن الثالوث وطبيعة المسيح", "يخاف من رفض أسرته", "يرى أن كل الأديان واحدة", "صورة الإسلام في الإعلام", "يسأل عن مكانة المرأة", "يتعلّق بعبادة الأصنام في قريته", "صعوبة الصلاة أثناء العمل"];
const INTERESTS = ["يحب سماع القرآن", "يقرأ الكتب المترجمة", "يسأل عن الآخرة", "مهتم بسيرة النبي ﷺ", "يحب الحوار الهادئ", "يتأثر بأخلاق زملائه المسلمين"];
const SPONSORS = ["مؤسسة النخيل الزراعية", "مصنع عنيزة للتمور", "شركة القصيم للمقاولات", "محمد العبدالله", "عبدالعزيز السليم", "شركة الخدمات الطبية"];

/** Local residents found through the association's programs: they have Saudi numbers and Riyadh time. */
const LOCAL_PEOPLE: { name: string; gender: Gender; nationality: string; language: string }[] = [
  { name: "سنديف", gender: "m", nationality: "الهند", language: "هندي" },
  { name: "تلندر", gender: "m", nationality: "النيبال", language: "نيبالي" },
  { name: "كربال رام", gender: "m", nationality: "الهند", language: "هندي" },
  { name: "راجو", gender: "m", nationality: "النيبال", language: "نيبالي" },
  { name: "سوريش", gender: "m", nationality: "الهند", language: "تاميلي" },
  { name: "بيكاش", gender: "m", nationality: "النيبال", language: "نيبالي" },
  { name: "جوزيف", gender: "m", nationality: "كينيا", language: "انجليزي" },
  { name: "روميو", gender: "m", nationality: "الفلبين", language: "تغالوغ" },
  { name: "أنيل", gender: "m", nationality: "سريلانكا", language: "سنهالي" },
  { name: "موهان", gender: "m", nationality: "الهند", language: "كيرلا" },
  { name: "ديفيد", gender: "m", nationality: "اوغندا", language: "انجليزي" },
  { name: "سانجاي", gender: "m", nationality: "الهند", language: "هندي" },
  { name: "ماريا", gender: "f", nationality: "الفلبين", language: "تغالوغ" },
  { name: "لمى", gender: "f", nationality: "الفلبين", language: "تغالوغ" },
  { name: "شانتي", gender: "f", nationality: "سريلانكا", language: "سنهالي" },
  { name: "روزا", gender: "f", nationality: "الفلبين", language: "تغالوغ" },
  { name: "غريس", gender: "f", nationality: "كينيا", language: "انجليزي" },
  { name: "بريا", gender: "f", nationality: "الهند", language: "تاميلي" },
];

/** New Muslims from earlier years, as the association's sheet keeps them. */
const PAST_MUSLIMS: { name: string; gender: Gender; nationality: string; language: string }[] = [
  { name: "عمر لاجوري", gender: "m", nationality: "الفلبين", language: "تغالوغ" },
  { name: "عبدالله راجيش", gender: "m", nationality: "الهند", language: "تلغو" },
  { name: "يوسف بهادور", gender: "m", nationality: "النيبال", language: "نيبالي" },
  { name: "إبراهيم كومار", gender: "m", nationality: "الهند", language: "هندي" },
  { name: "خالد سانتوس", gender: "m", nationality: "الفلبين", language: "تغالوغ" },
  { name: "محمد أولوتشي", gender: "m", nationality: "كينيا", language: "انجليزي" },
  { name: "بلال تيسفاي", gender: "m", nationality: "اثيوبيا", language: "امهري" },
  { name: "عائشة ريس", gender: "f", nationality: "الفلبين", language: "تغالوغ" },
  { name: "مريم بيريرا", gender: "f", nationality: "سريلانكا", language: "سنهالي" },
  { name: "سلمان داس", gender: "m", nationality: "البنقالية", language: "بنقالي" },
];

type Ctx = {
  r: () => number;
  pick: <T>(arr: T[]) => T;
  between: (a: number, b: number) => number;
  nowMs: number;
  iso: (ms: number) => string;
  nextId: (prefix: string) => string;
  beneficiaries: Beneficiary[];
  tasks: Task[];
  assignments: Assignment[];
  notes: Note[];
  callers: StaffSeed[];
  teachers: StaffSeed[];
  supervisorOf: (teamId: string) => string;
};

function associationFiles(c: Ctx): HidayaLog[] {
  const { r, pick, between, nowMs, iso, nextId, beneficiaries } = c;
  const logs: HidayaLog[] = [];
  const today = isoDay(nowMs);
  const saudiPhone = () => `05${Math.floor(10_000_000 + r() * 89_999_999)}`;
  const lessonsUpTo = (n: number) => Array.from({ length: 18 }, (_, i) => i < n);
  let hSerial = 0;
  let mSerial = 0;

  const fillCommon = (b: Beneficiary) => {
    b.city = pick(CITIES);
    b.workplace = pick(WORKPLACES);
    b.profession = pick(PROFESSIONS);
  };

  /** A contact history in the last `spanDays`, which also ticks the follow-up boxes. */
  const history = (b: Beneficiary, userId: string, count: number, spanDays: number, endMs = nowMs) => {
    const kinds: HidayaFollowup[] = ["call", "call", "call", "visit", "visit", "books", "gift"];
    const at: number[] = Array.from({ length: count }, () => endMs - between(0.2, spanDays) * DAY).sort((a, z) => a - z);
    for (const ms of at) {
      const kind = pick(kinds);
      logs.push({ id: nextId("HL"), beneficiaryId: b.id, userId, kind, at: iso(ms), note: "" });
    }
    return at;
  };

  const category = (b: Beneficiary): string => {
    if (b.stage === "learning") return "قريب من الهداية";
    if (b.stage === "interested") return pick(["مهتم", "متردد"]);
    if (b.stage === "contacted") return pick(["مشكك", "متردد", "صعب الهداية"]);
    if (b.stage === "paused") return pick(["صعب الهداية", "رافض"]);
    return "";
  };

  const hidayaFor = (b: Beneficiary, source: string, createdDay: string) => {
    const h = emptyHidaya(++hSerial);
    h.source = source;
    h.firstContact = createdDay;
    h.lastContact = null;
    h.religion = pick(RELIGIONS);
    if (b.stage !== "new") {
      h.doubts = pick(DOUBTS);
      h.interests = pick(INTERESTS);
    }
    b.hidaya = h;
    return h;
  };

  const replay = (b: Beneficiary, userId: string, count: number, span: number, endMs = nowMs) => {
    const before = logs.length;
    history(b, userId, count, span, endMs);
    const h = b.hidaya!;
    h.firstContact = null;
    for (const l of logs.slice(before)) applyHidayaLog({ settings: { recontactDays: DEFAULT_RECONTACT } } as DB, b, l.kind, isoDay(l.at));
    if (!h.lastContact) h.lastContact = null;
    h.firstContact = h.firstContact ?? isoDay(b.createdAt);
  };

  // Everyone the callers already talk to is a هداية case.
  for (const b of beneficiaries) {
    fillCommon(b);
    const src = pick(DEFAULT_LISTS.source);
    const h = hidayaFor(b, src, isoDay(b.createdAt));
    if (b.program === "hidaya") {
      const cat = category(b);
      h.category = cat;
      if (cat) h.categoryHistory = [{ value: cat, at: iso(nowMs - between(2, 25) * DAY), by: b.assignedTo }];
      if (b.stage === "learning") h.categoryHistory.unshift({ value: pick(["مهتم", "متردد"]), at: iso(nowMs - between(30, 60) * DAY), by: b.assignedTo });
      if (cat === "مهتم" && r() < 0.6) h.categoryHistory.unshift({ value: "مشكك", at: iso(nowMs - between(30, 70) * DAY), by: b.assignedTo });
      if (b.stage !== "new") {
        const span = Math.max(3, (nowMs - new Date(b.createdAt).getTime()) / DAY);
        // Some go cold on purpose so "needs contact again" has people in it.
        const cold = r() < 0.2;
        replay(b, b.assignedTo, Math.floor(between(2, 9)), span, cold ? nowMs - between(16, 40) * DAY : nowMs);
        h.result = b.stage === "paused" ? pick(["لم يستجب", "أخرى"]) : b.stage === "contacted" ? pick(["لم يستجب", "استجاب"]) : "استجاب";
        h.nextContact = addDays(today, Math.floor(between(-2, 12)));
      }
    } else {
      // Came through هداية, then embraced Islam.
      replay(b, b.introducedBy ?? b.assignedTo, Math.floor(between(4, 9)), 40, new Date(b.convertedAt!).getTime());
      h.result = CONVERTED;
      h.category = "قريب من الهداية";
      h.categoryHistory = [{ value: "قريب من الهداية", at: iso(new Date(b.convertedAt!).getTime() - 10 * DAY), by: b.introducedBy ?? b.assignedTo }];
      const sinceDays = (nowMs - new Date(b.convertedAt!).getTime()) / DAY;
      const done = Math.min(18, Math.floor(sinceDays / 4));
      const m = emptyMuslim(0, isoDay(b.convertedAt!));
      m.lessons = lessonsUpTo(done);
      m.iqama = `2${Math.floor(100_000_000 + r() * 899_999_999)}`;
      m.sponsorName = pick(SPONSORS);
      m.sponsorPhone = saudiPhone();
      m.contactMethod = pick(["واتساب", "واتساب", "اتصال", "زيارة"]);
      m.status = r() < 0.15 ? "منقطع" : "متابع";
      b.muslim = m;
    }
  }

  // Local residents found by the hidaya program (Saudi numbers, Riyadh time).
  LOCAL_PEOPLE.forEach((p, i) => {
    const fallback = c.callers.filter((s) => s.gender === p.gender);
    const lang = langCodeFor(p.language, pick(fallback).languages[0]);
    const caller = fallback.find((s) => s.languages.includes(lang)) ?? fallback[i % fallback.length];
    const createdMs = nowMs - between(5, 120) * DAY;
    const stage: Stage = i % 5 === 0 ? "new" : i % 5 === 1 ? "contacted" : i % 5 === 2 ? "interested" : i % 5 === 3 ? "learning" : "contacted";
    const id = `B-${1000 + beneficiaries.length + 1}`;
    const b: Beneficiary = {
      id,
      program: "hidaya",
      city: pick(CITIES),
      workplace: pick(WORKPLACES),
      profession: p.gender === "f" ? pick(["عاملة منزلية", "ممرضة", "خياطة"]) : pick(PROFESSIONS.slice(0, 12)),
      nationality: p.nationality,
      languageLabel: p.language,
      hidaya: null,
      muslim: null,
      name: p.name,
      alias: id,
      gender: p.gender,
      language: lang,
      country: "SA",
      timezone: "Asia/Riyadh",
      phone: saudiPhone(),
      preferredHour: pick([12, 18, 19, 20, 21]),
      stage,
      stageHistory: [{ stage: "new", at: iso(createdMs) }, ...(stage !== "new" ? [{ stage, at: iso(createdMs + DAY) }] : [])],
      assignedTo: caller.id,
      introducedBy: null,
      groupId: null,
      sensitive: false,
      background: "",
      needs: "",
      objections: [],
      source: "",
      createdAt: iso(createdMs),
      convertedAt: null,
      summary: null,
      optedOut: false,
    };
    beneficiaries.push(b);
    c.assignments.push({ id: nextId("A"), beneficiaryId: b.id, fromId: null, toId: caller.id, byId: c.supervisorOf(caller.teamId), reason: "إسناد أولي", at: b.createdAt });
    const h = hidayaFor(b, pick(DEFAULT_LISTS.source), isoDay(createdMs));
    h.category = category(b);
    if (h.category) h.categoryHistory = [{ value: h.category, at: iso(createdMs + 2 * DAY), by: caller.id }];
    if (stage !== "new") {
      replay(b, caller.id, Math.floor(between(1, 8)), (nowMs - createdMs) / DAY, i % 3 === 0 ? nowMs - between(18, 35) * DAY : nowMs);
      h.result = stage === "contacted" ? pick(["لم يستجب", "استجاب", "أخرى"]) : "استجاب";
    }
    if (i === 3) c.notes.push({ id: nextId("N"), beneficiaryId: b.id, authorId: caller.id, text: "طلب نسخة من معاني القرآن بالنيبالية، أحضرها في الزيارة القادمة.", at: iso(nowMs - 2 * DAY), needsContact: true });
  });

  // New Muslims from earlier years.
  PAST_MUSLIMS.forEach((p, i) => {
    const teacher = c.teachers.find((s) => s.gender === p.gender && s.languages.includes(langCodeFor(p.language, "hi"))) ?? c.teachers.filter((s) => s.gender === p.gender)[i % 3];
    const lang = langCodeFor(p.language, teacher.languages[0]);
    const caller = c.callers.filter((s) => s.gender === p.gender)[i % 4];
    const convertedMs = nowMs - between(200, 2400) * DAY;
    const id = `B-${1000 + beneficiaries.length + 1}`;
    const b: Beneficiary = {
      id,
      program: "muslim",
      city: pick(CITIES),
      workplace: pick(WORKPLACES),
      profession: pick(PROFESSIONS),
      nationality: p.nationality,
      languageLabel: p.language,
      hidaya: null,
      muslim: null,
      name: p.name,
      alias: id,
      gender: p.gender,
      language: lang,
      country: "SA",
      timezone: "Asia/Riyadh",
      phone: saudiPhone(),
      preferredHour: 20,
      stage: "muslim",
      stageHistory: [{ stage: "muslim", at: iso(convertedMs) }],
      assignedTo: teacher.id,
      introducedBy: caller.id,
      groupId: null,
      sensitive: false,
      background: "",
      needs: "",
      objections: [],
      source: "",
      createdAt: iso(convertedMs - 30 * DAY),
      convertedAt: iso(convertedMs),
      summary: null,
      optedOut: false,
    };
    beneficiaries.push(b);
    c.assignments.push({ id: nextId("A"), beneficiaryId: b.id, fromId: caller.id, toId: teacher.id, byId: c.supervisorOf(teacher.teamId), reason: "انتقل إلى التعليم بعد إسلامه", at: b.convertedAt! });
    const m = emptyMuslim(0, isoDay(convertedMs));
    const finished = i % 3 !== 2;
    m.lessons = lessonsUpTo(finished ? 18 : Math.floor(between(3, 15)));
    m.certificate = finished;
    m.status = finished ? pick(["متابع", "متابع", "مغادرة نهائية", "اجازة"]) : pick(["منقطع", "متابع"]);
    m.iqama = `2${Math.floor(100_000_000 + r() * 899_999_999)}`;
    m.sponsorName = pick(SPONSORS);
    m.sponsorPhone = saudiPhone();
    m.contactMethod = pick(["واتساب", "اتصال", "زيارة"]);
    b.muslim = m;
  });

  // Serials follow the order people joined each program, as in the sheets.
  [...beneficiaries].filter((b) => b.muslim).sort((a, z) => (a.muslim!.islamDate ?? "").localeCompare(z.muslim!.islamDate ?? "")).forEach((b) => (b.muslim!.serial = ++mSerial));
  [...beneficiaries].filter((b) => b.hidaya).sort((a, z) => a.createdAt.localeCompare(z.createdAt)).forEach((b, i) => (b.hidaya!.serial = i + 1));
  void hSerial;
  return logs.sort((a, z) => a.at.localeCompare(z.at));
}
