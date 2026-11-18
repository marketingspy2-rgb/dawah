import Link from "next/link";
import { featureOn } from "@/lib/features";
import type { T } from "@/lib/i18n";
import type { DB, Role } from "@/lib/types";
import { cx } from "./ui";

/**
 * The top of "People": a switch between the two programs, then the few pages inside
 * the chosen one. Everything that is not about the list of people lives in "More".
 */
export function ProgramNav({ program, active, t, counts, role, db }: { program: "hidaya" | "muslim"; active: string; t: T; counts?: Record<string, number>; role: Role; db?: DB }) {
  const on = (key: string) => !db || featureOn(db, key);
  const items =
    program === "hidaya"
      ? [
          { key: "table", href: "/hidaya", label: t("hidayaTable") },
          ...(on("recontact") && role !== "teacher" ? [{ key: "followup", href: "/hidaya/followup", label: t("recontact") }] : []),
          ...(on("hidayaInsights") ? [{ key: "insights", href: "/hidaya/insights", label: t("hidayaInsights") }] : []),
        ]
      : [
          { key: "table", href: "/beneficiaries", label: t("muslimTable") },
          ...(on("groups") ? [{ key: "groups", href: "/groups", label: t("groups") }] : []),
        ];
  return (
    <div className="mb-5">
      <div className="mb-3 inline-flex rounded-xl bg-surface-2 p-1 text-sm">
        {(
          [
            ["hidaya", "/hidaya", t("hidaya")],
            ["muslim", "/beneficiaries", t("newMuslim")],
          ] as const
        ).map(([key, href, label]) => (
          <Link
            key={key}
            href={href}
            aria-current={program === key ? "page" : undefined}
            className={cx("rounded-lg px-4 py-1.5 transition", program === key ? "bg-surface font-semibold text-text shadow-soft" : "text-muted hover:text-text")}
          >
            {label}
          </Link>
        ))}
      </div>
      {items.length > 1 && (
        <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
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
      )}
    </div>
  );
}
