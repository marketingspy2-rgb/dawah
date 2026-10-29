import { BookOpenCheck, HeartHandshake, MessageCircleHeart, Sprout } from "lucide-react";
import { login, toggleLang } from "@/app/actions";
import { Avatar, RoleBadge } from "@/components/ui";
import { loadDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { activeLoad } from "@/lib/logic";
import { getUiLang } from "@/lib/session";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const lang = await getUiLang();
  const t = translator(lang);
  const db = await loadDb();
  const admin = db.users.find((u) => u.role === "admin")!;

  const journey = [
    { icon: MessageCircleHeart, label: t("journey1") },
    { icon: HeartHandshake, label: t("journey2") },
    { icon: BookOpenCheck, label: t("journey3") },
    { icon: Sprout, label: t("journey4") },
  ];

  const Account = ({ u, hint }: { u: User; hint?: string }) => (
    <form action={login}>
      <input type="hidden" name="userId" value={u.id} />
      <button className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-2.5 text-start transition hover:border-brand hover:shadow-card">
        <Avatar name={u.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium group-hover:text-brand">{u.name}</span>
          <span className="block truncate text-[11px] text-muted">
            {hint ??
              [u.languages.map((l) => LANG_LABELS[l][lang]).join(lang === "ar" ? "، " : ", "), `${activeLoad(db, u.id)} ${t("cases")}`, u.status !== "available" ? t(u.status) : null]
                .filter(Boolean)
                .join(" · ")}
          </span>
        </span>
        <RoleBadge role={u.role} gender={u.gender} lang={lang} />
      </button>
    </form>
  );

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[minmax(360px,5fr)_7fr]">
      <section className="bg-pattern relative flex flex-col justify-between gap-10 overflow-hidden bg-night px-6 py-8 text-white lg:sticky lg:top-0 lg:h-screen lg:px-12 lg:py-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-gold shadow-pop">
              <svg viewBox="0 0 32 32" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M16 3l3.7 9.1L29 16l-9.3 3.9L16 29l-3.7-9.1L3 16l9.3-3.9z" />
                <circle cx="16" cy="16" r="3.2" />
              </svg>
            </span>
            <span className="text-lg font-bold">{t("appName")}</span>
          </div>
          <form action={toggleLang}>
            <button className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">{t("switchLang")}</button>
          </form>
        </div>

        <div>
          <span className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-night-text">{t("demoBadge")}</span>
          <h1 className="text-3xl leading-tight font-bold lg:text-4xl">{t("appTagline")}</h1>
          <p className="mt-3 max-w-md text-night-text">{t("structureSub")}</p>
          <ol className="mt-8 grid grid-cols-4 gap-2">
            {journey.map((j, i) => (
              <li key={j.label} className="relative flex flex-col items-center gap-2 text-center">
                {i > 0 && <span className="absolute top-5 h-px w-full bg-white/20 ltr:right-1/2 rtl:left-1/2" />}
                <span className="relative grid size-10 place-items-center rounded-full bg-night-2 ring-1 ring-white/20">
                  <j.icon className="size-5 text-gold-soft" strokeWidth={1.8} />
                </span>
                <span className="text-xs text-night-text">{j.label}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="hidden text-xs text-night-text/70 lg:block">{t("accessBeneficiary")}</p>
      </section>

      <section className="px-4 py-8 lg:px-12 lg:py-12">
        <h2 className="text-xl font-bold">{t("loginTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("loginHint")}</p>

        <div className="mt-6 space-y-6">
          <div>
            <div className="mb-2 text-xs font-medium text-muted">{t("loginRoleAdmin")}</div>
            <Account u={admin} hint={t("centerOverview")} />
          </div>

          {db.teams.map((team) => {
            const sup = db.users.find((u) => u.id === team.supervisorId)!;
            const members = db.users.filter((u) => u.teamId === team.id && u.id !== sup.id);
            const callers = members.filter((u) => u.role === "caller");
            const teachers = members.filter((u) => u.role === "teacher");
            return (
              <div key={team.id} className="rounded-2xl border border-border bg-surface-2/50 p-3 lg:p-4">
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <h3 className="font-semibold">{team.name}</h3>
                  <span className="text-xs text-muted">
                    {callers.length} {t("callers")} · {teachers.length} {t("teachers")}
                  </span>
                </div>
                <Account u={sup} hint={t("loginRoleSupervisor")} />
                <div className="mt-3 grid gap-3 border-s-2 border-border ps-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="px-1 text-[11px] font-medium text-muted">{t("loginRoleCaller")}</div>
                    {callers.map((u) => (
                      <Account key={u.id} u={u} />
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <div className="px-1 text-[11px] font-medium text-muted">{t("loginRoleTeacher")}</div>
                    {teachers.map((u) => (
                      <Account key={u.id} u={u} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
