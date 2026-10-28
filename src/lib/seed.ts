import { BENEFICIARY_LINES, CALLER_LINES, COUNTRIES, LESSONS, TEMPLATES, fillTemplate } from "./content";
import type {
  Assignment,
  Beneficiary,
  DB,
  Gender,
  Lang,
  LessonEvent,
  Message,
  Progress,
  Stage,
  Task,
  Team,
  User,
} from "./types";

export const DB_VERSION = 1;

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
    m: ["Carlos Mendoza", "Diego Ramírez", "José Herrera", "Luis Torres", "Andrés Castillo", "Miguel Ruiz", "Javier Morales", "Ricardo Flores", "Pablo Navarro", "Héctor Silva", "Fernando Ortiz", "Raúl Medina", "Sergio Peña", "Adrián Vega"],
    f: ["María Gómez", "Lucía Fernández", "Sofía Rojas", "Carmen Vargas", "Valentina Cruz", "Isabel Romero", "Paula Díaz"],
  },
  fil: {
    m: ["Juan dela Cruz", "Mark Santos", "Rodel Bautista", "Paolo Reyes", "Jomar Aquino", "Ramon Castro", "Noel Pascual", "Edgar Lim"],
    f: ["Maricel Garcia", "Joy Villanueva", "Angelica Ramos", "Kristine Mendoza", "Liza Navarro", "Rowena Dizon", "Jenny Uy", "Grace Tan"],
  },
  ur: {
    m: ["Arjun Masih", "Samuel Gill", "Daniel Bhatti", "Kashif Masih", "Peter Sandhu"],
    f: ["Sana Gill", "Rubina Masih", "Naila Bhatti"],
  },
  bn: {
    m: ["Rahul Das", "Sujon Roy", "Amit Barua", "Tapan Mondal", "Bijoy Saha", "Partha Ghosh"],
    f: ["Priya Sarkar", "Mitali Das", "Rupa Biswas", "Shila Roy", "Tania Paul", "Moumita Dey"],
  },
  hi: {
    m: ["Rajesh Kumar", "Vikram Singh", "Suresh Patel", "Anil Sharma", "Deepak Yadav", "Manoj Tiwari"],
    f: ["Pooja Verma", "Neha Gupta", "Kavita Joshi", "Sunita Rao"],
  },
  fr: {
    m: ["Jean Dupont", "Koffi Kouassi", "Thomas Martin", "Serge Mbarga", "Yves Konan"],
    f: ["Claire Moreau", "Nadège Ekotto", "Brigitte Yao", "Élodie Bernard", "Awa Koné"],
  },
};

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
];
const OBJECTIONS = [
  "الخوف من رفض الأسرة",
  "أسئلة عن الثالوث",
  "صعوبة الصلاة في مكان العمل",
  "صورة الإسلام في الإعلام",
  "تعلّم العربية للصلاة",
  "الالتزام بالصيام",
];
const SOURCES = ["إعلان فيسبوك", "صفحة المركز", "إحالة صديق", "زيارة المركز", "تيك توك"];

type CallerSeed = { id: string; name: string; gender: Gender; languages: Lang[]; teamId: string; quality: number };

const CALLERS: CallerSeed[] = [
  { id: "U-C01", name: "Ibrahim Garcia", gender: "m", languages: ["es"], teamId: "T1", quality: 0.6 },
  { id: "U-C02", name: "Hamza Martinez", gender: "m", languages: ["es"], teamId: "T1", quality: 1.3 },
  { id: "U-C13", name: "Yusuf Hernandez", gender: "m", languages: ["es"], teamId: "T1", quality: 0.8 },
  { id: "U-C03", name: "Fatima Lopez", gender: "f", languages: ["es"], teamId: "T1", quality: 0.8 },
  { id: "U-C04", name: "Omar Diallo", gender: "m", languages: ["fr", "es"], teamId: "T1", quality: 1.0 },
  { id: "U-C05", name: "Khadija Traoré", gender: "f", languages: ["fr", "es"], teamId: "T1", quality: 0.7 },
  { id: "U-C06", name: "Abdulrahman Reyes", gender: "m", languages: ["fil"], teamId: "T2", quality: 0.9 },
  { id: "U-C14", name: "Musa Bautista", gender: "m", languages: ["fil"], teamId: "T2", quality: 1.2 },
  { id: "U-C07", name: "Aisha Santos", gender: "f", languages: ["fil"], teamId: "T2", quality: 0.6 },
  { id: "U-C15", name: "Maryam Cruz", gender: "f", languages: ["fil"], teamId: "T2", quality: 1.0 },
  { id: "U-C08", name: "Bilal Ahmed", gender: "m", languages: ["ur", "hi"], teamId: "T2", quality: 1.1 },
  { id: "U-C09", name: "Zainab Akhtar", gender: "f", languages: ["ur", "hi"], teamId: "T2", quality: 0.8 },
  { id: "U-C10", name: "Rashid Hossain", gender: "m", languages: ["bn"], teamId: "T2", quality: 1.6 },
  { id: "U-C16", name: "Salman Uddin", gender: "m", languages: ["bn", "hi"], teamId: "T2", quality: 0.9 },
  { id: "U-C11", name: "Nusrat Begum", gender: "f", languages: ["bn"], teamId: "T2", quality: 0.9 },
  { id: "U-C17", name: "Hafsa Rahman", gender: "f", languages: ["bn", "hi"], teamId: "T2", quality: 0.7 },
  { id: "U-C12", name: "Imran Khan", gender: "m", languages: ["hi", "ur"], teamId: "T2", quality: 1.0 },
];

