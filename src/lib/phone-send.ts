import { TEMPLATES, fillTemplate, type TemplateId } from "./content";
import { firstName, nextScheduled } from "./logic";
import type { Beneficiary, DB, UiLang, User } from "./types";

/**
 * Ready messages for sending from the staff member's own WhatsApp: the platform opens WhatsApp
 * on their phone or computer with the text already written in the beneficiary's language, and
 * they press send there. Nothing logs in to WhatsApp, so the number is never at risk.
 */

export type PhoneOption = {
  key: string;
  label: string;
  /** In the beneficiary's language, ready to send. */
  text: string;
  /** The same message for the staff member to read. */
  meaning: string;
  eventId?: string;
  lessonId?: string;
};

const LABELS: Record<string, Record<UiLang, string>> = {
  lesson: { ar: "الدرس التالي", en: "Next lesson" },
  reminder: { ar: "تذكير بالدرس", en: "Lesson reminder" },
  checkin: { ar: "اطمئنان", en: "Check-in" },
  followup: { ar: "متابعة الحوار", en: "Follow-up" },
  free: { ar: "رسالة أكتبها", en: "My own message" },
};

/** wa.me wants the full international number, digits only. */
export function waNumber(phone: string) {
  return phone.replace(/\D/g, "").replace(/^00/, "");
}

export function newEventId() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return `ev_${Array.from({ length: 12 }, () => abc[Math.floor(Math.random() * abc.length)]).join("")}`;
}

export function phoneOptions(db: DB, user: User, b: Beneficiary, lang: UiLang, origin: string): PhoneOption[] {
  const vars = { name: firstName(b), caller: user.name.split(" ")[0] };
  const options: PhoneOption[] = [];
  const next = b.stage === "muslim" ? nextScheduled(db, b, Date.now() - 30 * 86_400_000) : null;
  if (next) {
    const eventId = next.kind === "reminder" && next.event ? next.event.id : newEventId();
    const tpl = TEMPLATES[next.kind === "reminder" ? "lesson_reminder" : "lesson_ready"];
    const link = `${origin}/l/${eventId}`;
    options.push({
      key: next.kind === "reminder" ? "reminder" : "lesson",
      label: `${LABELS[next.kind === "reminder" ? "reminder" : "lesson"][lang]}: ${next.lesson.title[lang]}`,
      text: fillTemplate(tpl[b.language], { ...vars, title: next.lesson.title[b.language] ?? next.lesson.title.en, link }),
      meaning: fillTemplate(tpl[lang], { ...vars, title: next.lesson.title[lang], link: "🔗" }),
      eventId,
      lessonId: next.lesson.id,
    });
  }
  for (const id of ["checkin", "followup"] as TemplateId[]) {
    options.push({ key: id, label: LABELS[id][lang], text: fillTemplate(TEMPLATES[id][b.language], vars), meaning: fillTemplate(TEMPLATES[id][lang], vars) });
  }
  options.push({ key: "free", label: LABELS.free[lang], text: "", meaning: "" });
  return options;
}
