import Link from "next/link";
import { logout, resetDemo, toggleLang } from "@/app/actions";
import { NavLink } from "@/components/nav-link";
import { mutate, readDb } from "@/lib/db";
import { ROLE_LABELS, translator } from "@/lib/i18n";
import { awaitingReply, openTasks, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);

  // Track usage for the platform metrics, at most every 10 minutes.
  if (!user.lastSeenAt || Date.now() - new Date(user.lastSeenAt).getTime() > 10 * 60_000) {
    await mutate((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (u) u.lastSeenAt = new Date().toISOString();
    });
  }

  const db = readDb();
  const mine = visibleBeneficiaries(db, user);
  const waiting = mine.filter((b) => awaitingReply(db, b)).length;
  const ids = new Set(mine.map((b) => b.id));
  const dueNow = openTasks(db).filter((task) => ids.has(task.beneficiaryId) && (user.role !== "caller" || task.assigneeId === user.id) && new Date(task.due).getTime() < Date.now()).length;

  const nav =
    user.role === "admin"
      ? [
          { href: "/dashboard", label: t("dashboard") },
          { href: "/beneficiaries", label: t("beneficiaries") },
          { href: "/new-muslims", label: t("newMuslims") },
          { href: "/team", label: t("team") },
          { href: "/curriculum", label: t("curriculum") },
        ]
      : [
          { href: "/", label: t("today"), badge: dueNow },
          { href: "/chats", label: t("chats"), badge: waiting },
          { href: "/beneficiaries", label: t("beneficiaries") },
          { href: "/new-muslims", label: t("newMuslims") },
          ...(user.role === "supervisor"
            ? [
                { href: "/team", label: t("team") },
                { href: "/dashboard", label: t("dashboard") },
              ]
            : []),
        ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-surface lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-e">
        <div className="flex h-full flex-col gap-4 p-3 lg:p-4">
          <div className="flex items-center justify-between gap-2">
            <Link href={user.role === "admin" ? "/dashboard" : "/"} className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">د</span>
              <span className="font-bold">{t("appName")}</span>
            </Link>
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">{t("demoBadge")}</span>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:flex-col lg:overflow-visible">
            {nav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
          <div className="mt-auto hidden space-y-2 border-t border-border pt-3 text-sm lg:block">
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted">{ROLE_LABELS[user.role][lang]}</div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <form action={toggleLang}>
                <button className="text-brand hover:underline">{t("switchLang")}</button>
              </form>
              <form action={logout}>
                <button className="text-brand hover:underline">{t("logout")}</button>
              </form>
            </div>
            {user.role === "admin" && (
              <form action={resetDemo}>
                <button className="text-xs text-muted hover:underline">{t("resetDemo")}</button>
              </form>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 text-sm lg:hidden">
            <span className="text-muted">
              {user.name} · {ROLE_LABELS[user.role][lang]}
            </span>
            <div className="flex gap-3">
              <form action={toggleLang}>
                <button className="text-brand">{t("switchLang")}</button>
              </form>
              <form action={logout}>
                <button className="text-brand">{t("logout")}</button>
              </form>
            </div>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-5 lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}
