import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, CheckCircle2, Mic, PencilLine, Send, Smartphone } from "lucide-react";
import { recordVoice, saveLesson, sendSpecificLesson, setLessonStatus } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { WhatsAppIcon } from "@/components/icons";
import { LessonView, type LessonUi } from "@/components/lesson-view";
import { Button, Card, Field, Notice, PageHeader, Pill, WhatsAppSubmit, cx } from "@/components/ui";
import { TEMPLATES, fillTemplate } from "@/lib/content";
import { LEARNER_UI, SPEECH_LANG, missingLanguages } from "@/lib/curriculum";
import { readDb } from "@/lib/db";
import { LANG_NATIVE, langDir, translator } from "@/lib/i18n";
import { canAct, displayName, formatDate, lessonStats, relTime, trackLessons, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import type { Lang, Lesson } from "@/lib/types";
import { LANGS } from "@/lib/types";

export const dynamic = "force-dynamic";

type EditLang = "ar" | "en" | Lang;

const STAFF_UI: Record<"ar" | "en", LessonUi> = {
  ar: { lesson: "الدرس", listen: "استمع", playing: "يُشغَّل…", check: "هل هذا صحيح؟", yes: "نعم", no: "لا", right: "أحسنت!", wrong: "قريب.", rightAnswerYes: "الإجابة: نعم.", rightAnswerNo: "الإجابة: لا.", practice: "لليوم", ask: "اسأل معلمي", done: "انتهى الدرس", of: "من" },
  en: { lesson: "Lesson", listen: "Listen", playing: "Playing…", check: "Is it true?", yes: "Yes", no: "No", right: "Well done!", wrong: "Almost.", rightAnswerYes: "The answer is: yes.", rightAnswerNo: "The answer is: no.", practice: "For today", ask: "Ask my teacher", done: "Lesson finished", of: "of" },
};

export default async function LessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ l?: string; saved?: string; sent?: string; track?: string }> }) {
  const { id } = await params;
  const { l, saved, sent, track } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();

  const isNew = id === "new";
  const found = db.lessons.find((x) => x.id === id);
  if (!isNew && !found) notFound();
  const trackId = found?.trackId ?? (track && db.tracks.some((tr) => tr.id === track) ? track : "TR1");
  const lesson: Lesson = found ?? {
    id: "",
    trackId,
    order: Math.max(0, ...db.lessons.filter((x) => x.trackId === trackId).map((x) => x.order)) + 1,
    status: "draft",
    title: { ar: "", en: "" },
    point: { ar: "", en: "" },
    question: { ar: "", en: "" },
    practice: { ar: "", en: "" },
    answer: true,
    audioSec: 0,
    updatedAt: "",
    updatedBy: "",
  };

  const editLangs: EditLang[] = ["ar", "en", ...LANGS];
  const active: EditLang = editLangs.includes(l as EditLang) ? (l as EditLang) : lang;
  const isLearnerLang = (LANGS as string[]).includes(active);
  const canEdit = user.role !== "caller";
  const canApprove = user.role === "supervisor" || user.role === "admin";
  const missing = missingLanguages(lesson, LANGS);
  const total = trackLessons(db, trackId, false).length;
  const stats = found ? lessonStats(db, found.id) : null;
  const filled = (x: EditLang) => [lesson.title, lesson.point, lesson.question, lesson.practice].every((f) => (f[x] ?? "").trim());
  const v = (f: "title" | "point" | "question" | "practice") => lesson[f][active] ?? "";
  const editor = db.users.find((u) => u.id === lesson.updatedBy);
  const learners = visibleBeneficiaries(db, user).filter((b) => b.stage === "muslim" && canAct(db, user, b) && !db.events.some((e) => e.beneficiaryId === b.id && e.lessonId === lesson.id));

  const ui = isLearnerLang ? LEARNER_UI[active as Lang] : STAFF_UI[active as "ar" | "en"];
  const waText = isLearnerLang ? fillTemplate(TEMPLATES.lesson_ready[active as Lang], { name: "Maria", title: v("title") || "…", link: "" }).trim() : fillTemplate(TEMPLATES.lesson_ready[active as "ar" | "en"], { name: "Maria", title: v("title") || "…", link: "" }).trim();
  const dir = langDir(active as Lang);

  return (
    <>
      {saved && <Notice tone="ok">{t("savedOk")}</Notice>}
      {sent !== undefined && <Notice tone={sent === "0" ? "warn" : "ok"}>{sent === "0" ? t("nothingHere") : t("sentOk")}</Notice>}

      <PageHeader
        crumbs={[{ href: "/lessons", label: t("lessons") }]}
        eyebrow={`${db.tracks.find((tr) => tr.id === trackId)?.title[lang]} · ${t("lessonOf", { n: lesson.order, total: Math.max(total, lesson.order) })}`}
        title={lesson.title[lang] || t("newLesson")}
        subtitle={
          found && editor ? t("lastEdited", { when: relTime(lesson.updatedAt, lang), who: editor.name }) : undefined
        }
        actions={
          <>
            <Pill tone={lesson.status === "ready" ? "ok" : "neutral"}>{lesson.status === "ready" ? t("ready") : t("draft")}</Pill>
            {found && canApprove && (
              <form action={setLessonStatus}>
                <input type="hidden" name="lessonId" value={lesson.id} />
                <input type="hidden" name="status" value={lesson.status === "ready" ? "draft" : "ready"} />
                <Button variant={lesson.status === "ready" ? "secondary" : "primary"} disabled={lesson.status !== "ready" && missing.length > 0}>
                  {lesson.status === "ready" ? t("backToDraft") : (
                    <>
                      <CheckCircle2 className="size-4" /> {t("markReady")}
                    </>
                  )}
                </Button>
              </form>
            )}
          </>
        }
      />

      {missing.length > 0 && (
        <Notice tone="warn">
          {t("missingLangs", { langs: missing.map((x) => LANG_NATIVE[x]).join("، ") })} · {t("readyNeedsAll")}
          {!canApprove && ` ${t("onlySupervisorApproves")}`}
        </Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Card title={t("edit")} icon={PencilLine} bodyClassName="pt-0!">
            <div className="scrollbar-none -mx-5 mb-4 flex gap-1 overflow-x-auto border-b border-border px-5">
              {editLangs.map((x) => (
                <Link
                  key={x}
                  href={`/lessons/${id}?l=${x}${track ? `&track=${track}` : ""}`}
                  className={cx("relative flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition", active === x ? "border-brand font-semibold text-brand" : "border-transparent text-muted hover:text-text")}
                >
                  {x === "ar" ? "العربية" : x === "en" ? "English" : LANG_NATIVE[x]}
                  <span className={cx("size-1.5 rounded-full", filled(x) ? "bg-ok" : "bg-warn")} />
                </Link>
              ))}
            </div>
            <form action={saveLesson} className="space-y-4">
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="trackId" value={trackId} />
              <input type="hidden" name="tab" value={active} />
              <Field label={t("lessonTitle")}>
                <input name={`title_${active}`} defaultValue={v("title")} dir={dir} disabled={!canEdit} required={active === "ar"} />
              </Field>
              <Field label={t("lessonPoint")} hint={t("pointHint")}>
                <textarea name={`point_${active}`} defaultValue={v("point")} rows={4} dir={dir} disabled={!canEdit} />
              </Field>
              <Field label={t("lessonQuestion")} hint={t("questionHint")}>
                <input name={`question_${active}`} defaultValue={v("question")} dir={dir} disabled={!canEdit} />
              </Field>
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-medium">{t("lessonAnswer")}</legend>
                <div className="flex gap-2">
                  {(["yes", "no"] as const).map((a) => (
                    <label key={a} className="cursor-pointer">
                      <input type="radio" name="answer" value={a} defaultChecked={lesson.answer === (a === "yes")} disabled={!canEdit} className="peer sr-only" />
                      <span className={cx("flex h-10 items-center rounded-xl border px-5 text-sm font-medium transition", a === "yes" ? "peer-checked:border-ok peer-checked:bg-ok peer-checked:text-white" : "peer-checked:border-bad peer-checked:bg-bad peer-checked:text-white", "border-border")}>
                        {t(a)}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label={t("lessonPractice")} hint={t("practiceHint")}>
                <input name={`practice_${active}`} defaultValue={v("practice")} dir={dir} disabled={!canEdit} />
              </Field>
              {canEdit && (
                <div className="flex items-center gap-3">
                  <Button>{t("save")}</Button>
                  <span className="text-xs text-muted">{t("translationsNote")}</span>
                </div>
              )}
            </form>
          </Card>

          {found && (
            <Card title={t("voiceNote")} icon={Mic}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={cx("grid size-12 place-items-center rounded-full", lesson.audioSec ? "bg-wa-soft text-wa" : "bg-surface-3 text-muted")}>
                  <Mic className="size-5" />
                </span>
                <div className="flex-1 text-sm">
                  {lesson.audioSec ? (
                    <span className="num font-medium" dir="ltr">
                      {Math.floor(lesson.audioSec / 60)}:{String(lesson.audioSec % 60).padStart(2, "0")}
                    </span>
                  ) : (
                    <span className="text-muted">{t("noVoice")}</span>
                  )}
                  <p className="text-xs text-muted">{t("voiceHint")}</p>
                </div>
                {canEdit && (
                  <form action={recordVoice}>
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <PendingButton className="flex h-9 items-center gap-1.5 rounded-xl bg-bad px-4 text-sm font-medium text-white hover:opacity-90">
                      <span className="size-2.5 rounded-full bg-white" /> {t("recordVoice")}
                    </PendingButton>
                  </form>
                )}
              </div>
            </Card>
          )}

          {found && lesson.status === "ready" && (
            <Card title={t("sendThisLesson")} icon={Send}>
              <form action={sendSpecificLesson} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="lessonId" value={lesson.id} />
                <Field label={t("chooseRecipient")} className="min-w-56 flex-1">
                  <select name="beneficiaryId" required disabled={!learners.length}>
                    {learners.map((b) => (
                      <option key={b.id} value={b.id}>
                        {displayName(db, user, b)} · {LANG_NATIVE[b.language]}
                      </option>
                    ))}
                  </select>
                </Field>
                <WhatsAppSubmit label={t("sendWhatsapp")} disabled={!learners.length} />
              </form>
            </Card>
          )}

          {stats && stats.sent > 0 && (
            <Card title={t("stats")} icon={BarChart3}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [t("sentTimes"), stats.sent, ""],
                  [t("openedTimes"), stats.opened, ""],
                  [t("completedTimes"), `${stats.completionPct ?? 0}%`, "text-ok"],
                  [t("wrongRate"), `${stats.wrongPct ?? 0}%`, (stats.wrongPct ?? 0) > 30 ? "text-bad" : ""],
                ].map(([k, val, cls]) => (
                  <div key={String(k)} className="rounded-xl bg-surface-2/60 p-3">
                    <div className="text-xs text-muted">{k}</div>
                    <div className={cx("num text-xl font-bold", String(cls))}>{val}</div>
                  </div>
                ))}
              </div>
              {(stats.wrongPct ?? 0) > 30 && <p className="mt-3 text-xs text-bad">{t("wrongHint")}</p>}
            </Card>
          )}
        </div>

        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card title={t("previewWhatsapp")} icon={Smartphone}>
            <div className="bg-pattern-light rounded-2xl bg-chat p-3">
              <div className="ms-auto max-w-[90%] rounded-2xl rounded-ee-md bg-bubble-out px-3 py-2 text-sm shadow-soft" dir={dir}>
                <p className="whitespace-pre-wrap">{waText}</p>
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/70 p-2 ring-1 ring-black/5">
                  <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">📘</span>
                  <span className="truncate text-xs font-semibold">{v("title") || "…"}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                <WhatsAppIcon className="size-3.5 text-wa" /> {t("officialNumber")}
              </div>
            </div>
          </Card>
          <Card title={t("previewPage")} icon={Smartphone}>
            <div className="mx-auto w-full max-w-[300px] rounded-[2rem] border-8 border-night bg-bg p-4 shadow-pop">
              <LessonView
                compact
                ui={ui}
                dir={dir}
                speechLang={isLearnerLang ? SPEECH_LANG[active as Lang] : active}
                order={lesson.order}
                total={Math.max(total, lesson.order)}
                title={v("title") || "…"}
                point={v("point") || "…"}
                question={v("question") || "…"}
                practice={v("practice") || "…"}
                answer={lesson.answer}
                audioSec={lesson.audioSec}
                result={null}
              />
            </div>
          </Card>
          {found && <p className="text-center text-[11px] text-muted">{formatDate(lesson.updatedAt || Date.now(), lang)}</p>}
        </div>
      </div>
    </>
  );
}
