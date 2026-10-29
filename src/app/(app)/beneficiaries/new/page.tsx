import { UserPlus } from "lucide-react";
import { addBeneficiary } from "@/app/actions";
import { Button, Card, Field, Notice, PageHeader } from "@/components/ui";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { getUiLang, requireUser } from "@/lib/session";
import { LANGS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewBeneficiaryPage({ searchParams }: { searchParams: Promise<{ dup?: string }> }) {
  const { dup } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);

  return (
    <>
      <PageHeader crumbs={[{ href: "/beneficiaries", label: t("beneficiaries") }]} title={t("addBeneficiary")} subtitle={t("willBeAssigned")} />
      {dup && <Notice tone="warn">{t("dupFound", { name: dup })}</Notice>}
      <Card className="max-w-2xl" icon={UserPlus} title={t("profile")}>
        <form action={addBeneficiary} className="grid gap-4 sm:grid-cols-2">
          <Field label={t("name")}>
            <input name="name" required />
          </Field>
          <Field label={t("phone")}>
            <input name="phone" required dir="ltr" placeholder="+63 917 000 0000" />
          </Field>
          <Field label={t("language")}>
            <select name="language" required defaultValue={user.languages[0]}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABELS[l][lang]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("gender")}>
            <select name="gender" defaultValue={user.gender}>
              <option value="m">{t("male")}</option>
              <option value="f">{t("female")}</option>
            </select>
          </Field>
          <Field label={t("source")} className="sm:col-span-2">
            <input name="source" />
          </Field>
          <Field label={t("background")} className="sm:col-span-2">
            <textarea name="background" rows={3} />
          </Field>
          <label className="flex items-start gap-2.5 rounded-xl bg-surface-2/60 p-3 sm:col-span-2">
            <input type="checkbox" name="sensitive" className="mt-1" />
            <span>
              <span className="block text-sm font-medium">{t("sensitive")}</span>
              <span className="block text-xs text-muted">{t("sensitiveHint")}</span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <Button>{t("save")}</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
