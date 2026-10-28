import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addNote,
  addTask,
  changeStage,
  completeTask,
  importChat,
  markSummaryReviewed,
  regenerateSummary,
  sendNextLesson,
  updateProfile,
} from "@/app/actions";
import { SubmitButton } from "@/components/chat-client";
import { CheckIcon, LockIcon } from "@/components/icons";
import { Card, Empty, LevelBadge, Pill, StageBadge, WhatsAppButton, cx } from "@/components/ui";
import { COUNTRIES } from "@/lib/content";
import { mutate, newId, readDb } from "@/lib/db";
import { LANG_LABELS, STAGE_LABELS, TASK_KIND_LABELS, langDir, translator } from "@/lib/i18n";
import { canOpen, canSeeName, displayName, formatDate, formatHour, learnerState, localTime, messagesOf, openTasks, relTime } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import { STAGES } from "@/lib/types";

export default async function BeneficiaryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ imported?: string }> }) {
  const { id } = await params;
  const { imported } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const b = db.beneficiaries.find((x) => x.id === id);
  if (!b || !canOpen(db, user, b)) notFound();

  // Every opening of a file is recorded.
  mutate((d) => {
    d.audit.unshift({ id: newId("AU"), userId: user.id, action: "open_file", target: b.id, at: new Date().toISOString() });
  });

  const now = Date.now();
  const name = displayName(db, user, b);
  const country = COUNTRIES.find((c) => c.code === b.country);
  const caller = db.users.find((u) => u.id === b.assignedTo);
  const notes = db.notes.filter((n) => n.beneficiaryId === b.id).sort((a, c) => c.at.localeCompare(a.at));
  const tasks = openTasks(db, b.id);
  const messages = messagesOf(db, b.id);
  const recent = messages.slice(-6);
  const learner = b.stage === "muslim" ? learnerState(db, b, now) : null;
  const history = db.assignments.filter((a) => a.beneficiaryId === b.id).sort((a, c) => c.at.localeCompare(a.at));
  const userName = (uid: string | null) => db.users.find((u) => u.id === uid)?.name ?? "—";
  const showReal = canSeeName(db, user, b);

  return (
    <>
      {imported && <div className="mb-4 rounded-lg bg-ok-soft px-4 py-2 text-sm text-ok">{lang === "ar" ? `تم استيراد ${imported} رسالة جديدة.` : `Imported ${imported} new messages.`}</div>}

      <header className="mb-5 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{name.replace("🔒 ", "")}</h1>
              {b.sensitive && (
                <Pill tone="warn">
                  <LockIcon /> {t("sensitive")}
                </Pill>
              )}
              <StageBadge stage={b.stage} lang={lang} />
              {learner && <LevelBadge level={learner.level} label={t(learner.level)} />}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <span>{LANG_LABELS[b.language][lang]}</span>
              <span>{country?.[lang] ?? "—"}</span>
              {showReal && <span dir="ltr">{b.phone}</span>}
              <span>
                {t("localTime")}: <span className="font-medium text-text">{localTime(b.timezone, lang)}</span>
              </span>
              <span>
                {t("caller")}: {caller?.name}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WhatsAppButton beneficiaryId={b.id} label={lang === "ar" ? "تواصل عبر واتساب" : "Message on WhatsApp"} />
            <form action={changeStage} className="flex items-center gap-1.5">
              <input type="hidden" name="beneficiaryId" value={b.id} />
              <select name="stage" defaultValue={b.stage} className="w-auto py-1.5 text-sm" aria-label={t("changeStage")}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s][lang]}
                  </option>
                ))}
              </select>
              <SubmitButton className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2">{t("save")}</SubmitButton>
            </form>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card
            title={t("handoverSummary")}
            action={
              <form action={regenerateSummary}>
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <SubmitButton className="text-sm text-brand hover:underline">{t("regenerate")}</SubmitButton>
              </form>
            }
          >
            {b.summary ? (
              <form action={markSummaryReviewed} className="space-y-2">
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <textarea name="text" rows={8} defaultValue={b.summary.text} className="text-sm leading-7" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    {relTime(b.summary.generatedAt, lang, now)} · {b.summary.reviewed ? <span className="text-ok">{t("reviewed")} ✓</span> : t("notReviewed")}
                  </span>
                  <SubmitButton className="rounded-md bg-brand-soft px-2.5 py-1 font-medium text-brand">{t("reviewed")}</SubmitButton>
                </div>
              </form>
            ) : (
              <form action={regenerateSummary}>
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <SubmitButton className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white">{t("regenerate")}</SubmitButton>
              </form>
            )}
            <p className="mt-2 text-xs text-muted">{t("summaryNote")}</p>
          </Card>

          <Card title={t("notes")}>
            <form action={addNote} className="mb-3 space-y-2">
              <input type="hidden" name="beneficiaryId" value={b.id} />
              <textarea name="text" rows={2} placeholder={t("addNote")} />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="needsContact" className="size-4 w-auto" /> {t("needsContact")}
                </label>
                <SubmitButton className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white">{t("addNote")}</SubmitButton>
              </div>
            </form>
            {notes.length ? (
              <ul className="divide-y divide-border">
                {notes.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{n.text}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {userName(n.authorId)} · {relTime(n.at, lang, now)}
                        {n.needsContact && (
                          <>
                            {" "}
                            · <span className="text-warn">{t("needsContact")}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {n.needsContact && <WhatsAppButton beneficiaryId={b.id} size="sm" label={t("whatsapp")} context={n.text} />}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{t("nothingHere")}</Empty>
            )}
          </Card>

          <Card
            title={<>{t("timeline")} <span className="num text-muted">({messages.length})</span></>}
            action={
              <Link href={`/chats?b=${b.id}`} className="text-sm text-brand hover:underline">
                {t("openChat")}
              </Link>
            }
          >
            {recent.length ? (
              <ul className="space-y-2">
                {recent.map((m) => (
                  <li key={m.id} className={cx("rounded-lg px-3 py-2 text-sm", m.direction === "out" ? "bg-bubble-out" : "bg-surface-2")}>
                    <div className="mb-0.5 text-xs text-muted">
                      {m.direction === "out" ? userName(m.authorId) === "—" ? t("system") : userName(m.authorId) : name.replace("🔒 ", "")} · {formatDate(m.at, lang)}
                    </div>
                    <p dir={langDir(b.language)}>{m.text}</p>
                    {m.translation && m.translation !== m.text && <p className="mt-0.5 text-xs text-muted">{m.translation}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{t("nothingHere")}</Empty>
            )}
          </Card>

          <Card title={t("importChat")}>
            <form action={importChat} className="space-y-2">
              <input type="hidden" name="beneficiaryId" value={b.id} />
              <p className="text-sm text-muted">{t("importHint")}</p>
              <input type="file" name="file" accept=".txt,text/plain" required />
              <input name="nameInFile" placeholder={t("beneficiaryNameInFile")} />
              <SubmitButton className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2">{t("import")}</SubmitButton>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          {learner && (
            <Card title={t("newMuslims")}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>{t("lessonOf", { n: learner.completed, total: learner.total })}</span>
                <span className="text-muted">
                  {t("lastActivity")}: {relTime(learner.lastActivity, lang, now)}
                </span>
              </div>
              <ol className="space-y-1 text-sm">
                {db.lessons.map((l) => {
                  const e = learner.events.find((x) => x.lesson === l.order);
                  return (
                    <li key={l.id} className="flex items-center gap-2">
                      <span
                        className={cx(
                          "grid size-5 shrink-0 place-items-center rounded-full text-[11px]",
                          e?.completedAt ? (e.correct ? "bg-ok text-white" : "bg-warn text-white") : e ? "border-2 border-wa" : "border border-border text-muted",
                        )}
                      >
                        {e?.completedAt ? <CheckIcon className="size-3" /> : l.order}
                      </span>
                      <span className={cx(!e && "text-muted")}>{l.title[lang]}</span>
                      {e?.completedAt && e.correct === false && <span className="text-xs text-warn">({t("wrong")})</span>}
                    </li>
                  );
                })}
              </ol>
              {!learner.waitingOnLesson && learner.completed < learner.total && (
                <form action={sendNextLesson} className="mt-3">
                  <input type="hidden" name="beneficiaryId" value={b.id} />
                  <SubmitButton className="w-full rounded-lg bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">{t("sendNextLesson")}</SubmitButton>
                </form>
              )}
              <p className="mt-2 text-xs text-muted">{t("checkinMilestones")}</p>
            </Card>
          )}

          <Card title={t("tasks")}>
            {tasks.length ? (
              <ul className="mb-3 divide-y divide-border">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 py-2">
                    <form action={completeTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button title={t("markDone")} className="grid size-6 place-items-center rounded-md border border-border text-transparent hover:border-ok hover:text-ok">
                        <CheckIcon />
                      </button>
                    </form>
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
              <Empty>{t("nothingHere")}</Empty>
            )}
            <form action={addTask} className="space-y-2 border-t border-border pt-3">
              <input type="hidden" name="beneficiaryId" value={b.id} />
              <input name="title" placeholder={t("addTask")} required />
              <div className="flex gap-2">
                <input type="datetime-local" name="due" required className="flex-1" />
                <SubmitButton className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white">{t("save")}</SubmitButton>
              </div>
            </form>
          </Card>

          <Card title={lang === "ar" ? "البيانات والظروف" : "Profile"}>
            <form action={updateProfile} className="space-y-3 text-sm">
              <input type="hidden" name="beneficiaryId" value={b.id} />
              <label className="block space-y-1">
                <span className="font-medium">{t("background")}</span>
                <textarea name="background" rows={2} defaultValue={b.background} />
              </label>
              <label className="block space-y-1">
                <span className="font-medium">{t("needs")}</span>
                <textarea name="needs" rows={2} defaultValue={b.needs} />
              </label>
              <label className="block space-y-1">
                <span className="font-medium">{t("objections")}</span>
                <input name="objections" defaultValue={b.objections.join("، ")} />
              </label>
              <label className="block space-y-1">
                <span className="font-medium">{t("preferredTime")}</span>
                <select name="preferredHour" defaultValue={b.preferredHour}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {formatHour(h, lang)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" name="sensitive" defaultChecked={b.sensitive} className="mt-1 size-4 w-auto" />
                <span>
                  <span className="font-medium">{t("sensitive")}</span>
                  <span className="block text-xs text-muted">{t("sensitiveHint")}</span>
                </span>
              </label>
              <div className="text-xs text-muted">
                {t("source")}: {b.source}
              </div>
              <SubmitButton className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-2">{t("save")}</SubmitButton>
            </form>
          </Card>

          <Card title={t("assignmentHistory")}>
            <ul className="space-y-2 text-sm">
              {history.map((a) => (
                <li key={a.id}>
                  <div>
                    {a.fromId ? `${userName(a.fromId)} ${lang === "ar" ? "←" : "→"} ` : ""}
                    <span className="font-medium">{userName(a.toId)}</span>
                  </div>
                  <div className="text-xs text-muted">
                    {a.reason} · {userName(a.byId)} · {formatDate(a.at, lang)}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
