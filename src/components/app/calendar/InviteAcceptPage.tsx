import { useAuth } from "@clerk/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/app/BrandLogo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { useCalendarStore } from "@/lib/calendar/store";
import { isClerkConfigured } from "@/lib/clerk";
import { withBasePath } from "@/lib/paths";
import { acceptInviteOnServer, fetchInvitePreview } from "@/lib/share/client";
import { readDevShareUser } from "@/lib/share/dev-session";
import { rememberPendingInvite } from "@/lib/share/pending-invite";

export function InviteAcceptPage({ token }: { token: string }) {
  if (isClerkConfigured()) return <ClerkInviteAcceptPage token={token} />;
  return (
    <LocalInviteAcceptPage
      token={token}
      signedIn={Boolean(readDevShareUser())}
      getToken={async () => null}
    />
  );
}

function ClerkInviteAcceptPage({ token }: { token: string }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  if (!isLoaded) return null;
  return <LocalInviteAcceptPage token={token} signedIn={Boolean(isSignedIn)} getToken={getToken} />;
}

function LocalInviteAcceptPage({
  token,
  signedIn,
  getToken,
}: {
  token: string;
  signedIn: boolean;
  getToken: () => Promise<string | null>;
}) {
  const { t } = useI18n();
  const cal = useCalendarStore();
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{
    childDisplayName: string;
    role: "caregiver" | "helper";
    email: string;
  } | null>(null);
  const [missing, setMissing] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    rememberPendingInvite(token);
  }, [token]);

  const local = cal.state.invites.find(
    (invite) => invite.token === token && invite.status === "pending",
  );
  const localChild = local ? cal.state.children.find((child) => child.id === local.childId) : null;
  const live = cal.shareMode === "live" || Boolean(readDevShareUser());

  useEffect(() => {
    if (!live) return;
    let cancel = false;
    void fetchInvitePreview(token).then((next) => {
      if (cancel) return;
      if (next) setPreview(next);
      else if (!local) setMissing(true);
    });
    return () => {
      cancel = true;
    };
  }, [live, local, token]);

  const childName = preview?.childDisplayName || localChild?.displayName || "";
  const role = preview?.role || local?.role || "caregiver";
  const email = preview?.email || local?.email || "";
  const known = Boolean(childName);

  const accept = async () => {
    if (!live) {
      const result = cal.acceptInviteToken(token);
      setMessage(result.message);
      setDone(result.ok);
      return;
    }
    try {
      const devUser = readDevShareUser();
      const authToken = devUser ? null : await getToken();
      const result = await acceptInviteOnServer(
        { token: authToken, devUser },
        token,
        window.location.origin,
      );
      cal.attachLive({
        getToken,
        devUser,
        state: result.state,
        status: "ready",
      });
      setMessage(t("share.accepted"));
      setDone(true);
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      setMessage(
        code === "email_mismatch"
          ? t("calendar.invite.emailMismatch", { email })
          : t("calendar.invite.missing"),
      );
    }
  };

  const signInHref = `${withBasePath("/sign-in")}?redirect=${encodeURIComponent(`/invite/${token}`)}`;

  useEffect(() => {
    if (!signedIn || done || !known || tried.current) return;
    tried.current = true;
    void accept();
    // Accept once when a signed-in person lands here, including after Google OAuth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, known, signedIn]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft">
        <BrandLogo variant="lockup" className="mx-auto mb-4 h-10 w-auto" />
        <h1 className="text-center font-display text-xl font-semibold">
          {t("calendar.invite.title")}
        </h1>
        {known && !missing ? (
          <>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {t("calendar.invite.body", { child: childName, role: t(`calendar.roles.${role}`) })}
            </p>
            {email ? (
              <p className="mt-1 text-center text-xs text-muted-foreground">{email}</p>
            ) : null}
            {done ? (
              <div className="mt-6 space-y-3 text-center">
                <p className="text-sm font-semibold text-success">{message}</p>
                <Button asChild className="w-full">
                  <Link to="/">{t("calendar.invite.openApp")}</Link>
                </Button>
              </div>
            ) : live && !signedIn && !readDevShareUser() ? (
              <div className="mt-6 space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  {t("share.signInToAccept", { email })}
                </p>
                <Button asChild className="w-full">
                  <a href={signInHref}>{t("calendar.invite.signIn")}</a>
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {message ? <p className="text-center text-sm text-destructive">{message}</p> : null}
                <Button type="button" className="w-full" onClick={() => void accept()}>
                  {t("calendar.invite.accept")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              {live && !missing ? t("common.loading") : t("calendar.invite.missing")}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">{t("common.goHome")}</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
