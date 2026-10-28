"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export function ScrollToBottom({ dep }: { dep: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [dep]);
  return <div ref={ref} />;
}

export function SubmitButton({ children, className, disabled }: { children: React.ReactNode; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className={className}>
      {pending ? "…" : children}
    </button>
  );
}

/** Clears the textarea after a send and submits on Ctrl/Cmd+Enter. */
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
        rows={2}
        dir={dir}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-11 flex-1 disabled:bg-surface-2"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
        }}
      />
      <button disabled={disabled || pending} className="rounded-lg bg-wa px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">
        {pending ? "…" : sendLabel}
      </button>
    </div>
  );
}
