import Link from "next/link";
import { ArrowLeft, ArrowRight, HeartHandshake, Sprout } from "lucide-react";
import { cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { formatHijri, isoDay } from "@/lib/hijri";
import { translator } from "@/lib/i18n";
import { visibleBeneficiaries } from "@/lib/logic";
import { STAGE_NAMES, hidayaSummary, muslimSummary } from "@/lib/programs";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Two boxes only: هداية and المسلم الجديد. Everything else lives inside them. */
export default async function HomePage() {
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const today = isoDay();
  const list = visibleBeneficiaries(db, user);
  const h = hidayaSummary(db, list, today);
  const m = muslimSummary(list, today);
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <>
      <div className="mb-6">
        <div className="mb-1 text-xs font-medium tracking-wide text-gold">{formatHijri(today, lang)}</div>
        <h1 className="text-2xl font-bold tracking-tight">{t("homeTitle", { name: user.name.split(" ")[0] })}</h1>
        <p className="mt-1 text-sm text-muted">{t("homeSub")}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ProgramBox
          href="/hidaya"
          title={t("hidaya")}
          sub={t("hidayaSub")}
          icon={<HeartHandshake className="size-7" strokeWidth={1.8} />}
          tone="brand"
          big={{ value: h.active, label: t("hidayaActive") }}
          stats={[
            { label: t("responded"), value: h.responded },
            { label: t("notResponded"), value: h.notResponded },
            { label: t("convertedMonth"), value: h.convertedMonth, strong: true },
            { label: t("convertedYear"), value: h.convertedYear },
          ]}
          alert={h.recontact ? { href: "/hidaya/followup", text: t("recontactCount", { n: h.recontact }) } : null}
          cta={t("openHidaya")}
          Arrow={Arrow}
        />
        <ProgramBox
          href="/beneficiaries"
          title={t("newMuslim")}
          sub={t("newMuslimSub")}
          icon={<Sprout className="size-7" strokeWidth={1.8} />}
          tone="gold"
          big={{ value: m.total, label: t("muslimTotal") }}
          stats={[
            { label: t("muslimYear"), value: m.year },
            { label: STAGE_NAMES[1][lang], value: m.stage[1] },
            { label: STAGE_NAMES[2][lang], value: m.stage[2] },
            { label: STAGE_NAMES[3][lang], value: m.stage[3] },
            { label: t("certificates"), value: m.certificates, strong: true },
            { label: t("stoppedLearners"), value: m.stopped },
          ]}
          alert={null}
          cta={t("openNewMuslim")}
          Arrow={Arrow}
        />
      </div>
    </>
  );
}

function ProgramBox({
  href,
  title,
  sub,
  icon,
  tone,
  big,
  stats,
  alert,
  cta,
  Arrow,
}: {
  href: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
  tone: "brand" | "gold";
  big: { value: number; label: string };
  stats: { label: string; value: number; strong?: boolean }[];
  alert: { href: string; text: string } | null;
  cta: string;
  Arrow: typeof ArrowLeft;
}) {
  return (
    <section className="animate-rise group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-card transition hover:border-border-strong hover:shadow-pop">
      <Link href={href} className="absolute inset-0 z-0" aria-label={title} />
      <div className={cx("bg-pattern-light p-6", tone === "brand" ? "bg-brand-tint" : "bg-gold-soft/60")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="mt-1 max-w-xs text-sm text-muted">{sub}</p>
          </div>
          <span className={cx("grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-pop", tone === "brand" ? "bg-brand" : "bg-gold")}>{icon}</span>
        </div>
        <div className="mt-5 flex items-baseline gap-2">
          <span className="num text-5xl leading-none font-bold">{big.value}</span>
          <span className="text-sm text-muted">{big.label}</span>
        </div>
      </div>
      <dl className={cx("grid flex-1 grid-cols-2 gap-px bg-border", stats.length % 3 === 0 && "sm:grid-cols-3")}>
        {stats.map((s) => (
          <div key={s.label} className="bg-surface px-5 py-3.5">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className={cx("num mt-0.5 text-xl font-bold", s.strong && (tone === "brand" ? "text-brand" : "text-gold"))}>{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
        {alert ? (
          <Link href={alert.href} className="rounded-full bg-warn-soft px-3 py-1 text-xs font-medium text-warn hover:underline">
            {alert.text}
          </Link>
        ) : (
          <span />
        )}
        <Link href={href} className={cx("inline-flex items-center gap-1.5 text-sm font-semibold", tone === "brand" ? "text-brand" : "text-gold")}>
          {cta}
          <Arrow className="size-4 transition group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
