import { BookOpen, Footprints, Gift, Phone } from "lucide-react";
import { HIJRI_MONTHS, HIJRI_MONTHS_EN, hijriOf, isoDay } from "@/lib/hijri";
import { FOLLOWUP_LABELS } from "@/lib/programs";
import type { HidayaFollowup, UiLang, User } from "@/lib/types";
import { HIDAYA_FOLLOWUPS } from "@/lib/types";
import { cx } from "./ui";

export const FOLLOWUP_ICONS: Record<HidayaFollowup, typeof Phone> = { call: Phone, books: BookOpen, visit: Footprints, gift: Gift };

/** Day / month / year in the Umm al-Qura calendar, as the association writes dates. */
export function HijriInput({ name, value, lang, empty, label }: { name: string; value: string | null | undefined; lang: UiLang; empty?: boolean; label?: string }) {
  const h = value ? hijriOf(value) : empty ? null : hijriOf(isoDay());
  const year = hijriOf(isoDay()).y;
  const years = Array.from({ length: year - 1430 + 2 }, (_, i) => year + 1 - i);
  const months = lang === "ar" ? HIJRI_MONTHS : HIJRI_MONTHS_EN;
  return (
    <div className="grid grid-cols-[4.25rem_minmax(0,1fr)_5.25rem] gap-1.5" role="group" aria-label={label}>
      <select name={`${name}_d`} defaultValue={h?.d ?? ""} aria-label={lang === "ar" ? "اليوم" : "Day"}>
        {(empty || !h) && <option value="">{lang === "ar" ? "يوم" : "Day"}</option>}
        {Array.from({ length: 30 }, (_, i) => (
          <option key={i} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      <select name={`${name}_m`} defaultValue={h?.m ?? ""} aria-label={lang === "ar" ? "الشهر" : "Month"}>
        {(empty || !h) && <option value="">{lang === "ar" ? "الشهر" : "Month"}</option>}
        {months.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select name={`${name}_y`} defaultValue={h?.y ?? ""} aria-label={lang === "ar" ? "السنة" : "Year"}>
        {(empty || !h) && <option value="">{lang === "ar" ? "السنة" : "Year"}</option>}
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A drop-down from one of the association's lists; a saved value that left the list stays selectable. */
export function ListSelect({ name, options, value, lang, required, blank = true }: { name: string; options: string[]; value?: string | null; lang: UiLang; required?: boolean; blank?: boolean }) {
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select name={name} defaultValue={value ?? ""} required={required}>
      {blank && <option value="">{lang === "ar" ? "— اختر —" : "— Choose —"}</option>}
      {all.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function StaffSelect({ name, staff, value, lang, blank }: { name: string; staff: User[]; value?: string | null; lang: UiLang; blank?: boolean }) {
  return (
    <select name={name} defaultValue={value ?? ""}>
      {blank && <option value="">{lang === "ar" ? "— اختر —" : "— Choose —"}</option>}
      {staff.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

/** The four follow-up boxes of the هداية sheet, as small icons. */
export function FollowupMarks({ followup, lang }: { followup: Record<HidayaFollowup, boolean>; lang: UiLang }) {
  return (
    <span className="inline-flex items-center gap-1">
      {HIDAYA_FOLLOWUPS.map((k) => {
        const Icon = FOLLOWUP_ICONS[k];
        return (
          <span
            key={k}
            title={FOLLOWUP_LABELS[k][lang]}
            aria-label={`${FOLLOWUP_LABELS[k][lang]}: ${followup[k] ? "✓" : "✗"}`}
            className={cx("grid size-6 place-items-center rounded-md", followup[k] ? "bg-ok-soft text-ok" : "bg-surface-2 text-faint")}
          >
            <Icon className="size-3.5" />
          </span>
        );
      })}
    </span>
  );
}

const CATEGORY_TONES = ["bg-ok-soft text-ok", "bg-brand-soft text-brand", "bg-info-soft text-info", "bg-violet-soft text-violet", "bg-warn-soft text-warn", "bg-bad-soft text-bad"];

/** Classification chip; its colour follows the position in the list, closest to Islam first. */
export function CategoryChip({ value, options }: { value: string; options: string[] }) {
  if (!value) return <span className="text-xs text-faint">—</span>;
  const i = options.indexOf(value);
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", i === -1 ? "bg-surface-2 text-muted" : CATEGORY_TONES[Math.min(i, CATEGORY_TONES.length - 1)])}>{value}</span>;
}

export function ResultChip({ value }: { value: string }) {
  if (!value) return <span className="text-xs text-faint">—</span>;
  const tone = value === "أسلم" ? "bg-gold-soft text-gold" : value === "استجاب" ? "bg-ok-soft text-ok" : value === "لم يستجب" ? "bg-bad-soft text-bad" : "bg-surface-2 text-muted";
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tone)}>{value}</span>;
}

export function StatusChip({ value }: { value: string }) {
  if (!value) return <span className="text-xs text-faint">—</span>;
  const tone = value === "متابع" ? "bg-ok-soft text-ok" : value === "منقطع" ? "bg-bad-soft text-bad" : value === "اجازة" ? "bg-warn-soft text-warn" : "bg-surface-2 text-muted";
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tone)}>{value}</span>;
}

/** 18 small squares in three groups of six, one group per stage. */
export function LessonGrid({ lessons }: { lessons: boolean[] }) {
  return (
    <span className="inline-flex items-center gap-1.5" dir="ltr">
      {[0, 1, 2].map((s) => (
        <span key={s} className="inline-flex gap-0.5">
          {lessons.slice(s * 6, s * 6 + 6).map((done, i) => (
            <span key={i} className={cx("size-2 rounded-[3px]", done ? "bg-ok" : "bg-surface-3")} />
          ))}
        </span>
      ))}
    </span>
  );
}
