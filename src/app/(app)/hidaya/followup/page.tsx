import Link from "next/link";
import { CalendarClock, CheckCircle2, Footprints, Snowflake } from "lucide-react";
import { logHidaya } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { CategoryChip, FOLLOWUP_ICONS } from "@/components/fields";
import { ProgramNav } from "@/components/program-nav";
import { reasonText } from "@/components/reasons";
import { Avatar, Card, Empty, PageHeader } from "@/components/ui";
import { readDb } from "@/lib/db";
import { formatHijri, isoDay } from "@/lib/hijri";
import { translator } from "@/lib/i18n";
import { canAct, canSeeName, displayName, staffUnder, visibleBeneficiaries } from "@/lib/logic";
import { F, FOLLOWUP_LABELS, activeHidaya, categoryRank, recontactReasons, type RecontactReason } from "@/lib/programs";
import { getUiLang, requireUser } from "@/lib/session";
import type { Beneficiary } from "@/lib/types";
import { HIDAYA_FOLLOWUPS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecontactPage({ searchParams }: { searchParams: Promise<{ owner?: string }> }) {
  const { owner } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const today = isoDay();
  const staff = staffUnder(db, user).filter((u) => u.role === "caller");
  const cases = activeHidaya(visibleBeneficiaries(db, user)).filter((b) => (user.role === "caller" ? b.assignedTo === user.id : !owner || b.assignedTo === owner));
  const withReasons = cases.map((b) => ({ b, reasons: recontactReasons(db, b, today) })).filter((x) => x.reasons.length);
  // Closest to Islam first: those are the conversations that must not go cold.
  const byRank = (a: { b: Beneficiary }, c: { b: Beneficiary }) => categoryRank(db, a.b.hidaya!.category) - categoryRank(db, c.b.hidaya!.category);
  const due = withReasons.filter((x) => x.reasons.some((r) => r.kind === "due" || r.kind === "never")).sort(byRank);
  const cold = withReasons.filter((x) => !due.includes(x) && x.reasons.some((r) => r.kind === "cold")).sort(byRank);
  const visits = withReasons.filter((x) => !due.includes(x) && !cold.includes(x)).sort(byRank);
  const userName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "—";

  const Row = ({ b, reasons }: { b: Beneficiary; reasons: RecontactReason[] }) => {
    const name = displayName(db, user, b);
    const h = b.hidaya!;
    return (
      <li className="flex flex-wrap items-center gap-3 px-5 py-3">
        <Avatar name={name} size="sm" locked={!canSeeName(db, user, b)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/hidaya/${b.id}`} className="font-medium hover:text-brand" dir="auto">
              {name}
            </Link>
            <CategoryChip value={h.category} options={db.settings.lists.category} />
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {reasons.map((r) => reasonText(r, lang, t)).join(" · ")}
            {" · "}
            {F.lastContact[lang]}: {formatHijri(h.lastContact, lang)}
            {user.role !== "caller" && ` · ${userName(b.assignedTo)}`}
          </div>
        </div>
        {canAct(db, user, b) && (
          <form action={logHidaya} className="flex gap-1">
            <input type="hidden" name="beneficiaryId" value={b.id} />
            {HIDAYA_FOLLOWUPS.map((k) => {
              const Icon = FOLLOWUP_ICONS[k];
              return (
                <PendingButton key={k} name="kind" value={k} title={FOLLOWUP_LABELS[k][lang]} aria-label={FOLLOWUP_LABELS[k][lang]} className="grid size-9 place-items-center rounded-lg border border-border bg-surface text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand">
                  <Icon className="size-4" />
                </PendingButton>
              );
            })}
          </form>
        )}
      </li>
    );
  };

  const Section = ({ title, hint, icon, items, tone }: { title: string; hint: string; icon: typeof Snowflake; items: { b: Beneficiary; reasons: RecontactReason[] }[]; tone?: "warn" | "bad" | "brand" }) =>
    items.length ? (
      <Card title={`${title} (${items.length})`} icon={icon} tone={tone} bodyClassName="px-0! pb-1!">
        <p className="-mt-1 px-5 pb-2 text-xs text-muted">{hint}</p>
        <ul className="divide-y divide-border border-t border-border">
          {items.map((x) => (
            <Row key={x.b.id} {...x} />
          ))}
        </ul>
      </Card>
    ) : null;

  return (
    <>
      <PageHeader eyebrow={t("hidayaEyebrow")} title={t("recontact")} subtitle={t("recontactSub")} />
      <ProgramNav program="hidaya" active="followup" t={t} role={user.role} counts={{ followup: due.length + cold.length }} />
      {user.role !== "caller" && (
        <form className="mb-4 flex items-center gap-2">
          <select name="owner" defaultValue={owner ?? ""} className="w-auto!" aria-label={F.callerFollow[lang]}>
            <option value="">
              {F.callerFollow[lang]}: {t("all")}
            </option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm hover:bg-surface-2">{t("filter")}</button>
        </form>
      )}
      {withReasons.length === 0 ? (
        <Empty icon={CheckCircle2}>{t("recontactNone")}</Empty>
      ) : (
        <div className="space-y-5">
          <Section title={t("recontactDue")} hint={t("recontactDueHint")} icon={CalendarClock} items={due} tone="warn" />
          <Section title={t("recontactCold")} hint={t("recontactColdHint")} icon={Snowflake} items={cold} tone="bad" />
          <Section title={t("recontactVisits")} hint={t("recontactVisitsHint")} icon={Footprints} items={visits} />
        </div>
      )}
    </>
  );
}
