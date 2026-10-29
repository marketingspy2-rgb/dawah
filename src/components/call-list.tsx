import Link from "next/link";
import { CheckCircle2, ChevronDown, Moon, PhoneOutgoing, Sun } from "lucide-react";
import { completeTask, recordPhoneSend } from "@/app/actions";
import { SendFromPhone } from "@/components/client";
import { QuickLog } from "@/components/quick-log";
import { Avatar, Empty, PersonName, StageBadge, cx } from "@/components/ui";
import { centerHourFor, type CallItem, type Reason } from "@/lib/daily";
import { langDir, type T } from "@/lib/i18n";
import { DAY, canSeeName, displayName, formatHour, relTime } from "@/lib/logic";
import { phoneOptions, waNumber } from "@/lib/phone-send";
import type { Beneficiary, DB, UiLang, User } from "@/lib/types";

type Ctx = { db: DB; user: User; lang: UiLang; t: T; origin: string };

const TONE: Record<Reason["kind"], string> = {
  waiting: "bg-wa-soft text-wa-strong",
  task: "bg-brand-soft text-brand",
  learner: "bg-bad-soft text-bad",
  note: "bg-warn-soft text-warn",
  lesson: "bg-info-soft text-info",
  new: "bg-info-soft text-info",
  cold: "bg-surface-2 text-muted",
};

function reasonText(r: Reason, { lang, t }: Ctx, now: number) {
  switch (r.kind) {
    case "waiting":
      return t("reasonWaiting", { when: relTime(r.since, lang, now) });
    case "task":
      return t(r.late ? "reasonTaskLate" : "reasonTask", { title: r.task.title });
    case "learner":
      return t(r.level === "red" ? "reasonRed" : "reasonYellow", { when: relTime(now - r.days * DAY, lang, now) });
    case "note":
      return t("reasonNote", { text: r.text.length > 60 ? `${r.text.slice(0, 60)}…` : r.text });
    case "lesson":
      return t(r.reminder ? "reasonReminder" : "reasonLesson");
    case "new":
      return t("reasonNew");
    case "cold":
      return t("reasonCold", { when: relTime(now - r.days * DAY, lang, now) });
  }
}

/** The send-from-my-phone panel, opened under a person in the list or on their file. */
export function PhoneSend({ b, ctx, open }: { b: Beneficiary; ctx: Ctx; open?: boolean }) {
  const { db, user, lang, t, origin } = ctx;
  return (
    <details className="group/send" open={open}>
      <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-full bg-wa px-3 text-xs font-medium text-white shadow-soft transition hover:bg-wa-strong">
        <PhoneOutgoing className="size-3.5" />
        {t("sendFromPhone")}
        <ChevronDown className="size-3 transition group-open/send:rotate-180" />
      </summary>
      <div className="mt-2 rounded-xl border border-wa/25 bg-wa-soft/40 p-3">
        <SendFromPhone
          beneficiaryId={b.id}
          phone={waNumber(b.phone)}
          options={phoneOptions(db, user, b, lang, origin)}
          action={recordPhoneSend}
          dir={langDir(b.language)}
          labels={{ open: t("openWhatsApp"), hint: t("phoneHint"), recorded: t("phoneRecorded"), placeholder: t("phonePlaceholder") }}
        />
      </div>
    </details>
  );
}

function Row({ item, ctx, now }: { item: CallItem; ctx: Ctx; now: number }) {
  const { db, user, lang, t } = ctx;
  const { b } = item;
  const name = displayName(db, user, b);
  const time = new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-GB", { hour: "numeric", minute: "2-digit", timeZone: b.timezone }).format(now);
  return (
    <li className={cx("py-3", item.doneToday && "opacity-70")}>
      <div className="flex items-start gap-3">
        {item.task && !item.doneToday ? (
          <form action={completeTask} className="pt-1.5">
            <input type="hidden" name="taskId" value={item.task.id} />
            <button aria-label={t("markDone")} title={t("markDone")} className="grid size-6 place-items-center rounded-full border-2 border-border-strong text-transparent transition hover:border-ok hover:text-ok">
              <CheckCircle2 className="size-4" />
            </button>
          </form>
        ) : (
          <Avatar name={name} size="sm" locked={!canSeeName(db, user, b)} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <PersonName name={name} href={`/beneficiaries/${b.id}`} />
            <StageBadge stage={b.stage} lang={lang} />
            {item.doneToday && <span className="text-[11px] font-medium text-ok">✓</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.reasons.map((r, i) => (
              <span key={i} dir="auto" className={cx("max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-medium", TONE[r.kind], r.kind === "task" && r.late && "bg-bad-soft text-bad", r.kind === "learner" && r.level === "yellow" && "bg-warn-soft text-warn")}>
                {reasonText(r, ctx, now)}
              </span>
            ))}
          </div>
          <div className={cx("mt-1 flex items-center gap-1 text-[11px]", item.goodNow ? "text-muted" : "text-warn")}>
            {item.goodNow ? <Sun className="size-3" /> : <Moon className="size-3" />}
            {item.goodNow ? t("goodNow", { time }) : t("notNow", { time, from: formatHour(centerHourFor(b, item.fromHour, now), lang) })}
          </div>
          {!item.doneToday && (
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <PhoneSend b={b} ctx={ctx} />
              <QuickLog db={db} user={user} beneficiaryId={b.id} lang={lang} t={t} compact />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function CallList({ items, ctx, showAll }: { items: CallItem[]; ctx: Ctx; showAll: boolean }) {
  const now = Date.now();
  const todo = items.filter((i) => !i.doneToday);
  const done = items.filter((i) => i.doneToday);
  const LIMIT = 10;
  const shown = showAll ? todo : todo.slice(0, LIMIT);
  return (
    <>
      {shown.length ? (
        <ul className="divide-y divide-border">
          {shown.map((item) => (
            <Row key={item.b.id} item={item} ctx={ctx} now={now} />
          ))}
        </ul>
      ) : (
        <Empty icon={CheckCircle2}>{ctx.t("allCaughtUp")}</Empty>
      )}
      {!showAll && todo.length > LIMIT && (
        <Link href="/?all=1" className="mt-2 inline-block text-sm font-medium text-brand hover:underline">
          {ctx.t("showAll", { n: todo.length })}
        </Link>
      )}
      {done.length > 0 && (
        <details className="mt-3 rounded-xl bg-surface-2/50 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-ok">{ctx.t("doneTodayN", { n: done.length })}</summary>
          <ul className="divide-y divide-border">
            {done.map((item) => (
              <Row key={item.b.id} item={item} ctx={ctx} now={now} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
