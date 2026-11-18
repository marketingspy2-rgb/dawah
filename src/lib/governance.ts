import type { UiLang } from "./types";

/**
 * A plain check on religious text before it reaches a beneficiary, taken from the old
 * platform's content review. It does not judge the content: it only points at what a
 * person with knowledge should look at before it is sent.
 */
export type ContentFlag = "ruling" | "uncited";

// Wording that states a ruling outright.
const RULING = /(?:^|[\s«"(])(?:يجوز|لا يجوز|حرام|حلال|محرم|واجب|فتوى|الراجح|الصحيح من القولين|مكروه)(?=$|[\s.،,؟?!»")])/;
// Mentions of a verse or a hadith…
const CITES = /آية|حديث|قال رسول الله|قال النبي|قال الله|﴿/;
// …and the markers that show where it comes from.
const SOURCE = /سورة|رواه|متفق عليه|أخرجه|البخاري|مسلم\b|\(\s*[؀-ۿ]+\s*:\s*\d+\s*\)|\(\d+:\d+\)|آية\s*\d/;

export function checkContent(text: string): ContentFlag[] {
  const flags: ContentFlag[] = [];
  if (RULING.test(text)) flags.push("ruling");
  if (CITES.test(text) && !SOURCE.test(text)) flags.push("uncited");
  return flags;
}

export const FLAG_LABELS: Record<ContentFlag, Record<UiLang, string>> = {
  ruling: { ar: "فيه حكم شرعي صريح (يجوز، حرام…): يراجعه من عنده علم قبل الإرسال", en: "States a ruling outright (permitted, forbidden…): have someone with knowledge check it before sending" },
  uncited: { ar: "يذكر آية أو حديثًا دون مصدره (السورة والآية، أو من رواه)", en: "Mentions a verse or hadith without its source (surah and verse, or narrator)" },
};
