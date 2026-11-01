import Link from "next/link";
import { UserPlus } from "lucide-react";
import { addHidaya } from "@/app/actions";
import { CommonFields, HidayaFields, ProfileFields } from "@/components/person-forms";
import { Button, Card, Notice, PageHeader } from "@/components/ui";
import { readDb } from "@/lib/db";
import { translator } from "@/lib/i18n";
import { staffUnder } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewHidayaPage({ searchParams }: { searchParams: Promise<{ dup?: string; dupId?: string }> }) {
  const { dup, dupId } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const callers = user.role === "caller" ? [user, ...db.users.filter((u) => u.role === "caller" && u.id !== user.id && u.teamId === user.teamId)] : staffUnder(db, user).filter((u) => u.role === "caller");
  const ctx = { db, lang, t };

  return (
    <>
      <PageHeader crumbs={[{ href: "/hidaya", label: t("hidaya") }]} title={t("addHidaya")} subtitle={t("addHidayaSub")} />
      {dup && (
        <Notice tone="warn">
          {t("dupFound", { name: dup })}{" "}
          {dupId && (
            <Link href={`/hidaya/${dupId}`} className="underline">
              {t("openFile")}
            </Link>
          )}
        </Notice>
      )}
      <form action={addHidaya} className="max-w-3xl space-y-5">
        <Card icon={UserPlus} title={t("hidayaSheet")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <CommonFields ctx={ctx} />
            <HidayaFields ctx={ctx} callers={callers} user={user} />
          </div>
        </Card>
        <Card title={t("understandProfile")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileFields ctx={ctx} />
          </div>
        </Card>
        <Button>{t("save")}</Button>
      </form>
    </>
  );
}
