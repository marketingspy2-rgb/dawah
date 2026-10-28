import Link from "next/link";
import { sendNextLesson, simulateLesson } from "@/app/actions";
import { SubmitButton } from "@/components/chat-client";
import { Bar, Card, Empty, LevelBadge, PageTitle, Stat, WhatsAppButton } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { displayName, formatHour, learnerState, relTime, visibleBeneficiaries, type Level } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export default async function NewMuslimsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();

  const all = visibleBeneficiaries(db, user)
    .filter((b) => b.stage === "muslim")
    .map((b) => ({ b, s: learnerState(db, b, now) }));
  const order: Record<Level, number> = { red: 0, yellow: 1, green: 2 };
  const list = all.filter((x) => !level || x.s.level === level).sort((a, c) => order[a.s.level] - order[c.s.level] || c.s.daysSince - a.s.daysSince);
  const count = (l: Level) => all.filter((x) => x.s.level === l).length;
  const filterLink = (l: string, label: string, n: number) => (
    <Link href={l ? `/new-muslims?level=${l}` : "/new-muslims"} className={`rounded-full px-3 py-1 text-sm ${level === l || (!level && !l) ? "bg-brand text-white" : "bg-surface-2"}`}>
      {label} <span className="num">({n})</span>
    </Link>
  );

  return (
    <>
      <PageTitle
        title={t("newMuslims")}
        subtitle={lang === "ar" ? "يتعلمون المنهج عبر الواتساب، والتنبيه يظهر قبل الانقطاع." : "Learning the curriculum on WhatsApp, with a warning before they drop off."}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label={t("green")} value={count("green")} tone="ok" hint={lang === "ar" ? "أكمل درسًا خلال 3 أيام" : "Finished a lesson in the last 3 days"} />
        <Stat label={t("yellow")} value={count("yellow")} tone="warn" hint={lang === "ar" ? "4 أيام بلا نشاط أو إجابتان خاطئتان" : "4 quiet days or 2 wrong answers"} />
        <Stat label={t("red")} value={count("red")} tone="bad" hint={lang === "ar" ? "7 أيام بلا رد: يُنبَّه المشرف" : "7 days silent: supervisor alerted"} />
      </div>
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          {filterLink("", t("all"), all.length)}
          {filterLink("red", t("red"), count("red"))}
          {filterLink("yellow", t("yellow"), count("yellow"))}
          {filterLink("green", t("green"), count("green"))}
        </div>
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  {user.role !== "caller" && <th>{t("caller")}</th>}
                  <th className="min-w-40">{t("progress")}</th>
                  <th>{t("status")}</th>
                  <th>{t("lastActivity")}</th>
                  <th>{t("nextLesson")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map(({ b, s }) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/beneficiaries/${b.id}`} className="font-medium hover:underline">
                        {displayName(db, user, b)}
                      </Link>
                      <div className="text-xs text-muted">
                        {LANG_LABELS[b.language][lang]} · {relTime(b.convertedAt, lang, now)}
                      </div>
                    </td>
                    {user.role !== "caller" && <td className="text-muted">{db.users.find((u) => u.id === b.assignedTo)?.name}</td>}
                    <td>
                      <div className="mb-1 text-xs text-muted">{t("lessonOf", { n: s.completed, total: s.total })}</div>
                      <Bar value={(s.completed / s.total) * 100} tone={s.level === "green" ? "ok" : s.level === "yellow" ? "warn" : "bad"} />
                    </td>
                    <td>
                      <LevelBadge level={s.level} label={t(s.level)} />
                      {s.wrongRecent >= 2 && <div className="mt-0.5 text-xs text-warn">{t("wrongAnswers")}: {s.wrongRecent}</div>}
                    </td>
                    <td className="whitespace-nowrap text-muted">{relTime(s.lastActivity, lang, now)}</td>
                    <td className="text-xs text-muted">
                      {s.waitingOnLesson
                        ? lang === "ar"
                          ? `أُرسل الدرس ${s.current!.lesson} ${relTime(s.current!.sentAt, lang, now)} ولم يُفتح`
                          : `Lesson ${s.current!.lesson} sent ${relTime(s.current!.sentAt, lang, now)}, not opened`
                        : s.completed >= s.total
                          ? "✓"
                          : `${lang === "ar" ? "يُرسل الساعة" : "Sends at"} ${formatHour(b.preferredHour, lang)} ${lang === "ar" ? "بتوقيته" : "their time"}`}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {s.waitingOnLesson ? (
                          <>
                            <form action={simulateLesson}>
                              <input type="hidden" name="beneficiaryId" value={b.id} />
                              <SubmitButton className="rounded-md border border-dashed border-border px-2 py-1 text-xs whitespace-nowrap hover:bg-surface-2">{t("simulateLesson")}</SubmitButton>
                            </form>
                          </>
                        ) : (
                          s.completed < s.total && (
                            <form action={sendNextLesson}>
                              <input type="hidden" name="beneficiaryId" value={b.id} />
                              <SubmitButton className="rounded-md bg-brand-soft px-2 py-1 text-xs font-medium whitespace-nowrap text-brand">{t("sendNextLesson")}</SubmitButton>
                            </form>
                          )
                        )}
                        <WhatsAppButton beneficiaryId={b.id} size="sm" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{t("nothingHere")}</Empty>
        )}
      </Card>
    </>
  );
}
