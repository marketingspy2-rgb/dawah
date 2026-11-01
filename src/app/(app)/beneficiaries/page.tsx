import Link from "next/link";
import { Award, Plus, Search, UsersRound } from "lucide-react";
import { LessonGrid, StatusChip } from "@/components/fields";
import { ProgramNav } from "@/components/program-nav";
import { Empty, LinkButton, Notice, PageHeader, Tabs } from "@/components/ui";
import { readDb } from "@/lib/db";
import { formatGregorian, formatHijri, hijriOf, isoDay } from "@/lib/hijri";
import { translator } from "@/lib/i18n";
import { canSeeName, displayName, staffUnder, visibleBeneficiaries } from "@/lib/logic";
import { F, STAGE_NAMES, lessonsDone, muslimCases, muslimStage, muslimSummary } from "@/lib/programs";
import { getUiLang, requireUser } from "@/lib/session";
import type { Beneficiary } from "@/lib/types";
import { MUSLIM_LESSONS } from "@/lib/types";

export const dynamic = "force-dynamic";

type Q = { q?: string; owner?: string; status?: string; year?: string; view?: string; added?: string; to?: string };

/** المسلم الجديد: the association's new Muslim sheet, one row per person. */
export default async function NewMuslimsPage({ searchParams }: { searchParams: Promise<Q> }) {
  const sp = await searchParams;
  const { q, owner, status, year, view = "all", added, to } = sp;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const today = isoDay();
  const all = muslimCases(visibleBeneficiaries(db, user));
  const staff = staffUnder(db, user);
  const summary = muslimSummary(all, today);
  const years = [...new Set(all.map((b) => (b.muslim!.islamDate ? hijriOf(b.muslim!.islamDate).y : 0)).filter(Boolean))].sort((a, c) => c - a);

  const inView = (b: Beneficiary, v: string) => {
    const m = b.muslim!;
    if (v === "cert") return m.certificate;
    if (v === "1" || v === "2" || v === "3") return !m.certificate && String(muslimStage(m)) === v;
    return true;
  };
  const filtered = (v: string) =>
    all
      .filter((b) => inView(b, v))
      .filter((b) => !owner || b.assignedTo === owner || b.introducedBy === owner)
      .filter((b) => !status || b.muslim!.status === status)
      .filter((b) => !year || (b.muslim!.islamDate && String(hijriOf(b.muslim!.islamDate).y) === year))
      .filter((b) => {
        if (!q) return true;
        const s = q.trim().toLowerCase();
        const d = s.replace(/\D/g, "") || "~";
        return displayName(db, user, b).toLowerCase().includes(s) || (canSeeName(db, user, b) && (b.phone.replace(/\D/g, "").includes(d) || b.muslim!.iqama.includes(d))) || String(b.muslim!.serial) === s;
      });
  const list = filtered(view).sort((a, c) => c.muslim!.serial - a.muslim!.serial);
  const href = (patch: Partial<Q>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, added: undefined, to: undefined, ...patch })) if (v) p.set(k, v);
    return `/beneficiaries?${p.toString()}`;
  };
  const userName = (id: string | null) => db.users.find((u) => u.id === id)?.name ?? "—";
  const filtersOn = !!(owner || status || year || q);

  return (
    <>
      {added && <Notice tone="info">{t("addedTo", { name: added, to: to ?? "" })}</Notice>}
      <PageHeader
        eyebrow={t("muslimEyebrow")}
        title={t("newMuslim")}
        subtitle={t("newMuslimSub")}
        actions={
          <LinkButton href="/beneficiaries/new">
            <Plus className="size-4" />
            {t("addMuslim")}
          </LinkButton>
        }
      />
      <ProgramNav program="muslim" active="table" t={t} role={user.role} />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          [t("muslimTotal"), summary.total],
          [t("muslimYear"), summary.year],
          [t("muslimMonth"), summary.month],
          [STAGE_NAMES[1][lang], summary.stage[1]],
          [STAGE_NAMES[2][lang], summary.stage[2]],
          [STAGE_NAMES[3][lang], summary.stage[3]],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-card">
            <div className="text-xs text-muted">{k}</div>
            <div className="num mt-0.5 text-2xl font-bold">{v}</div>
          </div>
        ))}
      </div>

      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto]">
        <input type="hidden" name="view" value={view} />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-faint ltr:left-3 rtl:right-3" />
          <input name="q" defaultValue={q} placeholder={t("muslimSearch")} className="ltr:pl-9! rtl:pr-9!" />
        </div>
        <select name="owner" defaultValue={owner ?? ""} aria-label={F.follower[lang]}>
          <option value="">
            {F.follower[lang]}: {t("all")}
          </option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} aria-label={F.status[lang]}>
          <option value="">
            {F.status[lang]}: {t("all")}
          </option>
          {db.settings.lists.status.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="year" defaultValue={year ?? ""} aria-label={t("islamYear")}>
          <option value="">
            {t("islamYear")}: {t("all")}
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}هـ
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button className="rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm hover:bg-surface-2">{t("filter")}</button>
          {filtersOn && (
            <Link href={`/beneficiaries?view=${view}`} className="self-center text-xs text-muted hover:text-text">
              {t("clear")}
            </Link>
          )}
        </div>
      </form>

      <Tabs
        active={view}
        items={[
          { key: "all", href: href({ view: "all" }), label: t("all"), count: filtered("all").length },
          { key: "1", href: href({ view: "1" }), label: STAGE_NAMES[1][lang], count: filtered("1").length },
          { key: "2", href: href({ view: "2" }), label: STAGE_NAMES[2][lang], count: filtered("2").length },
          { key: "3", href: href({ view: "3" }), label: STAGE_NAMES[3][lang], count: filtered("3").length },
          { key: "cert", href: href({ view: "cert" }), label: t("certificates"), count: filtered("cert").length },
        ]}
      />

      {list.length === 0 ? (
        <Empty icon={UsersRound}>{t("nothingHere")}</Empty>
      ) : (
        <div className="animate-rise overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
          <table className="min-w-[1500px] text-sm">
            <thead className="bg-surface-2/60">
              <tr>
                <th>{F.serial[lang]}</th>
                <th>{F.name[lang]}</th>
                <th>{F.islamDate[lang]}</th>
                <th>{F.city[lang]}</th>
                <th>{F.nationality[lang]}</th>
                <th>{F.language[lang]}</th>
                <th>{F.gender[lang]}</th>
                <th>{F.caller[lang]}</th>
                <th>{F.follower[lang]}</th>
                <th>{F.workplace[lang]}</th>
                <th>{F.profession[lang]}</th>
                <th>{F.iqama[lang]}</th>
                <th>{F.phone[lang]}</th>
                <th>{F.sponsorName[lang]}</th>
                <th>{F.sponsorPhone[lang]}</th>
                <th>{F.status[lang]}</th>
                <th>{F.contactMethod[lang]}</th>
                <th>{F.lessons[lang]}</th>
                <th>{F.certificate[lang]}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => {
                const m = b.muslim!;
                const shown = canSeeName(db, user, b);
                return (
                  <tr key={b.id}>
                    <td className="num text-muted">{m.serial}</td>
                    <td className="font-medium whitespace-nowrap">
                      <Link href={`/beneficiaries/${b.id}`} className="hover:text-brand" dir="auto">
                        {displayName(db, user, b)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">
                      <div>{formatHijri(m.islamDate, lang)}</div>
                      <div className="text-xs text-muted">{formatGregorian(m.islamDate, lang)}</div>
                    </td>
                    <td className="whitespace-nowrap">{b.city || "—"}</td>
                    <td className="whitespace-nowrap">{b.nationality || "—"}</td>
                    <td className="whitespace-nowrap">{b.languageLabel || "—"}</td>
                    <td>{b.gender === "f" ? t("female") : t("male")}</td>
                    <td className="whitespace-nowrap">{userName(b.introducedBy)}</td>
                    <td className="whitespace-nowrap">{userName(b.assignedTo)}</td>
                    <td className="whitespace-nowrap">{b.workplace || "—"}</td>
                    <td className="whitespace-nowrap">{b.profession || "—"}</td>
                    <td className="num" dir="ltr">
                      {shown ? m.iqama || "—" : "•••"}
                    </td>
                    <td className="num whitespace-nowrap" dir="ltr">
                      {shown ? b.phone : "•••"}
                    </td>
                    <td className="whitespace-nowrap">{m.sponsorName || "—"}</td>
                    <td className="num whitespace-nowrap" dir="ltr">
                      {m.sponsorPhone || "—"}
                    </td>
                    <td>
                      <StatusChip value={m.status} />
                    </td>
                    <td className="whitespace-nowrap">{m.contactMethod || "—"}</td>
                    <td className="whitespace-nowrap">
                      <LessonGrid lessons={m.lessons} />
                      <div className="num mt-1 text-[11px] text-muted">
                        {lessonsDone(m)}/{MUSLIM_LESSONS} · {STAGE_NAMES[muslimStage(m)][lang]}
                      </div>
                    </td>
                    <td className="text-center">{m.certificate ? <Award className="inline size-5 text-gold" aria-label={t("certificates")} /> : <span className="text-faint">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
