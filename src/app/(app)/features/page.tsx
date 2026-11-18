import { notFound } from "next/navigation";
import { saveFeatures } from "@/app/actions";
import { Button, Notice, PageHeader, Pill } from "@/components/ui";
import { readDb } from "@/lib/db";
import { FEATURES, FEATURE_GROUPS, PLACE_LABELS, featureOn } from "@/lib/features";
import { ROLE_LABELS, translator } from "@/lib/i18n";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Management switches any feature off when it is not needed, and back on when it is. */
export default async function FeaturesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();

  return (
    <>
      {saved && <Notice tone="ok">{t("savedOk")}</Notice>}
      <PageHeader title={t("featuresTitle")} subtitle={t("featuresSub")} />
      <form action={saveFeatures} className="space-y-6">
        {FEATURE_GROUPS.map((g) => {
          const items = FEATURES.filter((f) => f.group === g.key);
          if (!items.length) return null;
          return (
            <section key={g.key}>
              <h2 className="mb-2 px-1 text-xs font-medium tracking-wide text-muted">{g.title[lang]}</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
                {items.map((f) => (
                  <li key={f.key}>
                    <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                        <f.icon className="size-4.5" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{f.title[lang]}</span>
                        <span className="mt-0.5 block text-sm text-muted">{f.desc[lang]}</span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          <Pill>{PLACE_LABELS[f.place ?? "more"][lang]}</Pill>
                          <Pill>{f.roles.map((r) => ROLE_LABELS[r][lang]).join("، ")}</Pill>
                        </span>
                      </span>
                      {f.core ? (
                        <Pill tone="info" className="shrink-0">
                          {t("featureCore")}
                        </Pill>
                      ) : (
                        <span className="flex shrink-0 items-center gap-2 pt-1 text-sm font-medium">
                          <input type="checkbox" name={`f_${f.key}`} defaultChecked={featureOn(db, f.key)} className="size-5" />
                          {t("featureOn")}
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <div className="sticky bottom-20 lg:bottom-4">
          <Button>{t("save")}</Button>
        </div>
      </form>
    </>
  );
}
