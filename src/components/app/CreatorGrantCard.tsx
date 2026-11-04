import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import {
  CreatorApiError,
  lookupCreatorAccess,
  setCreatorAccess,
  type CreatorAccessUser,
} from "@/lib/creator/client";
import type { ShareAuth } from "@/lib/share/client";

const fieldLabelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

/** Founder-only switch. Writes Clerk publicMetadata.isCreatorPro and turns Pro on with it. */
export function CreatorGrantCard({ authFor }: { authFor: () => Promise<ShareAuth> }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<CreatorAccessUser | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (err: unknown) => {
    if (err instanceof CreatorApiError && err.code === "not_configured") {
      toast.error(t("creator.grantNeedsClerk"));
      return;
    }
    if (err instanceof CreatorApiError && err.code === "forbidden") {
      toast.error(t("creator.needCreator"));
      return;
    }
    toast.error(t("creator.invalid"));
  };

  const lookup = async () => {
    setBusy(true);
    try {
      const found = await lookupCreatorAccess(await authFor(), email.trim());
      setUser(found);
      if (!found) toast.message(t("creator.grantMissing"));
    } catch (err) {
      setUser(null);
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (enabled: boolean) => {
    if (!user) return;
    setBusy(true);
    try {
      const next = await setCreatorAccess(await authFor(), user.userId, enabled);
      setUser(next);
      toast.success(t("creator.grantSaved"));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-2 border-t border-border pt-3" data-testid="creator-grant">
      <h3 className="text-sm font-semibold">{t("creator.grantTitle")}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("creator.grantHint")}</p>
      <label className={fieldLabelClass} htmlFor="creator-grant-email">
        {t("creator.grantEmail")}
      </label>
      <Input
        id="creator-grant-email"
        data-testid="creator-grant-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy || !email.trim()}
        data-testid="creator-grant-lookup"
        onClick={() => void lookup()}
      >
        {t("creator.grantLookup")}
      </Button>
      {user ? (
        <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs" data-testid="creator-grant-user">
          <p className="font-semibold">{user.name || user.email}</p>
          <p>{user.email}</p>
          <p className="text-muted-foreground">
            {t("creator.grantPro")} {user.isPro ? t("creator.on") : t("creator.off")} ·{" "}
            {t("creator.grantCreator")} {user.isCreatorPro ? t("creator.on") : t("creator.off")}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || user.isCreatorPro}
              data-testid="creator-grant-on"
              onClick={() => void toggle(true)}
            >
              {t("creator.grantOn")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !user.isCreatorPro}
              data-testid="creator-grant-off"
              onClick={() => void toggle(false)}
            >
              {t("creator.grantOff")}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
