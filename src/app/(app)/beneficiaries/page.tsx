import Link from "next/link";
import { Plus, Search, UsersRound } from "lucide-react";
import { Avatar, Card, Empty, LessonDots, LevelBadge, LinkButton, Notice, PageHeader, PersonName, Pill, StageBadge, Tabs, WhatsAppLink, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { awaitingReply, canAct, canSeeName, displayName, isStaff, lastMessage, learnerState, relTime, staffUnder, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import type { Beneficiary, Group } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BeneficiariesPage({ searchParams }: { searchParams: Promise<{ q?: string; owner?: string; view?: string; added?: string; to?: string }> }) {
  const { q, owner, view = "active", added, to } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();

  const all = visibleBeneficiaries(db, user);
  const staff = staffUnder(db, user);
  const inView = (b: Beneficiary) =>
    view === "dawah" ? b.stage !== "muslim" && b.stage !== "closed" : view === "learners" ? b.stage === "muslim" : view === "closed" ? b.stage === "closed" : b.stage !== "closed";
  const list = all
    .filter(inView)
    .filter((b) => !owner || b.assignedTo === owner)
    .filter((b) => {
      if (!q) return true;
      const name = displayName(db, user, b).toLowerCase();
      return name.includes(q.toLowerCase()) || (canSeeName(db, user, b) && b.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "~"));
    });

  // One block per group, in the order of the people who own them.
  const byGroup = new Map<string, Beneficiary[]>();
  for (const b of list) {
    const key = b.groupId ?? "none";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(b);
  }
  const blocks = [...byGroup.entries()]
    .map(([id, members]) => ({ group: db.groups.find((g) => g.id === id) ?? null, members }))
    .sort((a, c) => (a.group?.ownerId ?? "~").localeCompare(c.group?.ownerId ?? "~") || (a.group?.name ?? "").localeCompare(c.group?.name ?? ""));

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, owner, view, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/beneficiaries?${p.toString()}`;
  };
  const count = (v: string) => all.filter((b) => (v === "dawah" ? b.stage !== "muslim" && b.stage !== "closed" : v === "learners" ? b.stage === "muslim" : v === "closed" ? b.stage === "closed" : b.stage !== "closed")).filter((b) => !owner || b.assignedTo === owner).length;

  return (
    <>
      {added && <Notice tone="info">{t("addedTo", { name: added, to: to ?? "" })}</Notice>}
      <PageHeader
        title={isStaff(user) ? t("myCases") : user.role === "supervisor" ? t("teamCases") : t("allCases")}
        subtitle={t("groupsSub")}
        actions={
          user.role !== "teacher" && (
            <LinkButton href="/beneficiaries/new">
              <Plus className="size-4" />
              {t("addBeneficiary")}
            </LinkButton>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-faint ltr:left-3 rtl:right-3" />
          {owner && <input type="hidden" name="owner" value={owner} />}
          <input type="hidden" name="view" value={view} />
          <input name="q" defaultValue={q} placeholder={t("search")} className="ltr:pl-9! rtl:pr-9!" />
        </form>
        {!isStaff(user) && (
          <form className="flex items-center gap-2">
            <input type="hidden" name="view" value={view} />
            <select name="owner" defaultValue={owner ?? ""} className="w-auto!" aria-label={t("responsible")}>
              <option value="">{t("all")}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm hover:bg-surface-2">{t("filter")}</button>
          </form>
        )}
      </div>

      <Tabs
        active={view}
        items={[
          { key: "active", href: href({ view: "active" }), label: t("all"), count: count("active") },
          { key: "dawah", href: href({ view: "dawah" }), label: t("journey1"), count: count("dawah") },
          { key: "learners", href: href({ view: "learners" }), label: t("journey3"), count: count("learners") },
          { key: "closed", href: href({ view: "closed" }), label: STAGE_CLOSED[lang], count: count("closed") },
        ]}
      />

      {blocks.length === 0 && <Empty icon={UsersRound}>{t("nothingHere")}</Empty>}
      <div className="space-y-5">
        {blocks.map(({ group, members }) => (
          <GroupBlock key={group?.id ?? "none"} group={group} members={members} />
        ))}
      </div>
    </>
  );

  function GroupBlock({ group, members }: { group: Group | null; members: Beneficiary[] }) {
    const ownerUser = group ? db.users.find((u) => u.id === group.ownerId) : null;
    return (
      <Card
        title={
          group ? (
            <Link href={`/groups/${group.id}`} className="hover:text-brand">
              {group.name}
            </Link>
          ) : (
            "—"
          )
        }
        icon={UsersRound}
        action={
          <span className="flex items-center gap-2 text-xs text-muted">
            {group && <Pill tone={group.kind === "learning" ? "violet" : "info"}>{group.kind === "learning" ? t("learningGroup") : t("dawahGroup")}</Pill>}
            {ownerUser && <span className="hidden sm:inline">{ownerUser.name}</span>}
          </span>
        }
        bodyClassName="px-0! pb-1!"
      >
        <ul className="divide-y divide-border border-t border-border">
          {members.map((b) => {
            const name = displayName(db, user, b);
            const last = lastMessage(db, b.id);
            const waiting = awaitingReply(db, b);
            const learner = b.stage === "muslim" ? learnerState(db, b, now) : null;
            const actable = canAct(db, user, b);
            return (
              <li key={b.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-2/40">
                <Avatar name={name} size="sm" locked={name !== b.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <PersonName name={name} href={`/beneficiaries/${b.id}`} />
                    <StageBadge stage={b.stage} lang={lang} />
                    {learner && <LevelBadge level={learner.level} label={t(learner.level)} />}
                    {!actable && <Pill>{t("readOnly")}</Pill>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span>{LANG_LABELS[b.language][lang]}</span>
                    {learner && <LessonDots total={learner.total} events={learner.events} lessonIds={learner.lessons.map((l) => l.id)} />}
                    <span className={cx(waiting && "font-medium text-wa")}>
                      · {t("lastContact")} {last ? relTime(last.at, lang, now) : "—"}
                    </span>
                  </div>
                </div>
                {actable && <WhatsAppLink beneficiaryId={b.id} size="sm" />}
              </li>
            );
          })}
        </ul>
      </Card>
    );
  }
}

const STAGE_CLOSED = { ar: "مغلقة", en: "Closed" };
