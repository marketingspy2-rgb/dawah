import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { learnerAnswer, learnerAsk, learnerOpened } from "@/app/actions";
import { MarkOpened } from "@/components/client";
import { LessonView } from "@/components/lesson-view";
import { LEARNER_UI, SPEECH_LANG } from "@/lib/curriculum";
import { loadDb } from "@/lib/db";
import { langDir } from "@/lib/i18n";
import { trackLessons } from "@/lib/logic";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "📘", robots: { index: false } };

/** The learner's lesson page: opened from a WhatsApp link, no login, no menus. */
export default async function LearnerLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await loadDb();
  const event = db.events.find((e) => e.id === id);
  const b = event && db.beneficiaries.find((x) => x.id === event.beneficiaryId);
  const lesson = event && db.lessons.find((l) => l.id === event.lessonId);
  if (!event || !b || !lesson) notFound();

  const lang = b.language;
  const ui = LEARNER_UI[lang];
  const pick = (m: typeof lesson.title) => m[lang] || m.en;
  const total = trackLessons(db, lesson.trackId).length;
  const teacher = db.users.find((u) => u.id === b.assignedTo);

  return (
    <main lang={lang} className="bg-pattern-light min-h-dvh bg-bg px-4 pt-5 pb-10">
      {!event.openedAt && <MarkOpened action={learnerOpened.bind(null, event.id)} />}
      <div className="mx-auto mb-5 flex max-w-md items-center gap-3" dir={langDir(lang)}>
        <span className="grid size-10 place-items-center rounded-xl bg-brand text-white">
          <svg viewBox="0 0 32 32" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M16 3l3.7 9.1L29 16l-9.3 3.9L16 29l-3.7-9.1L3 16l9.3-3.9z" />
          </svg>
        </span>
        <span className="text-base font-medium text-muted">{teacher?.name.split(" ")[0]}</span>
      </div>
      <LessonView
        ui={ui}
        dir={langDir(lang)}
        speechLang={SPEECH_LANG[lang]}
        order={lesson.order}
        total={Math.max(total, lesson.order)}
        title={pick(lesson.title)}
        point={pick(lesson.point)}
        question={pick(lesson.question)}
        practice={pick(lesson.practice)}
        answer={lesson.answer}
        audioSec={lesson.audioSec}
        result={event.completedAt ? { correct: event.correct !== false } : null}
        answerForm={(value, button) => (
          <form action={learnerAnswer}>
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="answer" value={value} />
            <button className="w-full">{button}</button>
          </form>
        )}
        askForm={(button) => (
          <form action={learnerAsk}>
            <input type="hidden" name="eventId" value={event.id} />
            <button className="w-full">{button}</button>
          </form>
        )}
      />
    </main>
  );
}
