import { useAuth, useUser } from "@clerk/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppStore } from "@/lib/app-store";
import { isClerkConfigured } from "@/lib/clerk";
import { isClerkPro, type ClerkNameSource } from "@/lib/clerk-profile";
import { countryName, sortedCountries } from "@/lib/help/countries";
import {
  fetchOwnProRequest,
  fetchProRequestQueue,
  submitProRequest,
  type ShareAuth,
} from "@/lib/share/client";
import { useDevShareUser } from "@/lib/share/dev-session";
import { isProRequestAdmin, type ProRequest, type ProRequestRole } from "@/lib/share/pro-request";

const fieldLabelClass =
  "mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

type AuthFor = () => Promise<ShareAuth>;

function roleLabel(t: (key: string) => string, role: ProRequestRole): string {
  if (role === "therapist") return t("proRequest.roleTherapist");
  if (role === "psychologist") return t("proRequest.rolePsychologist");
  return t("proRequest.roleOther");
}

export function ProAccessCard() {
  if (!isClerkConfigured()) return <DevOnlyProAccess />;
  return <ClerkProAccess />;
}

function DevOnlyProAccess() {
  const devUser = useDevShareUser();
  const { state } = useAppStore();
  if (!import.meta.env.DEV || !devUser) return null;
  return <DevPanel devUser={devUser} countryCode={state.profile?.helpCountry ?? ""} />;
}

function ClerkProAccess() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const devUser = useDevShareUser();
  const { state } = useAppStore();
  if (!isLoaded) return null;
  if (isSignedIn && user) {
    const emails = user.emailAddresses.map((item) => item.emailAddress);
    const email = user.primaryEmailAddress?.emailAddress ?? emails[0] ?? "";
    return (
      <ProAccessPanel
        isPro={isClerkPro(user as ClerkNameSource)}
        fullName={user.fullName || state.profile?.name || ""}
        email={email}
        emails={emails}
        countryCode={state.profile?.helpCountry ?? ""}
        authFor={async () => ({ token: await getToken(), devUser: null })}
      />
    );
  }
  if (import.meta.env.DEV && devUser) {
    return <DevPanel devUser={devUser} countryCode={state.profile?.helpCountry ?? ""} />;
  }
  return null;
}

function DevPanel({ devUser, countryCode }: { devUser: string; countryCode: string }) {
  const [userId, email, name, proFlag] = devUser.split("|");
  if (!userId || !email) return null;
  return (
    <ProAccessPanel
      isPro={proFlag === "1"}
      fullName={name || ""}
      email={email}
      emails={[email]}
      countryCode={countryCode}
      authFor={async () => ({ token: null, devUser })}
    />
  );
}

