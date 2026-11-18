import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, BookOpen, CalendarClock, Gauge, GraduationCap, HelpCircle, Inbox, KeyRound, ListChecks, Megaphone, Network, PhoneCall, PhoneOutgoing, QrCode, Repeat, ScrollText, ShieldCheck, ToggleRight, UsersRound } from "lucide-react";
import type { DB, Role, UiLang } from "./types";

/**
 * Every part of the platform beyond the four main screens, listed once.
 * The "More" screen is built from this list, and management can switch any
 * feature that is not core off (and back on) from the features page.
 */
export type FeatureGroup = "work" | "teach" | "reports" | "manage" | "about";

export type Feature = {
  key: string;
  /** The page the tile opens; features without a page change behavior elsewhere. */
  href?: string;
  icon: LucideIcon;
  title: Record<UiLang, string>;
  desc: Record<UiLang, string>;
  roles: Role[];
  group: FeatureGroup;
  /** Where the feature is reached from. Only "more" features get a tile on the More screen. */
  place?: "more" | "people" | "chats" | "inside";
  /** Starts switched off until management turns it on. */
  defaultOff?: boolean;
  /** Core features cannot be switched off: without them the platform cannot be run. */
  core?: boolean;
};

const ALL: Role[] = ["admin", "supervisor", "caller", "teacher"];
const LEADS: Role[] = ["admin", "supervisor"];

export const FEATURES: Feature[] = [
  {
    key: "recontact",
    href: "/hidaya/followup",
    icon: PhoneCall,
    title: { ar: "إعادة التواصل", en: "Contact again" },
    desc: { ar: "حالات هداية التي حان موعدها أو بردت", en: "Hidaya cases that are due or going cold" },
    roles: ["admin", "supervisor", "caller"],
    place: "people",
    group: "work",
  },
  {
    key: "scholarQuestions",
    href: "/questions",
    icon: HelpCircle,
    title: { ar: "اسأل أهل العلم", en: "Ask the scholars" },
    desc: { ar: "سؤال لا تعرف جوابه، يجيب عنه المشرف أو يحيله", en: "A question you cannot answer, answered or passed on by your supervisor" },
    roles: ALL,
    group: "work",
  },
  {
    key: "contentCheck",
    icon: ShieldCheck,
    title: { ar: "فحص المحتوى الشرعي", en: "Religious content check" },
    desc: { ar: "تنبيه عند ذكر حكم صريح أو آية وحديث بلا مصدر في الدروس والأجوبة", en: "Flags outright rulings, and verses or hadith without a source, in lessons and answers" },
    roles: LEADS,
    group: "teach",
    place: "inside",
  },
  {
    key: "captureLinks",
    href: "/sources",
    icon: QrCode,
    title: { ar: "مصادر التعرّف ورموز QR", en: "Sources and QR codes" },
    desc: { ar: "لكل مصدر رابط ورمز يفتح حالة جديدة باسمه، وأي المصادر أنجح", en: "A link and QR code per source that opens a case under it, and which sources work best" },
    roles: ["admin", "supervisor", "caller"],
    group: "work",
  },
  {
    key: "addChat",
    href: "/share",
    icon: Inbox,
    title: { ar: "إضافة محادثة", en: "Add a chat" },
    desc: { ar: "محادثة من جوالك الشخصي إلى ملف المستفيد", en: "A chat from your own phone into a file" },
    roles: ALL,
    place: "chats",
    group: "work",
  },
  {
    key: "phoneSend",
    icon: PhoneOutgoing,
    title: { ar: "أرسل من جوالي", en: "Send from my phone" },
    desc: { ar: "يفتح واتساب الموظف برسالة جاهزة ويسجّلها", en: "Opens the staff member's WhatsApp with a ready message and logs it" },
    roles: ALL,
    place: "inside",
    group: "work",
  },
  {
    key: "groups",
    href: "/groups",
    icon: UsersRound,
    title: { ar: "المجموعات والحلقات", en: "Groups and circles" },
    desc: { ar: "أعضاء كل مجموعة وتقدمهم وأيام الإرسال", en: "Members, progress and sending days" },
    roles: ALL,
    place: "people",
    group: "teach",
  },
  {
    key: "teacherBoard",
    href: "/teaching",
    icon: GraduationCap,
    title: { ar: "لوحة المعلم", en: "Teacher's board" },
    desc: { ar: "أنسب وقت لإرسال الدروس، وحال كل طالب، والدروس الصعبة", en: "Best time to send lessons, each learner, hardest lessons" },
    roles: ["admin", "supervisor", "teacher"],
    group: "teach",
  },
  {
    key: "schedule",
    href: "/schedule",
    icon: CalendarClock,
    title: { ar: "جدول الدروس", en: "Lesson schedule" },
    desc: { ar: "ما سيُرسل في الأيام السبعة القادمة", en: "What goes out in the next seven days" },
    roles: ["admin", "supervisor", "teacher"],
    group: "teach",
  },
  {
    key: "lessons",
    href: "/lessons",
    icon: BookOpen,
    title: { ar: "مكتبة الدروس", en: "Lesson library" },
    desc: { ar: "الدروس الثمانية عشر بلغات المستفيدين", en: "The eighteen lessons in every language" },
    roles: ["admin", "supervisor", "teacher"],
    group: "teach",
  },
  {
    key: "hidayaInsights",
    href: "/hidaya/insights",
    icon: BarChart3,
    title: { ar: "مؤشرات هداية", en: "Hidaya metrics" },
    desc: { ar: "من أسلم كل شهر هجري، وأداء كل داعية", en: "Conversions each Hijri month, and each caller" },
    roles: ALL,
    place: "people",
    group: "reports",
  },
  {
    key: "chatInsights",
    href: "/insights",
    icon: Activity,
    title: { ar: "إحصائيات التواصل", en: "Contact statistics" },
    desc: { ar: "سرعة الرد، والمنقطعون، وأنسب أوقات التواصل", en: "Reply speed, who went quiet, best times" },
    roles: ALL,
    group: "reports",
  },
  {
    key: "dashboard",
    href: "/dashboard",
    icon: Gauge,
    title: { ar: "المؤشرات", en: "Metrics" },
    desc: { ar: "الدعاة والمعلمون والمشرفون والتعليم", en: "Callers, teachers, supervisors and teaching" },
    roles: LEADS,
    group: "reports",
  },
  {
    key: "rules",
    href: "/rules",
    icon: Repeat,
    title: { ar: "قواعد المتابعة", en: "Follow-up rules" },
    desc: { ar: "متى تظهر الحالة في «يومي» تلقائيًا", en: "When a case shows on My day by itself" },
    roles: LEADS,
    group: "manage",
  },
  {
    key: "team",
    href: "/team",
    icon: Network,
    title: { ar: "الهيكل والصلاحيات", en: "Structure and access" },
    desc: { ar: "الفرق، ومن يرى ماذا، ونقل الحالات", en: "Teams, who sees what, moving cases" },
    roles: LEADS,
    group: "manage",
    core: true,
  },
  {
    key: "lists",
    href: "/lists",
    icon: ListChecks,
    title: { ar: "القوائم", en: "Lists" },
    desc: { ar: "خيارات جدولي هداية والمسلم الجديد", en: "Choices in both sheets" },
    roles: ["admin"],
    group: "manage",
    core: true,
  },
  {
    key: "features",
    href: "/features",
    icon: ToggleRight,
    title: { ar: "المميزات", en: "Features" },
    desc: { ar: "فعّل أو عطّل أي ميزة للجميع", en: "Switch any feature on or off for everyone" },
    roles: ["admin"],
    group: "manage",
    core: true,
  },
  {
    key: "access",
    href: "/access",
    icon: KeyRound,
    title: { ar: "أسماء الدخول وكلمات المرور", en: "Usernames and passwords" },
    desc: { ar: "ضع لكل موظف اسم دخول وكلمة مرور", en: "Give each staff member a username and password" },
    roles: ["admin", "supervisor"],
    group: "manage",
    core: true,
  },
  {
    key: "passwordLogin",
    icon: KeyRound,
    title: { ar: "الدخول بكلمة مرور", en: "Password sign-in" },
    desc: { ar: "كل موظف يدخل باسم دخول وكلمة مرور تضعها له الإدارة أو مشرفه، بدل اختيار الاسم من قائمة. ضع لنفسك كلمة مرور أولًا.", en: "Each staff member signs in with a username and password set by management or their supervisor, instead of picking a name. Set your own password first." },
    roles: ["admin"],
    group: "manage",
    place: "inside",
    defaultOff: true,
  },
  {
    key: "auditLog",
    href: "/audit",
    icon: ScrollText,
    title: { ar: "سجل الاطلاع", en: "Access log" },
    desc: { ar: "من دخل، ومن فتح أي ملف، ومن غيّر ماذا ومتى", en: "Who signed in, who opened which file, who changed what and when" },
    roles: ["admin"],
    group: "manage",
  },
  {
    key: "updates",
    href: "/updates",
    icon: Megaphone,
    title: { ar: "التحديثات", en: "Updates" },
    desc: { ar: "كل جديد في المنصة بلغة بسيطة", en: "Every change, in plain words" },
    roles: ALL,
    group: "about",
  },
];

