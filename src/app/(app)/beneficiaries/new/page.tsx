import Link from "next/link";
import { UserPlus } from "lucide-react";
import { addMuslim } from "@/app/actions";
import { CommonFields, MuslimFields } from "@/components/person-forms";
import { Button, Card, Notice, PageHeader } from "@/components/ui";
import { readDb } from "@/lib/db";
import { translator } from "@/lib/i18n";
import { staffUnder } from "@/lib/logic";
import { getUiLang, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewMuslimPage({ searchParams }: { searchParams: Promise<{ dup?: string; dupId?: string }> }) {
  const { dup, dupId } = await searchParams;
  const user = await requireUser();
  const lang = await getUiLang();
  const t = translator(lang);
  const db = readDb();
  const staff = user.role === "admin" ? db.users.filter((u) => u.role === "teacher" || u.role === "caller") : staffUnder(db, user);
  const ctx = { db, lang, t };

  return (
    <>
      <PageHeader crumbs={[{ href: "/beneficiaries", label: t("newMuslim") }]} title={t("addMuslim")} subtitle={t("addMuslimSub")} />
      {dup && (
        <Notice tone="warn">
          {t("dupFound", { name: dup })}{" "}
          {dupId && (
            <Link href={`/beneficiaries/${dupId}`} className="underline">
              {t("openFile")}
            </Link>
          )}
        </Notice>
      )}
      <form action={addMuslim} className="max-w-3xl space-y-5">
        <Card icon={UserPlus} title={t("muslimSheet")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <CommonFields ctx={ctx} />
            <MuslimFields ctx={ctx} staff={staff} user={user} />
          </div>
        </Card>
        <Button>{t("save")}</Button>
      </form>
    </>
  );
}
