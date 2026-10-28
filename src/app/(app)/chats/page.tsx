import Link from "next/link";
import { sendMessage, sendTemplate, simulateReply } from "@/app/actions";
import { Composer, ScrollToBottom, SubmitButton } from "@/components/chat-client";
import { LockIcon } from "@/components/icons";
import { Initials, StageBadge, cx } from "@/components/ui";
import { TEMPLATES, fillTemplate, type TemplateId } from "@/lib/content";
import { readDb } from "@/lib/db";
import { LANG_LABELS, langDir, translator } from "@/lib/i18n";
import { awaitingReply, canOpen, displayName, firstName, formatDate, lastMessage, localTime, messagesOf, relTime, visibleBeneficiaries, windowOpen } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export default async function ChatsPage({ searchParams }: { searchParams: Promise<{ b?: string; context?: string; q?: string }> }) {
  const { b: selectedId, context, q } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();

  const list = visibleBeneficiaries(db, user)
    .map((b) => ({ b, last: lastMessage(db, b.id), waiting: !!awaitingReply(db, b) }))
    .filter(({ b }) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.phone.includes(q))
    .sort((a, c) => (c.last?.at ?? "").localeCompare(a.last?.at ?? ""));

  const selected = selectedId ? db.beneficiaries.find((b) => b.id === selectedId && canOpen(db, user, b)) : undefined;
  const messages = selected ? messagesOf(db, selected.id) : [];
  const open = selected ? windowOpen(db, selected, now) : false;
  const ticks = { sent: "✓", delivered: "✓✓", read: "✓✓" } as const;

  return (
    <div className="grid h-[calc(100vh-140px)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-surface lg:h-[calc(100vh-56px)] lg:grid-cols-[320px_1fr]">
      <aside className={cx("flex min-h-0 flex-col border-border lg:border-e", selected && "hidden lg:flex")}>
        <form className="border-b border-border p-3">
          <input name="q" defaultValue={q} placeholder={t("search")} />
        </form>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {list.map(({ b, last, waiting }) => (
            <li key={b.id}>
              <Link
                href={`/chats?b=${b.id}`}
                className={cx("flex items-center gap-3 border-b border-border px-3 py-2.5 hover:bg-surface-2", b.id === selected?.id && "bg-brand-soft")}
              >
                <Initials name={displayName(db, user, b)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{displayName(db, user, b)}</span>
                    <span className="text-[11px] whitespace-nowrap text-muted">{last ? relTime(last.at, lang, now) : ""}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span dir="auto" className="truncate text-xs text-muted">{last ? last.translation ?? last.text : "—"}</span>
                    {waiting && <span className="size-2.5 shrink-0 rounded-full bg-wa" />}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {selected ? (
        <section className="flex min-h-0 flex-col">
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
            <Link href="/chats" className="text-brand lg:hidden">
              {lang === "ar" ? "→" : "←"}
            </Link>
            <Initials name={displayName(db, user, selected)} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/beneficiaries/${selected.id}`} className="font-semibold hover:underline">
                  {displayName(db, user, selected)}
                </Link>
                <StageBadge stage={selected.stage} lang={lang} />
                {selected.sensitive && <LockIcon className="size-3.5 text-warn" />}
              </div>
              <div className="text-xs text-muted">
                {LANG_LABELS[selected.language][lang]} · {t("localTime")}: {localTime(selected.timezone, lang)}
              </div>
            </div>
            <Link href={`/beneficiaries/${selected.id}`} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
              {t("openFile")}
            </Link>
          </header>

          {context && (
            <div className="border-b border-border bg-warn-soft px-4 py-2 text-sm text-warn">
              <span className="font-semibold">{t("notes")}: </span>
              {context}
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-chat px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={cx("flex", m.direction === "out" ? "justify-end" : "justify-start")}>
                <div className={cx("max-w-[78%] rounded-xl px-3 py-2 shadow-sm", m.direction === "out" ? "bg-bubble-out" : "bg-bubble-in")}>
                  {m.kind === "template" && <div className="mb-0.5 text-[11px] font-medium text-brand">{t("templates")}</div>}
                  {m.kind === "imported" && <div className="mb-0.5 text-[11px] font-medium text-muted">{t("importChat")}</div>}
                  <p dir={langDir(selected.language)} className="text-[15px] whitespace-pre-wrap">
                    {m.text}
                  </p>
                  {m.translation && m.translation !== m.text && (
                    <p dir="rtl" className="mt-1 border-t border-black/5 pt-1 text-xs text-muted">
                      {m.translation}
                    </p>
                  )}
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-muted">
                    {m.direction === "out" && m.authorId && <span>{db.users.find((u) => u.id === m.authorId)?.name.split(" ")[0]} ·</span>}
                    <span>{formatDate(m.at, lang)}</span>
                    {m.status && <span className={m.status === "read" ? "text-sky-600" : ""}>{ticks[m.status]}</span>}
                  </div>
                </div>
              </div>
            ))}
            <ScrollToBottom dep={`${selected.id}-${messages.length}`} />
          </div>

          <footer className="space-y-2 border-t border-border p-3">
            <div className={cx("rounded-lg px-3 py-1.5 text-xs", open ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>{open ? t("windowOpen") : t("windowClosed")}</div>
            <form action={sendMessage}>
              <input type="hidden" name="beneficiaryId" value={selected.id} />
              <Composer placeholder={`${t("typeMessage")} (${LANG_LABELS[selected.language][lang]})`} disabled={!open} sendLabel={t("send")} dir={langDir(selected.language)} />
            </form>
            <details className="text-sm">
              <summary className="cursor-pointer text-brand">{t("templates")}</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => {
                  const vars = { name: firstName(selected), caller: user.name.split(" ")[0] };
                  return (
                    <form key={id} action={sendTemplate} className="flex flex-col gap-1 rounded-lg border border-border p-2">
                      <input type="hidden" name="beneficiaryId" value={selected.id} />
                      <input type="hidden" name="templateId" value={id} />
                      <p dir={langDir(selected.language)} className="text-sm">
                        {fillTemplate(TEMPLATES[id][selected.language], vars)}
                      </p>
                      <p className="text-xs text-muted">{fillTemplate(TEMPLATES[id][lang], vars)}</p>
                      <SubmitButton className="self-end rounded-md bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">{t("send")}</SubmitButton>
                    </form>
                  );
                })}
              </div>
            </details>
            <form action={simulateReply} className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-2">
              <input type="hidden" name="beneficiaryId" value={selected.id} />
              <span className="text-xs text-muted">{t("simulatorNote")}</span>
              <SubmitButton className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-surface-2">{t("simulateReply")}</SubmitButton>
            </form>
          </footer>
        </section>
      ) : (
        <div className="hidden place-items-center bg-chat text-muted lg:grid">{t("noChat")}</div>
      )}
    </div>
  );
}
