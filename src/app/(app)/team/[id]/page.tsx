import { notFound, redirect } from "next/navigation";
import { ArrowLeftRight, BarChart3, BookOpen, Clock, HeartPulse, MessageCircle, Repeat, Sprout, TrendingUp, UsersRound } from "lucide-react";
import { GroupCard } from "@/components/group-card";
import { Avatar, Card, Empty, LinkButton, PageHeader, Pill, RoleBadge, Stat } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { canManageUser, isStaff, relTime, staffMetrics, teamOf } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const member = db.users.find((u) => u.id === id && isStaff(u));
  if (!member) notFound();
  if (member.id !== user.id && !canManageUser(db, user, member)) redirect("/");

  const m = staffMetrics(db, [member])[0];
  const team = teamOf(db, member);
  const sup = team ? db.users.find((u) => u.id === team.supervisorId) : null;
  const groups = db.groups.filter((g) => g.ownerId === member.id);
  const teacher = member.role === "teacher";

  return (
    <>
      <PageHeader
        crumbs={user.role === "admin" || user.role === "supervisor" ? [{ href: "/team", label: team?.name ?? t("team") }] : []}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={member.name} size="lg" />
            {member.name}
            <RoleBadge role={member.role} gender={member.gender} lang={lang} />
            {member.status !== "available" && <Pill tone="warn">{t(member.status)}</Pill>}
          </span>
        }
        subtitle={[member.languages.map((l) => LANG_LABELS[l][lang]).join(lang === "ar" ? "، " : ", "), sup ? `${t("supervisors")}: ${sup.name}` : null, `${t("lastSeen")} ${relTime(member.lastSeenAt, lang)}`].filter(Boolean).join(" · ")}
        actions={
          <>
            <LinkButton href={`/beneficiaries?owner=${member.id}`} variant="secondary">
              <UsersRound className="size-4" /> {t("staffCases")}
            </LinkButton>
            {canManageUser(db, user, member) && m.load > 0 && (
              <LinkButton href={`/team/handover/${member.id}`}>
                <ArrowLeftRight className="size-4" /> {t("handOver")}
              </LinkButton>
            )}
          </>
        }
      />

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <BarChart3 className="size-4" /> {t("performance")}
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={UsersRound} label={t("load")} value={m.load} />
        <Stat icon={Clock} label={t("firstResponse")} value={m.firstResponseH === null ? "—" : t("hours", { n: m.firstResponseH.toFixed(1) })} tone={m.firstResponseH !== null && m.firstResponseH > 12 ? "warn" : undefined} />
        <Stat icon={Repeat} label={t("onTime")} value={m.onTimePct === null ? "—" : `${m.onTimePct}%`} tone={m.onTimePct !== null && m.onTimePct < 70 ? "warn" : undefined} />
        <Stat icon={MessageCircle} label={t("statWaiting")} value={m.waiting} tone={m.waiting ? "warn" : "ok"} />
        {teacher ? (
          <>
            <Stat icon={BookOpen} label={t("completion")} value={m.completionPct === null ? "—" : `${m.completionPct}%`} />
            <Stat icon={Sprout} label={t("retention")} value={m.retentionPct === null ? "—" : `${m.retentionPct}%`} />
            <Stat icon={HeartPulse} label={t("red")} value={m.red} tone={m.red ? "bad" : "ok"} />
            <Stat icon={HeartPulse} label={t("yellow")} value={m.yellow} tone={m.yellow ? "warn" : "ok"} />
          </>
        ) : (
          <>
            <Stat icon={TrendingUp} label={t("stageMoves")} value={m.stageMoves} />
            <Stat icon={Sprout} label={t("conversions")} value={m.conversions} tone="ok" />
            <Stat icon={HeartPulse} label={t("overdue")} value={m.overdue} tone={m.overdue ? "bad" : "ok"} />
          </>
        )}
      </div>

      <Card title={t("staffGroups")} icon={UsersRound}>
        {groups.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => (
              <GroupCard key={g.id} db={db} group={g} lang={lang} t={t} />
            ))}
          </div>
        ) : (
          <Empty icon={UsersRound}>{t("nothingHere")}</Empty>
        )}
      </Card>
    </>
  );
}
