import { addDays, daysBetween, hijriOf, isoDay } from "./hijri";
import type { Beneficiary, DB, HidayaFile, HidayaFollowup, Lang, ListKey, MuslimFile, User } from "./types";
import { MUSLIM_LESSONS } from "./types";

/** The association's drop-down lists, as in the two spreadsheets. Management can edit them. */
export const DEFAULT_LISTS: Record<ListKey, string[]> = {
  category: ["قريب من الهداية", "مهتم", "متردد", "مشكك", "صعب الهداية", "رافض"],
  result: ["استجاب", "لم يستجب", "أخرى"],
  source: ["الجوال الدعوي", "السيارة الدعوية", "نطاقات", "مجيب", "عبدالرحمن", "مسح الصناعية", "ثناء", "رابط الاستبيان", "زيارات ميدانية"],
  nationality: ["الهند", "النيبال", "الفلبين", "اوغندا", "كينيا", "سريلانكا", "البنقالية", "باكستان", "مصر", "فيتنام", "غانا", "اثيوبيا", "اسكتلندا", "تنزانيا", "المكسيك", "كولومبيا", "بيرو", "فرنسا", "ساحل العاج", "الكاميرون"],
  language: ["هندي", "نيبالي", "تغالوغ", "انجليزي", "تاميلي", "اردو", "كيرلا", "يوبي", "بنقالي", "سنهالي", "تلغو", "تجريني", "امهري", "اورمو", "اوغندي", "بشتو", "كيني", "عربي", "فيتنامي", "اسباني", "فرنسي"],
  religion: ["مسيحي", "هندوسي", "بوذي", "سيخي", "لا ديني", "أخرى"],
  city: ["عنيزة", "بريدة", "الرس", "البكيرية", "المذنب"],
  status: ["متابع", "منقطع", "اجازة", "مغادرة نهائية"],
  contactMethod: ["اتصال", "واتساب", "زيارة", "أخرى"],
};

/** Days between contacts, by classification, before a هداية case shows in "needs contact again". */
export const DEFAULT_RECONTACT: Record<string, number> = {
  "قريب من الهداية": 7,
  مهتم: 10,
  متردد: 14,
  مشكك: 14,
  "صعب الهداية": 30,
  رافض: 60,
};
export const DEFAULT_RECONTACT_DAYS = 14;
/** The sheet asks for at least four visits per person. */
export const MIN_VISITS = 4;

export const CONVERTED = "أسلم";

/** Lesson language code for a language as the association writes it; unknown ones keep the fallback. */
const LANG_CODES: Record<string, Lang> = {
  هندي: "hi",
  نيبالي: "hi",
  تغالوغ: "fil",
  اردو: "ur",
  اوردو: "ur",
  بنقالي: "bn",
  بنجالي: "bn",
  اسباني: "es",
  فرنسي: "fr",
};
export function langCodeOf(label: string): Lang | null {
  return LANG_CODES[label.trim()] ?? null;
}
export function langCodeFor(label: string, fallback: Lang): Lang {
  return langCodeOf(label) ?? fallback;
}
export const LANG_LABEL_FOR: Record<Lang, string> = { es: "اسباني", fil: "تغالوغ", ur: "اردو", bn: "بنقالي", hi: "هندي", fr: "فرنسي" };

export const FOLLOWUP_LABELS: Record<HidayaFollowup, { ar: string; en: string }> = {
  call: { ar: "اتصال", en: "Call" },
  books: { ar: "كتب", en: "Books" },
  visit: { ar: "زيارة", en: "Visit" },
  gift: { ar: "هدية", en: "Gift" },
};

/** Field labels, in the order of the sheets. */
export const F = {
  serial: { ar: "م", en: "#" },
  name: { ar: "الاسم", en: "Name" },
  city: { ar: "المدينة", en: "City" },
  workplace: { ar: "مكان العمل", en: "Workplace" },
  profession: { ar: "المهنة", en: "Profession" },
  nationality: { ar: "الجنسية", en: "Nationality" },
  language: { ar: "اللغة", en: "Language" },
  gender: { ar: "الجنس", en: "Gender" },
  callerFollow: { ar: "متابعة الداعية", en: "Caller following up" },
  phone: { ar: "رقم الجوال", en: "Mobile" },
  source: { ar: "المصدر", en: "Source" },
  firstContact: { ar: "تاريخ التواصل الأول", en: "First contact" },
  lastContact: { ar: "تاريخ آخر تواصل", en: "Last contact" },
  followup: { ar: "المتابعة", en: "Follow-up" },
  visits: { ar: "عدد الزيارات", en: "Visits" },
  result: { ar: "نتيجة التواصل", en: "Result" },
  category: { ar: "تصنيف الحالة", en: "Classification" },
  religion: { ar: "الديانة", en: "Religion" },
  doubts: { ar: "أبرز الشبهات والأسئلة", en: "Main doubts and questions" },
  interests: { ar: "ما يهتم به", en: "Interests" },
  nextContact: { ar: "موعد التواصل القادم", en: "Next contact" },
  islamDate: { ar: "تاريخ الإسلام", en: "Date of Islam" },
  caller: { ar: "الداعية", en: "Caller" },
  follower: { ar: "متابعة", en: "Followed by" },
  iqama: { ar: "رقم الإقامة", en: "Iqama number" },
  sponsorName: { ar: "اسم الكفيل", en: "Sponsor" },
  sponsorPhone: { ar: "جوال الكفيل", en: "Sponsor mobile" },
  status: { ar: "الحالة", en: "Status" },
  contactMethod: { ar: "وسيلة التواصل", en: "Contact method" },
  lessons: { ar: "الدروس", en: "Lessons" },
  stage: { ar: "المرحلة", en: "Stage" },
  certificate: { ar: "الشهادة", en: "Certificate" },
} as const;
export type FieldKey = keyof typeof F;

