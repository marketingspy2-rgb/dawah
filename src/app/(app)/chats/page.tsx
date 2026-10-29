import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, FileText, MessagesSquare, Search, StickyNote } from "lucide-react";
import { sendLessonNow, sendMessage, sendTemplate, simulateReply } from "@/app/actions";
import { Composer, PendingButton, ScrollToBottom } from "@/components/client";
import { Avatar, Pill, StageBadge, WhatsAppSubmit, cx } from "@/components/ui";
import { TEMPLATES, fillTemplate, type TemplateId } from "@/lib/content";
import { readDb } from "@/lib/db";
import { LANG_LABELS, langDir, translator } from "@/lib/i18n";
import { DAY, awaitingReply, canAct, canOpen, canSeeName, displayName, firstName, formatDate, groupOf, lastInbound, lastMessage, localTime, messagesOf, relTime, visibleBeneficiaries, windowOpen } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const STAFF_TEMPLATES: TemplateId[] = ["checkin", "followup", "new_caller"];

export default async function ChatsPage({ searchParams }: { searchParams: Promise<{ b?: string; context?: string; q?: string; sent?: string }> }) {
  const { b: selectedId, context, q } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();

  const list = visibleBeneficiaries(db, user)
    .filter((b) => b.stage !== "closed")
    .map((b) => ({ b, last: lastMessage(db, b.id), waiting: !!awaitingReply(db, b), name: displayName(db, user, b) }))
    .filter(({ b, name }) => !q || name.toLowerCase().includes(q.toLowerCase()) || (canSeeName(db, user, b) && b.phone.includes(q)))
    .sort((a, c) => Number(c.waiting) - Number(a.waiting) || (c.last?.at ?? "").localeCompare(a.last?.at ?? ""));

  const selected = selectedId ? db.beneficiaries.find((b) => b.id === selectedId && canOpen(db, user, b)) : undefined;
  const messages = selected ? messagesOf(db, selected.id) : [];
  const open = selected ? windowOpen(db, selected, now) : false;
  const writable = selected ? canAct(db, user, selected) : false;
  const until = selected && open ? new Date(new Date(lastInbound(db, selected.id)!.at).getTime() + DAY) : null;
  const group = selected ? groupOf(db, selected) : null;
  const Back = lang === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="-mx-4 -my-6 grid h-[calc(100dvh-108px)] min-h-[520px] grid-cols-1 overflow-hidden bg-surface lg:mx-0 lg:my-0 lg:h-[calc(100dvh-72px)] lg:grid-cols-[340px_minmax(0,1fr)] lg:rounded-2xl lg:border lg:border-border lg:shadow-card">
      <aside className={cx("flex min-h-0 flex-col border-border lg:border-e", selected && "hidden lg:flex")}>
        <div className="border-b border-border p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <h1 className="text-lg font-bold">{t("chats")}</h1>
            <span className="text-[11px] text-muted">{t("officialNumber")}</span>
          </div>
          <form className="relative">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-faint ltr:left-3 rtl:right-3" />
            <input name="q" defaultValue={q} placeholder={t("search")} className="rounded-full! ltr:pl-9! rtl:pr-9!" />
          </form>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {list.map(({ b, last, waiting, name }) => (
            <li key={b.id}>
              <Link href={`/chats?b=${b.id}`} className={cx("flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface-2", b.id === selected?.id && "bg-brand-tint")}>
                <Avatar name={name} size="md" locked={name !== b.name} />
                <div className="min-w-0 flex-1 border-b border-border/60 pb-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span dir="auto" className={cx("truncate", waiting ? "font-semibold" : "font-medium")}>
                      {name}
                    </span>
                    <span className={cx("text-[11px] whitespace-nowrap", waiting ? "font-medium text-wa" : "text-muted")}>{last ? relTime(last.at, lang, now) : ""}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span dir="auto" className="truncate text-xs text-muted">
                      {last?.kind === "lesson" ? `📘 ${t("lessonLink")}` : last ? (last.translation ?? last.text) : "—"}
                    </span>
                    {waiting && <span className="size-2.5 shrink-0 rounded-full bg-wa" />}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {selected ? (
        <section className="flex min-h-0 min-w-0 flex-col">
          <header className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5 lg:px-4">
            <Link href="/chats" aria-label={t("back")} className="grid size-8 place-items-center rounded-full text-brand hover:bg-surface-2 lg:hidden">
              <Back className="size-5" />
            </Link>
            <Avatar name={displayName(db, user, selected)} locked={!canSeeName(db, user, selected)} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/beneficiaries/${selected.id}`} dir="auto" className="truncate font-semibold hover:text-brand">
                  {displayName(db, user, selected)}
                </Link>
                <StageBadge stage={selected.stage} lang={lang} />
                {!writable && <Pill>{t("readOnly")}</Pill>}
              </div>
              <div className="truncate text-xs text-muted">
                {LANG_LABELS[selected.language][lang]} · {t("localTime")} {localTime(selected.timezone, lang)}
                {group ? ` · ${group.name}` : ""}
              </div>
            </div>
            {writable && selected.stage === "muslim" && (
              <form action={sendLessonNow} className="hidden sm:block">
                <input type="hidden" name="beneficiaryId" value={selected.id} />
                <WhatsAppSubmit size="sm" label={t("sendThisLesson")} />
              </form>
            )}
            <Link href={`/beneficiaries/${selected.id}`} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-2">
              <FileText className="size-3.5" />
              <span className="hidden sm:inline">{t("openProfile")}</span>
            </Link>
          </header>

          {context && (
            <div className="flex items-start gap-2 border-b border-warn/20 bg-warn-soft px-4 py-2 text-sm text-warn">
              <StickyNote className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-semibold">{t("fromNote")} </span>
                {context}
              </span>
            </div>
          )}

          <div className="bg-pattern-light min-h-0 flex-1 space-y-2 overflow-y-auto bg-chat px-3 py-4 lg:px-6">
            {messages.map((m) => {
              const out = m.direction === "out";
              const author = m.authorId ? db.users.find((u) => u.id === m.authorId) : null;
              const event = m.eventId ? db.events.find((e) => e.id === m.eventId) : null;
              const lesson = event ? db.lessons.find((l) => l.id === event.lessonId) : null;
              const [before, after] = m.text.split("{link}");
              return (
                <div key={m.id} className={cx("flex", out ? "justify-end" : "justify-start")}>
                  <div className={cx("max-w-[82%] rounded-2xl px-3 py-2 shadow-soft lg:max-w-[70%]", out ? "rounded-ee-md bg-bubble-out" : "rounded-es-md bg-bubble-in")}>
                    {m.kind === "template" && <div className="mb-0.5 text-[11px] font-medium text-brand">{t("templates")}</div>}
                    {m.kind === "imported" && <div className="mb-0.5 text-[11px] font-medium text-muted">{t("importChat")}</div>}
                    <p dir={langDir(selected.language)} className="text-[15px] whitespace-pre-wrap">
                      {before.trim()}
                    </p>
                    {m.kind === "lesson" && event && (
                      <Link href={`/l/${event.id}`} target="_blank" className="mt-2 flex items-center gap-3 rounded-xl bg-white/70 p-2.5 ring-1 ring-black/5 transition hover:bg-white">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-white">
                          <BookOpen className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span dir="auto" className="block truncate text-sm font-semibold">
                            {lesson?.title[selected.language] ?? lesson?.title.en}
                          </span>
                          <span className="block text-[11px] text-muted" dir="ltr">
                            dawah.example/l/{event.id.slice(3, 9)}…
                          </span>
                        </span>
                        <span className={cx("shrink-0 text-[11px] font-medium", event.completedAt ? "text-ok" : event.openedAt ? "text-info" : "text-muted")}>
                          {event.completedAt ? t("completedTimes") : event.openedAt ? t("openedTimes") : t("sent")}
                        </span>
                      </Link>
                    )}
                    {after?.trim() && (
                      <p dir={langDir(selected.language)} className="text-[15px] whitespace-pre-wrap">
                        {after.trim()}
                      </p>
                    )}
                    {m.translation && m.translation !== m.text && (
                      <p dir="rtl" className="mt-1 border-t border-black/5 pt-1 text-xs text-muted">
                        {m.translation.replace("{link}", "").trim()}
                      </p>
                    )}
                    <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-muted">
                      {out && author && <span>{author.name.split(" ")[0]} ·</span>}
                      <span>{formatDate(m.at, lang)}</span>
                      {m.status && <Ticks status={m.status} />}
                    </div>
                  </div>
                </div>
              );
            })}
            <ScrollToBottom dep={`${selected.id}-${messages.length}`} />
          </div>

          {writable ? (
            <footer className="space-y-2 border-t border-border bg-surface p-3">
              <div className={cx("rounded-lg px-3 py-1.5 text-xs", open ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>
                {open && until ? t("windowOpen", { when: formatDate(until.getTime(), lang) }) : t("windowClosed")}
              </div>
              <form action={sendMessage}>
                <input type="hidden" name="beneficiaryId" value={selected.id} />
                <Composer placeholder={`${t("typeMessage")} (${LANG_LABELS[selected.language][lang]})`} disabled={!open} sendLabel={t("send")} dir={langDir(selected.language)} />
              </form>
              <details className="group text-sm" open={!open}>
                <summary className="cursor-pointer list-none text-xs font-medium text-brand">
                  {t("templates")} <span className="text-muted group-open:hidden">▾</span>
                </summary>
                <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto pb-1">
                  {STAFF_TEMPLATES.map((id) => {
                    const vars = { name: firstName(selected), caller: user.name.split(" ")[0] };
                    return (
                      <form key={id} action={sendTemplate} className="flex w-64 shrink-0 flex-col gap-1 rounded-xl border border-border bg-surface-2/50 p-2.5">
                        <input type="hidden" name="beneficiaryId" value={selected.id} />
                        <input type="hidden" name="templateId" value={id} />
                        <p dir={langDir(selected.language)} className="line-clamp-3 text-sm">
                          {fillTemplate(TEMPLATES[id][selected.language], vars)}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted">{fillTemplate(TEMPLATES[id][lang], vars)}</p>
                        <WhatsAppSubmit size="sm" label={t("send")} className="mt-auto self-end" />
                      </form>
                    );
                  })}
                </div>
              </details>
              <form action={simulateReply} className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-2">
                <input type="hidden" name="beneficiaryId" value={selected.id} />
                <span className="text-[11px] text-muted">{t("simulatorNote")}</span>
                <PendingButton className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-2">{t("simulateReply")}</PendingButton>
              </form>
            </footer>
          ) : (
            <footer className="border-t border-border bg-surface-2 p-3 text-center text-xs text-muted">{t("readOnlyChat")}</footer>
          )}
        </section>
      ) : (
        <div className="bg-pattern-light hidden place-items-center bg-chat text-muted lg:grid">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-surface shadow-card">
              <MessagesSquare className="size-7 text-brand" />
            </span>
            <span className="text-sm">{t("pickChat")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Ticks({ status }: { status: "sent" | "delivered" | "read" }) {
  return (
    <svg viewBox="0 0 18 12" className={cx("h-3 w-4", status === "read" ? "text-sky-600" : "text-muted")} fill="none" stroke="currentColor" strokeWidth="1.6" aria-label={status}>
      <path d="M1 6.5 4.5 10 11 2" />
      {status !== "sent" && <path d="M7 10 7.5 10.5 17 2" />}
    </svg>
  );
}
