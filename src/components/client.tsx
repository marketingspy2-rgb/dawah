"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/** A submit button that shows a spinner while its form is being sent. */
export function PendingButton({ children, className, disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} disabled={pending || disabled} className={className} aria-busy={pending || undefined}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

export function ScrollToBottom({ dep }: { dep: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [dep]);
  return <div ref={ref} />;
}

/** Clears the box after a send and submits on Ctrl/Cmd+Enter. */
export function Composer({ placeholder, disabled, sendLabel, dir }: { placeholder: string; disabled: boolean; sendLabel: string; dir: "ltr" | "rtl" }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && ref.current) ref.current.value = "";
    wasPending.current = pending;
  }, [pending]);
  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={ref}
        name="text"
        rows={1}
        dir={dir}
        disabled={disabled}
        placeholder={placeholder}
        className="max-h-40 min-h-11 flex-1 rounded-2xl! disabled:bg-surface-2"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
        }}
      />
      <button disabled={disabled || pending} className="grid h-11 shrink-0 place-items-center rounded-full bg-wa px-5 text-sm font-medium text-white transition hover:bg-wa-strong disabled:opacity-40">
        {pending ? <Loader2 className="size-4 animate-spin" /> : sendLabel}
      </button>
    </div>
  );
}

/** Icons are passed as rendered elements, since components can't cross to the client. */
export function NavLink({ href, label, badge, icon, tone = "dark" }: { href: string; label: string; badge?: number; icon: React.ReactNode; tone?: "dark" | "light" }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const dark = tone === "dark";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition",
        dark
          ? active
            ? "bg-white/12 font-medium text-white"
            : "text-night-text hover:bg-white/6 hover:text-white"
          : active
            ? "bg-brand font-medium text-white"
            : "bg-surface text-text",
      ].join(" ")}
    >
      <span className={`grid size-[18px] shrink-0 place-items-center [&>svg]:size-[18px] ${dark && !active ? "opacity-70 group-hover:opacity-100" : ""}`}>{icon}</span>
      <span className="flex-1">{label}</span>
      {!!badge && <span className={`num min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold ${active && !dark ? "bg-white/25 text-white" : "bg-gold text-white"}`}>{badge}</span>}
    </Link>
  );
}

/** Marks the lesson as opened once the page is shown (not on prefetch). */
export function MarkOpened({ action }: { action: () => Promise<void> }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void action();
  }, [action]);
  return null;
}

/**
 * The lesson's voice note. In the demo it reads the text aloud with the
 * phone's own voice when one exists for the language, and shows progress either way.
 */
export function VoicePlayer({ text, speechLang, seconds, label, playingLabel }: { text: string; speechLang: string; seconds: number; label: string; playingLabel: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = Math.max(seconds, 20);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  };

  useEffect(() => stop, []);

  const play = () => {
    if (playing) return stop();
    setPlaying(true);
    setProgress(0);
    try {
      const synth = window.speechSynthesis;
      if (synth) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = speechLang;
        u.rate = 0.9;
        u.onend = () => {
          setProgress(100);
          stop();
        };
        const voices = synth.getVoices();
        const voice = voices.find((v) => v.lang.toLowerCase().startsWith(speechLang.slice(0, 2).toLowerCase()));
        if (voice) {
          u.voice = voice;
          synth.speak(u);
        }
      }
    } catch {
      // No voice on this device: the progress bar still runs.
    }
    const started = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / 1000 / Math.min(total, 30)) * 100);
      setProgress(p);
      if (p >= 100) stop();
    }, 200);
  };

  const mm = Math.floor(total / 60);
  const ss = String(total % 60).padStart(2, "0");
  return (
    <button type="button" onClick={play} className="flex w-full items-center gap-4 rounded-3xl bg-wa p-4 text-start text-white shadow-pop transition active:scale-[0.99]">
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white/20">
        {playing ? (
          <svg viewBox="0 0 24 24" className="size-8" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-8 translate-x-0.5" fill="currentColor" aria-hidden>
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-semibold">{playing ? playingLabel : label}</span>
        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-white/25" dir="ltr">
          <span className="block h-full rounded-full bg-white transition-[width]" style={{ width: `${progress}%` }} />
        </span>
        <span className="mt-1 block text-sm opacity-80" dir="ltr">
          {mm}:{ss}
        </span>
      </span>
    </button>
  );
}
