import Link from "next/link";
import { Plus, Search, UsersRound } from "lucide-react";
import { CategoryChip, FollowupMarks, ResultChip } from "@/components/fields";
import { ProgramNav } from "@/components/program-nav";
import { Empty, LinkButton, PageHeader, Tabs, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { formatHijri, isoDay } from "@/lib/hijri";
import { translator } from "@/lib/i18n";
import { canSeeName, displayName, staffUnder, visibleBeneficiaries } from "@/lib/logic";
import { CONVERTED, F, MIN_VISITS, hidayaCases, needsContact } from "@/lib/programs";
import { getUiLang, requireUser } from "@/lib/session";
import type { Beneficiary } from "@/lib/types";

export const dynamic = "force-dynamic";

type Q = { q?: string; owner?: string; category?: string; result?: string; source?: string; view?: string };

export default async function HidayaPage({ searchParams }: { searchParams: Promise<Q> }) {
  const sp = await searchParams;
  const { q, owner, category, result, source, view = "active" } = sp;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const today = isoDay();
  const lists = db.settings.lists;
  const all = hidayaCases(visibleBeneficiaries(db, user)).filter((b) => user.role !== "teacher" || b.program === "hidaya" || b.introducedBy === user.id || b.assignedTo === user.id);
  const staff = staffUnder(db, user).filter((u) => u.role === "caller");

  const inView = (b: Beneficiary, v: string) => (v === "active" ? b.program === "hidaya" : v === "converted" ? b.program === "muslim" : true);
  const filtered = (v: string) =>
    all
      .filter((b) => inView(b, v))
      .filter((b) => !owner || (b.program === "hidaya" ? b.assignedTo === owner : b.introducedBy === owner))
      .filter((b) => !category || b.hidaya!.category === category)
      .filter((b) => !result || b.hidaya!.result === result)
      .filter((b) => !source || b.hidaya!.source === source)
      .filter((b) => {
        if (!q) return true;
        const s = q.trim().toLowerCase();
        return displayName(db, user, b).toLowerCase().includes(s) || (canSeeName(db, user, b) && b.phone.replace(/\D/g, "").includes(s.replace(/\D/g, "") || "~")) || b.workplace.includes(s) || String(b.hidaya!.serial) === s;
      });
  const list = filtered(view).sort((a, c) => c.hidaya!.serial - a.hidaya!.serial);
  const recontact = all.filter((b) => needsContact(db, b, today)).length;

  const href = (patch: Partial<Q>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    return `/hidaya?${p.toString()}`;
  };
  const userName = (id: string | null) => db.users.find((u) => u.id === id)?.name ?? "—";
  const filtersOn = !!(owner || category || result || source || q);

  return (
    <>
      <PageHeader
        eyebrow={t("hidayaEyebrow")}
        title={t("hidaya")}
        subtitle={t("hidayaSub")}
        actions={
          user.role !== "teacher" && (
            <LinkButton href="/hidaya/new">
              <Plus className="size-4" />
              {t("addHidaya")}
            </LinkButton>
          )
        }
      />
      <ProgramNav program="hidaya" active="table" t={t} role={user.role} counts={{ followup: recontact }} />

      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto]">
        <input type="hidden" name="view" value={view} />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-faint ltr:left-3 rtl:right-3" />
          <input name="q" defaultValue={q} placeholder={t("hidayaSearch")} className="ltr:pl-9! rtl:pr-9!" />
        </div>
        {user.role !== "caller" && (
          <select name="owner" defaultValue={owner ?? ""} aria-label={F.callerFollow[lang]}>
            <option value="">{F.callerFollow[lang]}: {t("all")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <FilterSelect name="category" label={F.category[lang]} value={category} options={lists.category} all={t("all")} />
        <FilterSelect name="result" label={F.result[lang]} value={result} options={[...lists.result, CONVERTED]} all={t("all")} />
        <FilterSelect name="source" label={F.source[lang]} value={source} options={lists.source} all={t("all")} />
        <div className="flex gap-2">
          <button className="rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm hover:bg-surface-2">{t("filter")}</button>
          {filtersOn && (
            <Link href={`/hidaya?view=${view}`} className="self-center text-xs text-muted hover:text-text">
              {t("clear")}
            </Link>
          )}
        </div>
      </form>

      <Tabs
        active={view}
        items={[
          { key: "active", href: href({ view: "active" }), label: t("hidayaActiveTab"), count: filtered("active").length },
          { key: "converted", href: href({ view: "converted" }), label: t("hidayaConvertedTab"), count: filtered("converted").length },
          { key: "all", href: href({ view: "all" }), label: t("all"), count: filtered("all").length },
        ]}
      />

      {list.length === 0 ? (
        <Empty icon={UsersRound}>{t("nothingHere")}</Empty>
      ) : (
        <div className="animate-rise overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
          <table className="min-w-[1180px] text-sm">
            <thead className="bg-surface-2/60">
              <tr>
                <th>{F.serial[lang]}</th>
                <th>{F.name[lang]}</th>
                <th>{F.city[lang]}</th>
                <th>{F.workplace[lang]}</th>
                <th>{F.profession[lang]}</th>
                <th>{F.nationality[lang]}</th>
                <th>{F.language[lang]}</th>
                <th>{F.gender[lang]}</th>
                <th>{F.callerFollow[lang]}</th>
                <th>{F.phone[lang]}</th>
                <th>{F.source[lang]}</th>
                <th>{F.firstContact[lang]}</th>
                <th>{F.lastContact[lang]}</th>
                <th>{F.followup[lang]}</th>
                <th>{F.visits[lang]}</th>
                <th>{F.result[lang]}</th>
                <th>{F.category[lang]}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => {
                const h = b.hidaya!;
                const shown = canSeeName(db, user, b);
                return (
                  <tr key={b.id}>
                    <td className="num text-muted">{h.serial}</td>
                    <td className="font-medium whitespace-nowrap">
                      <Link href={b.program === "muslim" ? `/beneficiaries/${b.id}` : `/hidaya/${b.id}`} className="hover:text-brand" dir="auto">
                        {displayName(db, user, b)}
                      </Link>
                      {needsContact(db, b, today) && <span className="ms-1.5 inline-block size-2 rounded-full bg-warn align-middle" title={t("recontact")} />}
                    </td>
                    <td className="whitespace-nowrap">{b.city || "—"}</td>
                    <td className="whitespace-nowrap">{b.workplace || "—"}</td>
                    <td className="whitespace-nowrap">{b.profession || "—"}</td>
                    <td className="whitespace-nowrap">{b.nationality || "—"}</td>
                    <td className="whitespace-nowrap">{b.languageLabel || "—"}</td>
                    <td>{b.gender === "f" ? t("female") : t("male")}</td>
                    <td className="whitespace-nowrap">{userName(b.program === "hidaya" ? b.assignedTo : (b.introducedBy ?? b.assignedTo))}</td>
                    <td className="num whitespace-nowrap" dir="ltr">
                      {shown ? b.phone : "•••"}
                    </td>
                    <td className="whitespace-nowrap">{h.source || "—"}</td>
                    <td className="whitespace-nowrap text-muted">{formatHijri(h.firstContact, lang)}</td>
                    <td className="whitespace-nowrap text-muted">{formatHijri(h.lastContact, lang)}</td>
                    <td>
                      <FollowupMarks followup={h.followup} lang={lang} />
                    </td>
                    <td className={cx("num text-center", h.visits < MIN_VISITS ? "text-warn" : "text-ok")}>{h.visits}</td>
                    <td>
                      <ResultChip value={h.result} />
                    </td>
                    <td>
                      <CategoryChip value={h.category} options={lists.category} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {list.length > 0 && <p className="mt-3 text-xs text-muted">{t("hidayaTableHint", { n: MIN_VISITS })}</p>}
    </>
  );
}

function FilterSelect({ name, label, value, options, all }: { name: string; label: string; value?: string; options: string[]; all: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} aria-label={label}>
      <option value="">
        {label}: {all}
      </option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
