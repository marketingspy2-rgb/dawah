import Link from "next/link";
import { cookies } from "next/headers";
import { Languages, LogOut, RotateCcw } from "lucide-react";
import { logout, resetDemo, toggleLang } from "@/app/actions";
import { Avatar, Card, PageHeader, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { FEATURE_GROUPS, moreTiles } from "@/lib/features";
import { roleLabel, translator } from "@/lib/i18n";
import { teamOf } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import { LATEST_UPDATE } from "@/lib/updates";

export const dynamic = "force-dynamic";

/** Everything beyond the three daily places, as tiles grouped by purpose. */
export default async function MorePage() {
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const tiles = moreTiles(db, user.role);
  const unseen = (await cookies()).get("dawah_seen_update")?.value !== LATEST_UPDATE;
  const team = teamOf(db, user);

  return (
    <>
      <PageHeader title={t("moreTitle")} subtitle={t("moreSub")} />
      <div className="space-y-6">
        {FEATURE_GROUPS.map((g) => {
          const items = tiles.filter((f) => f.group === g.key);
          if (!items.length) return null;
          return (
            <section key={g.key}>
              <h2 className="mb-2 px-1 text-xs font-medium tracking-wide text-muted">{g.title[lang]}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f) => (
                  <Link key={f.key} href={f.href!} className="animate-rise flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:border-brand">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                      <f.icon className="size-5" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold">
                        {f.title[lang]}
                        {f.key === "updates" && unseen && <span className="size-2 rounded-full bg-gold" aria-hidden />}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">{f.desc[lang]}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <Card title={t("appearance")}>
          <div className="flex items-center gap-3">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted">
                {roleLabel(user.role, user.gender, lang)}
                {team ? ` · ${team.name}` : ""}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={toggleLang}>
              <button className={cx("inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-2")}>
                <Languages className="size-4" />
                {t("switchLang")}
              </button>
            </form>
            <form action={logout}>
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-2">
                <LogOut className="size-4 rtl:-scale-x-100" />
                {t("logout")}
              </button>
            </form>
            {user.role === "admin" && (
              <form action={resetDemo}>
                <button className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted hover:bg-surface-2">
                  <RotateCcw className="size-4" />
                  {t("resetDemo")}
                </button>
              </form>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