export const LIST_LABELS: Record<ListKey, { ar: string; en: string }> = {
  category: F.category,
  result: F.result,
  source: F.source,
  nationality: F.nationality,
  language: F.language,
  religion: F.religion,
  city: F.city,
  status: F.status,
  contactMethod: F.contactMethod,
};

export function emptyHidaya(serial: number): HidayaFile {
  return {
    serial,
    source: "",
    firstContact: isoDay(),
    lastContact: null,
    followup: { call: false, books: false, visit: false, gift: false },
    visits: 0,
    result: "",
    category: "",
    categoryHistory: [],
    religion: "",
    doubts: "",
    interests: "",
    nextContact: null,
  };
}

export function emptyMuslim(serial: number, islamDate: string | null): MuslimFile {
  return { serial, islamDate, iqama: "", sponsorName: "", sponsorPhone: "", status: "متابع", contactMethod: "", lessons: Array(MUSLIM_LESSONS).fill(false), certificate: false };
}

export function nextSerial(db: DB, program: "hidaya" | "muslim") {
  const nums = db.beneficiaries.map((b) => (program === "hidaya" ? b.hidaya?.serial : b.muslim?.serial) ?? 0);
  return Math.max(0, ...nums) + 1;
}

// ---------- هداية ----------

export const hidayaCases = (list: Beneficiary[]) => list.filter((b) => b.hidaya);
export const activeHidaya = (list: Beneficiary[]) => list.filter((b) => b.hidaya && b.program === "hidaya");

export function recontactDays(db: DB, category: string) {
  return db.settings.recontactDays[category] ?? DEFAULT_RECONTACT_DAYS;
}

export type RecontactReason = { kind: "due"; day: string } | { kind: "cold"; days: number; limit: number } | { kind: "never" } | { kind: "visits"; visits: number };

/** Why a هداية case needs contact again today, most urgent first. */
export function recontactReasons(db: DB, b: Beneficiary, today = isoDay()): RecontactReason[] {
  const h = b.hidaya;
  if (!h || b.program !== "hidaya" || h.category === "رافض") return [];
  const out: RecontactReason[] = [];
  if (h.nextContact && h.nextContact <= today) out.push({ kind: "due", day: h.nextContact });
  const last = h.lastContact ?? null;
  if (!last) out.push({ kind: "never" });
  else {
    const limit = recontactDays(db, h.category);
    const days = daysBetween(last, today);
    if (days > limit && !(h.nextContact && h.nextContact > today)) out.push({ kind: "cold", days, limit });
  }
  if (h.result === "استجاب" && h.visits < MIN_VISITS) out.push({ kind: "visits", visits: h.visits });
  return out;
}

/** Due, never contacted or gone cold: the reasons that put someone on today's list (not just missing visits). */
export function needsContact(db: DB, b: Beneficiary, today = isoDay()) {
  return recontactReasons(db, b, today).some((r) => r.kind !== "visits");
}

/** Ticks the follow-up box and moves the contact dates after a call, books, a visit or a gift. */
export function applyHidayaLog(db: DB, b: Beneficiary, kind: HidayaFollowup, day: string) {
  const h = b.hidaya;
  if (!h) return;
  h.followup[kind] = true;
  if (kind === "visit") h.visits += 1;
  if (!h.firstContact) h.firstContact = day;
  if (!h.lastContact || day > h.lastContact) h.lastContact = day;
  if (h.nextContact && h.nextContact <= day) h.nextContact = addDays(day, recontactDays(db, h.category));
  if (b.stage === "new") {
    b.stage = "contacted";
    b.stageHistory.push({ stage: "contacted", at: new Date().toISOString() });
  }
}

// ---------- المسلم الجديد ----------

export const muslimCases = (list: Beneficiary[]) => list.filter((b) => b.program === "muslim" && b.muslim);

