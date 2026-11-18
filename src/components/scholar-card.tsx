import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { askScholars } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { Card, Pill } from "@/components/ui";
import { featureOn } from "@/lib/features";
import type { T } from "@/lib/i18n";
import { canOpen, relTime } from "@/lib/logic";
import type { Beneficiary, DB, UiLang, User } from "@/lib/types";

/** On a beneficiary's file: questions already asked about them, and a short form to ask one. */
export function ScholarCard({ db, user, b, lang, t }: { db: DB; user: User; b: Beneficiary; lang: UiLang; t: T }) {
  if (!featureOn(db, "scholarQuestions") || !canOpen(db, user, b)) return null;
  const now = Date.now();
  const qs = db.questions.filter((q) => q.beneficiaryId === b.id).sort((a, c) => c.at.localeCompare(a.at));
  const name = (id: string | null) => db.users.find((u) => u.id === id)?.name ?? "—";
  return (
    <Card title={t("qTitle")} icon={HelpCircle} action={<Link href="/questions" className="text-xs text-brand hover:underline">{t("qTitle")}</Link>}>
      {qs.length > 0 && (
        <ul className="mb-4 space-y-2">
          {qs.map((q) => (
            <li key={q.id} className="rounded-xl bg-surface-2/50 px-3 py-2.5 text-sm">
              <p>{q.text}</p>
              <p className="mt-0.5 text-xs text-muted">
                {t("qBy", { name: name(q.askedBy) })} · {relTime(q.at, lang, now)}
              </p>
              {q.answer ? (
                <div className="mt-2 rounded-lg border-s-4 border-ok bg-ok-soft/50 px-3 py-2">
                  <p className="whitespace-pre-wrap">{q.answer}</p>
                  <p className="mt-0.5 text-xs text-muted">{t("qAnsweredBy", { name: name(q.answeredBy) })}</p>
                </div>
              ) : (
                <Pill tone="warn" className="mt-1.5">
                  {t("qWaiting")}
                </Pill>
              )}
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft">
          <HelpCircle className="size-4" />
          {t("qAsk")}
        </summary>
        <form action={askScholars} className="mt-3 space-y-2">
          <input type="hidden" name="beneficiaryId" value={b.id} />
          <textarea name="text" rows={3} required placeholder={t("qPlaceholder")} />
          <PendingButton className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong">{t("qSend")}</PendingButton>
        </form>
      </details>
    </Card>
  );
}
