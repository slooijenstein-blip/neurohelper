import { SignIn, useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { AuthLoading } from "./AuthScreen";
import { BrandLogo } from "./BrandLogo";
import { familyCopy } from "@/lib/family/copy";
import { useFamilyStore } from "@/lib/family/family-context";
import { FamilyError, type InvitePreview } from "@/lib/family/types";
import { familyRoleLabel } from "@/lib/family/permissions";
import { isClerkConfigured } from "@/lib/clerk";
import { withBasePath } from "@/lib/paths";

export function InviteAcceptScreen({ token }: { token: string }) {
  if (isClerkConfigured()) return <ClerkInviteAccept token={token} />;
  return <InviteAcceptBody token={token} signedIn />;
}

function ClerkInviteAccept({ token }: { token: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  return <InviteAcceptBody token={token} signedIn={Boolean(isSignedIn)} />;
}

function InviteAcceptBody({ token, signedIn }: { token: string; signedIn: boolean }) {
  const family = useFamilyStore();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (family.client) {
          const next = await family.client.peekInvite(token);
          if (!cancelled) setPreview(next as InvitePreview);
          return;
        }
        const res = await fetch(`/api/family/invites/${encodeURIComponent(token)}`);
        const data = (await res.json()) as InvitePreview & { error?: string };
        if (!res.ok)
          throw new FamilyError(res.status, "not_found", data.error || "Invite not found.");
        if (!cancelled) setPreview(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof FamilyError ? err.message : "This invite link is not valid.");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [family.client, token]);

  const accept = async () => {
    if (!family.client) return;
    try {
      await family.client.acceptInvite(token);
      await family.refresh();
      setDone(true);
    } catch (err) {
      setError(err instanceof FamilyError ? err.message : "Could not accept this invite.");
    }
  };

  return (
    <div className="phone-shell">
      <div className="app-main min-h-0 flex-1 md:items-center md:justify-center md:p-10">
        <div className="app-login-panel h-full min-h-0 md:h-auto md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-card md:shadow-lg">
          <div className="hide-scrollbar flex h-full flex-col overflow-y-auto bg-surface px-5 py-6">
            <div className="mb-5 text-center">
              <h1 className="mb-3 flex justify-center">
                <BrandLogo variant="full" className="h-28 w-auto max-w-[14rem]" />
              </h1>
              <h2 className="text-2xl font-bold">{familyCopy.acceptTitle}</h2>
              <p className="text-sm text-muted-foreground">{familyCopy.acceptBody}</p>
            </div>

            {preview ? (
              <div className="soft-card mb-4 p-4 text-center">
                <p className="text-base font-semibold">{preview.childDisplayName}</p>
                <p className="text-xs text-muted-foreground">
                  Role: {familyRoleLabel(preview.role)} · {preview.invitedEmail}
                </p>
              </div>
            ) : null}

            {error ? <p className="mb-3 text-center text-sm text-destructive">{error}</p> : null}

            {done ? (
              <div className="space-y-3 text-center">
                <p className="text-sm">{familyCopy.accepted}</p>
                <Button asChild>
                  <Link to="/">{familyCopy.scheduleTitle}</Link>
                </Button>
              </div>
            ) : !signedIn ? (
              <div className="clerk-auth-host flex flex-1 flex-col items-center">
                <SignIn
                  routing="hash"
                  forceRedirectUrl={withBasePath(`/invite/${encodeURIComponent(token)}`)}
                  fallbackRedirectUrl={withBasePath(`/invite/${encodeURIComponent(token)}`)}
                  signUpUrl={withBasePath("/sign-up")}
                />
              </div>
            ) : (
              <Button onClick={() => void accept()} disabled={!family.client || !preview}>
                {familyCopy.acceptCta}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
