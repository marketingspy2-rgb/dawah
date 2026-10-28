import Link from "next/link";
import { STAGE_LABELS } from "@/lib/i18n";
import type { Level } from "@/lib/logic";
import type { Stage, UiLang } from "@/lib/types";
import { WhatsAppIcon } from "./icons";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ title, action, children, className }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-border bg-surface", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageTitle({ title, subtitle, action }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STAGE_TONE: Record<Stage, string> = {
  new: "bg-surface-2 text-text",
  contacted: "bg-surface-2 text-text",
  interested: "bg-brand-soft text-brand",
  learning: "bg-brand-soft text-brand",
  muslim: "bg-ok-soft text-ok",
  paused: "bg-warn-soft text-warn",
  closed: "bg-surface-2 text-muted",
};

export function StageBadge({ stage, lang }: { stage: Stage; lang: UiLang }) {
  return <span className={cx("inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", STAGE_TONE[stage])}>{STAGE_LABELS[stage][lang]}</span>;
}

const LEVEL_TONE: Record<Level, { dot: string; chip: string }> = {
  green: { dot: "bg-ok", chip: "bg-ok-soft text-ok" },
  yellow: { dot: "bg-warn", chip: "bg-warn-soft text-warn" },
  red: { dot: "bg-bad", chip: "bg-bad-soft text-bad" },
};

export function LevelBadge({ level, label }: { level: Level; label: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", LEVEL_TONE[level].chip)}>
      <span className={cx("size-2 rounded-full", LEVEL_TONE[level].dot)} />
      {label}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "warn" | "bad" | "ok" }) {
  const tones = { neutral: "bg-surface-2 text-muted", brand: "bg-brand-soft text-brand", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", ok: "bg-ok-soft text-ok" };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone])}>{children}</span>;
}

/**
 * Opens the conversation on the center's official number inside the platform,
 * so every message is kept in the file and counted in the metrics.
 */
export function WhatsAppButton({ beneficiaryId, label, context, size = "md" }: { beneficiaryId: string; label?: string; context?: string; size?: "sm" | "md" }) {
  const href = `/chats?b=${beneficiaryId}${context ? `&context=${encodeURIComponent(context)}` : ""}`;
  return (
    <Link
      href={href}
      title={label ?? "WhatsApp"}
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-wa font-medium text-white hover:opacity-90",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
      )}
    >
      <WhatsAppIcon className={size === "sm" ? "size-3.5" : "size-4"} />
      {label && <span>{label}</span>}
    </Link>
  );
}

export function Button({ children, variant = "primary", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const v = {
    primary: "bg-brand text-white hover:opacity-90",
    secondary: "border border-border bg-surface hover:bg-surface-2",
    ghost: "text-brand hover:bg-brand-soft",
  }[variant];
  return (
    <button {...rest} className={cx("inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50", v, className)}>
      {children}
    </button>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-muted">{children}</p>;
}

export function Initials({ name }: { name: string }) {
  const letters = name.replace("🔒", "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("");
  return <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">{letters}</span>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-text";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className={cx("num mt-1 text-2xl font-bold", color)}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

/** Horizontal bar for a 0-100 value. */
export function Bar({ value, tone = "brand" }: { value: number | null; tone?: "brand" | "ok" | "warn" | "bad" }) {
  const color = { brand: "bg-brand", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" }[tone];
  return (
    <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-surface-2">
      <div className={cx("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </div>
  );
}
