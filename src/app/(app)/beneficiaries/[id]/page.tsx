import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Award, BookOpen, Check, CheckCircle2, ClipboardList, Eye, FileText, Hand, HeartHandshake, History, Import, MessageCircle, PencilLine, Sparkles, StickyNote, UserCog, UsersRound } from "lucide-react";
import { addNote, addTask, completeTask, importChat, markSummaryReviewed, moveToGroup, regenerateSummary, sendLessonNow, toggleMuslimLesson, updateMuslim } from "@/app/actions";
import { StatusChip } from "@/components/fields";
import { CommonFields, MuslimFields } from "@/components/person-forms";
import { PendingButton } from "@/components/client";
import { PhoneSend } from "@/components/call-list";
import { QuickLog } from "@/components/quick-log";
import { LockIcon } from "@/components/icons";
import { Avatar, Button, Card, Crumbs, Empty, Field, LevelBadge, Notice, Pill, RoleBadge, WhatsAppLink, cx } from "@/components/ui";
import { mutate, newId, readDb } from "@/lib/db";
import { TASK_KIND_LABELS, langDir, translator } from "@/lib/i18n";
import { formatGregorian, formatHijri } from "@/lib/hijri";
import { F, STAGE_NAMES, lessonsDone, muslimStage } from "@/lib/programs";
import { canAct, canOpen, canSeeName, displayName, formatDate, groupOf, learnerState, localTime, messagesOf, nextScheduled, openTasks, relTime, staffUnder, teamOf } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import { MUSLIM_LESSONS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BeneficiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imported?: string; noted?: string; unreadable?: string; movedTo?: string; group?: string; sent?: string; converted?: string; added?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { imported, noted, unreadable, movedTo, group: movedGroup, sent, converted, added, saved } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? (h.get("host")?.startsWith("localhost") ? "http" : "https")}://${h.get("host")}`;
  const t = translator(lang);
  const found = readDb().beneficiaries.find((x) => x.id === id);
  if (!found || !canOpen(readDb(), user, found)) notFound();
  // People still in هداية have their own file.
  if (found.program === "hidaya" || !found.muslim) redirect(`/hidaya/${id}`);

  // Every opening of a file is recorded.
  await mutate((d) => {
    d.audit.unshift({ id: newId("AU"), userId: user.id, action: "open_file", target: id, at: new Date().toISOString() });
  });
  const db = readDb();
  const b = db.beneficiaries.find((x) => x.id === id)!;

  const now = Date.now();
  const name = displayName(db, user, b);
  const showReal = canSeeName(db, user, b);
  const actable = canAct(db, user, b);
  const m = b.muslim!;
  const stageNo = muslimStage(m);
  const staffList = user.role === "admin" ? db.users.filter((u) => u.role === "teacher" || u.role === "caller") : staffUnder(db, user);
  if (!staffList.some((u) => u.id === b.assignedTo)) staffList.unshift(db.users.find((u) => u.id === b.assignedTo)!);
  const owner = db.users.find((u) => u.id === b.assignedTo)!;
  const introducer = b.introducedBy ? db.users.find((u) => u.id === b.introducedBy) : null;
  const team = teamOf(db, owner);
  const group = groupOf(db, b);
  const ownerGroups = db.groups.filter((g) => g.ownerId === owner.id);
  const notes = db.notes.filter((n) => n.beneficiaryId === b.id).sort((a, c) => c.at.localeCompare(a.at));
  const tasks = openTasks(db, b.id);
  const messages = messagesOf(db, b.id);
  const recent = messages.slice(-5);
  const learner = b.stage === "muslim" ? learnerState(db, b, now) : null;
  const next = learner ? nextScheduled(db, b, now) : null;
  const history = db.assignments.filter((a) => a.beneficiaryId === b.id).sort((a, c) => c.at.localeCompare(a.at));
  const userName = (uid: string | null) => db.users.find((u) => u.id === uid)?.name ?? "—";

  const crumbs = [
    ...(user.role !== "caller" && user.role !== "teacher" && team ? [{ href: `/team`, label: team.name }] : []),
    ...(user.id !== owner.id && user.role !== "caller" ? [{ href: `/team/${owner.id}`, label: owner.name }] : []),
    { href: "/beneficiaries", label: t("newMuslim") },
    ...(group ? [{ href: `/groups/${group.id}`, label: group.name }] : []),
  ];

  // The program: هداية, then the three stages of six lessons, then the certificate.
  const steps = [t("hidaya"), STAGE_NAMES[1][lang], STAGE_NAMES[2][lang], STAGE_NAMES[3][lang], F.certificate[lang]];
  const current = m.certificate ? 4 : stageNo;

  return (
    <>
      {noted && <Notice tone="ok">{t("savedAsNote")}</Notice>}
      {imported && (unreadable ? <Notice tone="warn">{t("unreadable")}</Notice> : <Notice tone="ok">{t("imported", { n: imported })}</Notice>)}
      {converted && <Notice tone="ok">{t("convertedNotice")}</Notice>}
      {added && <Notice tone="ok">{t("muslimAdded")}</Notice>}
      {saved && <Notice tone="ok">{t("savedOk")}</Notice>}
      {movedTo && <Notice tone="ok">{movedGroup ? t("movedToTeacher", { name: movedTo, group: movedGroup }) : t("movedToFollower", { name: movedTo })}</Notice>}
      {sent !== undefined && <Notice tone={sent === "0" ? "warn" : "ok"}>{sent === "0" ? t("nothingHere") : t("sentOk")}</Notice>}

      <Crumbs items={crumbs} />

      <section className="animate-rise mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="bg-pattern-light flex flex-wrap items-start gap-4 bg-brand-tint p-5">
          <Avatar name={name} size="lg" locked={!showReal} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 dir="auto" className="text-2xl font-bold">
                {name}
              </h1>
              {b.sensitive && (
                <Pill tone="warn">
                  <LockIcon /> {t("sensitive")}
                </Pill>
              )}
              <span className="num rounded-lg bg-surface px-2 py-0.5 text-xs text-muted shadow-soft">
                {F.serial[lang]} {m.serial}
              </span>
              <StatusChip value={m.status} />
              {m.certificate && (
                <Pill tone="gold">
                  <Award className="size-3" /> {F.certificate[lang]}
                </Pill>
              )}
              {learner && <LevelBadge level={learner.level} label={t(learner.level)} />}
              {!actable && (
                <Pill>
                  <Eye className="size-3" /> {t("readOnly")}
                </Pill>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {[b.nationality, b.languageLabel, b.gender === "f" ? t("female") : t("male"), b.city].filter(Boolean).map((x) => (
                <span key={x}>{x}</span>
              ))}
              {showReal && (
                <span dir="ltr" className="num">
                  {b.phone}
                </span>
              )}
              <span>
                {F.islamDate[lang]}: <span className="font-medium text-text">{formatHijri(m.islamDate, lang)}</span>
              </span>
              {b.timezone !== "Asia/Riyadh" && (
                <span>
                  {t("localTime")} <span className="font-medium text-text">{localTime(b.timezone, lang)}</span>
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 shadow-soft">
                <span className="text-muted">{t("responsible")}:</span>
                <Link href={`/team/${owner.id}`} className="font-medium hover:text-brand">
                  {owner.name}
                </Link>
                <RoleBadge role={owner.role} gender={owner.gender} lang={lang} />
              </span>
              {introducer && (
                <span className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 shadow-soft">
                  <span className="text-muted">{F.caller[lang]}:</span>
                  <span className="font-medium">{introducer.name}</span>
                </span>
              )}
              {b.hidaya && (
                <Link href={`/hidaya/${b.id}`} className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-brand shadow-soft hover:underline">
                  <HeartHandshake className="size-3.5" /> {t("hidayaFileLink")}
                </Link>
              )}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-col sm:items-stretch">
            <WhatsAppLink beneficiaryId={b.id} size="lg" label={t("openChat")} />
            {actable && learner && learner.completed < learner.total && (
              <form action={sendLessonNow}>
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <PendingButton className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-wa/40 bg-surface px-5 text-[15px] font-medium text-wa transition hover:bg-wa-soft">
                  <BookOpen className="size-4" />
                  {learner.waitingOnLesson ? t("sendReminder") : t("sendThisLesson")}
                </PendingButton>
              </form>
            )}
          </div>
        </div>

        {/* Journey */}
        <ol className="scrollbar-none flex items-start overflow-x-auto px-5 py-4" aria-label={t("journey")}>
          {steps.map((label, i) => {
            const done = i < current || (i === current && i === 4);
            const here = i === current && i !== 4;
            return (
              <li key={label} className="flex min-w-20 flex-1 flex-col items-center gap-1.5 text-center">
                <div className="flex w-full items-center">
                  <span className={cx("h-0.5 flex-1", i === 0 ? "opacity-0" : i <= current ? "bg-brand" : "bg-surface-3")} />
                  <span
                    className={cx(
                      "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      done ? "bg-brand text-white" : here ? "bg-gold text-white ring-4 ring-gold-soft" : "bg-surface-3 text-muted",
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cx("h-0.5 flex-1", i === steps.length - 1 ? "opacity-0" : i < current ? "bg-brand" : "bg-surface-3")} />
                </div>
                <span className={cx("text-[11px] leading-tight", here ? "font-semibold text-text" : "text-muted")}>{label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {!actable && <Notice tone="info">{t("readOnlyFile", { name: owner.name })}</Notice>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card
            title={t("lessons18")}
            icon={BookOpen}
            action={
              <span className="num text-xs text-muted">
                {lessonsDone(m)}/{MUSLIM_LESSONS} · {m.certificate ? F.certificate[lang] : STAGE_NAMES[stageNo][lang]}
              </span>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {([1, 2, 3] as const).map((st) => (
                <div key={st} className={cx("rounded-xl border p-3", !m.certificate && st === stageNo ? "border-gold/50 bg-gold-soft/40" : "border-border")}>
                  <div className="mb-2 text-xs font-semibold text-muted">{STAGE_NAMES[st][lang]}</div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {m.lessons.slice((st - 1) * 6, st * 6).map((done, i) => {
                      const n = (st - 1) * 6 + i + 1;
                      const cls = cx("num grid h-9 place-items-center rounded-lg text-sm font-semibold transition", done ? "bg-ok text-white" : "bg-surface-2 text-muted", actable && "hover:ring-2 hover:ring-brand/40");
                      return actable ? (
                        <form key={n} action={toggleMuslimLesson}>
                          <input type="hidden" name="beneficiaryId" value={b.id} />
                          <input type="hidden" name="lesson" value={n} />
                          <PendingButton className={cx(cls, "w-full")} title={`${t("lessonN", { n })}`} aria-pressed={done}>
                            {n}
                          </PendingButton>
                        </form>
                      ) : (
                        <span key={n} className={cls}>
                          {n}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <Award className={cx("size-5", m.certificate ? "text-gold" : "text-faint")} />
                {m.certificate ? t("certificateDone") : lessonsDone(m) === MUSLIM_LESSONS ? t("certificateReady") : t("certificateAfter", { n: MUSLIM_LESSONS - lessonsDone(m) })}
              </span>
              {actable && lessonsDone(m) === MUSLIM_LESSONS && (
                <form action={toggleMuslimLesson}>
                  <input type="hidden" name="beneficiaryId" value={b.id} />
                  <input type="hidden" name="lesson" value={0} />
                  <PendingButton className={cx("rounded-full px-4 py-1.5 text-sm font-semibold", m.certificate ? "border border-border-strong bg-surface" : "bg-gold text-white")}>{m.certificate ? t("certificateUndo") : t("certificateGive")}</PendingButton>
                </form>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">{t("lessons18Hint")}</p>
          </Card>

          {actable && (
            <Card title={t("quickLog")} icon={Hand} action={<span className="hidden text-xs text-muted sm:block">{t("quickLogHint")}</span>}>
              <QuickLog db={db} user={user} beneficiaryId={b.id} lang={lang} t={t} />
              <div className="mt-4 border-t border-border pt-3">
                <PhoneSend b={b} ctx={{ db, user, lang, t, origin }} />
              </div>
            </Card>
          )}

          {learner && (
            <Card
              title={t("learningProgress")}
              icon={BookOpen}
              action={
                <span className="text-xs text-muted">
                  {t("lessonOf", { n: learner.completed, total: learner.total })}
                </span>
              }
            >
              <ol className="grid gap-1.5 sm:grid-cols-2">
                {learner.lessons.map((l) => {
                  const e = learner.events.find((x) => x.lessonId === l.id);
                  return (
                    <li key={l.id} className={cx("flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm", e && !e.completedAt ? "bg-info-soft" : "bg-surface-2/50")}>
                      <span
                        className={cx(
                          "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                          e?.completedAt ? (e.correct === false ? "bg-warn text-white" : "bg-ok text-white") : e ? "bg-surface text-info ring-2 ring-info" : "bg-surface-3 text-muted",
                        )}
                      >
                        {e?.completedAt ? <Check className="size-3.5" strokeWidth={3} /> : l.order}
                      </span>
                      <Link href={`/lessons/${l.id}`} className={cx("min-w-0 flex-1 truncate hover:text-brand", !e && "text-muted")}>
                        {l.title[lang]}
                      </Link>
                      {e && !e.completedAt && <span className="text-[11px] text-info">{e.openedAt ? t("openedTimes") : t("sent")}</span>}
                      {e?.completedAt && e.correct === false && <span className="text-[11px] text-warn">{t("wrongRate")}</span>}
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5 text-sm">
                <span className="text-muted">
                  {t("nextSend")}:{" "}
                  <span className="font-medium text-text">
                    {next
                      ? `${next.kind === "reminder" ? t("reminder") : t("lessonN", { n: next.lesson.order })} · ${localTime(b.timezone, lang, next.at)} ${t("theirTime")}`
                      : group?.schedule.paused
                        ? t("pausedSchedule")
                        : t("trackDone")}
                  </span>
                </span>
                <span className="text-xs text-muted">
                  {t("lastActivity")} {relTime(learner.lastActivity, lang, now)}
                </span>
              </div>
            </Card>
          )}

          <Card
            title={t("handoverSummary")}
            icon={Sparkles}
            action={
              actable && (
                <form action={regenerateSummary}>
                  <input type="hidden" name="beneficiaryId" value={b.id} />
                  <PendingButton className="text-xs font-medium text-brand hover:underline">{b.summary ? t("regenerate") : t("generateSummary")}</PendingButton>
                </form>
              )
            }
          >
            <p className="mb-2 text-xs text-muted">{t("summaryHint")}</p>
            {b.summary ? (
              actable ? (
                <form action={markSummaryReviewed} className="space-y-2">
                  <input type="hidden" name="beneficiaryId" value={b.id} />
                  <textarea name="text" rows={7} defaultValue={b.summary.text} className="text-sm leading-7" />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>
                      {relTime(b.summary.generatedAt, lang, now)} ·{" "}
                      {b.summary.reviewed ? (
                        <span className="inline-flex items-center gap-1 text-ok">
                          <CheckCircle2 className="size-3.5" /> {t("reviewed")}
                        </span>
                      ) : (
                        t("notReviewed")
                      )}
                    </span>
                    <Button size="sm" variant="secondary">
                      {t("markReviewed")}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm leading-7 whitespace-pre-wrap">{b.summary.text}</p>
              )
            ) : (
              <Empty icon={FileText}>{t("nothingHere")}</Empty>
            )}
          </Card>

          <Card title={t("notes")} icon={StickyNote}>
            <form action={addNote} className="mb-4 space-y-2">
              <input type="hidden" name="beneficiaryId" value={b.id} />
              <textarea name="text" rows={2} placeholder={t("addNote")} required />
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="needsContact" /> {t("noteNeedsContact")}
                </label>
                <Button size="sm">{t("addNote")}</Button>
              </div>
            </form>
            {notes.length ? (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className={cx("flex items-start gap-3 rounded-xl px-3 py-2.5", n.needsContact ? "bg-warn-soft/60" : "bg-surface-2/50")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{n.text}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {userName(n.authorId)} · {relTime(n.at, lang, now)}
                        {n.needsContact && <span className="text-warn"> · {t("noteNeedsContact")}</span>}
                      </p>
                    </div>
                    {n.needsContact && actable && <WhatsAppLink beneficiaryId={b.id} size="sm" context={n.text} />}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{t("nothingHere")}</Empty>
            )}
          </Card>

          <Card
            title={
              <>
                {t("conversation")} <span className="num text-muted">({messages.length})</span>
              </>
            }
            icon={MessageCircle}
            action={<WhatsAppLink beneficiaryId={b.id} size="sm" label={t("openChat")} />}
          >
            {recent.length ? (
              <ul className="bg-pattern-light space-y-2 rounded-xl bg-chat p-3">
                {recent.map((m) => (
                  <li key={m.id} className={cx("flex", m.direction === "out" ? "justify-end" : "justify-start")}>
                    <div className={cx("max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-soft", m.direction === "out" ? "bg-bubble-out" : "bg-bubble-in")}>
                      <div className="mb-0.5 text-[11px] text-muted">
                        {m.direction === "out" ? userName(m.authorId) : name} · {formatDate(m.at, lang)}
                      </div>
                      <p dir={langDir(b.language)} className="whitespace-pre-wrap">
                        {m.kind === "lesson" ? m.text.replace("{link}", "🔗") : m.text}
                      </p>
                      {m.translation && m.translation !== m.text && <p className="mt-0.5 text-xs text-muted">{m.translation.replace("{link}", "").trim()}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{t("nothingHere")}</Empty>
            )}
          </Card>

          {actable && (
            <Card title={t("importChat")} icon={Import}>
              <form action={importChat} className="space-y-2">
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <p className="text-sm text-muted">{t("importHint")}</p>
                <input type="file" name="file" accept=".txt,.zip,text/plain,application/zip" className="w-full text-sm" />
                <textarea name="raw" rows={3} placeholder={t("importPaste")} className="text-sm" dir="auto" />
                <div className="flex justify-end">
                  <Button size="sm" variant="secondary">
                    {t("importBtn")}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {actable && (
            <Card title={t("responsible")} icon={UsersRound}>
              <div className="space-y-3">
                <form action={moveToGroup} className="flex items-end gap-2">
                  <input type="hidden" name="beneficiaryId" value={b.id} />
                  <Field label={t("moveToGroup")} className="flex-1">
                    <select key={b.groupId ?? ""} name="groupId" defaultValue={b.groupId ?? ""}>
                      {!b.groupId && <option value="">—</option>}
                      {ownerGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Button size="md" variant="secondary">
                    {t("save")}
                  </Button>
                </form>

              </div>
            </Card>
          )}

          <Card title={t("tasks")} icon={ClipboardList}>
            {tasks.length ? (
              <ul className="mb-3 divide-y divide-border">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2.5 py-2">
                    {actable ? (
                      <form action={completeTask}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button title={t("markDone")} aria-label={t("markDone")} className="grid size-6 place-items-center rounded-full border-2 border-border-strong text-transparent hover:border-ok hover:text-ok">
                          <Check className="size-3.5" strokeWidth={3} />
                        </button>
                      </form>
                    ) : (
                      <span className="size-6 rounded-full border-2 border-border" />
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <div>{task.title}</div>
                      <div className={cx("text-xs", new Date(task.due).getTime() < now ? "text-bad" : "text-muted")}>
                        {TASK_KIND_LABELS[task.kind][lang]} · {relTime(task.due, lang, now)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mb-3">
                <Empty>{t("nothingHere")}</Empty>
              </div>
            )}
            {actable && (
              <form action={addTask} className="space-y-2 border-t border-border pt-3">
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <input name="title" placeholder={t("taskTitle")} required />
                <div className="flex gap-2">
                  <input type="datetime-local" name="due" required className="min-w-0 flex-1" aria-label={t("due")} />
                  <Button size="md">{t("addTask")}</Button>
                </div>
              </form>
            )}
          </Card>

          <Card title={t("muslimSheet")} icon={UserCog}>
            <dl className="space-y-2.5 text-sm">
              {(
                [
                  [F.islamDate[lang], `${formatHijri(m.islamDate, lang)} · ${formatGregorian(m.islamDate, lang)}`],
                  [F.caller[lang], introducer?.name ?? ""],
                  [F.follower[lang], owner.name],
                  [F.workplace[lang], b.workplace],
                  [F.profession[lang], b.profession],
                  [F.iqama[lang], showReal ? m.iqama : "•••"],
                  [F.sponsorName[lang], m.sponsorName],
                  [F.sponsorPhone[lang], m.sponsorPhone],
                  [F.contactMethod[lang], m.contactMethod],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-end font-medium" dir="auto">
                    {v || "—"}
                  </dd>
                </div>
              ))}
            </dl>
            {actable && (
              <details className="mt-4 border-t border-border pt-3">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand">
                  <PencilLine className="size-4" /> {t("editData")}
                </summary>
                <form action={updateMuslim} className="mt-4 space-y-3">
                  <input type="hidden" name="beneficiaryId" value={b.id} />
                  <CommonFields b={b} ctx={{ db, lang, t }} />
                  <MuslimFields b={b} ctx={{ db, lang, t }} staff={staffList} user={user} />
                  <Button>{t("save")}</Button>
                </form>
              </details>
            )}
          </Card>

          <Card title={t("assignmentHistory")} icon={History}>
            <ol className="relative space-y-3 border-s-2 border-border ps-4 text-sm">
              {history.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute top-1.5 size-2.5 rounded-full bg-brand ltr:-left-[21px] rtl:-right-[21px]" />
                  <div>
                    {a.fromId ? `${userName(a.fromId)} ${lang === "ar" ? "←" : "→"} ` : ""}
                    <span className="font-medium">{userName(a.toId)}</span>
                  </div>
                  <div className="text-xs text-muted">
                    {a.reason} · {formatDate(a.at, lang)}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
