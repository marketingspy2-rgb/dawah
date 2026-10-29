import Link from "next/link";
import { ClipboardPaste, Inbox, Smartphone } from "lucide-react";
import { stagePaste } from "@/app/actions";
import { InstallButton, PendingButton } from "@/components/client";
import { Card, PageHeader } from "@/components/ui";
import { readDb } from "@/lib/db";
import { translator } from "@/lib/i18n";
import { relTime } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Where staff bring in conversations from their own WhatsApp: install once, then share, upload or paste. */
export default async function SharePage() {
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const pending = db.shares.filter((s) => s.userId === user.id).sort((a, c) => c.at.localeCompare(a.at));

  return (
    <>
      <PageHeader title={t("shareTitle")} subtitle={t("shareSub")} />

      {pending.length > 0 && (
        <Card title={t("pendingShares")} icon={Inbox} tone="warn" className="mb-5">
          <ul className="divide-y divide-border">
            {pending.map((s) => (
              <li key={s.id}>
                <Link href={`/share/${s.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand">
                  <span className="truncate" dir="auto">
                    {s.fileName ?? s.text.slice(0, 60)}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{relTime(s.at, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title={t("pasteOrUpload")} icon={ClipboardPaste}>
          <form action={stagePaste} className="space-y-3">
            <input type="file" name="file" accept=".txt,.zip,text/plain,application/zip" className="w-full text-sm" />
            <textarea name="raw" rows={8} placeholder={t("pastePlaceholder")} dir="auto" className="text-sm" />
            <div className="flex justify-end">
              <PendingButton className="h-10 rounded-full bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-strong">{t("next")}</PendingButton>
            </div>
          </form>
        </Card>

        <Card title={t("howAndroid")} icon={Smartphone}>
          <ol className="space-y-3 text-sm">
            {(["howAndroid1", "howAndroid2", "howAndroid3"] as const).map((k, i) => (
              <li key={k} className="flex gap-3">
                <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{i + 1}</span>
                <span>{t(k)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 space-y-2 rounded-xl bg-surface-2/60 p-3">
            <InstallButton label={t("installApp")} installedLabel={t("installed")} className="h-10 w-full rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong" />
            <p className="text-xs text-muted">{t("installManual")}</p>
          </div>
          <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
            <div>
              <div className="mb-1 font-semibold">{t("howIphone")}</div>
              <p className="text-muted">{t("howIphone1")}</p>
            </div>
            <div>
              <div className="mb-1 font-semibold">{t("howCopy")}</div>
              <p className="text-muted">{t("howCopy1")}</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
