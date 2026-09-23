import { SignIn, SignUp, useAuth } from "@clerk/react";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { useAppStore, type DemoPersona } from "@/lib/app-store";
import { isClerkConfigured } from "@/lib/clerk";
import { withBasePath } from "@/lib/paths";
import { devShareEnabled, setDevShareUser } from "@/lib/share/dev-session";

import { BrandLogo } from "./BrandLogo";

export function AuthLoading() {
  const { t } = useI18n();
  return (
    <div className="phone-shell">
      <div className="app-main min-h-0 flex-1 md:items-center md:justify-center md:p-10">
        <div className="flex h-full flex-col items-center justify-center bg-surface px-6 text-center">
          <BrandLogo variant="icon" className="mb-4 size-16 animate-pulse" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    </div>
  );
}

function PersonaDemoButtons() {
  const { enterPrototypeDemo } = useAppStore();
  const { t } = useI18n();
  const navigate = useNavigate();

  const enter = (persona: DemoPersona) => {
    enterPrototypeDemo(persona);
    void navigate({ to: "/" });
  };

  return (
    <div className="space-y-2">
      <p className="text-center text-[11px] font-semibold text-muted-foreground">
        {t("auth.demoHint")}
      </p>
      <Button
        variant="default"
        className="w-full"
        data-testid="continue-pro"
        onClick={() => enter("pro")}
      >
        {t("auth.continuePro")}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        data-testid="continue-parent"
        onClick={() => enter("parent")}
      >
        {t("auth.continueParent")}
      </Button>
    </div>
  );
}

function DevShareButtons() {
  const navigate = useNavigate();
  if (!devShareEnabled()) return null;

  const enter = (value: string) => {
    setDevShareUser(value);
    void navigate({ to: "/" });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => enter("user_maya0001|maya@example.com|Maya|1")}
      >
        Dev live Pro
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => enter("user_sam000001|sam.parent@example.com|Sam|0")}
      >
        Dev live Parent
      </Button>
    </div>
  );
}

function DevDemoButton() {
  const { enterDevDemo } = useAppStore();
  const { t } = useI18n();
  if (!import.meta.env.DEV) return null;

  return (
    <Button variant="outline" className="w-full" onClick={enterDevDemo}>
      <LogIn className="mr-1 size-4" /> {t("auth.devDemo")}
    </Button>
  );
}

function SetupInstructions() {
  const { t } = useI18n();
  return (
    <div className="space-y-3 text-left text-sm text-muted-foreground">
      <p>{t("auth.setupLead")}</p>
      <ol className="list-decimal space-y-1 pl-4">
        <li>
          <a
            className="underline"
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noreferrer"
          >
            {t("auth.setupStep1")}
          </a>
        </li>
        <li>
          {t("auth.setupStep2Before")}{" "}
          <code className="text-foreground">VITE_CLERK_PUBLISHABLE_KEY</code>{" "}
          {t("auth.setupStep2After")} <code className="text-foreground">.env.local</code>
        </li>
        <li>
          {t("auth.setupStep3Before")} <code className="text-foreground">npm run dev</code>{" "}
          {t("auth.setupStep3After")}
        </li>
      </ol>
      <p className="text-xs">{t("auth.setupNote")}</p>
    </div>
  );
}

function AuthChrome({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="phone-shell">
      <div className="app-main min-h-0 flex-1 md:items-center md:justify-center md:p-10">
        <div className="app-login-panel h-full min-h-0 md:h-auto md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-card md:shadow-lg">
          <div className="hide-scrollbar flex h-full flex-col overflow-y-auto bg-surface px-5 py-6">
            <div className="mb-5 text-center">
              <h1 className="mb-3 flex justify-center">
                <BrandLogo variant="full" className="h-28 w-auto max-w-[14rem]" />
              </h1>
              <p className="text-sm text-muted-foreground">{t("brand.authTagline")}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function afterAuthPath(): string {
  if (typeof window === "undefined") return withBasePath("/");
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  if (redirect && redirect.startsWith("/invite/")) return withBasePath(redirect);
  return withBasePath("/");
}

export function AuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const clerkReady = isClerkConfigured();
  const { t } = useI18n();
  const nextUrl = afterAuthPath();

  return (
    <AuthChrome>
      {clerkReady ? (
        <div className="clerk-auth-host flex flex-1 flex-col items-center">
          {mode === "sign-in" ? (
            <SignIn
              routing="path"
              path={withBasePath("/sign-in")}
              signUpUrl={withBasePath("/sign-up")}
              forceRedirectUrl={nextUrl}
              fallbackRedirectUrl={nextUrl}
              withSignUp
            />
          ) : (
            <SignUp
              routing="path"
              path={withBasePath("/sign-up")}
              signInUrl={withBasePath("/sign-in")}
              forceRedirectUrl={nextUrl}
              fallbackRedirectUrl={nextUrl}
            />
          )}
        </div>
      ) : (
        <SetupInstructions />
      )}

      <div className="mt-6 space-y-2">
        <PersonaDemoButtons />
        <DevShareButtons />
        <DevDemoButton />
        {mode === "sign-in" ? (
          <p className="text-center text-xs text-muted-foreground">
            {t("auth.needAccount")}{" "}
            <Link to="/sign-up" className="font-semibold text-primary underline">
              {t("auth.signUp")}
            </Link>
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            {t("auth.haveAccount")}{" "}
            <Link to="/sign-in" className="font-semibold text-primary underline">
              {t("auth.signIn")}
            </Link>
          </p>
        )}
      </div>
    </AuthChrome>
  );
}

export function SignedInRedirect({ children }: { children: ReactNode }) {
  const { devDemo, prototypeDemo } = useAppStore();
  if (prototypeDemo || (import.meta.env.DEV && devDemo)) return <Navigate to="/" />;
  if (!isClerkConfigured()) return <>{children}</>;
  return <SignedInRedirectInner>{children}</SignedInRedirectInner>;
}

function SignedInRedirectInner({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  if (isSignedIn) return <Navigate to="/" />;
  return <>{children}</>;
}
