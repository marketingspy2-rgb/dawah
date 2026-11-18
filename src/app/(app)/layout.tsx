import Link from "next/link";
import { cookies } from "next/headers";
import { Grid2x2, Home, Languages, LogOut, MessagesSquare, RotateCcw, UsersRound } from "lucide-react";
import { logout, resetDemo, toggleLang } from "@/app/actions";
import { MainNav, type MainNavItem } from "@/components/client";
import { Avatar } from "@/components/ui";
import { mutate, readDb } from "@/lib/db";
import { featureOn } from "@/lib/features";
import { roleLabel, translator } from "@/lib/i18n";
import { awaitingReply, isStaff, openTasks, teamOf, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import { LATEST_UPDATE } from "@/lib/updates";

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
  const now = Date.now();
  const mine = visibleBeneficiaries(db, user).filter((b) => user.role !== "caller" || b.assignedTo === user.id);
  const waiting = mine.filter((b) => awaitingReply(db, b)).length;
  const overdue = openTasks(db).filter((task) => task.assigneeId === user.id && new Date(task.due).getTime() < now).length;
  const unseenUpdate = featureOn(db, "updates") && (await cookies()).get("dawah_seen_update")?.value !== LATEST_UPDATE;
  const pendingShares = db.shares.filter((s) => s.userId === user.id).length;

  // Four places only. Everything else opens from "More".
  const nav: MainNavItem[] = [
    { key: "today", href: "/", label: t("navToday"), icon: <Home strokeWidth={1.9} />, badge: isStaff(user) ? overdue || undefined : undefined, match: ["/", "/today"] },
    { key: "chats", href: "/chats", label: t("navChats"), icon: <MessagesSquare strokeWidth={1.9} />, badge: waiting + pendingShares || undefined, match: ["/chats", "/share"] },
    { key: "people", href: "/people", label: t("navPeople"), icon: <UsersRound strokeWidth={1.9} />, match: ["/people", "/hidaya", "/beneficiaries", "/groups"] },
    { key: "more", href: "/more", label: t("navMore"), icon: <Grid2x2 strokeWidth={1.9} />, dot: unseenUpdate, match: ["/more"] },
  ];
  const team = teamOf(db, user);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="bg-pattern hidden bg-night text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <Logo />
          <div className="min-w-0">
            <div className="font-bold leading-tight">{t("appName")}</div>
            <div className="text-[11px] text-night-text/80">{t("appTagline")}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <MainNav items={nav} variant="sidebar" />
        </nav>
        <div className="m-3 rounded-2xl bg-white/6 p-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-[11px] text-night-text/80">
                {roleLabel(user.role, user.gender, lang)}
                {team ? ` · ${team.name}` : ""}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 border-t border-white/10 pt-2 text-xs">
            <form action={toggleLang}>
              <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-night-text hover:bg-white/8 hover:text-white">
                <Languages className="size-3.5" />
                {t("switchLang")}
              </button>
            </form>
            <form action={logout} className="ms-auto">
              <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-night-text hover:bg-white/8 hover:text-white">
                <LogOut className="size-3.5 rtl:-scale-x-100" />
                {t("logout")}
              </button>
            </form>
          </div>
          {user.role === "admin" && (
            <form action={resetDemo}>
              <button className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-night-text/60 hover:text-white">
                <RotateCcw className="size-3" />
                {t("resetDemo")}
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <header className="bg-pattern sticky top-0 z-30 bg-night text-white lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Logo small />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-[11px] text-night-text/80">{roleLabel(user.role, user.gender, lang)}</div>
          </div>
          <form action={toggleLang}>
            <button className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs">{t("switchLang")}</button>
          </form>
          <form action={logout}>
            <button aria-label={t("logout")} className="grid size-8 place-items-center rounded-lg bg-white/10">
              <LogOut className="size-4 rtl:-scale-x-100" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-24 lg:px-10 lg:py-9">{children}</main>

      {/* Phone tab bar: the same four places, always in reach of the thumb */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <MainNav items={nav} variant="tabbar" />
      </nav>
    </div>
  );
}

function Logo({ small }: { small?: boolean }) {
  return (
    <Link href="/" className={`grid shrink-0 place-items-center rounded-xl bg-gold text-white shadow-pop ${small ? "size-9" : "size-11"}`}>
      <svg viewBox="0 0 32 32" className={small ? "size-5" : "size-6"} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M16 3l3.7 9.1L29 16l-9.3 3.9L16 29l-3.7-9.1L3 16l9.3-3.9z" />
        <circle cx="16" cy="16" r="3.2" />
      </svg>
    </Link>
  );
}
