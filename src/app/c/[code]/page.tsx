import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { captureSubmit } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { CAPTURE_UI, sourceByCode } from "@/lib/capture";
import { loadDb } from "@/lib/db";
import { featureOn } from "@/lib/features";
import { LANG_NATIVE, langDir } from "@/lib/i18n";
import { LANGS, type Lang } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "👋", robots: { index: false } };

/**
 * The page a QR code or capture link opens. No login and no menus: pick a language,
 * leave a name and a WhatsApp number, and a caller who speaks it gets in touch.
 */
export default async function CapturePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ lang?: string; done?: string; err?: string }> }) {
  const { code } = await params;
  const { lang: langParam, done, err } = await searchParams;
  const db = await loadDb();
  const source = sourceByCode(db, code);
  if (!source || !featureOn(db, "captureLinks")) notFound();
  const lang = LANGS.includes(langParam as Lang) ? (langParam as Lang) : null;
  const ui = lang ? CAPTURE_UI[lang] : null;

  return (
    <main className="bg-pattern-light min-h-dvh bg-bg px-4 pt-8 pb-12">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-pop">
            <svg viewBox="0 0 32 32" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M16 3l3.7 9.1L29 16l-9.3 3.9L16 29l-3.7-9.1L3 16l9.3-3.9z" />
            </svg>
          </span>
        </div>

        {!lang || !ui ? (
          // Step one: the language, shown in each language's own script.
          <div className="grid grid-cols-2 gap-3">
            {LANGS.map((l) => (
              <Link key={l} href={`/c/${code}?lang=${l}`} lang={l} dir={langDir(l)} className="rounded-2xl border border-border bg-surface px-4 py-5 text-center text-lg font-semibold shadow-card transition hover:border-brand">
                {LANG_NATIVE[l]}
              </Link>
            ))}
          </div>
        ) : done ? (
          <div lang={lang} dir={langDir(lang)} className="rounded-3xl border border-border bg-surface p-8 text-center shadow-card">
            <div className="mb-3 text-4xl">🤝</div>
            <h1 className="text-2xl font-bold">{ui.thanks}</h1>
            <p className="mt-2 text-muted">{ui.thanksSub}</p>
          </div>
        ) : (
          <form action={captureSubmit.bind(null, code)} lang={lang} dir={langDir(lang)} className="space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-card">
            <input type="hidden" name="lang" value={lang} />
            <div>
              <h1 className="text-xl font-bold">{ui.title}</h1>
              <p className="mt-1 text-sm text-muted">{ui.sub}</p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{ui.name}</span>
              <input name="name" required maxLength={80} autoComplete="name" className={err ? "border-bad!" : undefined} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{ui.phone}</span>
              <input name="phone" required type="tel" inputMode="tel" dir="ltr" placeholder="+63 9xx xxx xxxx" autoComplete="tel" className={err ? "border-bad!" : undefined} />
            </label>
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium">{ui.gender}</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["m", ui.male],
                    ["f", ui.female],
                  ] as const
                ).map(([v, label]) => (
                  <label key={v} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border py-3 has-checked:border-brand has-checked:bg-brand-soft has-checked:font-semibold">
                    <input type="radio" name="gender" value={v} defaultChecked={v === "m"} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{ui.message}</span>
              <textarea name="message" rows={3} maxLength={600} />
            </label>
            <PendingButton className="w-full rounded-xl bg-brand py-3 text-base font-semibold text-white hover:bg-brand-strong">{ui.send}</PendingButton>
            <p className="text-xs text-muted">{ui.consent}</p>
          </form>
        )}
      </div>
    </main>
  );
}
