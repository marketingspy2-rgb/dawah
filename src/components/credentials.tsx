import { KeyRound } from "lucide-react";
import { setCredentials } from "@/app/actions";
import { PendingButton } from "@/components/client";
import { Card, Pill } from "@/components/ui";
import { MIN_PASSWORD } from "@/lib/auth";
import type { T } from "@/lib/i18n";
import type { User } from "@/lib/types";

/** Sign-in name and password for one person. Only management and supervisors change the name. */
export function CredentialsCard({ target, canSetName, t, title }: { target: User; canSetName: boolean; t: T; title?: string }) {
  return (
    <Card title={title ?? t("credTitle")} icon={KeyRound} action={<Pill tone={target.passwordHash ? "ok" : "warn"}>{target.passwordHash ? t("credHas") : t("credNone")}</Pill>}>
      <form action={setCredentials} className="space-y-3">
        <input type="hidden" name="userId" value={target.id} />
        <p className="text-xs text-muted">{t("credHint", { n: MIN_PASSWORD })}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">{t("pwUsername")}</span>
            <input name="username" dir="ltr" autoComplete="off" defaultValue={target.username ?? ""} readOnly={!canSetName} className={canSetName ? undefined : "bg-surface-2!"} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium">{t("credNewPassword")}</span>
            <input name="password" type="password" dir="ltr" autoComplete="new-password" minLength={MIN_PASSWORD} />
          </label>
        </div>
        <PendingButton className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong">{t("credSave")}</PendingButton>
      </form>
    </Card>
  );
}
