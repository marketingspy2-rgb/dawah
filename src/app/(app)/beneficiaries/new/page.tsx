import { addBeneficiary } from "@/app/actions";
import { SubmitButton } from "@/components/chat-client";
import { Card, PageTitle } from "@/components/ui";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { getUiLang, requireUser } from "@/lib/session";
import { LANGS } from "@/lib/types";

export default async function NewBeneficiaryPage({ searchParams }: { searchParams: Promise<{ dup?: string }> }) {
  const { dup } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const hint =
    user.role === "caller"
      ? lang === "ar" ? "سيُسند إليك مباشرة." : "It will be assigned to you."
      : lang === "ar" ? "يُسند تلقائيًا لداعية بنفس اللغة والجنس والأقل حملاً." : "Assigned automatically to a caller with the same language and gender and the lowest load.";

  return (
    <>
      <PageTitle title={t("addBeneficiary")} subtitle={hint} />
      {dup && <div className="mb-4 rounded-lg bg-warn-soft px-4 py-2 text-sm text-warn">{t("duplicateWarning", { name: dup })}</div>}
      <Card className="max-w-2xl">
        <form action={addBeneficiary} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium">{t("name")}</span>
            <input name="name" required />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">{t("phone")}</span>
            <input name="phone" required dir="ltr" placeholder="+63 917 000 0000" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">{t("language")}</span>
            <select name="language" required>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABELS[l][lang]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">{t("gender")}</span>
            <select name="gender" defaultValue={user.role === "caller" ? user.gender : "m"}>
              <option value="m">{t("male")}</option>
              <option value="f">{t("female")}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">{t("source")}</span>
            <input name="source" />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">{t("background")}</span>
            <textarea name="background" rows={2} />
          </label>
          <label className="flex items-start gap-2 sm:col-span-2">
            <input type="checkbox" name="sensitive" className="mt-1 size-4 w-auto" />
            <span>
              <span className="text-sm font-medium">{t("sensitive")}</span>
              <span className="block text-xs text-muted">{t("sensitiveHint")}</span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <SubmitButton className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">{t("save")}</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
