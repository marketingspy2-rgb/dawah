import Link from "next/link";
import { redirect } from "next/navigation";
import { Bar, Card, Empty, PageTitle, Stat, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, STAGE_LABELS, translator, type TKey } from "@/lib/i18n";
import { callerMetrics, formatHour, funnelMetrics, learningMetrics, platformMetrics, relTime, supervisorMetrics, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

const TABS: { id: string; label: TKey }[] = [
  { id: "team", label: "metricsTeam" },
  { id: "supervisors", label: "metricsSupervisors" },
  { id: "funnel", label: "metricsFunnel" },
  { id: "learning", label: "metricsLearning" },
  { id: "platform", label: "metricsPlatform" },
];

function toneFor(value: number | null, good: number, ok: number, higherIsBetter = true) {
  if (value === null) return undefined;
  if (higherIsBetter) return value >= good ? "ok" : value >= ok ? "warn" : "bad";
  return value <= good ? "ok" : value <= ok ? "warn" : "bad";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "team" } = await searchParams;
  const user = await requireUser();
  if (user.role === "caller") redirect("/");
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();

  const scopeBens = visibleBeneficiaries(db, user);
  const callers = db.users.filter((u) => u.role === "caller" && (user.role === "admin" || u.teamId === user.teamId));
  const rows = callerMetrics(db, callers.map((c) => c.id), now);
  const fmtH = (h: number | null) => (h === null ? "—" : h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)} ${t("hours")}`);
  const fmtP = (p: number | null) => (p === null ? "—" : `${p}%`);

  const allReplies = rows.map((r) => r.firstResponseH).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const centerReply = allReplies.length ? allReplies[Math.floor(allReplies.length / 2)] : null;
  const avg = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };

  return (
    <>
      <PageTitle title={t("dashboard")} subtitle={user.role === "admin" ? t("centerWide") : db.teams.find((x) => x.id === user.teamId)?.name} />
      <nav className="mb-4 flex gap-1 overflow-x-auto">
        {TABS.map((x) => (
          <Link key={x.id} href={`/dashboard?tab=${x.id}`} className={cx("rounded-lg px-3 py-1.5 text-sm whitespace-nowrap", tab === x.id ? "bg-brand text-white" : "bg-surface hover:bg-surface-2")}>
            {t(x.label)}
          </Link>
        ))}
      </nav>

      {tab === "team" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t("firstResponse")} value={fmtH(centerReply)} tone={toneFor(centerReply, 4, 12, false)} hint={lang === "ar" ? "آخر 30 يومًا" : "Last 30 days"} />
            <Stat label={t("onTime")} value={fmtP(avg(rows.map((r) => r.onTimePct)))} tone={toneFor(avg(rows.map((r) => r.onTimePct)), 85, 70)} />
            <Stat label={t("retention")} value={fmtP(avg(rows.map((r) => r.retentionPct)))} hint={lang === "ar" ? "بعد 30 يومًا من الإسلام" : "30+ days after embracing Islam"} />
            <Stat label={t("redCases")} value={rows.reduce((a, r) => a + r.red, 0)} tone={rows.some((r) => r.red) ? "bad" : "ok"} />
          </div>
          <Card title={t("perCaller")}>
            <div className="overflow-x-auto">
              <table className="text-sm">
                <thead>
                  <tr>
                    <th>{t("caller")}</th>
                    <th>{t("firstResponse")}</th>
                    <th className="min-w-36">{t("onTime")}</th>
                    <th>{t("activeCases")}</th>
                    <th>{t("waitingReply")}</th>
                    <th>{t("stageMoves")}</th>
                    <th className="min-w-36">{t("retention")}</th>
                    <th>{t("redCases")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .sort((a, b) => (a.firstResponseH ?? 99) - (b.firstResponseH ?? 99))
                    .map((r) => {
                      const replyTone = toneFor(r.firstResponseH, 4, 12, false);
                      return (
                        <tr key={r.user.id}>
                          <td>
                            <div className="font-medium">{r.user.name}</div>
                            <div className="text-xs text-muted">{r.user.languages.map((l) => LANG_LABELS[l][lang]).join("، ")}</div>
                          </td>
                          <td className={cx("num font-medium", replyTone === "bad" ? "text-bad" : replyTone === "warn" ? "text-warn" : "text-ok")}>{fmtH(r.firstResponseH)}</td>
                          <td>
                            <div className="num mb-1 text-xs">{fmtP(r.onTimePct)}</div>
                            <Bar value={r.onTimePct} tone={toneFor(r.onTimePct, 85, 70) ?? "brand"} />
                          </td>
                          <td className="num">{r.load}</td>
                          <td className={cx("num", r.waiting > 0 && "font-medium text-bad")}>{r.waiting}</td>
                          <td className="num">{r.stageMoves}</td>
                          <td>
                            <div className="num mb-1 text-xs">{fmtP(r.retentionPct)}</div>
                            <Bar value={r.retentionPct} tone={toneFor(r.retentionPct, 80, 60) ?? "brand"} />
                          </td>
                          <td className={cx("num", r.red > 0 && "font-medium text-bad")}>{r.red}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              {lang === "ar"
                ? "سرعة الرد: من أول رسالة للمستفيد حتى رد الداعية. المتابعات في موعدها: المهام المنجزة خلال 12 ساعة من موعدها. المستمرون: من أسلم قبل 30 يومًا أو أكثر وليس منقطعًا."
                : "Reply time: from the beneficiary's first message to the caller's reply. On time: tasks done within 12 hours of their due time. Still active: embraced Islam 30+ days ago and not silent."}
            </p>
          </Card>
        </div>
      )}

      {tab === "supervisors" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {supervisorMetrics(db, now)
            .filter((s) => user.role === "admin" || s.team.id === user.teamId)
            .map((s) => (
              <Card key={s.team.id} title={`${s.team.name} · ${s.supervisor.name}`}>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label={t("supervisorReaction")} value={s.untouchedReds} tone={s.untouchedReds ? "bad" : "ok"} hint={`${s.reds} ${t("redCases")}`} />
                  <Stat label={t("teamBalance")} value={s.balance} tone={s.balance > 3 ? "warn" : "ok"} hint={t("activeCases")} />
                  <Stat
                    label={lang === "ar" ? "نجاح التسليم" : "Handover success"}
                    value={fmtP(s.handoverPct)}
                    hint={lang === "ar" ? `${s.handovers} نقل في 30 يومًا، تواصل خلال 24 ساعة` : `${s.handovers} handovers in 30 days, contact within 24h`}
                  />
                  <Stat
                    label={lang === "ar" ? "دعاة غائبون لديهم حالات" : "Absent callers with cases"}
                    value={s.onLeaveWithCases.length}
                    tone={s.onLeaveWithCases.length ? "warn" : "ok"}
                    hint={s.onLeaveWithCases.map((u) => u.name).join("، ") || undefined}
                  />
                </div>
              </Card>
            ))}
        </div>
      )}

      {tab === "funnel" && (() => {
        const f = funnelMetrics(db, scopeBens);
        const max = Math.max(...f.counts.map((c) => c.reached), 1);
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={lang === "ar" ? "رحلة الدعوة: كم وصل لكل مرحلة" : "Dawah journey: how many reached each stage"} className="lg:col-span-2">
              <ol className="space-y-2">
                {f.counts.map((c, i) => (
                  <li key={c.stage}>
                    <div className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-sm">{STAGE_LABELS[c.stage][lang]}</span>
                      <div className="h-7 flex-1 overflow-hidden rounded-md bg-surface-2">
                        <div className="flex h-full items-center rounded-md bg-brand px-2 text-xs font-medium text-white" style={{ width: `${Math.max(8, (c.reached / max) * 100)}%` }}>
                          <span className="num">{c.reached}</span>
                        </div>
                      </div>
                      <span className="num w-24 shrink-0 text-xs text-muted">
                        {lang === "ar" ? "الآن" : "now"}: {c.current}
                      </span>
                    </div>
                    {f.conversions[i] && (
                      <div className="ms-36 ps-3 text-xs text-muted">
                        ↓ {fmtP(f.conversions[i].pct)} {lang === "ar" ? "ينتقل للمرحلة التالية" : "move on"}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </Card>
            <Card title={t("timeInStage")}>
              <table className="text-sm">
                <tbody>
                  {f.timeInStage.map((s) => (
                    <tr key={s.stage}>
                      <td>{STAGE_LABELS[s.stage][lang]}</td>
                      <td className="num text-end">{s.days === null ? "—" : `${s.days} ${t("days")}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title={t("conversionBy")}>
              <table className="text-sm">
                <thead>
                  <tr>
                    <th>{t("source")}</th>
                    <th>{t("count")}</th>
                    <th>{STAGE_LABELS.muslim[lang]}</th>
                    <th className="min-w-28">{t("rate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {f.sources.map((s) => (
                    <tr key={s.source}>
                      <td>{s.source}</td>
                      <td className="num">{s.total}</td>
                      <td className="num">{s.muslim}</td>
                      <td>
                        <div className="num mb-1 text-xs">{fmtP(s.pct)}</div>
                        <Bar value={s.pct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title={lang === "ar" ? "أكثر ما يمنع المستفيدين" : "What holds people back most"} className="lg:col-span-2">
              <ul className="grid gap-2 sm:grid-cols-2">
                {f.objections.map(([o, n]) => (
                  <li key={o} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0">{o}</span>
                    <Bar value={(n / Math.max(...f.objections.map((x) => x[1]))) * 100} tone="warn" />
                    <span className="num w-6 text-muted">{n}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">{lang === "ar" ? "في النسخة الكاملة يستخرجها الذكاء الاصطناعي من المحادثات تلقائيًا." : "In the full version AI extracts these from the conversations automatically."}</p>
            </Card>
          </div>
        );
      })()}

      {tab === "learning" && (() => {
        const l = learningMetrics(db, scopeBens);
        const hardest = [...l.perLesson].filter((x) => x.wrongPct !== null).sort((a, b) => (b.wrongPct ?? 0) - (a.wrongPct ?? 0)).slice(0, 3);
        const bestHour = [...l.byHour].filter((h) => h.sent >= 3).sort((a, b) => b.pct - a.pct)[0];
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
              <Stat label={t("green")} value={l.levels.green} tone="ok" />
              <Stat label={t("yellow")} value={l.levels.yellow} tone="warn" />
              <Stat label={t("red")} value={l.levels.red} tone="bad" />
            </div>
            <Card title={t("lessonCompletion")}>
              <ul className="space-y-2">
                {l.perLesson.map((x) => (
                  <li key={x.lesson.id} className="flex items-center gap-3 text-sm">
                    <span className="w-44 shrink-0 truncate">
                      {x.lesson.order}. {x.lesson.title[lang]}
                    </span>
                    <Bar value={x.completionPct} tone={toneFor(x.completionPct, 85, 65) ?? "brand"} />
                    <span className="num w-20 shrink-0 text-xs text-muted">
                      {fmtP(x.completionPct)} · {x.sent}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">{lang === "ar" ? "الدرس ذو النسبة الأقل هو الذي ينسحب عنده الناس: راجع طوله وصياغته." : "The lowest bar is where people drop off: review its length and wording."}</p>
            </Card>
            <div className="space-y-4">
              <Card title={t("hardestQuestions")}>
                {hardest.length ? (
                  <ul className="space-y-2 text-sm">
                    {hardest.map((x) => (
                      <li key={x.lesson.id}>
                        <div className="flex justify-between gap-2">
                          <span>{x.lesson.question[lang]}</span>
                          <span className="num font-medium text-warn">{fmtP(x.wrongPct)}</span>
                        </div>
                        <div className="text-xs text-muted">
                          {x.lesson.order}. {x.lesson.title[lang]}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>{t("noData")}</Empty>
                )}
              </Card>
              <Card title={t("bestHour")}>
                <ul className="space-y-2">
                  {l.byHour.map((h) => (
                    <li key={h.hour} className="flex items-center gap-3 text-sm">
                      <span className="w-14 shrink-0">{formatHour(h.hour, lang)}</span>
                      <Bar value={h.pct} tone={bestHour?.hour === h.hour ? "ok" : "brand"} />
                      <span className="num w-20 shrink-0 text-xs text-muted">
                        {h.pct}% · {h.sent}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  {t("openRate")}
                  {bestHour && (lang === "ar" ? `. الأفضل: ${formatHour(bestHour.hour, lang)} بتوقيت المستفيد.` : `. Best: ${formatHour(bestHour.hour, lang)} local time.`)}
                </p>
              </Card>
            </div>
          </div>
        );
      })()}

      {tab === "platform" && (() => {
        const p = platformMetrics(db, now);
        return (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card title={t("usage")}>
              <table className="text-sm">
                <thead>
                  <tr>
                    <th>{t("caller")}</th>
                    <th>{t("lastSeen")}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.usage
                    .filter((u) => user.role === "admin" || u.user.teamId === user.teamId)
                    .map((u) => (
                      <tr key={u.user.id}>
                        <td>{u.user.name}</td>
                        <td className={cx("whitespace-nowrap", (u.daysAway ?? 0) > 3 ? "font-medium text-bad" : "text-muted")}>{relTime(u.lastSeenAt, lang, now)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Card>
            <div className="space-y-3">
              <Stat label={t("completeFiles")} value={fmtP(p.completePct)} tone={toneFor(p.completePct, 80, 50)} hint={lang === "ar" ? "اضغط «تحديث الملخص» في الملف لرفعها" : "Use “Refresh summary” in a file to raise it"} />
              <Stat label={lang === "ar" ? "رسائل آخر 30 يومًا" : "Messages, last 30 days"} value={p.messages30} />
              <Stat label={lang === "ar" ? "رسائل لم تصل" : "Undelivered messages"} value={p.failed} tone={p.failed ? "warn" : "ok"} />
              <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted">{t("costNote")}</p>
            </div>
          </div>
        );
      })()}
    </>
  );
}
