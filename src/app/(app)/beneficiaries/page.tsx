import Link from "next/link";
import { Card, Empty, LevelBadge, PageTitle, StageBadge, WhatsAppButton } from "@/components/ui";
import { LockIcon } from "@/components/icons";
import { COUNTRIES } from "@/lib/content";
import { readDb } from "@/lib/db";
import { LANG_LABELS, STAGE_LABELS, translator } from "@/lib/i18n";
import { displayName, lastMessage, learnerState, openTasks, relTime, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import { LANGS, STAGES, type Lang, type Stage } from "@/lib/types";

export default async function BeneficiariesPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string; lang?: string; added?: string; to?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();

  const list = visibleBeneficiaries(db, user)
    .filter((b) => !sp.stage || b.stage === sp.stage)
    .filter((b) => !sp.lang || b.language === sp.lang)
    .filter((b) => !sp.q || displayName(db, user, b).toLowerCase().includes(sp.q.toLowerCase()) || b.phone.replace(/\s/g, "").includes(sp.q.replace(/\s/g, "")) || b.id === sp.q)
    .map((b) => ({ b, last: lastMessage(db, b.id), next: openTasks(db, b.id)[0] }))
    .sort((a, c) => (c.last?.at ?? "").localeCompare(a.last?.at ?? ""));

  const scopeLabel = user.role === "caller" ? t("myCases") : user.role === "supervisor" ? t("teamCases") : t("allCases");

  return (
    <>
      <PageTitle
        title={t("beneficiaries")}
        subtitle={`${scopeLabel} · ${list.length}`}
        action={
          <Link href="/beneficiaries/new" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white">
            + {t("addBeneficiary")}
          </Link>
        }
      />
      {sp.added && sp.to && (
        <p className="mb-4 rounded-lg border border-ok/40 bg-ok-soft px-3 py-2 text-sm">{t("addedTo", { name: sp.added, to: sp.to })}</p>
      )}
      <Card>
        <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_180px_auto]">
          <input name="q" defaultValue={sp.q} placeholder={t("search")} />
          <select name="stage" defaultValue={sp.stage ?? ""}>
            <option value="">{t("stage")}: {t("all")}</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s as Stage][lang]}
              </option>
            ))}
          </select>
          <select name="lang" defaultValue={sp.lang ?? ""}>
            <option value="">{t("language")}: {t("all")}</option>
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {LANG_LABELS[l as Lang][lang]}
              </option>
            ))}
          </select>
          <button className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-surface-2">{t("search")}</button>
        </form>
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("stage")}</th>
                  <th>{t("language")}</th>
                  <th>{t("country")}</th>
                  {user.role !== "caller" && <th>{t("caller")}</th>}
                  <th>{t("lastContact")}</th>
                  <th>{t("tasks")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map(({ b, last, next }) => {
                  const level = b.stage === "muslim" ? learnerState(db, b, now).level : null;
                  return (
                    <tr key={b.id} className="hover:bg-surface-2">
                      <td>
                        <Link href={`/beneficiaries/${b.id}`} className="inline-flex items-center gap-1 font-medium hover:underline">
                          {b.sensitive && <LockIcon className="size-3.5 text-warn" />}
                          {displayName(db, user, b).replace("🔒 ", "")}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <StageBadge stage={b.stage} lang={lang} />
                          {level && level !== "green" && <LevelBadge level={level} label={t(level)} />}
                        </div>
                      </td>
                      <td>{LANG_LABELS[b.language][lang]}</td>
                      <td>{COUNTRIES.find((c) => c.code === b.country)?.[lang] ?? "—"}</td>
                      {user.role !== "caller" && <td className="text-muted">{db.users.find((u) => u.id === b.assignedTo)?.name}</td>}
                      <td className="whitespace-nowrap text-muted">{relTime(last?.at, lang, now)}</td>
                      <td className="text-muted">{next ? `${next.title} · ${relTime(next.due, lang, now)}` : "—"}</td>
                      <td>
                        <WhatsAppButton beneficiaryId={b.id} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t("nothingHere")}</Empty>
        )}
      </Card>
    </>
  );
}
