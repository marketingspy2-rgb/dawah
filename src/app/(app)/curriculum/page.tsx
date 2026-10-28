import { Card, PageTitle } from "@/components/ui";
import { TEMPLATES, type TemplateId } from "@/lib/content";
import { readDb } from "@/lib/db";
import { LANG_LABELS, langDir, translator } from "@/lib/i18n";
import { getUiLang, requireUser } from "@/lib/session";
import { LANGS } from "@/lib/types";

const TEMPLATE_NAMES: Record<TemplateId, { ar: string; en: string }> = {
  lesson_ready: { ar: "درسك جاهز", en: "Lesson ready" },
  checkin: { ar: "اطمئنان", en: "Check-in" },
  new_caller: { ar: "تعريف الداعية الجديد", en: "New caller intro" },
  followup: { ar: "استكمال الحوار", en: "Follow-up" },
};

export default async function CurriculumPage() {
  await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();

  return (
    <>
      <PageTitle title={t("curriculum")} />
      <div className="space-y-4">
        <Card title={t("lessons")}>
          <p className="mb-3 text-sm text-muted">{t("lessonsNote")}</p>
          <table className="text-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("lessons")}</th>
                <th>{t("question")}</th>
              </tr>
            </thead>
            <tbody>
              {db.lessons.map((l) => (
                <tr key={l.id}>
                  <td className="num">{l.order}</td>
                  <td>{l.title[lang]}</td>
                  <td className="text-muted">{l.question[lang]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title={t("templates")}>
          <p className="mb-3 text-sm text-muted">{t("templatesNote")}</p>
          <div className="space-y-4">
            {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
              <div key={id} className="rounded-lg border border-border">
                <div className="border-b border-border bg-surface-2 px-3 py-2 text-sm font-medium">
                  {TEMPLATE_NAMES[id][lang]} <span className="text-muted">· {TEMPLATES[id][lang]}</span>
                </div>
                <ul className="divide-y divide-border text-sm">
                  {LANGS.map((l) => (
                    <li key={l} className="grid gap-1 px-3 py-2 sm:grid-cols-[110px_1fr]">
                      <span className="text-muted">{LANG_LABELS[l][lang]}</span>
                      <span dir={langDir(l)}>{TEMPLATES[id][l]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