function ProAccessPanel({
  isPro,
  fullName,
  email,
  emails,
  countryCode,
  authFor,
}: {
  isPro: boolean;
  fullName: string;
  email: string;
  emails: string[];
  countryCode: string;
  authFor: AuthFor;
}) {
  const { t, locale } = useI18n();
  const isAdmin = isProRequestAdmin({ email, emails });
  const authRef = useRef(authFor);
  authRef.current = authFor;
  const [phase, setPhase] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [own, setOwn] = useState<ProRequest | null>(null);
  const [queue, setQueue] = useState<ProRequest[] | null>(null);

  useEffect(() => {
    let cancel = false;
    setPhase("loading");
    void (async () => {
      try {
        const auth = await authRef.current();
        const [request, requests] = await Promise.all([
          isPro ? Promise.resolve(null) : fetchOwnProRequest(auth),
          isAdmin ? fetchProRequestQueue(auth) : Promise.resolve(null),
        ]);
        if (cancel) return;
        setOwn(request);
        setQueue(requests);
        setPhase("ready");
      } catch (err) {
        if (cancel) return;
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code?: string }).code)
            : "";
        setPhase(code === "not_configured" ? "unavailable" : "error");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [email, isAdmin, isPro]);

  return (
    <section className="soft-card space-y-3 p-4" data-testid="pro-request-card">
      <div>
        <h2 className="text-sm font-semibold">{t("proRequest.title")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("proRequest.intro")}
        </p>
      </div>

      {phase === "loading" ? (
        <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
      ) : null}
      {phase === "unavailable" ? (
        <p className="text-xs text-muted-foreground">{t("proRequest.unavailable")}</p>
      ) : null}
      {phase === "error" ? (
        <p className="text-xs text-muted-foreground">{t("proRequest.saveFailed")}</p>
      ) : null}

      {phase === "ready" && isPro ? (
        <StatusLine label={t("proRequest.statusApproved")} body={t("proRequest.approvedBody")} />
      ) : null}

      {phase === "ready" && !isPro && own ? (
        <div className="space-y-2">
          <p className="text-sm">{t("proRequest.thanks")}</p>
          <StatusLine label={t("proRequest.statusPending")} body={t("proRequest.pendingBody")} />
        </div>
      ) : null}

      {phase === "ready" && !isPro && !own ? (
        <RequestForm
          fullName={fullName}
          email={email}
          countryCode={countryCode}
          onSubmit={async (input) => {
            try {
              const saved = await submitProRequest(await authRef.current(), input);
              setOwn(saved);
              if (isAdmin) setQueue(await fetchProRequestQueue(await authRef.current()));
              toast.success(t("proRequest.thanks"));
            } catch (err) {
              const message = err instanceof Error ? err.message : t("proRequest.saveFailed");
              toast.error(message);
            }
          }}
        />
      ) : null}

      {phase === "ready" && isAdmin && queue ? (
        <AdminQueue requests={queue} locale={locale} />
      ) : null}
    </section>
  );
}

function StatusLine({ label, body }: { label: string; body: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2" data-testid="pro-request-status">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("proRequest.statusLabel")}
      </p>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function RequestForm({
  fullName,
  email,
  countryCode,
  onSubmit,
}: {
  fullName: string;
  email: string;
  countryCode: string;
  onSubmit: (input: {
    fullName: string;
    email: string;
    role: ProRequestRole;
    country: string;
    organisation: string;
    why: string;
    worksWithFamilies: true;
  }) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(fullName);
  const [mail, setMail] = useState(email);
  const [role, setRole] = useState<ProRequestRole | "">("");
  const [country, setCountry] = useState(countryCode);
  const [organisation, setOrganisation] = useState("");
  const [why, setWhy] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const countries = sortedCountries(locale);

  return (
    <form
      className="space-y-3"
      data-testid="pro-request-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!role || !confirm) return;
        setSaving(true);
        void onSubmit({
          fullName: name,
          email: mail,
          role,
          country,
          organisation,
          why,
          worksWithFamilies: true,
        }).finally(() => setSaving(false));
      }}
    >
      <div>
        <label className={fieldLabelClass} htmlFor="pro-request-name">
          {t("proRequest.fullName")}
        </label>
        <Input
          id="pro-request-name"
          className="h-11"
          value={name}
          required
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="pro-request-email">
          {t("proRequest.email")}
        </label>
        <Input
          id="pro-request-email"
          type="email"
          className="h-11"
          value={mail}
          required
          maxLength={200}
          onChange={(event) => setMail(event.target.value)}
        />
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="pro-request-role">
          {t("proRequest.role")}
        </label>
        <select
          id="pro-request-role"
          className={selectClass}
          value={role}
          required
          onChange={(event) => setRole(event.target.value as ProRequestRole | "")}
        >
          <option value="">{t("proRequest.rolePlaceholder")}</option>
          <option value="therapist">{t("proRequest.roleTherapist")}</option>
          <option value="psychologist">{t("proRequest.rolePsychologist")}</option>
          <option value="other">{t("proRequest.roleOther")}</option>
        </select>
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="pro-request-country">
          {t("proRequest.country")}
        </label>
        <select
          id="pro-request-country"
          className={selectClass}
          value={country}
          required
          onChange={(event) => setCountry(event.target.value)}
        >
          <option value="">{t("proRequest.countryPlaceholder")}</option>
          {countries.map((item) => (
            <option key={item.code} value={item.code}>
              {countryName(item, locale)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="pro-request-org">
          {t("proRequest.organisation")}
        </label>
        <Input
          id="pro-request-org"
          className="h-11"
          value={organisation}
          maxLength={80}
          onChange={(event) => setOrganisation(event.target.value)}
        />
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="pro-request-why">
          {t("proRequest.why")}
        </label>
        <Input
          id="pro-request-why"
          className="h-11"
          value={why}
          maxLength={160}
          placeholder={t("proRequest.whyPlaceholder")}
          onChange={(event) => setWhy(event.target.value)}
        />
      </div>
      <label className="flex items-start gap-3 text-sm leading-snug">
        <input
          id="pro-request-confirm"
          type="checkbox"
          className="mt-1 size-4 shrink-0"
          checked={confirm}
          required
          onChange={(event) => setConfirm(event.target.checked)}
        />
        <span>{t("proRequest.confirm")}</span>
      </label>
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={saving}
        data-testid="pro-request-submit"
      >
        {saving ? t("proRequest.submitting") : t("proRequest.submit")}
      </Button>
    </form>
  );
}

function AdminQueue({ requests, locale }: { requests: ProRequest[]; locale: "en" | "es" }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2 border-t border-border pt-3" data-testid="pro-request-admin">
      <h3 className="text-sm font-semibold">{t("proRequest.adminTitle")}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("proRequest.adminHint")}</p>
      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("proRequest.adminEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((request) => {
            const country = sortedCountries(locale).find((item) => item.code === request.country);
            const when = new Date(request.createdAt).toLocaleString(
              locale === "es" ? "es-ES" : "en",
            );
            return (
              <li key={request.id} className="rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <p className="font-semibold">{request.fullName}</p>
                <p>{request.email}</p>
                <p className="text-muted-foreground">
                  {roleLabel(t, request.role)}
                  {country ? ` · ${countryName(country, locale)}` : ` · ${request.country}`}
                  {` · ${when}`}
                </p>
                {request.organisation ? <p>{request.organisation}</p> : null}
                {request.why ? <p className="text-muted-foreground">{request.why}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
