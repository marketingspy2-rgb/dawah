import { BookOpen, CircleHelp, MessageCircle, Phone, PhoneMissed, Undo2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { logTouch, undoTouch } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { cx } from "@/components/ui";
import { TOUCH_LABELS, type T } from "@/lib/i18n";
import { touchState } from "@/lib/insights";
import { relTime } from "@/lib/logic";
import type { DB, TouchKind, UiLang, User } from "@/lib/types";
import { TOUCH_KINDS } from "@/lib/types";

const ICONS: Record<TouchKind, LucideIcon> = { chat: MessageCircle, call: Phone, no_reply: PhoneMissed, question: CircleHelp, lesson: BookOpen };

/**
 * One tap after a conversation that happened outside the platform (personal WhatsApp, a call).
 * The full version sits on the beneficiary's file; the compact one on "My day".
 */
export function QuickLog({ db, user, beneficiaryId, lang, t, compact }: { db: DB; user: User; beneficiaryId: string; lang: UiLang; t: T; compact?: boolean }) {
  const now = Date.now();
  const { last, today } = touchState(db, beneficiaryId, now);
  const kinds = compact ? (["chat", "call", "no_reply"] as TouchKind[]) : TOUCH_KINDS;
  const canUndo = last && last.userId === user.id && now - new Date(last.at).getTime() < 10 * 60_000;

  return (
    <div className={cx(compact ? "mt-1.5" : "space-y-3")}>
      <div className={cx("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
        {kinds.map((kind) => {
          const Icon = ICONS[kind];
          const n = today.filter((k) => k === kind).length;
          return (
            <form key={kind} action={logTouch}>
              <input type="hidden" name="beneficiaryId" value={beneficiaryId} />
              <input type="hidden" name="kind" value={kind} />
              <PendingButton
                className={cx(
                  "flex items-center gap-1.5 rounded-full border font-medium transition active:scale-95",
                  compact ? "h-7 px-2.5 text-[11px]" : "h-10 px-4 text-sm",
                  n ? "border-brand/30 bg-brand-soft text-brand" : "border-border bg-surface hover:border-brand/40 hover:bg-brand-tint",
                )}
              >
                <Icon className={compact ? "size-3.5" : "size-4"} />
                {TOUCH_LABELS[kind][lang]}
                {n > 0 && <span className="num rounded-full bg-brand px-1.5 text-[10px] leading-4 text-white">{n}</span>}
              </PendingButton>
            </form>
          );
        })}
      </div>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {last ? t("lastTouch", { what: TOUCH_LABELS[last.kind as TouchKind][lang], when: relTime(last.at, lang, now) }) : t("noTouchYet")}
          {canUndo && (
            <form action={undoTouch}>
              <input type="hidden" name="touchId" value={last.id} />
              <button className="flex items-center gap-1 font-medium text-brand hover:underline">
                <Undo2 className="size-3" /> {t("undo")}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
