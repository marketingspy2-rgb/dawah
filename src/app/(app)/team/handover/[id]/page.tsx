import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { handover } from "@/app/actions";
import { SubmitButton } from "@/components/chat-client";
import { Card, PageTitle, StageBadge } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { activeLoad, buildSummary, displayName, eligibleCallers, supervisorIdFor } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export default async function HandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (user.role === "caller") redirect("/");
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const from = db.users.find((u) => u.id === id && u.role === "caller");
  if (!from) notFound();
  if (user.role === "supervisor" && supervisorIdFor(db, from.id) !== user.id) redirect("/team");

  const cases = db.beneficiaries.filter((b) => b.assignedTo === from.id && b.stage !== "closed");
  // Suggest as if assigning one by one, so the cases spread across colleagues.
  const baseLoad = new Map(db.users.map((u) => [u.id, activeLoad(db, u.id)]));
  const load = new Map(baseLoad);
  const rows = cases.map((b) => {
    const options = eligibleCallers(db, b).filter((u) => u.id !== from.id);
    const suggested = [...options].sort((a, c) => (load.get(a.id) ?? 0) - (load.get(c.id) ?? 0))[0];
    if (suggested) load.set(suggested.id, (load.get(suggested.id) ?? 0) + 1);
    const summary = (b.summary?.text ?? buildSummary(db, b, lang)).split("\n").slice(0, 2).join(" ");
    return { b, options, suggested, summary };
  });

  return (
    <>
      <PageTitle title={t("handoverTitle", { name: from.name })} subtitle={t("handoverHint")} action={<Link href="/team" className="text-sm text-brand">{t("cancel")}</Link>} />
      <form action={handover}>
        <input type="hidden" name="fromId" value={from.id} />
        <Card>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("stage")}</th>
                  <th className="min-w-72">{t("handoverSummary")}</th>
                  <th className="min-w-48">{t("newCaller")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ b, options, suggested, summary }) => (
                  <tr key={b.id}>
                    <td>
                      <div className="font-medium">{displayName(db, user, b)}</div>
                      <div className="text-xs text-muted">
                        {LANG_LABELS[b.language][lang]} · {b.gender === "f" ? t("female") : t("male")}
                      </div>
                    </td>
                    <td>
                      <StageBadge stage={b.stage} lang={lang} />
                    </td>
                    <td className="text-xs text-muted">{summary}</td>
                    <td>
                      {options.length ? (
                        <select name={`to_${b.id}`} defaultValue={suggested?.id}>
                          {options.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({baseLoad.get(o.id)})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-bad">{lang === "ar" ? "لا يوجد داعية متاح بنفس اللغة والجنس" : "No available caller with the same language and gender"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <label className="flex items-center gap-2 text-sm">
              {t("markAs")}
              <select name="newStatus" defaultValue={from.status === "available" ? "leave" : from.status} className="w-auto">
                <option value="leave">{t("leave")}</option>
                <option value="left">{t("left")}</option>
                <option value="available">{t("available")}</option>
              </select>
            </label>
            <SubmitButton className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">{t("confirmHandover")} ({rows.filter((r) => r.options.length).length})</SubmitButton>
          </div>
        </Card>
      </form>
    </>
  );
}

export const dynamic = "force-dynamic";