export const FEATURE_GROUPS: { key: FeatureGroup; title: Record<UiLang, string> }[] = [
  { key: "work", title: { ar: "العمل اليومي", en: "Daily work" } },
  { key: "teach", title: { ar: "التعليم", en: "Teaching" } },
  { key: "reports", title: { ar: "التقارير", en: "Reports" } },
  { key: "manage", title: { ar: "الإدارة", en: "Management" } },
  { key: "about", title: { ar: "عن المنصة", en: "About" } },
];

export function featureOn(db: DB, key: string) {
  const f = FEATURES.find((x) => x.key === key);
  if (f?.core) return true;
  const set = db.settings.features?.[key];
  return set === undefined ? !f?.defaultOff : set;
}

/** The tiles on this person's More screen, in list order. */
export function moreTiles(db: DB, role: Role) {
  return FEATURES.filter((f) => (f.place ?? "more") === "more" && f.href && f.roles.includes(role) && featureOn(db, f.key));
}

export const PLACE_LABELS: Record<NonNullable<Feature["place"]>, Record<UiLang, string>> = {
  more: { ar: "في «المزيد»", en: "In More" },
  people: { ar: "في «المستفيدون»", en: "In People" },
  chats: { ar: "في «المحادثات»", en: "In Chats" },
  inside: { ar: "داخل الشاشات", en: "Inside screens" },
};

/** Call at the top of a feature's page: a switched-off feature is not there. */
export function requireFeature(db: DB, key: string) {
  if (!featureOn(db, key)) notFound();
}
