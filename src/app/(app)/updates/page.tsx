import Link from "next/link";
import { CirclePlus, Sparkles, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MarkUpdatesSeen } from "@/components/client";
import { PageHeader, cx } from "@/components/ui";
import { translator } from "@/lib/i18n";
import { getUiLang, requireUser } from "@/lib/session";
import { LATEST_UPDATE, UPDATES, type UpdateKind } from "@/lib/updates";

export const dynamic = "force-dynamic";

const KIND: Record<UpdateKind, { icon: LucideIcon; cls: string; key: "kindNew" | "kindImproved" | "kindFixed" }> = {
  new: { icon: CirclePlus, cls: "bg-ok-soft text-ok", key: "kindNew" },
  improved: { icon: Sparkles, cls: "bg-info-soft text-info", key: "kindImproved" },
  fixed: { icon: Wrench, cls: "bg-warn-soft text-warn", key: "kindFixed" },
};

/** Every change to the platform, explained for the people who use it. */
export default async function UpdatesPage() {
  await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const date = new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <MarkUpdatesSeen id={LATEST_UPDATE} />
      <PageHeader title={t("updates")} subtitle={t("updatesSub")} />
      <ol className="relative max-w-3xl space-y-6 border-s-2 border-border ps-6">
        {UPDATES.map((u, i) => (
          <li key={u.id} className="animate-rise relative">
            <span className={cx("absolute top-1.5 size-3.5 rounded-full ring-4 ring-bg ltr:-left-[32px] rtl:-right-[32px]", i === 0 ? "bg-gold" : "bg-brand")} />
            <div className="mb-1 text-xs font-medium text-gold">{date.format(new Date(`${u.date}T12:00:00Z`))}</div>
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
              <h2 className="mb-3 text-lg font-bold">{u.title[lang]}</h2>
              <ul className="space-y-3">
                {u.items.map((item, k) => {
                  const kind = KIND[item.kind];
                  return (
                    <li key={k} className="flex items-start gap-3">
                      <span className={cx("mt-0.5 flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", kind.cls)}>
                        <kind.icon className="size-3.5" /> {t(kind.key)}
                      </span>
                      <p className="min-w-0 flex-1 text-[15px] leading-7">
                        {item[lang]}
                        {item.href && (
                          <>
                            {" "}
                            <Link href={item.href} className="font-medium whitespace-nowrap text-brand hover:underline">
                              {t("openIt")}
                            </Link>
                          </>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          </li>
        ))}
      </ol>
    </>
  );
}
