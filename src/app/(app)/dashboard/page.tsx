import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BookOpen, Clock, Filter, HeartPulse, MessageCircle, Repeat, Scale, Sprout, Users } from "lucide-react";
import { Avatar, Bar, Card, Empty, PageHeader, Pill, RoleBadge, Stat, Tabs, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { STAGE_LABELS, translator } from "@/lib/i18n";
import { formatHour, funnelMetrics, isStaff, learningMetrics, platformMetrics, relTime, staffMetrics, staffUnder, supervisorMetrics, teamOf, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Tone = "ok" | "warn" | "bad" | undefined;
function toneFor(value: number | null, good: number, ok: number, higherIsBetter = true): Tone {
  if (value === null) return undefined;
  if (higherIsBetter) return value >= good ? "ok" : value >= ok ? "warn" : "bad";
  return value <= good ? "ok" : value <= ok ? "warn" : "bad";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "staff" } = await searchParams;
  const user = await requireUser();
  if (isStaff(user)) redirect(`/team/${user.id}`);
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();
  const scope = visibleBeneficiaries(db, user);
  const staff = staffUnder(db, user);
  const rows = staffMetrics(db, staff, now);
  const fmtH = (h: number | null) => (h === null ? "—" : t("hours", { n: h.toFixed(1) }));
  const fmtP = (p: number | null) => (p === null ? "—" : `${p}%`);
  const avg = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const median = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x !== null).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : null;
  };

  const tabs = [
    { key: "staff", label: t("tabStaff") },
    { key: "supervisors", label: t("tabSupervisors") },
    { key: "funnel", label: t("tabFunnel") },
    { key: "learning", label: t("tabLearning") },
    { key: "platform", label: t("tabPlatform") },
  ].map((x) => ({ ...x, href: `/dashboard?tab=${x.key}` }));

  return (
    <>
      <PageHeader title={t("dashboard")} subtitle={`${user.role === "admin" ? t("centerOverview") : (teamOf(db, user)?.name ?? "")} · ${t("dashSub")}`} />
      <Tabs items={tabs} active={tab} />

      {tab === "staff" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Clock} label={t("firstResponse")} value={fmtH(median(rows.map((r) => r.firstResponseH)))} tone={toneFor(median(rows.map((r) => r.firstResponseH)), 4, 12, false)} />
            <Stat icon={Repeat} label={t("onTime")} value={fmtP(avg(rows.map((r) => r.onTimePct)))} tone={toneFor(avg(rows.map((r) => r.onTimePct)), 85, 70)} />
            <Stat icon={Sprout} label={t("retention")} value={fmtP(avg(rows.filter((r) => r.user.role === "teacher").map((r) => r.retentionPct)))} />
            <Stat icon={HeartPulse} label={t("red")} value={rows.reduce((a, r) => a + r.red, 0)} tone={rows.some((r) => r.red) ? "bad" : "ok"} />
          </div>
          {(["caller", "teacher"] as const).map((role) => (
            <Card key={role} title={role === "caller" ? t("callers") : t("teachers")} icon={role === "caller" ? MessageCircle : BookOpen} bodyClassName="px-0!">
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr>
                      <th className="ps-5!">{t("name")}</th>
                      <th>{t("firstResponse")}</th>
                      <th className="min-w-32">{t("onTime")}</th>
                      <th>{t("load")}</th>
                      <th>{t("statWaiting")}</th>
                      {role === "caller" ? (
                        <>
                          <th>{t("stageMoves")}</th>
                          <th>{t("conversions")}</th>
                        </>
                      ) : (
                        <>
                          <th className="min-w-32">{t("completion")}</th>
                          <th className="min-w-32">{t("retention")}</th>
                          <th>{t("red")}</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .filter((r) => r.user.role === role)
                      .sort((a, b) => (a.firstResponseH ?? 99) - (b.firstResponseH ?? 99))
                      .map((r) => {
                        const rt = toneFor(r.firstResponseH, 4, 12, false);
                        return (
                          <tr key={r.user.id}>
                            <td className="ps-5!">
                              <Link href={`/team/${r.user.id}`} className="flex items-center gap-2 hover:text-brand">
                                <Avatar name={r.user.name} size="sm" />
                                <span className="font-medium whitespace-nowrap">{r.user.name}</span>
                                {r.user.status !== "available" && <Pill tone="warn">{t(r.user.status)}</Pill>}
                              </Link>
                            </td>
                            <td className={cx("num font-medium whitespace-nowrap", rt === "bad" ? "text-bad" : rt === "warn" ? "text-warn" : "text-ok")}>{fmtH(r.firstResponseH)}</td>
                            <td>
                              <div className="num mb-1 text-xs">{fmtP(r.onTimePct)}</div>
                              <Bar value={r.onTimePct} tone={toneFor(r.onTimePct, 85, 70) ?? "brand"} />
                            </td>
                            <td className="num">{r.load}</td>
                            <td className={cx("num", r.waiting > 0 && "font-medium text-warn")}>{r.waiting}</td>
                            {role === "caller" ? (
                              <>
                                <td className="num">{r.stageMoves}</td>
                                <td className="num font-medium text-ok">{r.conversions}</td>
                              </>
                            ) : (
                              <>
                                <td>
                                  <div className="num mb-1 text-xs">{fmtP(r.completionPct)}</div>
                                  <Bar value={r.completionPct} tone={toneFor(r.completionPct, 80, 60) ?? "brand"} />
                                </td>
                                <td>
                                  <div className="num mb-1 text-xs">{fmtP(r.retentionPct)}</div>
                                  <Bar value={r.retentionPct} tone={toneFor(r.retentionPct, 80, 60) ?? "brand"} />
                                </td>
                                <td className={cx("num", r.red > 0 && "font-medium text-bad")}>{r.red}</td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
          <p className="text-xs text-muted">{t("metricsNote")}</p>
        </div>
      )}

      {tab === "supervisors" && (
        <div className="grid gap-5 lg:grid-cols-2">
          {supervisorMetrics(db, now)
            .filter((s) => user.role === "admin" || s.team.supervisorId === user.id)
            .map((s) => (
              <Card
                key={s.team.id}
                title={s.team.name}
                icon={Users}
                action={
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {s.supervisor.name} <RoleBadge role="supervisor" gender={s.supervisor.gender} lang={lang} />
                  </span>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <Stat icon={HeartPulse} label={t("redUntouchedShort")} value={s.untouchedReds} tone={s.untouchedReds ? "bad" : "ok"} hint={`${s.reds} ${t("red")}`} />
                  <Stat icon={Scale} label={t("balance")} value={s.balance} tone={s.balance > 3 ? "warn" : "ok"} hint={t("balanceHint")} />
                  <Stat icon={Repeat} label={t("handoverQuality")} value={fmtP(s.handoverPct)} hint={`${s.handovers} · 30d`} />
                  <Stat icon={Users} label={t("absentWithCases")} value={s.onLeaveWithCases.length} tone={s.onLeaveWithCases.length ? "warn" : "ok"} hint={s.onLeaveWithCases.map((u) => u.name).join("، ") || undefined} />
                </div>
              </Card>
            ))}
        </div>
      )}

      {tab === "funnel" &&
        (() => {
          const f = funnelMetrics(db, scope);
          const max = Math.max(...f.counts.map((c) => c.reached), 1);
          const maxObj = Math.max(1, ...f.objections.map((x) => x[1]));
          return (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title={t("tabFunnel")} icon={Filter} className="lg:col-span-2">
                <ol className="space-y-1">
                  {f.counts.map((c, i) => (
                    <li key={c.stage}>
                      <div className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-sm">{STAGE_LABELS[c.stage][lang]}</span>
                        <div className="h-8 flex-1 overflow-hidden rounded-lg bg-surface-2">
                          <div className="flex h-full items-center rounded-lg bg-gradient-to-l from-brand to-brand-strong px-2.5 text-xs font-semibold text-white" style={{ width: `${Math.max(8, (c.reached / max) * 100)}%` }}>
                            <span className="num">{c.reached}</span>
                          </div>
                        </div>
                        <span className="num w-16 shrink-0 text-xs text-muted">{c.current}</span>
                      </div>
                      {f.conversions[i] && (
                        <div className="py-0.5 text-[11px] text-muted ltr:ml-36 rtl:mr-36">
                          ↓ {fmtP(f.conversions[i].pct)} · {t("timeInStage")} {f.timeInStage[i].days === null ? "—" : t("days", { n: f.timeInStage[i].days! })}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </Card>
              <Card title={t("bySource")} icon={Activity}>
                <ul className="space-y-2.5">
                  {f.sources.map((s) => (
                    <li key={s.source} className="flex items-center gap-3 text-sm">
                      <span className="w-28 shrink-0 truncate">{s.source}</span>
                      <Bar value={s.pct} />
                      <span className="num w-20 shrink-0 text-xs text-muted">
                        {fmtP(s.pct)} · {s.muslim}/{s.total}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title={t("topObjections")} icon={MessageCircle}>
                <ul className="space-y-2.5">
                  {f.objections.slice(0, 8).map(([o, n]) => (
                    <li key={o} className="flex items-center gap-3 text-sm">
                      <span className="w-36 shrink-0 truncate">{o}</span>
                      <Bar value={(n / maxObj) * 100} tone="warn" />
                      <span className="num w-6 text-muted">{n}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          );
        })()}

      {tab === "learning" &&
        (() => {
          const l = learningMetrics(db, scope);
          const bestHour = [...l.byHour].filter((h) => h.sent >= 3).sort((a, b) => b.pct - a.pct)[0];
          return (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="grid grid-cols-3 gap-3 lg:col-span-2">
                <Stat label={t("green")} value={l.levels.green} tone="ok" />
                <Stat label={t("yellow")} value={l.levels.yellow} tone="warn" />
                <Stat label={t("red")} value={l.levels.red} tone="bad" />
              </div>
              <Card title={t("perLesson")} icon={BookOpen}>
                <ul className="space-y-2.5">
                  {l.perLesson.map((x) => (
                    <li key={x.lesson.id}>
                      <Link href={`/lessons/${x.lesson.id}`} className="flex items-center gap-3 text-sm hover:text-brand">
                        <span className="w-28 shrink-0 truncate sm:w-40">
                          {x.lesson.order}. {x.lesson.title[lang]}
                        </span>
                        <Bar value={x.completionPct} tone={toneFor(x.completionPct, 85, 65) ?? "brand"} />
                        <span className="num shrink-0 text-xs whitespace-nowrap text-muted">
                          {fmtP(x.completionPct)} · <span className={cx((x.wrongPct ?? 0) > 30 && "text-bad")}>✗ {fmtP(x.wrongPct)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title={t("bestHour")} icon={Clock}>
                {l.byHour.length ? (
                  <ul className="space-y-2.5">
                    {l.byHour.map((h) => (
                      <li key={h.hour} className="flex items-center gap-3 text-sm">
                        <span className="w-16 shrink-0">{formatHour(h.hour, lang)}</span>
                        <Bar value={h.pct} tone={bestHour?.hour === h.hour ? "ok" : "brand"} />
                        <span className="num w-20 shrink-0 text-xs text-muted">
                          {h.pct}% · {h.sent}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>{t("nothingHere")}</Empty>
                )}
              </Card>
            </div>
          );
        })()}

      {tab === "platform" &&
        (() => {
          const p = platformMetrics(db, now);
          const people = p.usage.filter((u) => user.role === "admin" || u.user.teamId === user.teamId);
          return (
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <Card title={t("usage")} icon={Users}>
                <ul className="divide-y divide-border">
                  {people.map((u) => (
                    <li key={u.user.id} className="flex items-center gap-3 py-2 text-sm">
                      <Avatar name={u.user.name} size="sm" />
                      <span className="flex-1">{u.user.name}</span>
                      <RoleBadge role={u.user.role} gender={u.user.gender} lang={lang} />
                      <span className={cx("w-28 text-end text-xs whitespace-nowrap", (u.daysAway ?? 0) > 3 ? "font-medium text-bad" : "text-muted")}>{relTime(u.lastSeenAt, lang, now)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <div className="space-y-3">
                <Stat label={t("completeFiles")} value={fmtP(p.completePct)} tone={toneFor(p.completePct, 80, 50)} />
                <Stat label={t("messages30")} value={p.messages30} />
                <Stat label={t("failedMessages")} value={p.failed} tone={p.failed ? "warn" : "ok"} />
                <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted">{t("costNote")}</p>
              </div>
            </div>
          );
        })()}
    </>
  );
}
