import { Activity, Globe2, HeartHandshake, Megaphone, PhoneCall, Sprout, Tags, TrendingUp, Users } from "lucide-react";
import { CategoryChip } from "@/components/fields";
import { ProgramNav } from "@/components/program-nav";
import { Bar, Card, PageHeader, Stat, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { HIJRI_MONTHS, HIJRI_MONTHS_EN, hijriOf, isoDay } from "@/lib/hijri";
import { translator } from "@/lib/i18n";
import { pct, staffUnder, visibleBeneficiaries } from "@/lib/logic";
import { CONVERTED, F, callerPerformance, categoryRank, countBy, hidayaCases, hidayaSummary } from "@/lib/programs";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HidayaInsightsPage() {
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const today = isoDay();
  const list = visibleBeneficiaries(db, user);
  const cases = hidayaCases(list);
  const active = cases.filter((b) => b.program === "hidaya");
  const s = hidayaSummary(db, list, today);
  const staff = staffUnder(db, user).filter((u) => u.role === "caller");
  const perf = callerPerformance(db, staff, list, today).sort((a, c) => c.converted - a.converted || c.contactsMonth - a.contactsMonth);
  const contacted = active.filter((b) => b.hidaya!.result);
  const responseRate = pct(active.filter((b) => b.hidaya!.result === "استجاب").length, contacted.length);

  // Conversions per Hijri month, the last twelve months.
  const now = hijriOf(today);
  const months = Array.from({ length: 12 }, (_, i) => {
    const k = now.m - 11 + i;
    const y = now.y + Math.floor((k - 1) / 12);
    const m = ((((k - 1) % 12) + 12) % 12) + 1;
    return { y, m, n: 0 };
  });
  for (const b of cases) {
    if (b.program !== "muslim" || !b.muslim?.islamDate) continue;
    const h = hijriOf(b.muslim.islamDate);
    const slot = months.find((x) => x.y === h.y && x.m === h.m);
    if (slot) slot.n++;
  }
  const maxMonth = Math.max(1, ...months.map((x) => x.n));

  // Classifications: how many, and how many moved closer in the last 90 days.
  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const improved = active.filter((b) => {
    const hist = b.hidaya!.categoryHistory;
    const recent = hist.filter((c) => c.at >= cutoff);
    if (!recent.length) return false;
    const before = hist.filter((c) => c.at < cutoff).pop() ?? hist[0];
    return categoryRank(db, recent[recent.length - 1].value) < categoryRank(db, before.value);
  }).length;
  const cats = db.settings.lists.category.map((c) => ({ c, n: active.filter((b) => b.hidaya!.category === c).length }));
  const unclassified = active.filter((b) => !b.hidaya!.category).length;

  const sources = countBy(cases, (b) => b.hidaya!.source).map(([src, n]) => {
    const of = cases.filter((b) => (b.hidaya!.source || "—") === src);
    return { src, n, responded: of.filter((b) => b.hidaya!.result === "استجاب" || b.hidaya!.result === CONVERTED).length, converted: of.filter((b) => b.program === "muslim").length };
  });
  const nationalities = countBy(cases, (b) => b.nationality).slice(0, 8);
  const languages = countBy(cases, (b) => b.languageLabel).slice(0, 8);
  const monthName = (m: number) => (lang === "ar" ? HIJRI_MONTHS : HIJRI_MONTHS_EN)[m - 1];

  return (
    <>
      <PageHeader eyebrow={t("hidayaEyebrow")} title={t("hidayaInsights")} subtitle={t("hidayaInsightsSub")} />
      <ProgramNav program="hidaya" active="insights" t={t} role={user.role} counts={{ followup: s.recontact }} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Sprout} label={t("convertedMonth")} value={s.convertedMonth} hint={`${t("convertedYear")}: ${s.convertedYear} · ${t("total")}: ${s.converted}`} tone="ok" />
        <Stat icon={HeartHandshake} label={t("hidayaActive")} value={s.active} hint={`${t("responded")}: ${s.responded}`} />
        <Stat icon={PhoneCall} label={t("contactsMonth")} value={s.contactsMonth} />
        <Stat icon={Activity} label={t("responseRate")} value={responseRate === null ? "—" : `${responseRate}%`} hint={`${t("recontact")}: ${s.recontact}`} tone={s.recontact ? "warn" : undefined} href="/hidaya/followup" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t("convertedByMonth")} icon={TrendingUp} className="lg:col-span-2">
          <div className="flex h-40 items-end gap-1.5">
            {months.map((x) => (
              <div key={`${x.y}-${x.m}`} className="flex flex-1 flex-col items-center gap-1">
                <span className="num text-xs font-semibold">{x.n || ""}</span>
                <div className={cx("w-full rounded-t-md", x.n ? "bg-gold" : "bg-surface-3")} style={{ height: `${Math.max(4, (x.n / maxMonth) * 110)}px` }} />
                <span className="truncate text-[10px] text-muted">
                  {monthName(x.m)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title={t("callerPerformance")} icon={Users} className="lg:col-span-2" bodyClassName="px-0! pb-0!">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th className="ps-5!">{F.caller[lang]}</th>
                  <th>{t("activeCases")}</th>
                  <th>{t("contactsMonth")}</th>
                  <th>{t("visitsMonth")}</th>
                  <th>{t("responseRate")}</th>
                  <th>{t("overdueCases")}</th>
                  <th>{t("convertedYear")}</th>
                  <th>{t("convertedTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {perf.map((r) => (
                  <tr key={r.user.id}>
                    <td className="ps-5! font-medium">{r.user.name}</td>
                    <td className="num">{r.active}</td>
                    <td className="num">{r.contactsMonth}</td>
                    <td className="num">{r.visitsMonth}</td>
                    <td className="w-40">
                      <div className="flex items-center gap-2">
                        <Bar value={r.responseRate} tone="ok" className="flex-1" />
                        <span className="num w-9 text-xs">{r.responseRate === null ? "—" : `${r.responseRate}%`}</span>
                      </div>
                    </td>
                    <td className={cx("num", r.overdue ? "font-semibold text-warn" : "text-muted")}>{r.overdue}</td>
                    <td className="num">{r.convertedYear}</td>
                    <td className="num font-semibold text-gold">{r.converted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t("byCategory")} icon={Tags}>
          <ul className="space-y-2.5">
            {cats.map(({ c, n }) => (
              <li key={c} className="flex items-center gap-3">
                <span className="w-32 shrink-0">
                  <CategoryChip value={c} options={db.settings.lists.category} />
                </span>
                <Bar value={pct(n, active.length)} className="flex-1" />
                <span className="num w-8 text-end text-sm font-semibold">{n}</span>
              </li>
            ))}
            {unclassified > 0 && (
              <li className="flex items-center gap-3 text-sm text-muted">
                <span className="w-32 shrink-0">{t("unclassified")}</span>
                <Bar value={pct(unclassified, active.length)} tone="warn" className="flex-1" />
                <span className="num w-8 text-end font-semibold">{unclassified}</span>
              </li>
            )}
          </ul>
          <p className="mt-4 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">{t("improvedCount", { n: improved })}</p>
        </Card>

        <Card title={t("bySource")} icon={Megaphone} bodyClassName="px-0! pb-0!">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="ps-5!">{F.source[lang]}</th>
                <th>{t("cases")}</th>
                <th>{t("responded")}</th>
                <th>{t("convertedTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((r) => (
                <tr key={r.src}>
                  <td className="ps-5!">{r.src}</td>
                  <td className="num">{r.n}</td>
                  <td className="num">{r.responded}</td>
                  <td className="num font-semibold text-gold">{r.converted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title={t("byNationality")} icon={Globe2}>
          <Distribution rows={nationalities} total={cases.length} />
        </Card>
        <Card title={t("byLanguage")} icon={Globe2}>
          <Distribution rows={languages} total={cases.length} />
        </Card>
      </div>
    </>
  );
}

function Distribution({ rows, total }: { rows: [string, number][]; total: number }) {
  return (
    <ul className="space-y-2">
      {rows.map(([k, n]) => (
        <li key={k} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate">{k}</span>
          <Bar value={pct(n, total)} className="flex-1" />
          <span className="num w-8 text-end font-semibold">{n}</span>
        </li>
      ))}
    </ul>
  );
}
