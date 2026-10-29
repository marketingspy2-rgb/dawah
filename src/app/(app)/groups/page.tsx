import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { GroupCard } from "@/components/group-card";
import { createGroup } from "@/app/actions";
import { Avatar, Button, Card, Empty, Field, PageHeader, Pill, RoleBadge } from "@/components/ui";
import { readDb } from "@/lib/db";
import { LANG_LABELS, translator } from "@/lib/i18n";
import { isStaff, staffUnder, visibleGroups } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";
import { LANGS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const groups = visibleGroups(db, user);
  const owners = staffUnder(db, user).filter((s) => groups.some((g) => g.ownerId === s.id) || s.id === user.id);

  return (
    <>
      <PageHeader title={isStaff(user) ? t("myGroups") : t("groups")} subtitle={t("groupsSub")} />

      <div className="space-y-8">
        {owners.map((owner) => {
          const mine = groups.filter((g) => g.ownerId === owner.id);
          return (
            <section key={owner.id}>
              {!isStaff(user) && (
                <div className="mb-3 flex items-center gap-3">
                  <Avatar name={owner.name} size="sm" />
                  <Link href={`/team/${owner.id}`} className="font-semibold hover:text-brand">
                    {owner.name}
                  </Link>
                  <RoleBadge role={owner.role} gender={owner.gender} lang={lang} />
                  {owner.status !== "available" && <Pill tone="warn">{t(owner.status)}</Pill>}
                </div>
              )}
              {mine.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {mine.map((g) => (
                    <GroupCard key={g.id} db={db} group={g} lang={lang} t={t} />
                  ))}
                </div>
              ) : (
                <Empty icon={UsersRound}>{t("nothingHere")}</Empty>
              )}
            </section>
          );
        })}
      </div>

      <Card title={t("newGroup")} icon={Plus} className="mt-8 max-w-2xl">
        <form action={createGroup} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <Field label={t("groupName")}>
            <input name="name" required />
          </Field>
          <Field label={t("language")}>
            <select name="language" defaultValue={user.languages[0] ?? "es"}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABELS[l][lang]}
                </option>
              ))}
            </select>
          </Field>
          {!isStaff(user) ? (
            <Field label={t("owner")}>
              <select name="ownerId">
                {staffUnder(db, user).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <span />
          )}
          <Button>{t("createGroup")}</Button>
        </form>
      </Card>
    </>
  );
}
