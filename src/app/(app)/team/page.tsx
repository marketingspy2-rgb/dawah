import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftRight, BookOpen, Building2, Eye, Lock, MessageCircle, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { setUserStatus } from "@/app/actions";
import { Avatar, Card, Notice, PageHeader, Pill, RoleBadge, cx } from "@/components/ui";
import { PendingButton } from "@/components/client";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator, type T } from "@/lib/i18n";
import { activeLoad, canManageUser, isStaff, relTime } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import type { DB, UiLang, User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ moved?: string; team?: string }> }) {
  const { moved, team: teamFilter } = await searchParams;
  const user = await requireUser();
  if (isStaff(user)) redirect(`/team/${user.id}`);
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const teams = db.teams.filter((tm) => (user.role === "admin" ? !teamFilter || tm.id === teamFilter : tm.supervisorId === user.id));
  const admin = db.users.find((u) => u.role === "admin");

  const access = [
    { icon: Building2, role: t("navManage"), text: t("accessAdmin"), tone: "bg-brand-soft text-brand" },
    { icon: ShieldCheck, role: t("supervisors"), text: t("accessSupervisor"), tone: "bg-gold-soft text-gold" },
    { icon: MessageCircle, role: t("callers"), text: t("accessCaller"), tone: "bg-info-soft text-info" },
    { icon: BookOpen, role: t("teachers"), text: t("accessTeacher"), tone: "bg-violet-soft text-violet" },
    { icon: Smartphone, role: t("beneficiaries"), text: t("accessBeneficiary"), tone: "bg-wa-soft text-wa" },
  ];

  return (
    <>
      {moved && <Notice tone="ok">{t("moved", { n: moved })}</Notice>}
      <PageHeader title={t("structure")} subtitle={t("structureSub")} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {user.role === "admin" && admin && (
            <div className="bg-pattern flex items-center gap-3 rounded-2xl bg-night p-4 text-white shadow-card">
              <Avatar name={admin.name} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{admin.name}</div>
                <div className="text-xs text-night-text">{t("accessAdmin")}</div>
              </div>
              {teamFilter && (
                <Link href="/team" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15">
                  {t("all")}
                </Link>
              )}
            </div>
          )}

          {teams.map((team) => {
            const sup = db.users.find((u) => u.id === team.supervisorId)!;
            const members = db.users.filter((u) => u.teamId === team.id && isStaff(u));
            return (
              <section key={team.id} className="animate-rise rounded-2xl border border-border bg-surface shadow-card">
                <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                  <Avatar name={sup.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{team.name}</h2>
                      <RoleBadge role="supervisor" gender={sup.gender} lang={lang} />
                    </div>
                    <div className="text-xs text-muted">{sup.name}</div>
                  </div>
                  <span className="text-xs text-muted">
                    {db.beneficiaries.filter((b) => members.some((m) => m.id === b.assignedTo) && b.stage !== "closed").length} {t("cases")}
                  </span>
                </header>
                <div className="grid gap-4 p-4 md:grid-cols-2">
                  {(["caller", "teacher"] as const).map((role) => (
                    <div key={role}>
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
                        {role === "caller" ? <MessageCircle className="size-3.5" /> : <BookOpen className="size-3.5" />}
                        {role === "caller" ? t("callers") : t("teachers")}
                      </div>
                      <div className="space-y-2 border-s-2 border-border ps-3">
                        {members
                          .filter((m) => m.role === role)
                          .map((m) => (
                            <StaffNode key={m.id} db={db} viewer={user} member={m} lang={lang} t={t} />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card title={t("whoSeesWhat")} icon={Eye}>
            <ol className="relative space-y-3">
              {access.map((a, i) => (
                <li key={a.role} className="relative flex gap-3">
                  {i < access.length - 1 && <span className="absolute top-9 bottom-[-12px] w-px bg-border ltr:left-4 rtl:right-4" />}
                  <span className={cx("relative grid size-8 shrink-0 place-items-center rounded-full", a.tone)}>
                    <a.icon className="size-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{a.role}</div>
                    <p className="text-xs leading-5 text-muted">{a.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex gap-2 rounded-xl bg-warn-soft/70 p-3 text-xs leading-5 text-warn">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              {t("sensitiveRule")}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function StaffNode({ db, viewer, member, lang, t }: { db: DB; viewer: User; member: User; lang: UiLang; t: T }) {
  const groups = db.groups.filter((g) => g.ownerId === member.id);
  const load = activeLoad(db, member.id);
  const manage = canManageUser(db, viewer, member);
  return (
    <div className={cx("rounded-xl border p-3", member.status !== "available" && load ? "border-bad/30 bg-bad-soft/30" : "border-border bg-surface-2/30")}>
      <div className="flex items-center gap-2.5">
        <Avatar name={member.name} size="sm" />
        <div className="min-w-0 flex-1">
          <Link href={`/team/${member.id}`} className="block truncate text-sm font-medium hover:text-brand">
            {member.name}
          </Link>
          <div className="truncate text-[11px] text-muted">
            {member.languages.map((l) => LANG_LABELS[l][lang]).join(lang === "ar" ? "، " : ", ")} · {load} {t("cases")} · {relTime(member.lastSeenAt, lang)}
          </div>
        </div>
        {member.status !== "available" && <Pill tone="warn">{t(member.status)}</Pill>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {groups.map((g) => (
          <Link key={g.id} href={`/groups/${g.id}`} className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted ring-1 ring-border hover:text-brand hover:ring-brand">
            {g.name}
          </Link>
        ))}
      </div>
      {manage && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
          <Link href={`/team/${member.id}`} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
            <UserRound className="size-3.5" /> {t("openProfile")}
          </Link>
          {load > 0 && (
            <Link href={`/team/handover/${member.id}`} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              <ArrowLeftRight className="size-3.5" /> {t("handOver")}
            </Link>
          )}
          <form action={setUserStatus} className="ms-auto flex items-center gap-1">
            <input type="hidden" name="userId" value={member.id} />
            <select name="status" defaultValue={member.status} className="h-7! w-auto! py-0! text-xs!" aria-label={t("setStatus")}>
              <option value="available">{t("available")}</option>
              <option value="leave">{t("leave")}</option>
              <option value="left">{t("left")}</option>
            </select>
            <PendingButton className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-surface-2">{t("save")}</PendingButton>
          </form>
        </div>
      )}
    </div>
  );
}
