/**
 * Dates in the association's sheets are written in the Umm al-Qura calendar (day / month / year).
 * The platform stores plain dates (YYYY-MM-DD) and shows both calendars.
 */

export const HIJRI_MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
export const HIJRI_MONTHS_EN = ["Muharram", "Safar", "Rabi I", "Rabi II", "Jumada I", "Jumada II", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah"];

export type HijriParts = { d: number; m: number; y: number };

const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });

/** The day in Riyadh for an instant, as YYYY-MM-DD. */
export function isoDay(at: Date | number | string = new Date()) {
  const ms = new Date(at).getTime() + 3 * 3_600_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function hijriOf(day: string): HijriParts {
  const parts = fmt.formatToParts(new Date(`${day}T12:00:00Z`));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { d: get("day"), m: get("month"), y: parseInt(String(parts.find((p) => p.type === "year")?.value ?? "0"), 10) };
}

/** Converts a Hijri date to YYYY-MM-DD, or null when that day does not exist (e.g. the 30th of a 29-day month). */
export function fromHijri(d: number, m: number, y: number): string | null {
  if (!(d >= 1 && d <= 30 && m >= 1 && m <= 12 && y > 1300 && y < 1600)) return null;
  // Start from the average month length, then walk to the exact day.
  let ms = Date.UTC(622, 6, 19) + ((y - 1) * 354.36707 + (m - 1) * 29.530589 + (d - 1)) * 86_400_000;
  for (let i = 0; i < 6; i++) {
    const day = new Date(ms).toISOString().slice(0, 10);
    const h = hijriOf(day);
    const diff = d - h.d + (m - h.m) * 29.530589 + (y - h.y) * 354.36707;
    if (Math.abs(diff) < 0.5) return day;
    ms += Math.round(diff) * 86_400_000;
  }
  return null;
}

export function formatHijri(day: string | null | undefined, lang: "ar" | "en" = "ar") {
  if (!day) return "—";
  const h = hijriOf(day);
  return lang === "ar" ? `${h.d} ${HIJRI_MONTHS[h.m - 1]} ${h.y}هـ` : `${h.d} ${HIJRI_MONTHS_EN[h.m - 1]} ${h.y} AH`;
}

export function formatGregorian(day: string | null | undefined, lang: "ar" | "en" = "ar") {
  if (!day) return "—";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

/** Whole days from one date to another. */
export function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86_400_000);
}

export function addDays(day: string, n: number) {
  return new Date(new Date(`${day}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
}
