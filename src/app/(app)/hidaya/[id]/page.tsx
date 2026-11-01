import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ClipboardList, Eye, History, NotebookPen, PencilLine, Sprout, StickyNote, Tags, UserSearch } from "lucide-react";
import { addNote, convertHidaya, logHidaya, setHidayaCategory, undoHidayaLog, updateHidaya } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { CategoryChip, FOLLOWUP_ICONS, FollowupMarks, HijriInput, ListSelect, ResultChip } from "@/components/fields";
import { CommonFields, HidayaFields, ProfileFields } from "@/components/person-forms";
import { Avatar, Button, Card, Crumbs, Empty, Field, Notice, Pill, WhatsAppLink, cx } from "@/components/ui";
import { mutate, newId, readDb } from "@/lib/db";
import { daysBetween, formatGregorian, formatHijri, isoDay } from "@/lib/hijri";
import { translator } from "@/lib/i18n";
import { canAct, canOpen, canSeeName, displayName, relTime, staffUnder } from "@/lib/logic";
import { F, FOLLOWUP_LABELS, MIN_VISITS, recontactDays, recontactReasons } from "@/lib/programs";
import { LOG_KEYS, reasonText } from "@/components/reasons";
import { getUiLang, requireUser } from "@/lib/session";
import { HIDAYA_FOLLOWUPS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HidayaFilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string; saved?: string; logged?: string }> }) {
  const { id } = await params;
  const { added, saved, logged } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const found = readDb().beneficiaries.find((x) => x.id === id);
  if (!found?.hidaya || !canOpen(readDb(), user, found)) notFound();
  await mutate((d) => {
    d.audit.unshift({ id: newId("AU"), userId: user.id, action: "open_file", target: id, at: new Date().toISOString() });
  });
  const db = readDb();
  const b = db.beneficiaries.find((x) => x.id === id)!;
  const h = b.hidaya!;
  const today = isoDay();
  const converted = b.program === "muslim";
  const actable = canAct(db, user, b) && !converted;
  const name = displayName(db, user, b);
  const showReal = canSeeName(db, user, b);
  const owner = db.users.find((u) => u.id === (converted ? (b.introducedBy ?? b.assignedTo) : b.assignedTo));
  const lists = db.settings.lists;
  const logs = db.hidayaLogs.filter((l) => l.beneficiaryId === b.id).sort((a, c) => c.at.localeCompare(a.at));
  const notes = db.notes.filter((n) => n.beneficiaryId === b.id).sort((a, c) => c.at.localeCompare(a.at));
  const reasons = recontactReasons(db, b, today);
  const userName = (uid: string | null) => db.users.find((u) => u.id === uid)?.name ?? "—";
  const callers = user.role === "caller" ? db.users.filter((u) => u.role === "caller" && (u.id === user.id || u.teamId === user.teamId)) : staffUnder(db, user).filter((u) => u.role === "caller");
  if (owner && !callers.some((c) => c.id === owner.id)) callers.unshift(owner);
  const ctx = { db, lang, t };
  const now = Date.now();

  return (
    <>
      {added && <Notice tone="ok">{t("hidayaAdded")}</Notice>}
      {saved && <Notice tone="ok">{t("savedOk")}</Notice>}
      {logged && <Notice tone="ok">{t("hidayaLogged", { kind: FOLLOWUP_LABELS[logged as keyof typeof FOLLOWUP_LABELS]?.[lang] ?? "" })}</Notice>}
      <Crumbs items={[{ href: "/hidaya", label: t("hidaya") }]} />

      <section className="animate-rise mb-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="bg-pattern-light flex flex-wrap items-start gap-4 bg-brand-tint p-5">
          <Avatar name={name} size="lg" locked={!showReal} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num rounded-lg bg-surface px-2 py-0.5 text-xs text-muted shadow-soft">
                {F.serial[lang]} {h.serial}
              </span>
              <h1 dir="auto" className="text-2xl font-bold">
                {name}
              </h1>
              <CategoryChip value={h.category} options={lists.category} />
              <ResultChip value={h.result} />
              {!actable && !converted && (
                <Pill>
                  <Eye className="size-3" /> {t("readOnly")}
                </Pill>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {[b.nationality, b.languageLabel, b.gender === "f" ? t("female") : t("male"), b.city, [b.profession, b.workplace].filter(Boolean).join(" · ")].filter(Boolean).map((x) => (
                <span key={x}>{x}</span>
              ))}
              {showReal && (
                <span dir="ltr" className="num">
                  {b.phone}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 shadow-soft">
                <span className="text-muted">{F.callerFollow[lang]}:</span>
                <span className="font-medium">{owner?.name ?? "—"}</span>
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 shadow-soft">
                <span className="text-muted">{F.followup[lang]}:</span>
                <FollowupMarks followup={h.followup} lang={lang} />
                <span className={cx("num text-xs", h.visits < MIN_VISITS ? "text-warn" : "text-ok")}>
                  {t("visitsOf", { n: h.visits, min: MIN_VISITS })}
                </span>
              </span>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-col sm:items-stretch">
            {showReal && b.phone && (
              <a href={`tel:${b.phone}`} className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-border-strong bg-surface px-5 text-[15px] font-medium hover:bg-surface-2">
                {t("callNow")}
              </a>
            )}
            {canAct(db, user, b) && <WhatsAppLink beneficiaryId={b.id} size="lg" label={t("openChat")} />}
          </div>
        </div>
      </section>

      {converted && (
        <Notice tone="ok">
          {t("hidayaConvertedNotice", { date: formatHijri(b.muslim?.islamDate, lang) })}{" "}
          <Link href={`/beneficiaries/${b.id}`} className="font-semibold underline">
            {t("openMuslimFile")}
          </Link>
        </Notice>
      )}
      {!converted && reasons.length > 0 && (
        <div className="animate-rise mb-5 flex items-start gap-3 rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="font-semibold">{t("needsContactAgain")}</div>
            <ul className="mt-0.5">
              {reasons.map((r, i) => (
                <li key={i}>{reasonText(r, lang, t)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {actable && (
            <Card title={t("logContact")} icon={NotebookPen} action={<span className="hidden text-xs text-muted sm:block">{t("logContactHint")}</span>}>
              <form action={logHidaya} className="space-y-3">
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <textarea name="note" rows={2} placeholder={t("contactNote")} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={F.result[lang]}>
                    <ListSelect name="result" options={lists.result} value={h.result} lang={lang} />
                  </Field>
                  <Field label={F.nextContact[lang]} hint={t("nextContactHint", { n: recontactDays(db, h.category) })}>
                    <HijriInput name="nextContact" value={null} lang={lang} empty />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {HIDAYA_FOLLOWUPS.map((k) => {
                    const Icon = FOLLOWUP_ICONS[k];
                    return (
                      <PendingButton key={k} name="kind" value={k} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface text-sm font-medium transition hover:border-brand hover:bg-brand-soft hover:text-brand">
                        <Icon className="size-4" />
                        {t(LOG_KEYS[k])}
                      </PendingButton>
                    );
                  })}
                </div>
              </form>
            </Card>
          )}

          <Card title={t("contactHistory")} icon={History} action={<span className="num text-xs text-muted">{logs.length}</span>}>
            {logs.length ? (
              <ol className="relative space-y-3 border-s-2 border-border ps-4 text-sm">
                {logs.map((l, i) => {
                  const Icon = FOLLOWUP_ICONS[l.kind];
                  const undoable = i === 0 && l.userId === user.id && now - new Date(l.at).getTime() < 10 * 60_000;
                  return (
                    <li key={l.id} className="relative">
                      <span className="absolute top-1 grid size-5 place-items-center rounded-full bg-brand-soft text-brand ltr:-left-[27px] rtl:-right-[27px]">
                        <Icon className="size-3" />
                      </span>
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium">{FOLLOWUP_LABELS[l.kind][lang]}</span>
                        <span className="text-xs text-muted">
                          {userName(l.userId)} · {formatHijri(isoDay(l.at), lang)} · {relTime(l.at, lang, now)}
                        </span>
                        {undoable && (
                          <form action={undoHidayaLog}>
                            <input type="hidden" name="logId" value={l.id} />
                            <button className="text-xs font-medium text-brand hover:underline">{t("undo")}</button>
                          </form>
                        )}
                      </div>
                      {l.note && <p className="mt-0.5 text-muted">{l.note}</p>}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <Empty>{t("noContactsYet")}</Empty>
            )}
          </Card>

          <Card title={t("notes")} icon={StickyNote}>
            {canAct(db, user, b) && (
              <form action={addNote} className="mb-4 space-y-2">
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <textarea name="text" rows={2} placeholder={t("addNote")} required />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="needsContact" /> {t("noteNeedsContact")}
                  </label>
                  <Button size="sm">{t("addNote")}</Button>
                </div>
              </form>
            )}
            {notes.length ? (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className={cx("rounded-xl px-3 py-2.5", n.needsContact ? "bg-warn-soft/60" : "bg-surface-2/50")}>
                    <p className="text-sm">{n.text}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {userName(n.authorId)} · {relTime(n.at, lang, now)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{t("nothingHere")}</Empty>
            )}
          </Card>

          <Card title={t("hidayaSheet")} icon={ClipboardList}>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {(
                [
                  [F.source[lang], h.source],
                  [F.firstContact[lang], `${formatHijri(h.firstContact, lang)} · ${formatGregorian(h.firstContact, lang)}`],
                  [F.lastContact[lang], h.lastContact ? `${formatHijri(h.lastContact, lang)} · ${t("daysAgo", { n: daysBetween(h.lastContact, today) })}` : "—"],
                  [F.nextContact[lang], h.nextContact ? formatHijri(h.nextContact, lang) : "—"],
                  [F.workplace[lang], b.workplace],
                  [F.profession[lang], b.profession],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd>{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {actable && (
              <details className="group mt-4 border-t border-border pt-3">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand">
                  <PencilLine className="size-4" /> {t("editData")}
                </summary>
                <form action={updateHidaya} className="mt-4 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="beneficiaryId" value={b.id} />
                  <CommonFields b={b} ctx={ctx} />
                  <HidayaFields b={b} ctx={ctx} callers={callers} user={user} />
                  <Field label={F.nextContact[lang]}>
                    <HijriInput name="nextContact" value={h.nextContact} lang={lang} empty />
                  </Field>
                  <ProfileFields b={b} ctx={ctx} />
                  <div className="sm:col-span-2">
                    <Button>{t("save")}</Button>
                  </div>
                </form>
              </details>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {actable && (
            <Card title={t("embracedIslam")} icon={Sprout} tone="brand">
              <p className="mb-3 text-sm text-muted">{t("convertHint")}</p>
              <form action={convertHidaya} className="space-y-3">
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <Field label={F.islamDate[lang]}>
                  <HijriInput name="islamDate" value={today} lang={lang} />
                </Field>
                <PendingButton className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 text-[15px] font-semibold text-white shadow-pop transition hover:brightness-105">
                  <Sprout className="size-4" />
                  {t("convertBtn")}
                </PendingButton>
              </form>
            </Card>
          )}

          <Card title={F.category[lang]} icon={Tags}>
            {actable && (
              <form action={setHidayaCategory} className="mb-3 flex items-end gap-2">
                <input type="hidden" name="beneficiaryId" value={b.id} />
                <div className="flex-1">
                  <ListSelect name="category" options={lists.category} value={h.category} lang={lang} />
                </div>
                <Button size="md" variant="secondary">
                  {t("save")}
                </Button>
              </form>
            )}
            {h.categoryHistory.length ? (
              <ol className="space-y-1.5 text-sm">
                {[...h.categoryHistory].reverse().map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <CategoryChip value={c.value} options={lists.category} />
                    <span className="text-xs text-muted">
                      {userName(c.by)} · {formatHijri(isoDay(c.at), lang)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">{t("noCategoryYet")}</p>
            )}
          </Card>

          <Card title={t("understandProfile")} icon={UserSearch}>
            <dl className="space-y-2.5 text-sm">
              {(
                [
                  [F.religion[lang], h.religion],
                  [F.doubts[lang], h.doubts],
                  [F.interests[lang], h.interests],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd>{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {actable && <p className="mt-3 text-xs text-muted">{t("profileEditHint")}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
