import Link from "next/link";
import { CheckCircle2, HelpCircle, ShieldAlert } from "lucide-react";
import { answerQuestion, askScholars } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { Card, Empty, Notice, PageHeader, Pill } from "@/components/ui";
import { readDb } from "@/lib/db";
import { featureOn, requireFeature } from "@/lib/features";
import { FLAG_LABELS, checkContent } from "@/lib/governance";
import { translator } from "@/lib/i18n";
import { canOpen, displayName, relTime } from "@/lib/logic";
import { canAnswer, visibleQuestions } from "@/lib/questions";
import { getUiLang, requireUser } from "@/lib/session";
import type { Question } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Questions to the scholars: staff ask, supervisors and management answer. */
export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ asked?: string; answered?: string }> }) {
  const { asked, answered } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  requireFeature(db, "scholarQuestions");
  const now = Date.now();
  const all = visibleQuestions(db, user);
  const open = all.filter((q) => !q.answer);
  const done = all.filter((q) => q.answer);
  const name = (id: string | null) => db.users.find((u) => u.id === id)?.name ?? "—";
  const checking = featureOn(db, "contentCheck");

  const Item = ({ q }: { q: Question }) => {
    const b = q.beneficiaryId ? db.beneficiaries.find((x) => x.id === q.beneficiaryId) : null;
    const flags = q.answer && checking ? checkContent(q.answer) : [];
    return (
      <li className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {b && canOpen(db, user, b) ? (
            <Link href={b.program === "hidaya" ? `/hidaya/${b.id}` : `/beneficiaries/${b.id}`} className="font-medium text-brand hover:underline" dir="auto">
              {t("qAbout", { name: displayName(db, user, b) })}
            </Link>
          ) : (
            <span>{t("qGeneral")}</span>
          )}
          <span>· {t("qBy", { name: name(q.askedBy) })}</span>
          <span>· {relTime(q.at, lang, now)}</span>
        </div>
        <p className="mt-1.5 text-[15px] whitespace-pre-wrap">{q.text}</p>
        {q.answer ? (
          <div className="mt-3 rounded-xl border-s-4 border-ok bg-ok-soft/50 px-3 py-2.5 text-sm">
            <p className="whitespace-pre-wrap">{q.answer}</p>
            <p className="mt-1 text-xs text-muted">
              {t("qAnsweredBy", { name: name(q.answeredBy) })} · {relTime(q.answeredAt, lang, now)}
            </p>
            {flags.map((f) => (
              <p key={f} className="mt-1.5 flex items-start gap-1.5 text-xs text-warn">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                {FLAG_LABELS[f][lang]}
              </p>
            ))}
          </div>
        ) : canAnswer(db, user, q) ? (
          <form action={answerQuestion} className="mt-3 space-y-2">
            <input type="hidden" name="questionId" value={q.id} />
            <textarea name="answer" rows={3} required placeholder={t("qAnswerPlaceholder")} />
            <PendingButton className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong">{t("qSaveAnswer")}</PendingButton>
          </form>
        ) : (
          <Pill tone="warn" className="mt-2">
            {t("qWaiting")}
          </Pill>
        )}
      </li>
    );
  };

  return (
    <>
      {asked && <Notice tone="ok">{t("qAsked")}</Notice>}
      {answered && <Notice tone="ok">{t("qAnswered")}</Notice>}
      <PageHeader title={t("qTitle")} subtitle={t("qSub")} />

      <Card title={t("qAsk")} icon={HelpCircle} className="mb-5">
        <form action={askScholars} className="space-y-2">
          <textarea name="text" rows={3} required placeholder={t("qPlaceholder")} />
          <PendingButton className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong">{t("qSend")}</PendingButton>
        </form>
      </Card>

      <div className="space-y-5">
        <Card title={t("qOpen", { n: open.length })} icon={HelpCircle} tone={open.length ? "warn" : undefined} bodyClassName="px-0! pb-0!">
          {open.length ? (
            <ul className="divide-y divide-border border-t border-border">
              {open.map((q) => (
                <Item key={q.id} q={q} />
              ))}
            </ul>
          ) : (
            <div className="px-5 pb-5">
              <Empty icon={CheckCircle2}>{t("qNone")}</Empty>
            </div>
          )}
        </Card>
        {done.length > 0 && (
          <Card title={t("qDone")} icon={CheckCircle2} bodyClassName="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {done.map((q) => (
                <Item key={q.id} q={q} />
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
