import { guessCountryFromPhone } from "./content";
import { newId } from "./db";
import { isoDay } from "./hijri";
import { groupForMember, suggestAssignee } from "./logic";
import { LANG_LABEL_FOR, emptyHidaya, nextSerial } from "./programs";
import type { Beneficiary, DB, Gender, Lang, User } from "./types";

/** Adds one line to the access log, newest first, keeping the last 500. */
export function auditEntry(db: DB, user: User | null, action: string, target: string) {
  db.audit.unshift({ id: newId("AU"), userId: user?.id ?? "beneficiary", action, target, at: new Date().toISOString() });
  db.audit.length = Math.min(db.audit.length, 500);
}

export function blankBeneficiary(db: DB, user: User, program: "hidaya" | "muslim"): Beneficiary {
  const id = `B-${1000 + db.beneficiaries.length + 1}`;
  const now = new Date().toISOString();
  return {
    id,
    program,
    city: "",
    workplace: "",
    profession: "",
    nationality: "",
    languageLabel: "",
    hidaya: null,
    muslim: null,
    name: "",
    alias: id,
    gender: user.gender,
    language: user.languages[0] ?? "hi",
    country: "SA",
    timezone: "Asia/Riyadh",
    phone: "",
    preferredHour: 19,
    stage: program === "muslim" ? "muslim" : "new",
    stageHistory: [{ stage: program === "muslim" ? "muslim" : "new", at: now }],
    assignedTo: user.id,
    introducedBy: null,
    groupId: null,
    sensitive: false,
    background: "",
    needs: "",
    objections: [],
    source: "",
    createdAt: now,
    convertedAt: program === "muslim" ? now : null,
    summary: null,
    optedOut: false,
  };
}

/** The file that already has this phone number, compared without the country code 966 or a leading 0. */
export function duplicateOf(db: DB, phone: string, except?: string) {
  const digits = (s: string) => s.replace(/\D/g, "").replace(/^(966|0)/, "");
  const p = digits(phone);
  return p.length >= 7 ? db.beneficiaries.find((x) => x.id !== except && digits(x.phone) === p) : undefined;
}

/**
 * A new هداية case from someone who reached out on their own: a source link or a WhatsApp message.
 * It goes to the caller with the lightest load who speaks the language, due for contact today.
 */
export function intakeCase(
  db: DB,
  p: { name: string; phone: string; lang?: Lang; gender?: Gender; mark: string; source: string; reason: string; message?: string; action: string },
) {
  const now = new Date();
  const country = guessCountryFromPhone(p.phone);
  const lang = p.lang ?? country?.lang ?? "hi";
  const gender = p.gender ?? "m";
  const owner = suggestAssignee(db, { language: lang, gender }, "caller") ?? db.users.find((u) => u.role === "admin" && u.status !== "left");
  if (!owner) return null;
  const b = blankBeneficiary(db, owner, "hidaya");
  b.name = p.name;
  b.phone = p.phone;
  b.gender = gender;
  b.language = lang;
  b.languageLabel = LANG_LABEL_FOR[lang];
  if (country) {
    b.country = country.code;
    b.timezone = country.tz;
  }
  b.source = p.mark;
  b.assignedTo = owner.id;
  b.hidaya = emptyHidaya(nextSerial(db, "hidaya"));
  b.hidaya.source = p.source;
  b.hidaya.nextContact = isoDay(now);
  b.groupId = groupForMember(db, owner.id, "dawah", lang)?.id ?? null;
  db.beneficiaries.push(b);
  db.assignments.push({ id: newId("A"), beneficiaryId: b.id, fromId: null, toId: owner.id, byId: owner.id, reason: p.reason, at: b.createdAt });
  if (p.message) db.messages.push({ id: newId("M"), beneficiaryId: b.id, direction: "in", text: p.message, translation: null, at: now.toISOString(), authorId: null, status: null, kind: "text" });
  auditEntry(db, null, p.action, b.id);
  return b;
}
