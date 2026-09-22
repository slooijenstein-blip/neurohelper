import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { BrandLogo } from "@/components/app/BrandLogo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { useCalendarStore } from "@/lib/calendar/store";

export function InviteAcceptPage({ token }: { token: string }) {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  const invite = cal.state.invites.find((i) => i.token === token);
  const child = invite ? cal.state.children.find((c) => c.id === invite.childId) : null;

  const accept = () => {
    const result = cal.acceptInviteToken(token);
    setMessage(result.message);
    setDone(result.ok);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft">
        <BrandLogo variant="lockup" className="mx-auto mb-4 h-10 w-auto" />
        <h1 className="text-center font-display text-xl font-semibold">
          {t("calendar.invite.title")}
        </h1>
        {invite && child ? (
          <>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {t("calendar.invite.body", {
                child: child.displayName,
                role: t(`calendar.roles.${invite.role}`),
              })}
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">{invite.email}</p>
            {done ? (
              <div className="mt-6 space-y-3 text-center">
                <p className="text-sm font-semibold text-success">{message}</p>
                <Button asChild className="w-full">
                  <Link to="/">{t("calendar.invite.openApp")}</Link>
                </Button>
              </div>
            ) : (
              <Button type="button" className="mt-6 w-full" onClick={accept}>
                {t("calendar.invite.accept")}
              </Button>
            )}
          </>
        ) : (
          <div className="mt-4 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">{t("calendar.invite.missing")}</p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">{t("common.goHome")}</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
