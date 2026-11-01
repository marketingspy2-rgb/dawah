import Link from "next/link";
import type { T } from "@/lib/i18n";
import type { Role } from "@/lib/types";
import { cx } from "./ui";

/** The pages inside one program, shown under its title. */
export function ProgramNav({ program, active, t, counts, role }: { program: "hidaya" | "muslim"; active: string; t: T; counts?: Record<string, number>; role: Role }) {
  const staff = role === "caller" || role === "teacher";
  const items =
    program === "hidaya"
      ? [
          { key: "table", href: "/hidaya", label: t("hidayaTable") },
          { key: "followup", href: "/hidaya/followup", label: t("recontact") },
          { key: "insights", href: "/hidaya/insights", label: t("hidayaInsights") },
        ]
      : [
          { key: "table", href: "/beneficiaries", label: t("muslimTable") },
          { key: "today", href: "/today", label: t("today") },
          { key: "chats", href: "/chats", label: t("chats") },
          { key: "groups", href: "/groups", label: t("groups") },
          ...(role !== "caller"
            ? [
                { key: "schedule", href: "/schedule", label: t("schedule") },
                { key: "lessons", href: "/lessons", label: t("lessons") },
              ]
            : []),
          { key: "share", href: "/share", label: t("addChat") },
          { key: "insights", href: "/insights", label: t("insights") },
          ...(!staff
            ? [
                { key: "dashboard", href: "/dashboard", label: t("dashboard") },
                { key: "rules", href: "/rules", label: t("rules") },
              ]
            : []),
        ];
  return (
    <nav className="scrollbar-none -mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-border px-1">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={cx("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition", active === it.key ? "border-brand font-semibold text-brand" : "border-transparent text-muted hover:text-text")}
        >
          {it.label}
          {counts?.[it.key] ? <span className="num rounded-full bg-warn-soft px-1.5 text-xs text-warn">{counts[it.key]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
