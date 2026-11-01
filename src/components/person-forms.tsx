import { F, FOLLOWUP_LABELS } from "@/lib/programs";
import type { T } from "@/lib/i18n";
import type { Beneficiary, DB, UiLang, User } from "@/lib/types";
import { HIDAYA_FOLLOWUPS } from "@/lib/types";
import { FOLLOWUP_ICONS, HijriInput, ListSelect, StaffSelect } from "./fields";
import { Field } from "./ui";

type Ctx = { db: DB; lang: UiLang; t: T };

/** Name to gender: the columns both sheets share, in the sheets' order. */
export function CommonFields({ b, ctx, phoneRequired }: { b?: Beneficiary; ctx: Ctx; phoneRequired?: boolean }) {
  const { db, lang, t } = ctx;
  const lists = db.settings.lists;
  return (
    <>
      <Field label={F.name[lang]} className="sm:col-span-2">
        <input name="name" required defaultValue={b?.name} dir="auto" />
      </Field>
      <Field label={F.phone[lang]}>
        <input name="phone" required={phoneRequired} defaultValue={b?.phone} dir="ltr" inputMode="tel" placeholder="05xxxxxxxx" />
      </Field>
      <Field label={F.city[lang]}>
        <ListSelect name="city" options={lists.city} value={b?.city} lang={lang} />
      </Field>
      <Field label={F.workplace[lang]}>
        <input name="workplace" defaultValue={b?.workplace} />
      </Field>
      <Field label={F.profession[lang]}>
        <input name="profession" defaultValue={b?.profession} />
      </Field>
      <Field label={F.nationality[lang]}>
        <ListSelect name="nationality" options={lists.nationality} value={b?.nationality} lang={lang} />
      </Field>
      <Field label={F.language[lang]}>
        <ListSelect name="languageLabel" options={lists.language} value={b?.languageLabel} lang={lang} />
      </Field>
      <Field label={F.gender[lang]}>
        <select name="gender" defaultValue={b?.gender ?? "m"}>
          <option value="m">{t("male")}</option>
          <option value="f">{t("female")}</option>
        </select>
      </Field>
    </>
  );
}

/** The هداية columns after the shared ones: caller, source, dates, follow-up, visits, result, classification. */
export function HidayaFields({ b, ctx, callers, user }: { b?: Beneficiary; ctx: Ctx; callers: User[]; user: User }) {
  const { db, lang } = ctx;
  const h = b?.hidaya;
  const lists = db.settings.lists;
  const locked = h?.result === "أسلم";
  return (
    <>
      <Field label={F.callerFollow[lang]}>
        <StaffSelect name="assignedTo" staff={callers} value={b?.assignedTo ?? (user.role === "caller" ? user.id : callers[0]?.id)} lang={lang} />
      </Field>
      <Field label={F.source[lang]}>
        <ListSelect name="source" options={lists.source} value={h?.source} lang={lang} />
      </Field>
      <Field label={F.firstContact[lang]}>
        <HijriInput name="firstContact" value={h ? h.firstContact : undefined} lang={lang} empty={!!h} label={F.firstContact[lang]} />
      </Field>
      {h && (
        <Field label={F.lastContact[lang]}>
          <HijriInput name="lastContact" value={h.lastContact} lang={lang} empty label={F.lastContact[lang]} />
        </Field>
      )}
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-[13px] font-medium">{F.followup[lang]}</span>
        <input type="hidden" name="followupForm" value="1" />
        <div className="flex flex-wrap items-center gap-2">
          {HIDAYA_FOLLOWUPS.map((k) => {
            const Icon = FOLLOWUP_ICONS[k];
            return (
              <label key={k} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm has-checked:border-ok has-checked:bg-ok-soft">
                <input type="checkbox" name={`f_${k}`} defaultChecked={h?.followup[k]} />
                <Icon className="size-4 text-muted" />
                {FOLLOWUP_LABELS[k][lang]}
              </label>
            );
          })}
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">{F.visits[lang]}</span>
            <input type="number" name="visits" min={0} max={99} defaultValue={h?.visits ?? 0} className="w-20!" />
          </label>
        </div>
      </div>
      <Field label={F.result[lang]}>
        {locked ? <input value="أسلم" disabled /> : <ListSelect name="result" options={lists.result} value={h?.result} lang={lang} />}
      </Field>
      <Field label={F.category[lang]}>
        <ListSelect name="category" options={lists.category} value={h?.category} lang={lang} />
      </Field>
    </>
  );
}

/** Classification and what helps the caller understand the person. */
export function ProfileFields({ b, ctx }: { b?: Beneficiary; ctx: Ctx }) {
  const { db, lang } = ctx;
  const h = b?.hidaya;
  return (
    <>
      <Field label={F.religion[lang]}>
        <ListSelect name="religion" options={db.settings.lists.religion} value={h?.religion} lang={lang} />
      </Field>
      <Field label={F.interests[lang]}>
        <input name="interests" defaultValue={h?.interests} />
      </Field>
      <Field label={F.doubts[lang]} className="sm:col-span-2">
        <textarea name="doubts" rows={2} defaultValue={h?.doubts} />
      </Field>
    </>
  );
}

/** The المسلم الجديد columns after the shared ones. */
export function MuslimFields({ b, ctx, staff, user }: { b?: Beneficiary; ctx: Ctx; staff: User[]; user: User }) {
  const { db, lang } = ctx;
  const m = b?.muslim;
  const lists = db.settings.lists;
  const callers = db.users.filter((u) => u.role === "caller" || u.role === "teacher");
  return (
    <>
      <Field label={F.islamDate[lang]}>
        <HijriInput name="islamDate" value={m?.islamDate} lang={lang} label={F.islamDate[lang]} />
      </Field>
      <Field label={F.caller[lang]}>
        <StaffSelect name="introducedBy" staff={callers} value={b?.introducedBy} lang={lang} blank />
      </Field>
      <Field label={F.follower[lang]}>
        <StaffSelect name="assignedTo" staff={staff} value={b?.assignedTo ?? (user.role === "teacher" ? user.id : undefined)} lang={lang} blank={!b} />
      </Field>
      <Field label={F.iqama[lang]}>
        <input name="iqama" defaultValue={m?.iqama} dir="ltr" inputMode="numeric" />
      </Field>
      <Field label={F.sponsorName[lang]}>
        <input name="sponsorName" defaultValue={m?.sponsorName} />
      </Field>
      <Field label={F.sponsorPhone[lang]}>
        <input name="sponsorPhone" defaultValue={m?.sponsorPhone} dir="ltr" inputMode="tel" />
      </Field>
      <Field label={F.status[lang]}>
        <ListSelect name="status" options={lists.status} value={m?.status ?? "متابع"} lang={lang} blank={false} />
      </Field>
      <Field label={F.contactMethod[lang]}>
        <ListSelect name="contactMethod" options={lists.contactMethod} value={m?.contactMethod} lang={lang} />
      </Field>
    </>
  );
}
