import { Check, Sprout, X } from "lucide-react";
import { VoicePlayer } from "./client";
import { WhatsAppIcon } from "./icons";
import { cx } from "./ui";

export type LessonUi = {
  lesson: string;
  listen: string;
  playing: string;
  check: string;
  yes: string;
  no: string;
  right: string;
  wrong: string;
  rightAnswerYes: string;
  rightAnswerNo: string;
  practice: string;
  ask: string;
  done: string;
  of: string;
};

type Props = {
  ui: LessonUi;
  dir: "ltr" | "rtl";
  speechLang: string;
  order: number;
  total: number;
  title: string;
  point: string;
  question: string;
  practice: string;
  answer: boolean;
  audioSec: number;
  /** null until the learner answers. */
  result: { correct: boolean } | null;
  /** Forms for the real page; left out in the staff preview. */
  answerForm?: (value: "yes" | "no", button: React.ReactNode) => React.ReactNode;
  askForm?: (button: React.ReactNode) => React.ReactNode;
  compact?: boolean;
};

/**
 * The one page a learner sees. Built for people new to phones:
 * one column, large text, a play button, two big answer buttons and a way back to their teacher.
 */
export function LessonView(p: Props) {
  const yesBtn = (
    <span className={cx("flex w-full flex-col items-center justify-center gap-1 rounded-3xl bg-ok font-bold text-white shadow-pop transition active:scale-[0.97]", p.compact ? "h-16 text-base" : "h-28 text-2xl")}>
      <Check className={p.compact ? "size-5" : "size-9"} strokeWidth={3} />
      {p.ui.yes}
    </span>
  );
  const noBtn = (
    <span className={cx("flex w-full flex-col items-center justify-center gap-1 rounded-3xl bg-bad font-bold text-white shadow-pop transition active:scale-[0.97]", p.compact ? "h-16 text-base" : "h-28 text-2xl")}>
      <X className={p.compact ? "size-5" : "size-9"} strokeWidth={3} />
      {p.ui.no}
    </span>
  );
  const askBtn = (
    <span className={cx("flex w-full items-center justify-center gap-3 rounded-full bg-wa font-semibold text-white shadow-pop transition active:scale-[0.98]", p.compact ? "h-11 text-sm" : "h-16 text-lg")}>
      <WhatsAppIcon className={p.compact ? "size-5" : "size-7"} />
      {p.ui.ask}
    </span>
  );

  return (
    <div dir={p.dir} className={cx("mx-auto flex w-full max-w-md flex-col", p.compact ? "gap-3 text-sm" : "gap-5")}>
      <div className="flex items-center justify-between">
        <span className={cx("font-medium text-muted", p.compact ? "text-xs" : "text-base")}>
          {p.ui.lesson} {p.order} {p.ui.of} {p.total}
        </span>
        <span className="flex gap-1" dir="ltr">
          {Array.from({ length: p.total }, (_, i) => (
            <span key={i} className={cx("rounded-full", p.compact ? "h-1.5 w-3" : "h-2 w-4", i < p.order - (p.result ? 0 : 1) ? "bg-ok" : i === p.order - 1 ? "bg-gold" : "bg-surface-3")} />
          ))}
        </span>
      </div>

      <h1 className={cx("leading-snug font-bold", p.compact ? "text-lg" : "text-3xl")}>{p.title}</h1>

      {p.compact ? (
        <span className="flex items-center gap-3 rounded-2xl bg-wa p-3 text-white">
          <span className="grid size-10 place-items-center rounded-full bg-white/20">▶</span>
          <span className="font-semibold">{p.ui.listen}</span>
        </span>
      ) : (
        <VoicePlayer text={`${p.title}. ${p.point}`} speechLang={p.speechLang} seconds={p.audioSec || 60} label={p.ui.listen} playingLabel={p.ui.playing} />
      )}

      <p className={cx("leading-relaxed", p.compact ? "text-sm" : "text-xl")}>{p.point}</p>

      <section className={cx("rounded-3xl border-2 border-border bg-surface", p.compact ? "p-3" : "p-5")}>
        <div className={cx("mb-1 font-semibold text-gold", p.compact ? "text-xs" : "text-base")}>{p.ui.check}</div>
        <p className={cx("font-semibold", p.compact ? "text-sm" : "text-xl")}>{p.question}</p>
        {p.result ? (
          <div className={cx("mt-4 flex items-center gap-3 rounded-2xl p-4", p.result.correct ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>
            <span className={cx("grid shrink-0 place-items-center rounded-full text-white", p.result.correct ? "bg-ok" : "bg-warn", p.compact ? "size-8" : "size-12")}>
              {p.result.correct ? <Check className="size-6" strokeWidth={3} /> : <span className="text-xl font-bold">!</span>}
            </span>
            <div>
              <div className={cx("font-bold", p.compact ? "text-sm" : "text-xl")}>{p.result.correct ? p.ui.right : p.ui.wrong}</div>
              <div className={p.compact ? "text-xs" : "text-base"}>{p.answer ? p.ui.rightAnswerYes : p.ui.rightAnswerNo}</div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {p.answerForm ? p.answerForm("yes", yesBtn) : yesBtn}
            {p.answerForm ? p.answerForm("no", noBtn) : noBtn}
          </div>
        )}
      </section>

      {(p.result || p.compact) && (
        <section className={cx("flex items-start gap-3 rounded-3xl bg-gold-soft", p.compact ? "p-3" : "p-5")}>
          <span className={cx("grid shrink-0 place-items-center rounded-2xl bg-gold text-white", p.compact ? "size-8" : "size-12")}>
            <Sprout className={p.compact ? "size-4" : "size-6"} />
          </span>
          <div>
            <div className={cx("font-semibold text-gold", p.compact ? "text-xs" : "text-base")}>{p.ui.practice}</div>
            <p className={cx("font-medium", p.compact ? "text-sm" : "text-xl")}>{p.practice}</p>
          </div>
        </section>
      )}

      {p.result && !p.compact && (
        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-ok">
          <Check className="size-6" strokeWidth={3} /> {p.ui.done}
        </div>
      )}

      {p.askForm ? p.askForm(askBtn) : askBtn}
    </div>
  );
}
