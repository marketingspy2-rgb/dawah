import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BookOpen, Clock, GraduationCap } from "lucide-react";
import { applyGroupHour } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { Avatar, Bar, Card, Empty, LessonDots, LevelBadge, Notice, PageHeader, Pill, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { translator } from "@/lib/i18n";
import { canSeeName, displayName, formatHour, relTime } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import { MIN_SENT, groupBoards, hardLessons, learnerRows } from "@/lib/teaching";

export const dynamic = "force-dynamic";

/** The teacher's board: best hour per circle with one-tap apply, every learner, and the hardest lessons. */
export default async function TeachingPage({ searchParams }: { searchParams: Promise<{ applied?: string }> }) {
  const { applied } = await searchParams;
  const user = await requireUser();
  if (user.role === "caller") notFound();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  requireFeature(db, "teacherBoard");
  const now = Date.now();
  const boards = groupBoards(db, user);
  const learners = boards.flatMap((g) => g.learners);
  const rows = learnerRows(db, learners, now);
  const hard = hardLessons(db, learners, now).slice(0, 6);
  const fh = (h: number) => formatHour(h, lang);

  return (
    <>
      {applied && <Notice tone="ok">{t("boardApplied", { hour: fh(Number(applied)) })}</Notice>}
      <PageHeader title={t("boardTitle")} subtitle={t("boardSub")} />

      {!learners.length ? (
        <Card>
          <Empty icon={GraduationCap}>{t("boardNoLearners")}</Empty>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card title={t("boardBestTime")} icon={Clock}>
            <p className="-mt-1 mb-4 text-xs text-muted">{t("boardBestHint")}</p>
            <div className="space-y-5">
              {boards
                .filter((g) => g.learners.length)
                .map((g) => (
                  <section key={g.group.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/groups/${g.group.id}`} className="font-semibold hover:text-brand">
                        {g.group.name}
                      </Link>
                      <span className="text-xs text-muted">{g.current !== null ? t("boardNowAt", { hour: fh(g.current) }) : t("boardNowEach")}</span>
                    </div>

                    {g.best ? (
                      g.suggest ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-ok-soft/60 px-3 py-2.5 text-sm">
                          <span className="min-w-0 flex-1">
                            {g.currentPct !== null ? t("boardSuggest", { hour: fh(g.best.hour), pct: g.best.pct, now: g.currentPct }) : t("boardSuggestNoNow", { hour: fh(g.best.hour), pct: g.best.pct })}
                          </span>
                          <form action={applyGroupHour}>
                            <input type="hidden" name="groupId" value={g.group.id} />
                            <input type="hidden" name="hour" value={g.best.hour} />
                            <PendingButton className="rounded-full bg-ok px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90">{t("boardApply", { hour: fh(g.best.hour) })}</PendingButton>
                          </form>
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-ok">✓ {t("boardKeep")}</div>
                      )
                    ) : (
                      <p className="mt-3 text-sm text-muted">{t("boardNotEnough", { n: MIN_SENT })}</p>
                    )}

                    {g.hours.length > 0 && (
                      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        {g.hours.map((h) => (
                          <li key={h.hour} className="flex items-center gap-3 text-sm">
                            <span className={cx("w-14 shrink-0", g.best?.hour === h.hour && "font-semibold text-ok")}>{fh(h.hour)}</span>
                            <Bar value={h.pct} tone={g.best?.hour === h.hour ? "ok" : "brand"} />
                            <span className="num w-16 shrink-0 text-xs text-muted">
                              {h.pct}% · {h.sent}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card title={`${t("boardStudents")} (${rows.length})`} icon={GraduationCap} bodyClassName="px-0! pb-1!">
              <ul className="divide-y divide-border border-t border-border">
                {rows.map((r) => {
                  const name = displayName(db, user, r.b);
                  return (
                    <li key={r.b.id} className="flex items-start gap-3 px-5 py-3">
                      <Avatar name={name} size="sm" locked={!canSeeName(db, user, r.b)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/beneficiaries/${r.b.id}`} className="font-medium hover:text-brand" dir="auto">
                            {name}
                          </Link>
                          <LevelBadge level={r.state.level} label={t(r.state.level)} />
                        </div>
                        <div className="mt-1.5">
                          <LessonDots total={r.state.total} events={r.state.events} lessonIds={r.state.lessons.map((l) => l.id)} />
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                          <span>{t("boardOpened", { opened: r.opened, sent: r.sent })}</span>
                          {r.correctPct !== null && <span className={cx(r.correctPct < 60 && "text-bad")}>{t("boardCorrect", { pct: r.correctPct })}</span>}
                          {r.hoursToOpen !== null && <span>{t("boardOpensIn", { h: r.hoursToOpen })}</span>}
                          <span>{t("boardLastActive", { when: relTime(r.state.lastActivity, lang, now) })}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card title={t("boardHard")} icon={AlertTriangle} tone="warn">
              <p className="-mt-1 mb-3 text-xs text-muted">{t("boardHardHint")}</p>
              {hard.length ? (
                <ul className="space-y-3">
                  {hard.map((x) => (
                    <li key={x.lesson.id}>
                      <Link href={`/lessons/${x.lesson.id}`} className="flex items-start gap-2 text-sm hover:text-brand">
                        <BookOpen className="mt-0.5 size-4 shrink-0 text-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {x.lesson.order}. {x.lesson.title[lang]}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            {x.wrongPct !== null && x.wrongPct > 0 && <Pill tone={x.wrongPct >= 30 ? "bad" : "warn"}>{t("boardWrong", { pct: x.wrongPct })}</Pill>}
                            {x.stuck > 0 && <Pill tone="warn">{t("boardStuck", { n: x.stuck })}</Pill>}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>{t("nothingHere")}</Empty>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
