import Link from "next/link";
import { notFound } from "next/navigation";
import { BellRing, BookOpen, CalendarClock, Settings2, UsersRound } from "lucide-react";
import { sendGroupNow, sendLessonNow, updateGroupSchedule } from "@/app/actions";
import { Avatar, Bar, Button, Card, Empty, Field, LessonDots, LevelBadge, Notice, PageHeader, PersonName, Pill, StageBadge, WhatsAppLink, WhatsAppSubmit, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { awaitingReply, canManageUser, displayName, formatHour, groupMembers, lastMessage, learnerState, localTime, nextScheduled, relTime, teamOf, trackLessons, visibleGroups, weekdayName } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string; saved?: string }> }) {
  const { id } = await params;
  const { sent, saved } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();
  const group = visibleGroups(db, user).find((g) => g.id === id);
  if (!group) notFound();

  const owner = db.users.find((u) => u.id === group.ownerId)!;
  const team = teamOf(db, owner);
  const canEdit = owner.id === user.id || canManageUser(db, user, owner);
  const learning = group.kind === "learning";
  const track = group.trackId ? db.tracks.find((tr) => tr.id === group.trackId) : null;
  const lessons = group.trackId ? trackLessons(db, group.trackId) : [];
  const members = groupMembers(db, group.id).map((b) => ({
    b,
    s: b.stage === "muslim" ? learnerState(db, b, now) : null,
    next: learning ? nextScheduled(db, b, now) : null,
    last: lastMessage(db, b.id),
    waiting: !!awaitingReply(db, b),
  }));
  const done = members.reduce((n, m) => n + (m.s?.completed ?? 0), 0);
  const total = members.reduce((n, m) => n + (m.s?.total ?? 0), 0);
  const sendable = members.filter((m) => m.s && m.s.completed < m.s.total).length;

  const crumbs = [
    ...(user.role === "admin" || user.role === "supervisor" ? [{ href: "/team", label: team?.name ?? t("team") }, { href: `/team/${owner.id}`, label: owner.name }] : []),
    { href: "/groups", label: user.id === owner.id ? t("myGroups") : t("groups") },
  ];

  return (
    <>
      {sent !== undefined && <Notice tone={sent === "0" ? "warn" : "ok"}>{sent === "0" ? t("nothingHere") : t("sentCount", { n: sent })}</Notice>}
      {saved && <Notice tone="ok">{t("savedOk")}</Notice>}

      <PageHeader
        crumbs={crumbs}
        eyebrow={learning ? t("learningGroup") : t("dawahGroup")}
        title={group.name}
        subtitle={
          <>
            {LANG_LABELS[group.language][lang]} · {owner.name}
            {track ? ` · ${t("track")}: ${track.title[lang]}` : ""}
          </>
        }
        actions={
          learning &&
          canEdit && (
            <form action={sendGroupNow}>
              <input type="hidden" name="groupId" value={group.id} />
              <WhatsAppSubmit size="lg" label={`${t("sendToGroup")} (${sendable})`} disabled={!sendable} />
            </form>
          )
        }
      />

      <div className={cx("grid gap-5", learning && "lg:grid-cols-[minmax(0,1fr)_320px]")}>
        <Card
          title={t("members")}
          icon={UsersRound}
          action={
            learning && total ? (
              <span className="flex items-center gap-2 text-xs text-muted">
                <Bar value={(done / total) * 100} tone="ok" className="w-24" />
                <span className="num">{Math.round((done / total) * 100)}%</span>
              </span>
            ) : (
              <span className="num text-xs text-muted">{members.length}</span>
            )
          }
          bodyClassName="px-0! pb-1!"
        >
          {members.length ? (
            <ul className="divide-y divide-border border-t border-border">
              {members.map(({ b, s, next, last, waiting }) => {
                const name = displayName(db, user, b);
                return (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap">
                    <Avatar name={name} size="sm" locked={name !== b.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PersonName name={name} href={`/beneficiaries/${b.id}`} />
                        {s ? <LevelBadge level={s.level} label={t(s.level)} /> : <StageBadge stage={b.stage} lang={lang} />}
                        {waiting && <span className="size-2 rounded-full bg-wa" title={t("statWaiting")} />}
                      </div>
                      {s ? (
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <LessonDots total={s.total} events={s.events} lessonIds={s.lessons.map((l) => l.id)} />
                          <span className="num">
                            {s.completed}/{s.total}
                          </span>
                          <span className="flex items-center gap-1">
                            {next?.kind === "reminder" ? <BellRing className="size-3" /> : <CalendarClock className="size-3" />}
                            {next ? `${next.kind === "reminder" ? t("reminder") : t("lessonN", { n: next.lesson.order })} · ${localTime(b.timezone, lang, next.at)}` : s.completed >= s.total ? t("trackDone") : "—"}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs text-muted">
                          {t("lastContact")} {last ? relTime(last.at, lang, now) : "—"}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {s && canEdit && s.completed < s.total && (
                        <form action={sendLessonNow}>
                          <input type="hidden" name="beneficiaryId" value={b.id} />
                          <WhatsAppSubmit size="sm" label={s.waitingOnLesson ? t("sendReminder") : t("sendNow")} />
                        </form>
                      )}
                      <WhatsAppLink beneficiaryId={b.id} size="sm" />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 pb-4">
              <Empty icon={UsersRound}>{t("nothingHere")}</Empty>
            </div>
          )}
        </Card>

        {learning && (
          <div className="space-y-5">
            <Card title={t("scheduleSettings")} icon={Settings2}>
              {canEdit ? (
                <form action={updateGroupSchedule} className="space-y-4">
                  <input type="hidden" name="groupId" value={group.id} />
                  <Field label={t("groupName")}>
                    <input name="name" defaultValue={group.name} />
                  </Field>
                  <fieldset>
                    <legend className="mb-1.5 text-[13px] font-medium">{t("sendDays")}</legend>
                    <div className="grid grid-cols-7 gap-1">
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <label key={d} className="cursor-pointer">
                          <input type="checkbox" name="days" value={d} defaultChecked={group.schedule.days.includes(d as never)} className="peer sr-only" />
                          <span className="grid h-10 place-items-center rounded-lg border border-border text-xs transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                            {weekdayName(d, lang, "short")}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label={t("sendTime")} hint={t("scheduleTzHint")}>
                    <select name="hour" defaultValue={group.schedule.hour ?? ""}>
                      <option value="">{t("theirPreferred")}</option>
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {formatHour(h, lang)} · {t("fixedHour")}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="paused" defaultChecked={group.schedule.paused} /> {t("pauseSending")}
                  </label>
                  <Button>{t("save")}</Button>
                </form>
              ) : (
                <p className="text-sm text-muted">{t("readOnly")}</p>
              )}
            </Card>

            <Card title={t("track")} icon={BookOpen} action={<Link href="/lessons" className="text-xs text-brand hover:underline">{t("lessons")}</Link>}>
              {track && <p className="mb-3 text-xs text-muted">{track.description[lang]}</p>}
              <ol className="space-y-1.5 text-sm">
                {lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-2">
                    <span className="num grid size-5 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] text-muted">{l.order}</span>
                    <Link href={`/lessons/${l.id}`} className="truncate hover:text-brand">
                      {l.title[lang]}
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        )}
      </div>
      {!learning && <p className="mt-4 text-xs text-muted">{t("dawahGroupHint")}</p>}
      {learning && group.schedule.paused && (
        <div className="mt-4">
          <Pill tone="warn">{t("pausedSchedule")}</Pill>
        </div>
      )}
    </>
  );
}