export function lessonsDone(m: MuslimFile) {
  return m.lessons.filter(Boolean).length;
}

/** Stage 1-3 by how far the person has gone: the first unfinished lesson decides it. */
export function muslimStage(m: MuslimFile): 1 | 2 | 3 {
  const first = m.lessons.findIndex((x) => !x);
  const at = first === -1 ? MUSLIM_LESSONS - 1 : first;
  return at < 6 ? 1 : at < 12 ? 2 : 3;
}

export const STAGE_NAMES = { 1: { ar: "المرحلة الأولى", en: "Stage one" }, 2: { ar: "المرحلة الثانية", en: "Stage two" }, 3: { ar: "المرحلة الثالثة", en: "Stage three" } } as const;

// ---------- Counts for the home boxes and metrics ----------

export function hijriYearMonth(day: string | null | undefined) {
  if (!day) return null;
  const h = hijriOf(day);
  return { y: h.y, m: h.m };
}

export function convertedIn(b: Beneficiary, today = isoDay()) {
  const now = hijriOf(today);
  const at = hijriYearMonth(b.muslim?.islamDate ?? (b.convertedAt ? isoDay(b.convertedAt) : null));
  return { year: !!at && at.y === now.y, month: !!at && at.y === now.y && at.m === now.m };
}

export function hidayaSummary(db: DB, list: Beneficiary[], today = isoDay()) {
  const all = hidayaCases(list);
  const active = all.filter((b) => b.program === "hidaya");
  const converted = all.filter((b) => b.program === "muslim");
  return {
    total: all.length,
    active: active.length,
    responded: active.filter((b) => b.hidaya!.result === "استجاب").length,
    notResponded: active.filter((b) => b.hidaya!.result === "لم يستجب").length,
    converted: converted.length,
    convertedMonth: converted.filter((b) => convertedIn(b, today).month).length,
    convertedYear: converted.filter((b) => convertedIn(b, today).year).length,
    recontact: active.filter((b) => needsContact(db, b, today)).length,
    contactsMonth: db.hidayaLogs.filter((l) => all.some((b) => b.id === l.beneficiaryId) && hijriYearMonth(isoDay(l.at))?.m === hijriOf(today).m && hijriYearMonth(isoDay(l.at))?.y === hijriOf(today).y).length,
  };
}

export function muslimSummary(list: Beneficiary[], today = isoDay()) {
  const all = muslimCases(list);
  const stage = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
  for (const b of all) if (!b.muslim!.certificate) stage[muslimStage(b.muslim!)]++;
  return {
    total: all.length,
    year: all.filter((b) => convertedIn(b, today).year).length,
    month: all.filter((b) => convertedIn(b, today).month).length,
    stage,
    certificates: all.filter((b) => b.muslim!.certificate).length,
    following: all.filter((b) => b.muslim!.status === "متابع").length,
    stopped: all.filter((b) => b.muslim!.status === "منقطع").length,
  };
}

/** Per caller: cases, contacts this month, visits, response and how many embraced Islam. */
export function callerPerformance(db: DB, staff: User[], list: Beneficiary[], today = isoDay()) {
  const now = hijriOf(today);
  const cases = hidayaCases(list);
  return staff
    .map((u) => {
      const mine = cases.filter((b) => (b.program === "hidaya" ? b.assignedTo === u.id : b.introducedBy === u.id || b.assignedTo === u.id));
      const active = mine.filter((b) => b.program === "hidaya");
      const logs = db.hidayaLogs.filter((l) => l.userId === u.id && mine.some((b) => b.id === l.beneficiaryId));
      const monthLogs = logs.filter((l) => {
        const h = hijriOf(isoDay(l.at));
        return h.y === now.y && h.m === now.m;
      });
      const converted = mine.filter((b) => b.program === "muslim");
      const contacted = active.filter((b) => b.hidaya!.result);
      return {
        user: u,
        active: active.length,
        contactsMonth: monthLogs.length,
        visitsMonth: monthLogs.filter((l) => l.kind === "visit").length,
        responded: active.filter((b) => b.hidaya!.result === "استجاب").length,
        responseRate: contacted.length ? Math.round((active.filter((b) => b.hidaya!.result === "استجاب").length / contacted.length) * 100) : null,
        overdue: active.filter((b) => recontactReasons(db, b, today).some((r) => r.kind !== "visits")).length,
        converted: converted.length,
        convertedYear: converted.filter((b) => convertedIn(b, today).year).length,
      };
    })
    .filter((r) => r.active || r.converted || r.contactsMonth);
}

export function countBy<T>(items: T[], key: (x: T) => string) {
  const m = new Map<string, number>();
  for (const x of items) {
    const k = key(x) || "—";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** The order of classifications, closest to Islam first, so a move up the list is progress. */
export function categoryRank(db: DB, category: string) {
  const i = db.settings.lists.category.indexOf(category);
  return i === -1 ? 99 : i;
}