/** Stages for each caller's four cases, varied a little per caller. */
const STAGE_PATTERNS: Stage[][] = [
  ["muslim", "muslim", "learning", "new"],
  ["muslim", "learning", "interested", "contacted"],
  ["muslim", "muslim", "interested", "new"],
  ["muslim", "learning", "contacted", "paused"],
  ["muslim", "muslim", "interested", "contacted"],
];

export function createSeed(now = new Date()): DB {
  const r = rng(1447);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const between = (a: number, b: number) => a + r() * (b - a);
  const nowMs = now.getTime();
  const H = 3600_000;
  const D = 24 * H;
  const iso = (ms: number) => new Date(Math.min(ms, nowMs)).toISOString();
  let idCounter = 1000;
  const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

  const users: User[] = [
    { id: "U-A01", name: "عبدالله (الإدارة)", role: "admin", gender: "m", languages: [], teamId: null, status: "available", lastSeenAt: iso(nowMs - 2 * H) },
    { id: "U-S01", name: "خالد العتيبي", role: "supervisor", gender: "m", languages: ["es", "fr"], teamId: "T1", status: "available", lastSeenAt: iso(nowMs - 5 * H) },
    { id: "U-S02", name: "يوسف القحطاني", role: "supervisor", gender: "m", languages: ["ur", "hi"], teamId: "T2", status: "available", lastSeenAt: iso(nowMs - 20 * H) },
    ...CALLERS.map<User>((c) => ({
      id: c.id,
      name: c.name,
      role: "caller",
      gender: c.gender,
      languages: c.languages,
      teamId: c.teamId,
      status: c.id === "U-C02" ? "leave" : "available",
      lastSeenAt: iso(nowMs - (c.id === "U-C10" ? 9 * D : between(1, 60) * H)),
    })),
  ];

  const teams: Team[] = [
    { id: "T1", name: "فريق أمريكا اللاتينية وأفريقيا", supervisorId: "U-S01" },
    { id: "T2", name: "فريق آسيا", supervisorId: "U-S02" },
  ];

  const beneficiaries: Beneficiary[] = [];
  const messages: Message[] = [];
  const tasks: Task[] = [];
  const progress: Progress[] = [];
  const assignments: Assignment[] = [];
  const usedNames = new Set<string>();

  const msg = (b: Beneficiary, direction: "in" | "out", at: number, line: { ar: string } & Record<Lang, string>, authorId: string | null, kind: Message["kind"] = "text", status: Message["status"] = null): Message => ({
    id: nextId("M"),
    beneficiaryId: b.id,
    direction,
    text: line[b.language],
    translation: line.ar,
    at: iso(at),
    authorId,
    status: direction === "out" ? status ?? "read" : null,
    kind,
  });

  CALLERS.forEach((caller, ci) => {
    const pattern = STAGE_PATTERNS[ci % STAGE_PATTERNS.length];
    pattern.forEach((stage, bi) => {
      const lang = caller.languages[bi % caller.languages.length];
      const pool = NAMES[lang][caller.gender].filter((n) => !usedNames.has(n));
      const name = pool[0] ?? `${pick(NAMES[lang][caller.gender])} ${bi}`;
      usedNames.add(name);
      const country = pick(COUNTRIES.filter((c) => c.lang === lang));
      const createdMs = nowMs - between(stage === "new" ? 1 : 20, stage === "new" ? 4 : 200) * D;
      const id = `B-${1000 + beneficiaries.length + 1}`;

      // Build a stage history that ends in the current stage.
      const order: Stage[] = ["new", "contacted", "interested", "learning", "muslim"];
      const reached = stage === "paused" ? "interested" : stage;
      const steps = order.slice(0, order.indexOf(reached as Stage) + 1);
      const history = steps.map((s, i) => ({ stage: s, at: iso(createdMs + ((nowMs - createdMs) * 0.8 * i) / Math.max(steps.length, 2)) }));
      if (stage === "paused") history.push({ stage: "paused", at: iso(nowMs - between(5, 20) * D) });
      const convertedAt = stage === "muslim" ? history[history.length - 1].at : null;

      const b: Beneficiary = {
        id,
        name,
        alias: id,
        gender: caller.gender,
        language: lang,
        country: country.code,
        timezone: country.tz,
        phone: `${country.dial} ${Math.floor(100 + r() * 899)} ${Math.floor(100 + r() * 899)} ${Math.floor(1000 + r() * 8999)}`,
        preferredHour: pick([8, 12, 18, 19, 20, 21]),
        stage,
        stageHistory: history,
        assignedTo: caller.id,
        sensitive: r() < 0.22,
        background: pick(BACKGROUNDS),
        needs: pick(NEEDS),
        objections: [pick(OBJECTIONS), pick(OBJECTIONS)].filter((v, i, a) => a.indexOf(v) === i),
        source: pick(SOURCES),
        createdAt: iso(createdMs),
        convertedAt,
        summary: null,
        optedOut: false,
      };
      beneficiaries.push(b);
      assignments.push({ id: nextId("A"), beneficiaryId: id, fromId: null, toId: caller.id, byId: teams.find((t) => t.id === caller.teamId)!.supervisorId, reason: "إسناد أولي", at: b.createdAt });

      // Conversation: alternating turns, the caller's reply speed depends on quality.
      const turns = stage === "new" ? 1 : Math.floor(between(3, 7));
      const endMs = nowMs - between(2, stage === "paused" ? 15 * 24 : 80) * H;
      let t = Math.max(createdMs, nowMs - 25 * D);
      const span = (endMs - t) / (turns + 1);
      for (let k = 0; k < turns; k++) {
        const inLine = k === 0 ? BENEFICIARY_LINES[0] : pick(BENEFICIARY_LINES.slice(1));
        messages.push(msg(b, "in", t, inLine, null));
        const replyH = between(0.3, 14) * caller.quality * (r() < 0.15 ? 3 : 1);
        const leaveUnanswered = k === turns - 1 && r() < 0.35 && stage !== "paused";
        if (!leaveUnanswered) {
          messages.push(msg(b, "out", t + replyH * H, k === 0 ? CALLER_LINES[0] : pick(CALLER_LINES.slice(1)), caller.id));
        }
        t += span;
      }
      // A recent unanswered message gives callers something in "waiting for reply".
      if (stage !== "paused" && stage !== "new" && r() < 0.3) {
        messages.push(msg(b, "in", nowMs - between(1, 20) * H, pick(BENEFICIARY_LINES.slice(1)), null));
      }

      // Past follow-up tasks drive the "on time" metric.
      const pastCount = stage === "new" ? 0 : Math.floor(between(2, 6));
      for (let k = 0; k < pastCount; k++) {
        const due = nowMs - between(1, 30) * D;
        const late = r() < 0.06 + 0.16 * (caller.quality - 0.6);
        tasks.push({
          id: nextId("TK"),
          beneficiaryId: id,
          assigneeId: caller.id,
          title: "متابعة دورية",
          kind: "followup",
          due: iso(due),
          createdAt: iso(due - 3 * D),
          doneAt: late ? (r() < 0.5 ? iso(due + between(1, 3) * D) : null) : iso(due - between(0, 20) * H),
        });
      }
      // The next open follow-up.
      if (stage !== "muslim" && stage !== "closed") {
        const due = stage === "new" ? nowMs - between(1, 10) * H : nowMs + between(-2.5, 2.5) * D;
        tasks.push({
          id: nextId("TK"),
          beneficiaryId: id,
          assigneeId: caller.id,
          title: stage === "new" ? "أول تواصل" : stage === "paused" ? "محاولة إعادة التواصل" : "متابعة الحوار",
          kind: stage === "new" ? "first_contact" : "followup",
          due: iso(due),
          createdAt: iso(due - 2 * D),
          doneAt: null,
        });
      }

      // New Muslim learning path.
      if (stage === "muslim" && convertedAt) {
        const convMs = new Date(convertedAt).getTime();
        const daysIn = (nowMs - convMs) / D;
        // Mix of healthy, slowing and silent learners.
        const roll = r();
        const state = roll < 0.55 ? "green" : roll < 0.8 ? "yellow" : "red";
        const events: LessonEvent[] = [];
        const evening = b.preferredHour >= 18;
        let tMs = convMs + 1 * D;
        const maxLessons = Math.min(LESSONS.length, Math.max(1, Math.floor(daysIn / 3.5)));
        // Lessons go out at the learner's preferred local hour.
        const atPreferredHour = (ms: number) => {
          const local = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: b.timezone }).format(new Date(ms))) % 24;
          const shift = (b.preferredHour - local + 24) % 24;
          const d = new Date(ms + shift * H);
          d.setUTCMinutes(Math.floor(r() * 10), 0, 0);
          return d.getTime();
        };
        for (let li = 1; li <= maxLessons; li++) {
          const sentAt = atPreferredHour(tMs);
          const quick = r() < (evening ? 0.9 : 0.6);
          const startedAt = sentAt + (quick ? between(0.2, 5) : between(10, 40)) * H;
          const last = li === maxLessons;
          if (last && state !== "green") {
            // Silent learners stop at the last lesson sent.
            const silentFor = state === "yellow" ? between(4, 6) : between(8, 15);
            events.push({ lesson: li, sentAt: iso(nowMs - silentFor * D), startedAt: null, completedAt: null, correct: null });
            break;
          }
          if (startedAt > nowMs) {
            events.push({ lesson: li, sentAt: iso(sentAt), startedAt: null, completedAt: null, correct: null });
            break;
          }
          const completedAt = startedAt + between(0.1, 1) * H;
          events.push({ lesson: li, sentAt: iso(sentAt), startedAt: iso(startedAt), completedAt: iso(completedAt), correct: r() < (li === 4 || li === 8 ? 0.55 : 0.85) });
          tMs = completedAt + between(2, 3.5) * D;
          if (tMs > nowMs) break;
        }
        // Slowing learners also struggle with quizzes.
        if (state === "yellow") events.slice(-3).forEach((e) => e.completedAt && (e.correct = false));
        progress.push({ beneficiaryId: id, events });

        const lastEvent = events[events.length - 1];
        if (lastEvent) {
          const tpl = TEMPLATES.lesson_ready;
          messages.push({
            id: nextId("M"),
            beneficiaryId: id,
            direction: "out",
            text: fillTemplate(tpl[lang], { name: name.split(" ")[0] }),
            translation: fillTemplate(tpl.ar, { name: name.split(" ")[0] }),
            at: lastEvent.sentAt,
            authorId: null,
            status: lastEvent.startedAt ? "read" : state === "red" ? "delivered" : "read",
            kind: "template",
          });
        }

        // Check-in milestones near today.
        for (const day of [14, 30, 90]) {
          const dueMs = convMs + day * D;
          if (Math.abs(dueMs - nowMs) < 3 * D) {
            tasks.push({ id: nextId("TK"), beneficiaryId: id, assigneeId: caller.id, title: `اطمئنان بعد ${day} يومًا من الإسلام`, kind: "checkin", due: iso(dueMs), createdAt: iso(dueMs - 7 * D), doneAt: null });
          }
        }
      }
    });
  });

  messages.sort((a, b) => a.at.localeCompare(b.at));

  return {
    version: DB_VERSION,
    seededAt: now.toISOString(),
    users,
    teams,
    beneficiaries,
    messages,
    notes: beneficiaries
      .filter((_, i) => i % 3 === 0)
      .map((b, i) => ({
        id: `N-${2000 + i}`,
        beneficiaryId: b.id,
        authorId: b.assignedTo,
        text: i % 2 === 0 ? "طلب مقطعًا صوتيًا يشرح الوضوء بلغته. أرسله له." : "ذكر أن أخاه غاضب منه. يحتاج اتصالاً للاطمئنان.",
        at: new Date(nowMs - (i + 1) * 9 * H).toISOString(),
        needsContact: true,
      })),
    tasks,
    lessons: LESSONS,
    progress,
    assignments,
    audit: [],
  };
}
