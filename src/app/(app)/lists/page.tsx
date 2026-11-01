import { notFound } from "next/navigation";
import { ListChecks, Timer } from "lucide-react";
import { saveLists } from "@/app/actions";
import { Button, Card, Notice, PageHeader } from "@/components/ui";
import { readDb } from "@/lib/db";
import { translator } from "@/lib/i18n";
import { DEFAULT_RECONTACT_DAYS, LIST_LABELS } from "@/lib/programs";
import { getUiLang, requireUser } from "@/lib/session";
import { LIST_KEYS } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Management edits the drop-down lists of both sheets, and how often each classification is contacted. */
export default async function ListsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const { lists, recontactDays } = db.settings;

  return (
    <>
      {saved && <Notice tone="ok">{t("savedOk")}</Notice>}
      <PageHeader title={t("listsTitle")} subtitle={t("listsSub")} />
      <form action={saveLists} className="space-y-5">
        <Card title={t("recontactDaysTitle")} icon={Timer}>
          <p className="mb-3 text-sm text-muted">{t("recontactDaysHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lists.category.map((c) => (
              <label key={c} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2 text-sm">
                <span className="font-medium">{c}</span>
                <span className="flex items-center gap-1.5 text-muted">
                  <input type="number" name={`days_${c}`} min={1} max={365} defaultValue={recontactDays[c] ?? DEFAULT_RECONTACT_DAYS} className="w-20!" />
                  {t("daysUnit")}
                </span>
              </label>
            ))}
          </div>
        </Card>
        <Card title={t("listsCard")} icon={ListChecks}>
          <p className="mb-3 text-sm text-muted">{t("listsHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LIST_KEYS.map((k) => (
              <label key={k} className="block">
                <span className="mb-1.5 block text-[13px] font-medium">
                  {LIST_LABELS[k][lang]} <span className="num text-xs text-muted">({lists[k].length})</span>
                </span>
                <textarea name={k} rows={8} defaultValue={lists[k].join("\n")} className="text-sm leading-6" />
              </label>
            ))}
          </div>
        </Card>
        <Button>{t("save")}</Button>
      </form>
    </>
  );
}
