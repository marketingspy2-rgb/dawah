import Link from "next/link";
import { AlertTriangle, BellRing, BookOpen, CalendarClock, CheckCircle2, ClipboardList, Clock, HeartPulse, MessageCircle, StickyNote, Users } from "lucide-react";
import { completeTask, sendLessonNow } from "@/app/actions";
import { Avatar, Bar, Card, Empty, LessonDots, LevelBadge, Notice, PageHeader, PersonName, Pill, RoleBadge, Stat, WhatsAppLink, WhatsAppSubmit, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { TASK_KIND_LABELS, translator, type T } from "@/lib/i18n";
import {
  DAY,
  HOUR,
  awaitingReply,
  canAct,
  displayName,
  formatDay,
  isStaff,
  learnerState,
  localTime,
  openTasks,
  relTime,
  staffMetrics,
  staffUnder,
  supervisorMetrics,
  taskBuckets,
  teamOf,
  upcoming,
  visibleBeneficiaries,
} from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import type { DB, UiLang, User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const notice = sent !== undefined ? <Notice tone={sent === "0" ? "warn" : "ok"}>{sent === "0" ? t("nothingHere") : t("sentCount", { n: sent })}</Notice> : null;
  return (
    <>
      {notice}
      {isStaff(user) ? <MyDay db={db} user={user} lang={lang} t={t} /> : <Overview db={db} user={user} lang={lang} t={t} />}
    </>
  );
}

type P = { db: DB; user: User; lang: UiLang; t: T };

function MyDay({ db, user, lang, t }: P) {
  const now = Date.now();
  const mine = db.beneficiaries.filter((b) => b.assignedTo === user.id && b.stage !== "closed");
  const waiting = mine
    .map((b) => ({ b, m: awaitingReply(db, b) }))
    .filter((x): x is { b: typeof x.b; m: NonNullable<typeof x.m> } => !!x.m)
    .sort((a, c) => a.m.at.localeCompare(c.m.at));
  const learners = mine.filter((b) => b.stage === "muslim").map((b) => ({ b, s: learnerState(db, b, now) }));
  const worried = learners.filter((x) => x.s.level !== "green").sort((a, c) => c.s.daysSince - a.s.daysSince);
  const today = upcoming(db, mine, now, 1).filter((s) => s.at < now + 24 * HOUR);
  const tasks = taskBuckets(openTasks(db).filter((task) => task.assigneeId === user.id), now);
  const ids = new Set(mine.map((b) => b.id));
  const notes = db.notes
    .filter((n) => n.needsContact && ids.has(n.beneficiaryId) && now - new Date(n.at).getTime() < 7 * DAY)
    .filter((n) => !db.messages.some((m) => m.beneficiaryId === n.beneficiaryId && m.direction === "out" && m.authorId === user.id && m.kind !== "lesson" && m.at > n.at));
  const introduced = db.beneficiaries.filter((b) => b.introducedBy === user.id);
  const byId = (id: string) => db.beneficiaries.find((b) => b.id === id)!;

  return (
    <>
      <PageHeader eyebrow={formatDay(now, lang)} title={t("greeting", { name: user.name.split(" ")[0] })} subtitle={t("todaySub")} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={MessageCircle} label={t("statWaiting")} value={waiting.length} tone={waiting.length ? "warn" : "ok"} href="/chats" />
        <Stat icon={ClipboardList} label={t("statOverdue")} value={tasks.overdue.length} tone={tasks.overdue.length ? "bad" : "ok"} />
        {user.role === "teacher" ? (
          <>
            <Stat icon={HeartPulse} label={t("statLearners")} value={worried.length} tone={worried.length ? "warn" : "ok"} />
            <Stat icon={CalendarClock} label={t("statLessons")} value={today.length} href="/schedule" />
          </>
        ) : (
          <>
            <Stat icon={Users} label={t("activeCases")} value={mine.length} href="/beneficiaries" />
            <Stat icon={HeartPulse} label={t("conversions")} value={introduced.length} />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title={t("waitingReply")} icon={MessageCircle} tone={waiting.length ? "warn" : undefined}>
          {waiting.length ? (
            <ul className="divide-y divide-border">
              {waiting.map(({ b, m }) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={displayName(db, user, b)} size="sm" locked={b.sensitive && displayName(db, user, b) !== b.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <PersonName name={displayName(db, user, b)} href={`/beneficiaries/${b.id}`} />
                      <span className={cx("text-[11px]", now - new Date(m.at).getTime() > 12 * HOUR ? "text-bad" : "text-muted")}>{relTime(m.at, lang, now)}</span>
                    </div>
                    <p dir="auto" className="truncate text-xs text-muted">
                      {m.translation ?? m.text}
                    </p>
                  </div>
                  <WhatsAppLink beneficiaryId={b.id} size="sm" label={t("openChat")} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={CheckCircle2}>{t("allCaughtUp")}</Empty>
          )}
        </Card>

        {user.role === "teacher" && (
          <Card title={t("lessonsToday")} icon={BookOpen} action={<Link href="/schedule" className="text-xs text-brand hover:underline">{t("schedule")}</Link>}>
            {today.length ? (
              <ul className="divide-y divide-border">
                {today.map((s) => (
                  <li key={s.beneficiary.id} className="flex items-center gap-3 py-2.5">
                    <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl", s.kind === "reminder" ? "bg-gold-soft text-gold" : "bg-brand-soft text-brand")}>
                      {s.kind === "reminder" ? <BellRing className="size-4" /> : <BookOpen className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <PersonName name={displayName(db, user, s.beneficiary)} href={`/beneficiaries/${s.beneficiary.id}`} />
                      <div className="truncate text-xs text-muted">
                        {s.kind === "reminder" ? `${t("reminder")}: ` : `${t("lessonN", { n: s.lesson.order })}: `}
                        {s.lesson.title[lang]} · {localTime(s.beneficiary.timezone, lang, s.at)} {t("theirTime")}
                      </div>
                    </div>
                    <form action={sendLessonNow}>
                      <input type="hidden" name="beneficiaryId" value={s.beneficiary.id} />
                      <WhatsAppSubmit size="sm" label={t("sendNow")} />
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={CalendarClock}>{t("noUpcoming")}</Empty>
            )}
          </Card>
        )}

        {user.role === "teacher" && (
          <Card title={t("learnerWarnings")} icon={HeartPulse} tone={worried.length ? "bad" : undefined}>
            {worried.length ? (
              <ul className="divide-y divide-border">
                {worried.map(({ b, s }) => (
                  <li key={b.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PersonName name={displayName(db, user, b)} href={`/beneficiaries/${b.id}`} />
                        <LevelBadge level={s.level} label={t(s.level)} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <LessonDots total={s.total} events={s.events} lessonIds={s.lessons.map((l) => l.id)} />
                        <span>
                          {t("lastActivity")} {relTime(s.lastActivity, lang, now)}
                        </span>
                      </div>
                    </div>
                    <WhatsAppLink beneficiaryId={b.id} size="sm" label={t("openChat")} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={CheckCircle2}>{t("allCaughtUp")}</Empty>
            )}
          </Card>
        )}

        <Card title={t("myTasks")} icon={ClipboardList} tone={tasks.overdue.length ? "bad" : undefined}>
          {tasks.overdue.length + tasks.today.length + tasks.upcoming.length ? (
            <ul className="divide-y divide-border">
              {[...tasks.overdue, ...tasks.today, ...tasks.upcoming].slice(0, 8).map((task) => {
                const b = byId(task.beneficiaryId);
                const late = new Date(task.due).getTime() < now;
                return (
                  <li key={task.id} className="flex items-center gap-3 py-2.5">
                    <form action={completeTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button aria-label={t("markDone")} title={t("markDone")} className="grid size-6 place-items-center rounded-full border-2 border-border-strong text-transparent transition hover:border-ok hover:text-ok">
                        <CheckCircle2 className="size-4" />
                      </button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{task.title}</div>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <PersonName name={displayName(db, user, b)} href={`/beneficiaries/${b.id}`} className="text-xs font-normal" />
                        <span>· {TASK_KIND_LABELS[task.kind][lang]}</span>
                        <span className={cx("flex items-center gap-1", late && "text-bad")}>
                          · <Clock className="size-3" /> {relTime(task.due, lang, now)}
                        </span>
                      </div>
                    </div>
                    <WhatsAppLink beneficiaryId={b.id} size="sm" context={task.title} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty icon={CheckCircle2}>{t("allCaughtUp")}</Empty>
          )}
        </Card>

        {notes.length > 0 && (
          <Card title={t("needsContact")} icon={StickyNote} tone="warn">
            <ul className="divide-y divide-border">
              {notes.map((n) => {
                const b = byId(n.beneficiaryId);
                const author = db.users.find((u) => u.id === n.authorId);
                return (
                  <li key={n.id} className="flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <PersonName name={displayName(db, user, b)} href={`/beneficiaries/${b.id}`} />
                      <p className="mt-0.5 text-sm">{n.text}</p>
                      <div className="text-[11px] text-muted">
                        {author?.name} · {relTime(n.at, lang, now)}
                      </div>
                    </div>
                    <WhatsAppLink beneficiaryId={b.id} size="sm" context={n.text} />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {user.role === "caller" && introduced.length > 0 && (
          <Card title={t("conversions")} icon={HeartPulse}>
            <ul className="divide-y divide-border">
              {introduced.map((b) => {
                const s = learnerState(db, b, now);
                const teacher = db.users.find((u) => u.id === b.assignedTo);
                return (
                  <li key={b.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PersonName name={displayName(db, user, b)} href={`/beneficiaries/${b.id}`} />
                        <LevelBadge level={s.level} label={t(s.level)} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                        <LessonDots total={s.total} events={s.events} lessonIds={s.lessons.map((l) => l.id)} />
                        <span>
                          {t("responsible")}: {teacher?.name}
                        </span>
                      </div>
                    </div>
                    <Pill>{t("readOnly")}</Pill>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

function Overview({ db, user, lang, t }: P) {
  const now = Date.now();
  const staff = staffUnder(db, user);
  const list = visibleBeneficiaries(db, user).filter((b) => b.stage !== "closed");
  const metrics = staffMetrics(db, staff, now);
  const teams = supervisorMetrics(db, now).filter((m) => user.role === "admin" || m.team.supervisorId === user.id);
  const learners = list.filter((b) => b.stage === "muslim");
  const red = metrics.reduce((n, m) => n + m.red, 0);
  const waitingLong = list.filter((b) => {
    const m = awaitingReply(db, b);
    return m && now - new Date(m.at).getTime() > 12 * HOUR;
  });
  const team = teamOf(db, user);

  const alerts: { tone: "bad" | "warn"; text: string; href?: string; cta?: string }[] = [];
  for (const m of teams) {
    for (const c of m.onLeaveWithCases) {
      alerts.push({ tone: "bad", text: t("onLeaveWithCases", { name: c.name, n: db.beneficiaries.filter((b) => b.assignedTo === c.id && b.stage !== "closed").length }), href: `/team/handover/${c.id}`, cta: t("handOver") });
    }
  }
  for (const s of staff) {
    const days = s.lastSeenAt ? (now - new Date(s.lastSeenAt).getTime()) / DAY : 99;
    if (s.status === "available" && days >= 5) alerts.push({ tone: "warn", text: t("inactiveStaff", { name: s.name, n: Math.floor(days) }), href: `/team/${s.id}`, cta: t("openProfile") });
  }
  const untouched = teams.reduce((n, m) => n + m.untouchedReds, 0);
  if (untouched) alerts.push({ tone: "bad", text: t("redUntouched", { n: untouched }), href: "/groups", cta: t("groups") });
  if (waitingLong.length) alerts.push({ tone: "warn", text: t("waitingLong", { n: waitingLong.length }), href: "/chats", cta: t("chats") });

  const callers = metrics.filter((m) => m.user.role === "caller");
  const teachers = metrics.filter((m) => m.user.role === "teacher");

  return (
    <>
      <PageHeader
        eyebrow={formatDay(now, lang)}
        title={user.role === "admin" ? t("centerOverview") : team?.name ?? t("teamOverview")}
        subtitle={t("overviewSub")}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label={t("activeCases")} value={list.length - learners.length} href="/beneficiaries" />
        <Stat icon={BookOpen} label={t("learnersCount")} value={learners.length} href="/groups" />
        <Stat icon={MessageCircle} label={t("statWaitingLong")} value={waitingLong.length} tone={waitingLong.length ? "warn" : "ok"} href="/chats" />
        <Stat icon={HeartPulse} label={t("red")} value={red} tone={red ? "bad" : "ok"} />
      </div>

      <Card title={t("needsYou")} icon={AlertTriangle} tone={alerts.length ? "bad" : undefined} className="mb-6">
        {alerts.length ? (
          <ul className="space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className={cx("flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 text-sm", a.tone === "bad" ? "border-bad/20 bg-bad-soft/60" : "border-warn/20 bg-warn-soft/60")}>
                <AlertTriangle className={cx("size-4 shrink-0", a.tone === "bad" ? "text-bad" : "text-warn")} />
                <span className="min-w-0 flex-1">{a.text}</span>
                {a.href && (
                  <Link href={a.href} className="rounded-lg bg-surface px-3 py-1 text-xs font-medium text-brand shadow-soft hover:bg-brand-soft">
                    {a.cta}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={CheckCircle2}>{t("nothingNeedsYou")}</Empty>
        )}
      </Card>

      {user.role === "admin" && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {teams.map((m) => (
            <Link key={m.team.id} href={`/team?team=${m.team.id}`} className="animate-rise rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:border-brand">
              <div className="flex items-center gap-3">
                <Avatar name={m.supervisor.name} />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{m.team.name}</div>
                  <div className="text-xs text-muted">
                    {m.supervisor.name} · <RoleBadge role="supervisor" gender={m.supervisor.gender} lang={lang} />
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-surface-2 p-2">
                  <div className="num text-lg font-bold">{m.staff.filter((s) => s.role === "caller").length}</div>
                  {t("callers")}
                </div>
                <div className="rounded-lg bg-surface-2 p-2">
                  <div className="num text-lg font-bold">{m.staff.filter((s) => s.role === "teacher").length}</div>
                  {t("teachers")}
                </div>
                <div className={cx("rounded-lg p-2", m.reds ? "bg-bad-soft text-bad" : "bg-surface-2")}>
                  <div className="num text-lg font-bold">{m.reds}</div>
                  {t("red")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <StaffList title={t("callers")} items={callers} lang={lang} t={t} kind="caller" />
        <StaffList title={t("teachers")} items={teachers} lang={lang} t={t} kind="teacher" />
      </div>
    </>
  );
}

function StaffList({ title, items, lang, t, kind }: { title: string; items: ReturnType<typeof staffMetrics>; lang: UiLang; t: T; kind: "caller" | "teacher" }) {
  const maxLoad = Math.max(1, ...items.map((m) => m.load));
  return (
    <Card title={title} icon={kind === "caller" ? MessageCircle : BookOpen} action={<span className="num text-xs text-muted">{items.length}</span>}>
      <ul className="divide-y divide-border">
        {items.map((m) => (
          <li key={m.user.id}>
            <Link href={`/team/${m.user.id}`} className="flex items-center gap-3 py-2.5 hover:bg-surface-2/50">
              <Avatar name={m.user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{m.user.name}</span>
                  {m.user.status !== "available" && <Pill tone="warn">{t(m.user.status)}</Pill>}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Bar value={(m.load / maxLoad) * 100} className="max-w-28" tone={m.user.status !== "available" && m.load ? "bad" : "brand"} />
                  <span className="num text-[11px] text-muted">
                    {m.load} {t("cases")}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {m.waiting > 0 && (
                  <Pill tone="warn">
                    <MessageCircle className="size-3" />
                    {m.waiting}
                  </Pill>
                )}
                {m.overdue > 0 && (
                  <Pill tone="bad">
                    <ClipboardList className="size-3" />
                    {m.overdue}
                  </Pill>
                )}
                {kind === "teacher" && m.red > 0 && (
                  <Pill tone="bad">
                    <HeartPulse className="size-3" />
                    {m.red}
                  </Pill>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
