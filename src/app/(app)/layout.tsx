import Link from "next/link";
import { BarChart3, BookOpen, CalendarClock, Home, Languages, LogOut, MessagesSquare, Network, RotateCcw, Users, UsersRound } from "lucide-react";
import { logout, resetDemo, toggleLang } from "@/app/actions";
import { NavLink } from "@/components/client";
import { Avatar } from "@/components/ui";
import { mutate, readDb } from "@/lib/db";
import { roleLabel, translator } from "@/lib/i18n";
import { HOUR, awaitingReply, isStaff, openTasks, teamOf, upcoming, visibleBeneficiaries } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Item = { href: string; label: string; icon: React.ReactNode; badge?: number };

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
  const lessonsSoon = upcoming(db, mine, now, 1).filter((s) => s.at < now + 24 * HOUR).length;

  const i = (Icon: typeof Home) => <Icon strokeWidth={1.9} />;
  const staff = isStaff(user);
  const sections: { label: string; items: Item[] }[] = [
    {
      label: t("navWork"),
      items: [
        { href: "/", label: staff ? t("today") : t("overview"), icon: i(Home), badge: staff ? overdue : undefined },
        { href: "/chats", label: t("chats"), icon: i(MessagesSquare), badge: waiting },
        { href: "/groups", label: staff ? t("myGroups") : t("groups"), icon: i(UsersRound) },
        { href: "/beneficiaries", label: t("beneficiaries"), icon: i(Users) },
      ],
    },
    ...(user.role !== "caller"
      ? [
          {
            label: t("navTeaching"),
            items: [
              { href: "/schedule", label: t("schedule"), icon: i(CalendarClock), badge: lessonsSoon },
              { href: "/lessons", label: t("lessons"), icon: i(BookOpen) },
            ],
          },
        ]
      : []),
    ...(!staff
      ? [
          {
            label: t("navManage"),
            items: [
              { href: "/team", label: t("structure"), icon: i(Network) },
              { href: "/dashboard", label: t("dashboard"), icon: i(BarChart3) },
            ],
          },
        ]
      : []),
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
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {sections.map((s) => (
            <div key={s.label}>
              <div className="mb-1.5 px-3 text-[11px] font-medium tracking-wide text-night-text/60">{s.label}</div>
              <div className="space-y-0.5">
                {s.items.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            </div>
          ))}
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
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
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
        <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2">
          {sections.flatMap((s) => s.items).map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-10 lg:py-9">{children}</main>
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
