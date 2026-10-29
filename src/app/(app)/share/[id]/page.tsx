import Link from "next/link";
import { FileText, UserRound } from "lucide-react";
import { discardShare, importShared } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { Avatar, Card, Notice, PageHeader, StageBadge, cx } from "@/components/ui";
import { guessBeneficiarySender, parseWhatsAppExport, suggestBeneficiaries, summarize } from "@/lib/chat-import";
import { mutate, readDb } from "@/lib/db";
import { translator } from "@/lib/i18n";
import { canAct, displayName, formatDate, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** A chat that arrived from the phone: check it, pick whose file it goes to, save. */
export default async function SharedChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  let share = readDb().shares.find((s) => s.id === id);

  if (!share) {
    return (
      <>
        <PageHeader title={t("shareTitle")} />
        <Notice tone="warn">{t("shareGone")}</Notice>
        <Link href="/share" className="text-sm font-medium text-brand hover:underline">
          {t("addChat")}
        </Link>
      </>
    );
  }
  // A share sent before signing in belongs to whoever opens it first.
  if (!share.userId) {
    await mutate((db) => {
      const s = db.shares.find((x) => x.id === id);
      if (s && !s.userId) s.userId = user.id;
    });
    share = readDb().shares.find((s) => s.id === id)!;
  }

  const db = readDb();
  const lines = parseWhatsAppExport(share.text);
  const sum = summarize(lines);
  const candidates = visibleBeneficiaries(db, user).filter((b) => b.stage !== "closed" && canAct(db, user, b));
  const suggestions = suggestBeneficiaries(lines, candidates).slice(0, 4);
  const others = candidates.filter((b) => !suggestions.includes(b)).sort((a, c) => displayName(db, user, a).localeCompare(displayName(db, user, c)));
  const guessed = suggestions[0] ? guessBeneficiarySender(lines, suggestions[0], user) : null;
  const them = guessed ?? sum.senders.find((s) => !s.name.toLowerCase().includes(user.name.split(" ")[0].toLowerCase()))?.name ?? sum.senders[0]?.name;
  const preview = lines.slice(-6);

  return (
    <>
      <PageHeader title={t("shareReceived")} subtitle={share.fileName ?? undefined} crumbs={[{ href: "/share", label: t("addChat") }]} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form action={importShared} className="space-y-5">
          <input type="hidden" name="shareId" value={share.id} />

          <Card title={t("pickBeneficiary")} icon={UserRound}>
            {suggestions.length > 0 && (
              <div className="mb-3 space-y-2">
                {suggestions.map((b, i) => (
                  <label key={b.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-2.5 has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
                    <input type="radio" name="beneficiaryId" value={b.id} defaultChecked={i === 0} />
                    <Avatar name={displayName(db, user, b)} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium" dir="auto">
                      {displayName(db, user, b)}
                    </span>
                    {i === 0 && <span className="text-[11px] font-medium text-brand">{t("suggested")}</span>}
                    <StageBadge stage={b.stage} lang={lang} />
                  </label>
                ))}
              </div>
            )}
            <select name="otherBeneficiaryId" defaultValue="" aria-label={t("pickBeneficiary")} required={!suggestions.length}>
              <option value="">{suggestions.length ? `${t("all")}…` : "—"}</option>
              {others.map((b) => (
                <option key={b.id} value={b.id}>
                  {displayName(db, user, b)}
                </option>
              ))}
            </select>
          </Card>

          {sum.senders.length > 1 && (
            <Card title={t("whoIsBeneficiary")} icon={UserRound}>
              <div className="flex flex-wrap gap-2">
                {sum.senders.slice(0, 6).map((s) => (
                  <label key={s.name} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
                    <input type="radio" name="them" value={s.name} defaultChecked={s.name === them} />
                    <span dir="auto">{s.name}</span>
                    <span className="num text-xs text-muted">{s.n}</span>
                  </label>
                ))}
              </div>
            </Card>
          )}

          <PendingButton className="h-12 w-full rounded-full bg-brand text-base font-semibold text-white shadow-pop hover:bg-brand-strong">{t("saveToFile")}</PendingButton>
        </form>

        <Card title={lines.length ? t("shareStats", { n: lines.length, from: formatDate(sum.from!.getTime(), lang), to: formatDate(sum.to!.getTime(), lang) }) : t("shareReceived")} icon={FileText}>
          {lines.length ? (
            <ul className="bg-pattern-light space-y-2 rounded-xl bg-chat p-3">
              {preview.map((l, i) => (
                <li key={i} className={cx("flex", l.sender === them ? "justify-start" : "justify-end")}>
                  <div className={cx("max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-soft", l.sender === them ? "bg-bubble-in" : "bg-bubble-out")}>
                    <div className="mb-0.5 text-[11px] text-muted" dir="auto">
                      {l.sender} · {formatDate(l.at.getTime(), lang)}
                    </div>
                    <p dir="auto" className="whitespace-pre-wrap">
                      {l.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <Notice tone="info">{t("shareNoMessages")}</Notice>
              <p dir="auto" className="line-clamp-6 text-sm whitespace-pre-wrap text-muted">
                {share.text}
              </p>
            </>
          )}
          <form action={discardShare} className="mt-4 flex justify-end">
            <input type="hidden" name="shareId" value={share.id} />
            <button className="text-xs font-medium text-muted hover:text-bad">{t("discard")}</button>
          </form>
        </Card>
      </div>
    </>
  );
}
