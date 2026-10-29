import Link from "next/link";
import { Activity, BarChart3, Clock, Database, HeartPulse, Inbox, MessageCircle, MessagesSquare, PhoneCall, RefreshCw, Reply, Users } from "lucide-react";
import { Avatar, Bar, Card, Empty, LinkButton, Notice, PageHeader, PersonName, Pill, RoleBadge, Stat, Tabs, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { TOUCH_LABELS, translator, type T } from "@/lib/i18n";
import { STALE_DAYS, conversationInsights, type Insights } from "@/lib/insights";
import { CENTER_TZ, DAY, displayName, formatHour, isStaff, relTime, staffUnder, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import type { UiLang } from "@/lib/types";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90] as const;

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = RANGES.find((d) => String(d) === daysParam) ?? 30;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();
  const staff = isStaff(user);
  const list = visibleBeneficiaries(db, user).filter((b) => !staff || b.assignedTo === user.id);
  const people = staffUnder(db, user).filter((u) => u.status !== "left");
  const ins = conversationInsights(db, list, people, days, now);
  const me = staff ? ins.perStaff.find((r) => r.user.id === user.id) : null;
  const fmtH = (h: number | null) => (h === null ? "—" : t("hours", { n: h < 10 ? h.toFixed(1) : Math.round(h) }));
  const rangeLabel = { 7: t("range7"), 30: t("range30"), 90: t("range90") };

  return (
    <>
      <PageHeader
        title={t("insights")}
        subtitle={t("insightsSub")}
        actions={
          <LinkButton href="/share" variant="secondary">
            <Inbox className="size-4" /> {t("addChat")}
          </LinkButton>
        }
      />
      <Tabs items={RANGES.map((d) => ({ key: String(d), href: `/insights?days=${d}`, label: rangeLabel[d] }))} active={String(days)} />

      {me?.stale && (
        <Notice tone="warn">
          {t("staleNotice", { when: me.lastUpdate ? relTime(me.lastUpdate, lang, now) : t("never") })}{" "}
          <Link href="/share" className="underline">
            {t("addChat")}
          </Link>
        </Notice>
      )}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={MessagesSquare} label={t("activeConversations")} value={ins.active} hint={t("activeHint", { n: ins.open })} />
        <Stat icon={MessageCircle} label={t("messagesLabel")} value={ins.messagesIn + ins.messagesOut} hint={t("inOutHint", { in: ins.messagesIn, out: ins.messagesOut })} />
        <Stat icon={Clock} label={t("replySpeed")} value={fmtH(ins.replyH)} hint={t("replySpeedHint")} tone={ins.replyH === null ? undefined : ins.replyH <= 4 ? "ok" : ins.replyH <= 12 ? "warn" : "bad"} />
        <Stat icon={Reply} label={t("answeredRate")} value={ins.answeredPct === null ? "—" : `${ins.answeredPct}%`} hint={t("answeredHint")} />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat icon={PhoneCall} label={t("touchesLogged")} value={ins.touches} />
        <Stat icon={HeartPulse} label={t("silentLabel")} value={ins.silent.length} tone={ins.silent.length ? "warn" : "ok"} />
        <Stat icon={RefreshCw} label={t("freshData")} value={ins.freshPct === null ? "—" : `${ins.freshPct}%`} hint={t("freshHint")} tone={ins.freshPct === null ? undefined : ins.freshPct >= 70 ? "ok" : ins.freshPct >= 40 ? "warn" : "bad"} />
      </div>

      <Card title={t("activity")} icon={Activity} className="mb-5" action={<span className="text-xs text-muted">{days > 31 ? t("perWeek") : t("perDay")}</span>}>
        <ActivityChart ins={ins} lang={lang} t={t} />
      </Card>

      <div className="mb-5 grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title={t("whenTheyWrite")} icon={Clock}>
          <HoursChart ins={ins} lang={lang} t={t} />
        </Card>
        <div className="space-y-5">
          <Card title={t("logKinds")} icon={PhoneCall}>
            <HBars rows={ins.kinds.map((k) => ({ label: TOUCH_LABELS[k.kind][lang], n: k.n }))} />
          </Card>
          <Card title={t("dataSources")} icon={Database}>
            <HBars
              rows={[
                { label: t("srcImported"), n: ins.sources.imported },
                { label: t("srcPlatform"), n: ins.sources.platform },
                { label: t("srcTouches"), n: ins.sources.touches },
              ]}
            />
          </Card>
        </div>
      </div>

      {!staff && (
        <Card title={t("byStaff")} icon={Users} className="mb-5" bodyClassName="px-0!">
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="ps-5!">{t("name")}</th>
                  <th>{t("colCases")}</th>
                  <th>{t("colActive")}</th>
                  <th>{t("colIn")}</th>
                  <th>{t("colOut")}</th>
                  <th>{t("replySpeed")}</th>
                  <th className="min-w-28">{t("answeredRate")}</th>
                  <th>{t("colLogs")}</th>
                  <th>{t("colSilent")}</th>
                  <th>{t("lastUpdate")}</th>
                </tr>
              </thead>
              <tbody>
                {ins.perStaff
                  .filter((r) => r.cases > 0)
                  .sort((a, c) => Number(c.stale) - Number(a.stale) || c.silent - a.silent)
                  .map((r) => (
                    <tr key={r.user.id}>
                      <td className="ps-5!">
                        <Link href={`/team/${r.user.id}`} className="flex items-center gap-2 hover:text-brand">
                          <Avatar name={r.user.name} size="sm" />
                          <span className="whitespace-nowrap">{r.user.name}</span>
                          <RoleBadge role={r.user.role} gender={r.user.gender} lang={lang} />
                        </Link>
                      </td>
                      <td className="num">{r.cases}</td>
                      <td className="num">{r.active}</td>
                      <td className="num">{r.in}</td>
                      <td className="num">{r.out}</td>
                      <td className="num whitespace-nowrap">{fmtH(r.replyH)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Bar value={r.answeredPct} tone={r.answeredPct !== null && r.answeredPct < 50 ? "warn" : "brand"} className="w-16" />
                          <span className="num text-xs">{r.answeredPct === null ? "—" : `${r.answeredPct}%`}</span>
                        </div>
                      </td>
                      <td className="num">{r.touches}</td>
                      <td className={cx("num", r.silent > 0 && "text-warn")}>{r.silent}</td>
                      <td className="whitespace-nowrap">
                        <span className={cx("text-xs", r.stale ? "text-bad" : "text-muted")}>{r.lastUpdate ? relTime(r.lastUpdate, lang, now) : t("never")}</span>
                        {r.stale && (
                          <Pill tone="bad" className="ms-1.5">
                            {t("staleBadge")}
                          </Pill>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title={t("needsReach")} icon={HeartPulse} tone={ins.silent.length ? "warn" : undefined} className="mb-5">
        {ins.silent.length ? (
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {ins.silent.slice(0, 12).map(({ b, lastIn }) => {
              const owner = db.users.find((u) => u.id === b.assignedTo);
              return (
                <li key={b.id} className="flex items-center gap-3 border-b border-border py-2.5">
                  <Avatar name={displayName(db, user, b)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <PersonName name={displayName(db, user, b)} href={`/beneficiaries/${b.id}`} />
                    <div className="truncate text-xs text-muted">
                      {lastIn ? t("lastFromThem", { when: relTime(lastIn, lang, now) }) : t("neverWrote")}
                      {!staff && owner ? ` · ${owner.name}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty icon={BarChart3}>{t("allCaughtUp")}</Empty>
        )}
      </Card>

      <p className="text-xs leading-6 text-muted">{t("howCounted")}</p>
    </>
  );
}

/** Messages per day (or week): the team's and the beneficiaries', stacked. Hover a bar for the numbers. */
function ActivityChart({ ins, lang, t }: { ins: Insights; lang: UiLang; t: T }) {
  const max = Math.max(1, ...ins.activity.map((a) => a.in + a.out));
  const day = new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { day: "numeric", month: "short", timeZone: CENTER_TZ });
  const weekly = ins.days > 31;
  const label = (start: number) => (weekly ? `${day.format(start)} – ${day.format(start + 6 * DAY)}` : day.format(start));
  const tickEvery = Math.ceil(ins.activity.length / 6);
  return (
    <div>
      <Legend items={[{ cls: "bg-series-out", label: t("fromTeam") }, { cls: "bg-series-in", label: t("fromBeneficiaries") }]} />
      <div className="relative mt-3" dir="ltr">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span className="num absolute -top-2 right-0 bg-surface ps-1 text-[10px] text-muted">{max}</span>
        <div className="flex h-44 items-end gap-[2px] border-b border-border-strong">
          {ins.activity.map((a) => (
            <div key={a.start} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
              {a.out > 0 && <div className="mb-[2px] rounded-t-[4px] bg-series-out" style={{ height: `${(a.out / max) * 100}%` }} />}
              {a.in > 0 && <div className={cx("bg-series-in", a.out === 0 && "rounded-t-[4px]")} style={{ height: `${(a.in / max) * 100}%` }} />}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max -translate-x-1/2 rounded-lg bg-night px-2.5 py-1.5 text-[11px] leading-5 text-white shadow-pop group-hover:block" dir={lang === "ar" ? "rtl" : "ltr"}>
                <div className="font-semibold">{label(a.start)}</div>
                <div>
                  {t("fromTeam")}: <span className="num">{a.out}</span>
                </div>
                <div>
                  {t("fromBeneficiaries")}: <span className="num">{a.in}</span>
                </div>
                {a.touches > 0 && (
                  <div>
                    {t("srcTouches")}: <span className="num">{a.touches}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-[2px]">
          {ins.activity.map((a, i) => (
            <div key={a.start} className="min-w-0 flex-1 text-center text-[10px] whitespace-nowrap text-muted">
              {i % tickEvery === 0 ? day.format(a.start) : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Messages from beneficiaries by hour of day; the three busiest hours are named in the note. */
function HoursChart({ ins, lang, t }: { ins: Insights; lang: UiLang; t: T }) {
  const max = Math.max(1, ...ins.byHour.map((h) => h.n));
  const total = ins.byHour.reduce((a, h) => a + h.n, 0);
  const top = [...ins.byHour].sort((a, c) => c.n - a.n).filter((h) => h.n > 0).slice(0, 3);
  const topSet = new Set(top.map((h) => h.hour));
  if (!total) return <Empty icon={Clock}>{t("nothingHere")}</Empty>;
  return (
    <div>
      <p className="mb-3 text-xs text-muted">{t("whenHint", { hours: top.map((h) => formatHour(h.hour, lang)).join(lang === "ar" ? "، " : ", ") })}</p>
      <div className="flex h-32 items-end gap-[2px] border-b border-border-strong" dir="ltr">
        {ins.byHour.map((h) => (
          <div key={h.hour} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            {h.n > 0 && <div className={cx("rounded-t-[4px]", topSet.has(h.hour) ? "bg-series-in" : "bg-series-in/45")} style={{ height: `${(h.n / max) * 100}%` }} />}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max -translate-x-1/2 rounded-lg bg-night px-2.5 py-1.5 text-[11px] text-white shadow-pop group-hover:block">
              {formatHour(h.hour, lang)}: <span className="num">{h.n}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[10px] text-muted" dir="ltr">
        {ins.byHour.map((h) => (
          <div key={h.hour} className="num min-w-0 flex-1 text-center">
            {h.hour % 6 === 0 ? h.hour : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function HBars({ rows }: { rows: { label: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-series-out" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
          <span className="num text-end text-muted">{r.n}</span>
        </li>
      ))}
    </ul>
  );
}

function Legend({ items }: { items: { cls: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={cx("size-2.5 rounded-sm", i.cls)} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
