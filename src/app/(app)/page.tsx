import Link from "next/link";
import { redirect } from "next/navigation";
import { completeTask } from "@/app/actions";
import { CheckIcon } from "@/components/icons";
import { Card, Empty, LevelBadge, PageTitle, Pill, StageBadge, WhatsAppButton } from "@/components/ui";
import { readDb } from "@/lib/db";
import { TASK_KIND_LABELS, translator } from "@/lib/i18n";
import { DAY, awaitingReply, displayName, learnerState, messagesOf, openTasks, relTime, taskBuckets, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import type { Beneficiary, Task } from "@/lib/types";

export default async function TodayPage() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/dashboard");
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();

  const mine = visibleBeneficiaries(db, user);
  const byId = new Map(mine.map((b) => [b.id, b]));
  const callerName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "";
  const showCaller = user.role !== "caller";

  const waiting = mine
    .map((b) => ({ b, m: awaitingReply(db, b) }))
    .filter((x): x is { b: Beneficiary; m: NonNullable<typeof x.m> } => !!x.m)
    .sort((a, c) => a.m.at.localeCompare(c.m.at));

  // Notes asking for contact that nobody has acted on yet.
  const notes = db.notes
    .filter((n) => n.needsContact && byId.has(n.beneficiaryId) && now - new Date(n.at).getTime() < 7 * DAY)
    .filter((n) => !messagesOf(db, n.beneficiaryId).some((m) => m.direction === "out" && m.authorId && m.at > n.at))
    .sort((a, c) => c.at.localeCompare(a.at));

  const tasks = openTasks(db).filter((task) => byId.has(task.beneficiaryId) && (user.role !== "caller" || task.assigneeId === user.id));
  const buckets = taskBuckets(tasks, now);

  const learners = mine
    .filter((b) => b.stage === "muslim")
    .map((b) => ({ b, s: learnerState(db, b, now) }))
    .filter((x) => x.s.level !== "green")
    .sort((a, c) => c.s.daysSince - a.s.daysSince);

  const TaskList = ({ list, tone }: { list: Task[]; tone?: "bad" }) =>
    list.length ? (
      <ul className="divide-y divide-border">
        {list.map((task) => {
          const b = byId.get(task.beneficiaryId)!;
          return (
            <li key={task.id} className="flex items-start gap-3 py-2.5">
              <form action={completeTask} className="pt-0.5">
                <input type="hidden" name="taskId" value={task.id} />
                <button title={t("markDone")} className="grid size-6 place-items-center rounded-md border border-border text-transparent hover:border-ok hover:text-ok">
                  <CheckIcon />
                </button>
              </form>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/beneficiaries/${b.id}`} className="font-medium hover:underline">
                    {displayName(db, user, b)}
                  </Link>
                  <Pill>{TASK_KIND_LABELS[task.kind][lang]}</Pill>
                </div>
                <p className="text-sm text-muted">
                  {task.title}
                  {showCaller && ` · ${callerName(task.assigneeId)}`}
                  {" · "}
                  <span className={tone === "bad" ? "font-medium text-bad" : undefined}>{relTime(task.due, lang, now)}</span>
                </p>
              </div>
              <WhatsAppButton beneficiaryId={b.id} size="sm" label={t("whatsapp")} />
            </li>
          );
        })}
      </ul>
    ) : (
      <Empty>{t("nothingHere")}</Empty>
    );

  return (
    <>
      <PageTitle title={t("today")} subtitle={user.name} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<>{t("waitingReply")} <span className="num text-muted">({waiting.length})</span></>}>
          {waiting.length ? (
            <ul className="divide-y divide-border">
              {waiting.map(({ b, m }) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/beneficiaries/${b.id}`} className="font-medium hover:underline">
                        {displayName(db, user, b)}
                      </Link>
                      <StageBadge stage={b.stage} lang={lang} />
                      {showCaller && <span className="text-xs text-muted">{callerName(b.assignedTo)}</span>}
                    </div>
                    <p dir="auto" className="truncate text-sm text-muted">{m.translation ?? m.text}</p>
                  </div>
                  <span className="text-xs whitespace-nowrap text-muted">{relTime(m.at, lang, now)}</span>
                  <WhatsAppButton beneficiaryId={b.id} size="sm" label={t("whatsapp")} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("nothingHere")}</Empty>
          )}
        </Card>

        <Card title={<>{t("learnerWarnings")} <span className="num text-muted">({learners.length})</span></>}>
          {learners.length ? (
            <ul className="divide-y divide-border">
              {learners.map(({ b, s }) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/beneficiaries/${b.id}`} className="font-medium hover:underline">
                        {displayName(db, user, b)}
                      </Link>
                      <LevelBadge level={s.level} label={t(s.level)} />
                    </div>
                    <p className="text-sm text-muted">
                      {t("lessonOf", { n: s.completed, total: s.total })} · {t("lastActivity")} {relTime(s.lastActivity, lang, now)}
                      {s.wrongRecent >= 2 && ` · ${t("wrongAnswers")}: ${s.wrongRecent}`}
                    </p>
                  </div>
                  <WhatsAppButton beneficiaryId={b.id} size="sm" label={t("whatsapp")} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t("nothingHere")}</Empty>
          )}
        </Card>

        {notes.length > 0 && (
          <Card title={<>{t("notes")}: {t("needsContact")} <span className="num text-muted">({notes.length})</span></>} className="lg:col-span-2">
            <ul className="divide-y divide-border">
              {notes.map((n) => {
                const b = byId.get(n.beneficiaryId)!;
                return (
                  <li key={n.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link href={`/beneficiaries/${b.id}`} className="font-medium hover:underline">
                        {displayName(db, user, b)}
                      </Link>
                      <p className="text-sm text-muted">{n.text}</p>
                    </div>
                    <span className="text-xs whitespace-nowrap text-muted">{relTime(n.at, lang, now)}</span>
                    <WhatsAppButton beneficiaryId={b.id} size="sm" label={t("whatsapp")} context={n.text} />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Card title={<>{t("overdue")} <span className="num text-muted">({buckets.overdue.length})</span></>}>
          <TaskList list={buckets.overdue} tone="bad" />
        </Card>
        <div className="space-y-4">
          <Card title={<>{t("dueToday")} <span className="num text-muted">({buckets.today.length})</span></>}>
            <TaskList list={buckets.today} />
          </Card>
          <Card title={<>{t("upcoming")} <span className="num text-muted">({buckets.upcoming.length})</span></>}>
            <TaskList list={buckets.upcoming} />
          </Card>
        </div>
      </div>
    </>
  );
}
