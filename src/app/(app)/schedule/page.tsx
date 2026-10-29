import Link from "next/link";
import { BellRing, BookOpen, CalendarClock, PauseCircle } from "lucide-react";
import { sendLessonNow } from "@/app/actions";
import { Avatar, Card, Empty, Notice, PageHeader, PersonName, Pill, WhatsAppSubmit, cx } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { canAct, centerTime, dayKey, displayName, formatDay, isStaff, localTime, upcoming, visibleBeneficiaries, visibleGroups } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const now = Date.now();
  const list = visibleBeneficiaries(db, user).filter((b) => b.assignedTo === user.id || !isStaff(user));
  const items = upcoming(db, list, now, 7);
  const days = new Map<string, typeof items>();
  for (const it of items) {
    const k = dayKey(it.at);
    if (!days.has(k)) days.set(k, []);
    days.get(k)!.push(it);
  }
  const paused = visibleGroups(db, user).filter((g) => g.kind === "learning" && g.schedule.paused && (!isStaff(user) || g.ownerId === user.id));
  const todayKey = dayKey(now);

  return (
    <>
      {sent !== undefined && <Notice tone={sent === "0" ? "warn" : "ok"}>{sent === "0" ? t("nothingHere") : t("sentOk")}</Notice>}
      <PageHeader title={t("schedule")} subtitle={t("scheduleSub")} />

      {paused.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-warn/20 bg-warn-soft/60 px-4 py-2.5 text-sm text-warn">
          <PauseCircle className="size-4" />
          {t("pausedSchedule")}:
          {paused.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="font-medium underline-offset-2 hover:underline">
              {g.name}
            </Link>
          ))}
        </div>
      )}

      {items.length === 0 && <Empty icon={CalendarClock}>{t("noUpcoming")}</Empty>}

      <div className="space-y-5">
        {[...days.entries()].map(([k, list]) => (
          <Card
            key={k}
            title={
              <span className="flex items-center gap-2">
                {formatDay(list[0].at, lang)}
                {k === todayKey && <Pill tone="gold">{t("dueToday")}</Pill>}
              </span>
            }
            icon={CalendarClock}
            action={<span className="num text-xs text-muted">{list.length}</span>}
            bodyClassName="px-0! pb-1!"
          >
            <ul className="divide-y divide-border border-t border-border">
              {list.map((s) => {
                const b = s.beneficiary;
                const name = displayName(db, user, b);
                const owner = db.users.find((u) => u.id === b.assignedTo);
                return (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap">
                    <div className="w-16 shrink-0 text-center">
                      <div className="num text-sm font-semibold">{centerTime(s.at, lang)}</div>
                      <div className="text-[10px] text-muted">{t("yourTime")}</div>
                    </div>
                    <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl", s.kind === "reminder" ? "bg-gold-soft text-gold" : "bg-brand-soft text-brand")}>
                      {s.kind === "reminder" ? <BellRing className="size-4" /> : <BookOpen className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Avatar name={name} size="sm" locked={name !== b.name} />
                        <PersonName name={name} href={`/beneficiaries/${b.id}`} />
                        <span className="text-xs text-muted">· {LANG_LABELS[b.language][lang]}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">
                        {s.kind === "reminder" ? t("reminder") : t("lessonN", { n: s.lesson.order })}: <span className="text-text">{s.lesson.title[lang]}</span> · {localTime(b.timezone, lang, s.at)} {t("theirTime")}
                        {!isStaff(user) && owner ? ` · ${owner.name}` : ""}
                        {" · "}
                        <Link href={`/groups/${s.group.id}`} className="hover:text-brand">
                          {s.group.name}
                        </Link>
                      </div>
                    </div>
                    {canAct(db, user, b) && (
                      <form action={sendLessonNow}>
                        <input type="hidden" name="beneficiaryId" value={b.id} />
                        <WhatsAppSubmit size="sm" label={t("sendNow")} />
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
