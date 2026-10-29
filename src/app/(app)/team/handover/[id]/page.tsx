import { notFound, redirect } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { handover } from "@/app/actions";
import { Avatar, Button, Card, Empty, LinkButton, PageHeader, PersonName, StageBadge } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { activeLoad, buildSummary, canManageUser, displayName, eligibleStaff, isStaff, teamOf } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import type { StaffRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const from = db.users.find((u) => u.id === id && isStaff(u));
  if (!from) notFound();
  if (!canManageUser(db, user, from)) redirect("/team");

  const cases = db.beneficiaries.filter((b) => b.assignedTo === from.id && b.stage !== "closed");
  // Suggest as if assigning one by one, so the cases spread across colleagues, same team first.
  const baseLoad = new Map(db.users.map((u) => [u.id, activeLoad(db, u.id)]));
  const load = new Map(baseLoad);
  const rows = cases.map((b) => {
    const options = eligibleStaff(db, b, from.role as StaffRole)
      .filter((u) => u.id !== from.id)
      .sort((a, c) => Number(c.teamId === from.teamId) - Number(a.teamId === from.teamId));
    const suggested = [...options].sort((a, c) => Number(c.teamId === from.teamId) - Number(a.teamId === from.teamId) || (load.get(a.id) ?? 0) - (load.get(c.id) ?? 0))[0];
    if (suggested) load.set(suggested.id, (load.get(suggested.id) ?? 0) + 1);
    const summary = (b.summary?.text ?? buildSummary(db, b, lang)).split("\n").slice(0, 2).join(" ");
    return { b, options, suggested, summary };
  });
  const team = teamOf(db, from);

  return (
    <>
      <PageHeader
        crumbs={[
          { href: "/team", label: team?.name ?? t("team") },
          { href: `/team/${from.id}`, label: from.name },
        ]}
        title={t("handoverTitle", { name: from.name })}
        subtitle={t("handoverSub")}
        actions={
          <LinkButton href={`/team/${from.id}`} variant="secondary">
            {t("cancel")}
          </LinkButton>
        }
      />
      {rows.length === 0 ? (
        <Empty icon={ArrowLeftRight}>{t("noCases")}</Empty>
      ) : (
        <form action={handover}>
          <input type="hidden" name="fromId" value={from.id} />
          <Card bodyClassName="px-0! pb-0!">
            <ul className="divide-y divide-border">
              {rows.map(({ b, options, suggested, summary }) => {
                const name = displayName(db, user, b);
                return (
                  <li key={b.id} className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr_240px] md:items-center">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} size="sm" locked={name !== b.name} />
                      <div className="min-w-0">
                        <PersonName name={name} href={`/beneficiaries/${b.id}`} />
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                          <StageBadge stage={b.stage} lang={lang} />
                          {LANG_LABELS[b.language][lang]} · {b.gender === "f" ? t("female") : t("male")}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs leading-6 text-muted">{summary}</p>
                    {options.length ? (
                      <select name={`to_${b.id}`} defaultValue={suggested?.id} aria-label={t("newOwner")}>
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} · {baseLoad.get(o.id)} {t("cases")}
                            {o.teamId !== from.teamId ? ` · ${teamOf(db, o)?.name ?? ""}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-bad">{t("noMatch")}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface-2/50 px-5 py-4">
              <label className="flex items-center gap-2 text-sm">
                {t("setStatusTo")}
                <select name="newStatus" defaultValue={from.status === "available" ? "leave" : from.status} className="w-auto!">
                  <option value="leave">{t("leave")}</option>
                  <option value="left">{t("left")}</option>
                  <option value="available">{t("available")}</option>
                </select>
              </label>
              <Button className="ms-auto">
                <ArrowLeftRight className="size-4" />
                {t("confirmHandover")} ({rows.filter((r) => r.options.length).length})
              </Button>
            </div>
          </Card>
        </form>
      )}
    </>
  );
}
