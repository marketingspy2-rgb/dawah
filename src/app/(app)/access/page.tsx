import { notFound } from "next/navigation";
import { CredentialsCard } from "@/components/credentials";
import { Notice, PageHeader } from "@/components/ui";
import { MIN_PASSWORD } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { featureOn } from "@/lib/features";
import { roleLabel, translator, type TKey } from "@/lib/i18n";
import { canManageUser } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Usernames and passwords: management for everyone, a supervisor for their team. */
export default async function AccessPage({ searchParams }: { searchParams: Promise<{ credSaved?: string; credErr?: string }> }) {
  const { credSaved, credErr } = await searchParams;
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "supervisor") notFound();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const people = db.users.filter((u) => u.status !== "left" && (u.id === user.id || canManageUser(db, user, u)));

  return (
    <>
      <PageHeader title={t("accessTitle")} subtitle={t("credHint", { n: MIN_PASSWORD })} />
      {credSaved && <Notice tone="ok">{t("credSaved")}</Notice>}
      {credErr && <Notice tone="bad">{t(`credErr_${credErr}` as TKey, { n: MIN_PASSWORD })}</Notice>}
      {!featureOn(db, "passwordLogin") && <Notice tone="info">{t(user.role === "admin" ? "accessOffAdmin" : "accessOff")}</Notice>}
      <div className="grid gap-4 lg:grid-cols-2">
        {people.map((u) => (
          <CredentialsCard key={u.id} target={u} canSetName={user.role === "admin" || u.id !== user.id} t={t} title={`${u.name} · ${roleLabel(u.role, u.gender, lang)}`} />
        ))}
      </div>
    </>
  );
}
