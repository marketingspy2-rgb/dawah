import { redirect } from "next/navigation";
import { BellRing, HeartHandshake, MessageCircleReply, PhoneMissed, Save, UserPlus } from "lucide-react";
import { saveRules } from "@/app/actions";
import { Button, Card, Field, Notice, PageHeader, Pill } from "@/components/ui";
import { readDb } from "@/lib/db";
import { STAGE_LABELS, translator, type T } from "@/lib/i18n";
import { DAY, relTime } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import type { LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

/** Which rule created a task, from the key it leaves on the task. */
const RULE_OF: [string, string][] = [
  ["after_contact", "afterContact"],
  ["no_answer:", "noAnswer"],
  ["checkin:", "newMuslim"],
  ["silent", "silentLearner"],
  ["new_case", "newCase"],
];

function Rule({ name, on, icon: Icon, title, hint, count, t, children }: { name: string; on: boolean; icon: LucideIcon; title: string; hint: string; count: number; t: T; children?: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input type="checkbox" name={name} defaultChecked={on} />
              {t("ruleOn")}
            </label>
          </div>
          <p className="mt-1 text-sm text-muted">{hint}</p>
          {children && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>}
          <div className="mt-3">
            <Pill>{t("ruleCreated", { n: count })}</Pill>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default async function RulesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "supervisor") redirect("/");
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();
  const { rules: r, rulesUpdatedAt, rulesUpdatedBy } = db.settings;

  const counts: Record<string, number> = {};
  for (const task of db.tasks) {
    if (!task.rule || now - new Date(task.createdAt).getTime() > 30 * DAY) continue;
    const hit = RULE_OF.find(([prefix]) => task.rule!.startsWith(prefix));
    if (hit) counts[hit[1]] = (counts[hit[1]] ?? 0) + 1;
  }
  const who = db.users.find((u) => u.id === rulesUpdatedBy)?.name;
  const num = (name: string, value: number, min: number, max: number) => <input type="number" name={name} defaultValue={value} min={min} max={max} inputMode="numeric" required />;

  return (
    <>
      <PageHeader title={t("rules")} subtitle={t("rulesSub")} />
      {saved && <Notice>{t("rulesSaved")}</Notice>}
      <form action={saveRules} className="grid gap-4">
        <Rule name="afterContact" on={r.afterContact.on} icon={MessageCircleReply} title={t("ruleAfterContact")} hint={t("ruleAfterContactHint")} count={counts.afterContact ?? 0} t={t}>
          <Field label={`${STAGE_LABELS.contacted[lang]} · ${t("daysAfter")}`}>{num("contacted", r.afterContact.contacted, 1, 30)}</Field>
          <Field label={`${STAGE_LABELS.interested[lang]} · ${t("daysAfter")}`}>{num("interested", r.afterContact.interested, 1, 30)}</Field>
          <Field label={`${STAGE_LABELS.learning[lang]} · ${t("daysAfter")}`}>{num("learning", r.afterContact.learning, 1, 30)}</Field>
        </Rule>
        <Rule name="noAnswer" on={r.noAnswer.on} icon={PhoneMissed} title={t("ruleNoAnswer")} hint={t("ruleNoAnswerHint")} count={counts.noAnswer ?? 0} t={t}>
          <Field label={t("daysAfter")}>{num("noAnswerDays", r.noAnswer.days, 1, 14)}</Field>
          <Field label={t("triesLabel")}>{num("noAnswerTries", r.noAnswer.tries, 2, 10)}</Field>
        </Rule>
        <Rule name="newMuslim" on={r.newMuslim.on} icon={HeartHandshake} title={t("ruleNewMuslim")} hint={t("ruleNewMuslimHint")} count={counts.newMuslim ?? 0} t={t}>
          <Field label={t("checkinDays")} className="col-span-2 sm:col-span-3">
            <input name="newMuslimDays" defaultValue={r.newMuslim.days.join(", ")} dir="ltr" inputMode="numeric" required />
          </Field>
        </Rule>
        <Rule name="silentLearner" on={r.silentLearner.on} icon={BellRing} title={t("ruleSilent")} hint={t("ruleSilentHint")} count={counts.silentLearner ?? 0} t={t} />
        <Rule name="newCase" on={r.newCase.on} icon={UserPlus} title={t("ruleNewCase")} hint={t("ruleNewCaseHint")} count={counts.newCase ?? 0} t={t}>
          <Field label={t("hoursAfter")}>{num("newCaseHours", r.newCase.hours, 1, 72)}</Field>
        </Rule>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">
            <Save className="size-4" /> {t("save")}
          </Button>
          {rulesUpdatedAt && who && <span className="text-xs text-muted">{t("rulesLastChange", { who, when: relTime(rulesUpdatedAt, lang, now) })}</span>}
        </div>
      </form>
    </>
  );
}
