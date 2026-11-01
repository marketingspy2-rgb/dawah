import { formatHijri } from "@/lib/hijri";
import type { T, TKey } from "@/lib/i18n";
import { MIN_VISITS, type RecontactReason } from "@/lib/programs";
import type { HidayaFollowup, UiLang } from "@/lib/types";

export const LOG_KEYS: Record<HidayaFollowup, TKey> = { call: "logCall", books: "logBooks", visit: "logVisit", gift: "logGift" };

/** Why a هداية case shows in "needs contact again", in a short sentence. */
export function reasonText(r: RecontactReason, lang: UiLang, t: T) {
  if (r.kind === "due") return t("reasonDue", { date: formatHijri(r.day, lang) });
  if (r.kind === "never") return t("reasonNever");
  if (r.kind === "cold") return t("hReasonCold", { n: r.days, limit: r.limit });
  return t("reasonVisits", { n: r.visits, min: MIN_VISITS });
}
