import { login, toggleLang } from "@/app/actions";
import { loadDb } from "@/lib/db";
import { LANG_LABELS, ROLE_LABELS, translator } from "@/lib/i18n";
import { activeLoad } from "@/lib/logic";
import { getUiLang } from "@/lib/session";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const lang = await getUiLang();
  const t = translator(lang);
  const db = await loadDb();
  const groups: Role[] = ["admin", "supervisor", "caller"];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-brand text-lg font-bold text-white">د</span>
            <span className="text-xl font-bold">{t("appName")}</span>
          </div>
          <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
          <p className="mt-1 text-muted">{t("loginHint")}</p>
        </div>
        <form action={toggleLang}>
          <button className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">{t("switchLang")}</button>
        </form>
      </div>

      {groups.map((role) => (
        <section key={role} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-muted">{ROLE_LABELS[role][lang]}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {db.users
              .filter((u) => u.role === role)
              .map((u) => (
                <form key={u.id} action={login}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="w-full rounded-xl border border-border bg-surface p-3 text-start hover:border-brand">
                    <div className="font-medium">{u.name}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {u.languages.map((l) => LANG_LABELS[l][lang]).join("، ") || ROLE_LABELS[u.role][lang]}
                      {u.role === "caller" && ` · ${activeLoad(db, u.id)} ${t("activeCases")}`}
                      {u.status !== "available" && ` · ${t(u.status)}`}
                    </div>
                  </button>
                </form>
              ))}
          </div>
        </section>
      ))}
    </main>
  );
}
