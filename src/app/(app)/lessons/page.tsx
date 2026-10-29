import Link from "next/link";
import { BookOpen, CircleAlert, Mic, Plus } from "lucide-react";
import { Card, LinkButton, PageHeader, Pill, cx } from "@/components/ui";
import { missingLanguages } from "@/lib/curriculum";
import { readDb } from "@/lib/db";
import { LANG_NATIVE, translator } from "@/lib/i18n";
import { lessonStats, trackLessons } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import { LANGS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const canEdit = user.role !== "caller";

  return (
    <>
      <PageHeader
        title={t("lessons")}
        subtitle={t("lessonsSub")}
        actions={
          canEdit && (
            <LinkButton href="/lessons/new">
              <Plus className="size-4" />
              {t("newLesson")}
            </LinkButton>
          )
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Mic, title: t("voiceNote"), text: t("principleVoice") },
          { icon: CircleAlert, title: t("lessonQuestion"), text: t("principleQuestion") },
          { icon: BookOpen, title: t("lessonPractice"), text: t("principlePractice") },
        ].map((x) => (
          <div key={x.title} className="flex gap-3 rounded-2xl border border-border bg-surface-2/50 p-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold">
              <x.icon className="size-4" />
            </span>
            <div>
              <div className="text-sm font-semibold">{x.title}</div>
              <p className="text-xs text-muted">{x.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {db.tracks.map((track) => {
          const lessons = trackLessons(db, track.id, false);
          return (
            <Card key={track.id} title={track.title[lang]} icon={BookOpen} action={<span className="text-xs text-muted">{lessons.length}</span>} bodyClassName="px-0! pb-1!">
              <p className="-mt-1 mb-3 px-5 text-xs text-muted">{track.description[lang]}</p>
              <ul className="divide-y divide-border border-t border-border">
                {lessons.map((l) => {
                  const missing = missingLanguages(l, LANGS);
                  const s = lessonStats(db, l.id);
                  return (
                    <li key={l.id}>
                      <Link href={`/lessons/${l.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 transition hover:bg-surface-2/50 sm:flex-nowrap">
                        <span className={cx("num grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold", l.status === "ready" ? "bg-brand text-white" : "bg-surface-3 text-muted")}>{l.order}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{l.title[lang] || "—"}</span>
                            <Pill tone={l.status === "ready" ? "ok" : "neutral"}>{l.status === "ready" ? t("ready") : t("draft")}</Pill>
                            {l.audioSec > 0 && (
                              <Pill tone="info">
                                <Mic className="size-3" /> {t("minutes", { n: Math.max(1, Math.round(l.audioSec / 60)) })}
                              </Pill>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted">
                            {missing.length ? <span className="text-warn">{t("missingLangs", { langs: missing.map((x) => LANG_NATIVE[x]).join("، ") })}</span> : t("allLangs")}
                          </div>
                        </div>
                        {s.sent > 0 && (
                          <div className="flex shrink-0 gap-4 text-center text-[11px] text-muted">
                            <div>
                              <div className="num text-sm font-semibold text-text">{s.sent}</div>
                              {t("sentTimes")}
                            </div>
                            <div>
                              <div className="num text-sm font-semibold text-ok">{s.completionPct ?? 0}%</div>
                              {t("completedTimes")}
                            </div>
                            <div>
                              <div className={cx("num text-sm font-semibold", (s.wrongPct ?? 0) > 30 ? "text-bad" : "text-text")}>{s.wrongPct ?? 0}%</div>
                              {t("wrongRate")}
                            </div>
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
