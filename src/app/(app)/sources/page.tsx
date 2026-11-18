import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Download, ExternalLink, QrCode } from "lucide-react";
import { Bar, Card, PageHeader, Pill } from "@/components/ui";
import { captureUrl, sourceStats } from "@/lib/capture";
import { readDb } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { translator } from "@/lib/i18n";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Every source gets a link and a printable QR code; the numbers show which sources bring people who embrace Islam. */
export default async function SourcesPage() {
  const user = await requireUser();
  if (user.role === "teacher") notFound();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  requireFeature(db, "captureLinks");
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const origin = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  const stats = sourceStats(db);
  const max = Math.max(1, ...stats.map((s) => s.total));
  const cards = await Promise.all(
    stats.map(async (s) => {
      const url = captureUrl(origin, s.source);
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0c332c", light: "#ffffff" } });
      return { ...s, url, svg };
    }),
  );

  return (
    <>
      <PageHeader title={t("sourcesTitle")} subtitle={t("sourcesSub")} />

      <Card title={t("sourcesWhich")} icon={QrCode} className="mb-5">
        <ul className="space-y-2.5">
          {stats.map((s) => (
            <li key={s.source} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 truncate">{s.source}</span>
              <Bar value={(s.total / max) * 100} />
              <span className="num w-28 shrink-0 text-xs text-muted">
                {s.total} · <span className="text-gold">{t("sourcesMuslims", { n: s.muslims })}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <section key={c.source} className="animate-rise flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{c.source}</h2>
              {c.viaLink > 0 && <Pill tone="ok">{t("sourcesViaLink", { n: c.viaLink })}</Pill>}
            </div>
            <div className="mx-auto my-3 w-40 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div dir="ltr" className="truncate rounded-lg bg-surface-2 px-2 py-1 text-center text-xs text-muted">
              {c.url}
            </div>
            <div className="mt-3 flex gap-2">
              <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(c.svg)}`} download={`qr-${c.source}.svg`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong">
                <Download className="size-4" />
                {t("sourcesDownload")}
              </a>
              <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-2">
                <ExternalLink className="size-4" />
                {t("sourcesTry")}
              </a>
            </div>
          </section>
        ))}
      </div>
      <p className="mt-5 text-xs text-muted">{t("sourcesNote")}</p>
    </>
  );
}
