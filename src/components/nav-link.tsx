"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, badge }: { href: string; label: string; badge?: number }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
        active ? "bg-brand text-white" : "text-text hover:bg-surface-2"
      }`}
    >
      <span>{label}</span>
      {!!badge && (
        <span className={`num min-w-5 rounded-full px-1.5 text-center text-xs font-semibold ${active ? "bg-white/25" : "bg-bad text-white"}`}>{badge}</span>
      )}
    </Link>
  );
}
