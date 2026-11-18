import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Empty, PageHeader } from "@/components/ui";
import { readDb } from "@/lib/db";
import { requireFeature } from "@/lib/features";
import { translator } from "@/lib/i18n";
import { formatDate, relTime } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Readable names for what the log records. Anything unlisted shows its raw key. */
const ACTIONS: Record<string, { ar: string; en: string }> = {
  login: { ar: "دخل المنصة", en: "Signed in" },
  login_failed: { ar: "محاولة دخول خاطئة", en: "Failed sign-in" },
  open_file: { ar: "فتح ملف", en: "Opened a file" },
  add_note: { ar: "أضاف ملاحظة", en: "Added a note" },
  add_hidaya: { ar: "أضاف حالة في هداية", en: "Added a Hidaya case" },
  update_hidaya: { ar: "عدّل بيانات هداية", en: "Edited Hidaya details" },
  capture: { ar: "حالة جديدة من رابط مصدر", en: "New case from a source link" },
  capture_again: { ar: "عاد عبر رابط مصدر", en: "Came back through a source link" },
  ask_scholars: { ar: "سأل أهل العلم", en: "Asked the scholars" },
  answer_question: { ar: "أجاب سؤالًا", en: "Answered a question" },
  set_password: { ar: "غيّر كلمة مرور", en: "Changed a password" },
  set_username: { ar: "غيّر اسم دخول", en: "Changed a username" },
  features: { ar: "غيّر المميزات المفعّلة", en: "Changed the features" },
  lists: { ar: "عدّل القوائم", en: "Edited the lists" },
  group_best_hour: { ar: "اعتمد أنسب ساعة لحلقة", en: "Applied a circle's best hour" },
  update_group: { ar: "عدّل حلقة", en: "Edited a group" },
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ who?: string; what?: string }> }) {
  const { who, what } = await searchParams;
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  requireFeature(db, "auditLog");
  const now = Date.now();
  const users = new Map(db.users.map((u) => [u.id, u]));
  const entries = db.audit.filter((a) => (!who || a.userId === who) && (!what || a.action.startsWith(what)));
  const label = (action: string) => ACTIONS[action]?.[lang] ?? ACTIONS[action.split(":")[0]]?.[lang] ?? action;
  const target = (id: string) => {
    const b = db.beneficiaries.find((x) => x.id === id);
    if (b) return { href: b.program === "hidaya" ? `/hidaya/${b.id}` : `/beneficiaries/${b.id}`, text: b.sensitive ? b.alias : b.name };
    const u = users.get(id);
    if (u) return { href: null, text: u.name };
    return { href: null, text: id === "settings" ? (lang === "ar" ? "الإعدادات" : "Settings") : id };
  };

  return (
    <>
      <PageHeader title={t("auditTitle")} subtitle={t("auditSub")} />
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="who" defaultValue={who ?? ""} className="w-auto!">
          <option value="">{t("auditAll")}</option>
          {db.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select name="what" defaultValue={what ?? ""} className="w-auto!">
          <option value="">{t("auditAll")}</option>
          {Object.entries(ACTIONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v[lang]}
            </option>
          ))}
        </select>
        <button className="rounded-xl border border-border px-4 text-sm hover:bg-surface-2">{t("auditFilter")}</button>
      </form>
      <Card bodyClassName="px-0! pb-0! pt-0!">
        {entries.length ? (
          <ul className="divide-y divide-border">
            {entries.slice(0, 300).map((a) => {
              const tg = target(a.target);
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-5 py-2.5 text-sm">
                  <span className="w-36 shrink-0 font-medium">{users.get(a.userId)?.name ?? (a.userId === "beneficiary" ? "—" : a.userId)}</span>
                  <span className="text-muted">{label(a.action)}</span>
                  {tg.href ? (
                    <Link href={tg.href} className="text-brand hover:underline" dir="auto">
                      {tg.text}
                    </Link>
                  ) : (
                    <span dir="auto">{tg.text}</span>
                  )}
                  <span className="ms-auto text-xs text-muted" title={formatDate(a.at, lang)}>
                    {relTime(a.at, lang, now)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-5">
            <Empty>{t("nothingHere")}</Empty>
          </div>
        )}
      </Card>
    </>
  );
}
