import Link from "next/link";
import { CalendarClock, HeartPulse, MessageCircle, PauseCircle } from "lucide-react";
import { LANG_LABELS, type T } from "@/lib/i18n";
import { awaitingReply, formatHour, groupMembers, learnerState, weekdayName } from "@/lib/logic";
import type { DB, Group, UiLang } from "@/lib/types";
import { Avatar, Bar, Pill, cx } from "./ui";

export function GroupCard({ db, group, lang, t }: { db: DB; group: Group; lang: UiLang; t: T }) {
  const members = groupMembers(db, group.id);
  const learning = group.kind === "learning";
  const states = learning ? members.filter((b) => b.stage === "muslim").map((b) => learnerState(db, b)) : [];
  const done = states.reduce((n, s) => n + s.completed, 0);
  const total = states.reduce((n, s) => n + s.total, 0);
  const red = states.filter((s) => s.level === "red").length;
  const waiting = members.filter((b) => awaitingReply(db, b)).length;
  const days = group.schedule.days.map((d) => weekdayName(d, lang, "short")).join(lang === "ar" ? "، " : ", ");

  return (
    <Link href={`/groups/${group.id}`} className="group animate-rise flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-brand hover:shadow-pop">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold group-hover:text-brand">{group.name}</div>
          <div className="mt-0.5 text-xs text-muted">
            {LANG_LABELS[group.language][lang]} · {learning ? t("learnersInGroup", { n: members.length }) : t("peopleInGroup", { n: members.length })}
          </div>
        </div>
        <Pill tone={learning ? "violet" : "info"}>{learning ? t("learningGroup") : t("dawahGroup")}</Pill>
      </div>

      {learning ? (
        <>
          <div className="mt-4 flex items-center gap-2">
            <Bar value={total ? (done / total) * 100 : 0} tone="ok" />
            <span className="num text-xs text-muted">{total ? Math.round((done / total) * 100) : 0}%</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            {group.schedule.paused ? (
              <span className="flex items-center gap-1 text-warn">
                <PauseCircle className="size-3.5" /> {t("pausedSchedule")}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3.5" /> {days || "—"} · {group.schedule.hour === null ? t("preferredHour") : formatHour(group.schedule.hour, lang)}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="mt-4 flex -space-x-2 rtl:space-x-reverse">
          {members.slice(0, 6).map((b) => (
            <span key={b.id} className="rounded-full ring-2 ring-surface">
              <Avatar name={b.sensitive ? b.alias : b.name} size="sm" locked={b.sensitive} />
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center gap-1.5 pt-3">
        {waiting > 0 && (
          <Pill tone="warn">
            <MessageCircle className="size-3" /> {waiting}
          </Pill>
        )}
        {red > 0 && (
          <Pill tone="bad">
            <HeartPulse className="size-3" /> {red}
          </Pill>
        )}
        <span className={cx("ms-auto text-xs font-medium text-brand opacity-0 transition group-hover:opacity-100")}>{t("open")} {lang === "ar" ? "←" : "→"}</span>
      </div>
    </Link>
  );
}
