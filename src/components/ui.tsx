import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STAGE_LABELS, roleLabel } from "@/lib/i18n";
import type { Level } from "@/lib/logic";
import type { LessonEvent, Role, Stage, UiLang } from "@/lib/types";
import { LockIcon, WhatsAppIcon } from "./icons";
import { PendingButton } from "./client";

export function cx(...parts: (string | false | null | undefined | 0)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  title,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
  tone,
}: {
  title?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  tone?: "warn" | "bad" | "brand";
}) {
  const accent = tone === "bad" ? "text-bad bg-bad-soft" : tone === "warn" ? "text-warn bg-warn-soft" : "text-brand bg-brand-soft";
  return (
    <section className={cx("animate-rise min-w-0 rounded-2xl border border-border bg-surface shadow-card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
            {Icon && (
              <span className={cx("grid size-7 place-items-center rounded-lg", accent)}>
                <Icon className="size-4" strokeWidth={2} />
              </span>
            )}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={cx("px-5 pb-5", !(title || action) && "pt-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  crumbs,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && <Crumbs items={crumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-xs font-medium tracking-wide text-gold">{eyebrow}</div>}
          <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Crumbs({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted">
      {items.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          {i > 0 && (
            <>
              <ChevronLeft className="size-3.5 rtl:inline ltr:hidden" />
              <ChevronRight className="size-3.5 rtl:hidden ltr:inline" />
            </>
          )}
          <Link href={c.href} className="rounded px-1 hover:bg-surface-2 hover:text-text">
            {c.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

const STAGE_TONE: Record<Stage, string> = {
  new: "bg-info-soft text-info",
  contacted: "bg-surface-2 text-text",
  interested: "bg-violet-soft text-violet",
  learning: "bg-brand-soft text-brand",
  muslim: "bg-ok-soft text-ok",
  paused: "bg-warn-soft text-warn",
  closed: "bg-surface-2 text-muted",
};

export function StageBadge({ stage, lang }: { stage: Stage; lang: UiLang }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", STAGE_TONE[stage])}>{STAGE_LABELS[stage][lang]}</span>;
}

const LEVEL_TONE: Record<Level, { dot: string; chip: string }> = {
  green: { dot: "bg-ok", chip: "bg-ok-soft text-ok" },
  yellow: { dot: "bg-warn", chip: "bg-warn-soft text-warn" },
  red: { dot: "bg-bad", chip: "bg-bad-soft text-bad" },
};

export function LevelBadge({ level, label }: { level: Level; label: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", LEVEL_TONE[level].chip)}>
      <span className={cx("size-1.5 rounded-full", LEVEL_TONE[level].dot)} />
      {label}
    </span>
  );
}

export type Tone = "neutral" | "brand" | "warn" | "bad" | "ok" | "info" | "gold" | "violet";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  brand: "bg-brand-soft text-brand",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  ok: "bg-ok-soft text-ok",
  info: "bg-info-soft text-info",
  gold: "bg-gold-soft text-gold",
  violet: "bg-violet-soft text-violet",
};

export function Pill({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", TONES[tone], className)}>{children}</span>;
}

export function RoleBadge({ role, gender, lang }: { role: Role; gender: "m" | "f"; lang: UiLang }) {
  const tone: Tone = role === "teacher" ? "violet" : role === "caller" ? "info" : role === "supervisor" ? "gold" : "brand";
  return <Pill tone={tone}>{roleLabel(role, gender, lang)}</Pill>;
}

const AVATAR_TONES = ["bg-brand-soft text-brand", "bg-gold-soft text-gold", "bg-info-soft text-info", "bg-violet-soft text-violet", "bg-ok-soft text-ok", "bg-warn-soft text-warn"];

export function Avatar({ name, size = "md", locked }: { name: string; size?: "sm" | "md" | "lg"; locked?: boolean }) {
  const clean = name.replace(/[()]/g, "").trim();
  const letters = clean.split(/\s+/).slice(0, 2).map((p) => p[0]).join("");
  let h = 0;
  for (const ch of clean) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const tone = AVATAR_TONES[h % AVATAR_TONES.length];
  const dims = size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-14 text-lg" : "size-10 text-sm";
  return <span className={cx("grid shrink-0 place-items-center rounded-full font-semibold", dims, locked ? "bg-surface-3 text-muted" : tone)}>{locked ? <LockIcon /> : letters}</span>;
}

/** Name of a beneficiary, with a lock when it is hidden. */
export function PersonName({ name, hidden, href, className }: { name: string; hidden?: boolean; href?: string; className?: string }) {
  const inner = (
    <span className={cx("inline-flex items-center gap-1", className)}>
      {hidden && <LockIcon className="size-3.5 text-muted" />}
      <span dir="auto">{name}</span>
    </span>
  );
  return href ? (
    <Link href={href} className="font-medium hover:text-brand">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** Opens the conversation on the center's official number inside the platform. */
export function WhatsAppLink({ beneficiaryId, label, context, size = "md", className }: { beneficiaryId: string; label?: string; context?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const href = `/chats?b=${beneficiaryId}${context ? `&context=${encodeURIComponent(context)}` : ""}`;
  return (
    <Link href={href} title={label ?? "WhatsApp"} className={cx(waClass(size, !label), className)}>
      <WhatsAppIcon className={size === "sm" ? "size-3.5" : "size-4"} />
      {label && <span>{label}</span>}
    </Link>
  );
}

function waClass(size: "sm" | "md" | "lg", iconOnly: boolean) {
  return cx(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-wa font-medium text-white shadow-soft transition hover:bg-wa-strong active:scale-[0.98] disabled:opacity-50",
    size === "sm" ? (iconOnly ? "size-8" : "h-8 px-3 text-xs") : size === "lg" ? "h-11 px-5 text-[15px]" : iconOnly ? "size-9" : "h-9 px-4 text-sm",
  );
}

/** A form button that sends something through the official WhatsApp number. */
export function WhatsAppSubmit({ label, size = "md", className, disabled }: { label?: string; size?: "sm" | "md" | "lg"; className?: string; disabled?: boolean }) {
  return (
    <PendingButton className={cx(waClass(size, !label), className)} disabled={disabled} title={label ?? "WhatsApp"}>
      <WhatsAppIcon className={size === "sm" ? "size-3.5" : "size-4"} />
      {label && <span>{label}</span>}
    </PendingButton>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md") {
  const v = {
    primary: "bg-brand text-white hover:bg-brand-strong shadow-soft",
    secondary: "border border-border-strong bg-surface text-text hover:bg-surface-2",
    ghost: "text-brand hover:bg-brand-soft",
    danger: "bg-bad text-white hover:opacity-90",
  }[variant];
  return cx("inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-50", size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-4 text-sm", v);
}

export function Button({ children, variant = "primary", size = "md", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <PendingButton {...rest} className={cx(buttonClass(variant, size), className)}>
      {children}
    </PendingButton>
  );
}

export function LinkButton({ href, children, variant = "primary", size = "md", className }: { href: string; children: React.ReactNode; variant?: ButtonVariant; size?: "sm" | "md"; className?: string }) {
  return (
    <Link href={href} className={cx(buttonClass(variant, size), className)}>
      {children}
    </Link>
  );
}

export function Empty({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-surface-2/60 px-4 py-6 text-center text-sm text-muted">
      {Icon && <Icon className="size-5 text-faint" />}
      <div>{children}</div>
    </div>
  );
}

export function Stat({ icon: Icon, label, value, hint, tone, href }: { icon?: LucideIcon; label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "ok" | "warn" | "bad" | "brand"; href?: string }) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-text";
  const iconTone = tone === "bad" ? "bg-bad-soft text-bad" : tone === "warn" ? "bg-warn-soft text-warn" : tone === "ok" ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand";
  const body = (
    <div className="flex h-full items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:border-border-strong">
      <div className="min-w-0">
        <div className="text-[13px] text-muted">{label}</div>
        <div className={cx("num mt-1 text-[26px] leading-tight font-bold", color)}>{value}</div>
        {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      </div>
      {Icon && (
        <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl", iconTone)}>
          <Icon className="size-[18px]" />
        </span>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Horizontal bar for a 0-100 value. */
export function Bar({ value, tone = "brand", className }: { value: number | null; tone?: "brand" | "ok" | "warn" | "bad" | "gold"; className?: string }) {
  const color = { brand: "bg-brand", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", gold: "bg-gold" }[tone];
  return (
    <div className={cx("h-2 w-full min-w-16 overflow-hidden rounded-full bg-surface-3", className)}>
      <div className={cx("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </div>
  );
}

/** One dot per lesson: done, done with a wrong answer, sent and waiting, or not yet. */
export function LessonDots({ total, events, lessonIds }: { total: number; events: LessonEvent[]; lessonIds: string[] }) {
  const byLesson = new Map(events.map((e) => [e.lessonId, e]));
  return (
    <span className="inline-flex items-center gap-1" dir="ltr">
      {lessonIds.slice(0, total).map((id) => {
        const e = byLesson.get(id);
        const cls = !e
          ? "bg-surface-3"
          : e.completedAt
            ? e.correct === false
              ? "bg-warn"
              : "bg-ok"
            : "bg-surface ring-2 ring-info ring-inset";
        return <span key={id} className={cx("size-2.5 rounded-full", cls)} />;
      })}
    </span>
  );
}

export function Tabs({ items, active }: { items: { key: string; href: string; label: string; count?: number }[]; active: string }) {
  return (
    <div className="scrollbar-none -mx-1 mb-5 flex gap-1 overflow-x-auto px-1">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className={cx(
            "flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm whitespace-nowrap transition",
            active === it.key ? "border-brand bg-brand text-white" : "border-border bg-surface text-text hover:border-border-strong",
          )}
        >
          {it.label}
          {it.count !== undefined && <span className={cx("num rounded-full px-1.5 text-xs", active === it.key ? "bg-white/20" : "bg-surface-2 text-muted")}>{it.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-text">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Notice({ tone = "ok", children }: { tone?: "ok" | "warn" | "bad" | "info"; children: React.ReactNode }) {
  const t = { ok: "border-ok/25 bg-ok-soft text-ok", warn: "border-warn/25 bg-warn-soft text-warn", bad: "border-bad/25 bg-bad-soft text-bad", info: "border-info/25 bg-info-soft text-info" }[tone];
  return <div className={cx("animate-rise mb-5 rounded-xl border px-4 py-3 text-sm font-medium", t)}>{children}</div>;
}
