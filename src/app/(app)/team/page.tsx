import Link from "next/link";
import { redirect } from "next/navigation";
import { setUserStatus } from "@/app/actions";
import { SubmitButton } from "@/components/chat-client";
import { Card, PageTitle, Pill } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { activeLoad, awaitingReply, learnerState, relTime } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ moved?: string }> }) {
  const { moved } = await searchParams;
  const user = await requireUser();
  if (user.role === "caller") redirect("/");
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();
  const teams = db.teams.filter((team) => user.role === "admin" || team.id === user.teamId);

  return (
    <>
      <PageTitle title={t("team")} subtitle={t("handoverHint")} />
      {moved && <div className="mb-4 rounded-lg bg-ok-soft px-4 py-2 text-sm text-ok">{t("handoverDone", { n: moved })}</div>}
      <div className="space-y-4">
        {teams.map((team) => {
          const members = db.users.filter((u) => u.teamId === team.id && u.role === "caller");
          return (
            <Card key={team.id} title={`${team.name} · ${db.users.find((u) => u.id === team.supervisorId)?.name}`}>
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr>
                      <th>{t("caller")}</th>
                      <th>{t("language")}</th>
                      <th>{t("activeCases")}</th>
                      <th>{t("waitingReply")}</th>
                      <th>{t("redCases")}</th>
                      <th>{t("lastSeen")}</th>
                      <th>{t("status")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const cases = db.beneficiaries.filter((b) => b.assignedTo === m.id);
                      const load = activeLoad(db, m.id);
                      const waiting = cases.filter((b) => awaitingReply(db, b)).length;
                      const red = cases.filter((b) => b.stage === "muslim" && learnerState(db, b, now).level === "red").length;
                      const stranded = m.status !== "available" && load > 0;
                      return (
                        <tr key={m.id} className={stranded ? "bg-warn-soft" : undefined}>
                          <td>
                            <div className="font-medium">{m.name}</div>
                            <div className="text-xs text-muted">{m.gender === "f" ? t("female") : t("male")}</div>
                          </td>
                          <td>{m.languages.map((l) => LANG_LABELS[l][lang]).join("، ")}</td>
                          <td className="num">{load}</td>
                          <td className="num">{waiting ? <span className="font-medium text-bad">{waiting}</span> : 0}</td>
                          <td className="num">{red ? <span className="font-medium text-bad">{red}</span> : 0}</td>
                          <td className="whitespace-nowrap text-muted">{relTime(m.lastSeenAt, lang, now)}</td>
                          <td>
                            <form action={setUserStatus} className="flex items-center gap-1">
                              <input type="hidden" name="userId" value={m.id} />
                              <select name="status" defaultValue={m.status} className="w-auto py-1 text-xs">
                                <option value="available">{t("available")}</option>
                                <option value="leave">{t("leave")}</option>
                                <option value="left">{t("left")}</option>
                              </select>
                              <SubmitButton className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-2">{t("save")}</SubmitButton>
                            </form>
                            {stranded && (
                              <div className="mt-1">
                                <Pill tone="warn">{lang === "ar" ? `${load} حالة بلا متابعة` : `${load} cases uncovered`}</Pill>
                              </div>
                            )}
                          </td>
                          <td>
                            {load > 0 && (
                              <Link href={`/team/handover/${m.id}`} className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap ${stranded ? "bg-brand text-white" : "border border-border hover:bg-surface-2"}`}>
                                {t("distribute")}
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
