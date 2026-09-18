import { SignIn, SignUp, useAuth } from "@clerk/react";
import { Link, Navigate } from "@tanstack/react-router";
import { LogIn, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { isClerkConfigured } from "@/lib/clerk";
import { withBasePath } from "@/lib/paths";

export function AuthLoading() {
  return (
    <div className="phone-shell">
      <div className="flex h-full flex-col items-center justify-center bg-surface px-6 text-center">
        <div className="mb-4 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-8 animate-pulse" />
        </div>
        <p className="text-sm text-muted-foreground">Loading Synlumae…</p>
      </div>
    </div>
  );
}

function DevDemoButton() {
  const { enterDevDemo } = useAppStore();
  if (!import.meta.env.DEV) return null;

  return (
    <Button variant="outline" className="w-full" onClick={enterDevDemo}>
      <LogIn className="mr-1 size-4" /> Continue as Sam (dev only)
    </Button>
  );
}

function SetupInstructions() {
  return (
    <div className="space-y-3 text-left text-sm text-muted-foreground">
      <p>
        Sign-in is not configured in this build. Add a Clerk publishable key and restart the app.
      </p>
      <ol className="list-decimal space-y-1 pl-4">
        <li>
          Create an application at{" "}
          <a
            className="underline"
            href="https://dashboard.clerk.com"
            target="_blank"
            rel="noreferrer"
          >
            dashboard.clerk.com
          </a>
        </li>
        <li>
          Copy <code className="text-foreground">VITE_CLERK_PUBLISHABLE_KEY</code> into{" "}
          <code className="text-foreground">.env.local</code>
        </li>
        <li>
          Run <code className="text-foreground">npm run dev</code> and open localhost:8080
        </li>
      </ol>
      <p className="text-xs">
        Clerk development keys only work on localhost. Production sign-in needs a production Clerk
        instance (for example on Vercel at synlumae.com), not GitHub Pages with test keys.
      </p>
    </div>
  );
}

function AuthChrome({ children }: { children: ReactNode }) {
  return (
    <div className="phone-shell">
      <div className="hide-scrollbar flex h-full flex-col overflow-y-auto bg-surface px-5 py-6">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-7" />
          </div>
          <h1 className="text-2xl font-bold">Synlumae</h1>
          <p className="text-sm text-muted-foreground">
            Activities, schedules, and community for neurodiverse families.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthScreen({ mode }: { mode: "sign-in" | "sign-up" }) {
  const clerkReady = isClerkConfigured();

  return (
    <AuthChrome>
      {clerkReady ? (
        <div className="clerk-auth-host flex flex-1 flex-col items-center">
          {mode === "sign-in" ? (
            <SignIn
              routing="path"
              path={withBasePath("/sign-in")}
              signUpUrl={withBasePath("/sign-up")}
              forceRedirectUrl={withBasePath("/")}
              fallbackRedirectUrl={withBasePath("/")}
              withSignUp
            />
          ) : (
            <SignUp
              routing="path"
              path={withBasePath("/sign-up")}
              signInUrl={withBasePath("/sign-in")}
              forceRedirectUrl={withBasePath("/")}
              fallbackRedirectUrl={withBasePath("/")}
            />
          )}
        </div>
      ) : (
        <SetupInstructions />
      )}

      <div className="mt-6 space-y-2">
        <DevDemoButton />
        {mode === "sign-in" ? (
          <p className="text-center text-xs text-muted-foreground">
            Need an account?{" "}
            <Link to="/sign-up" className="font-semibold text-primary underline">
              Sign up
            </Link>
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/sign-in" className="font-semibold text-primary underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </AuthChrome>
  );
}

export function SignedInRedirect({ children }: { children: ReactNode }) {
  const { devDemo } = useAppStore();
  if (import.meta.env.DEV && devDemo) return <Navigate to="/" />;
  if (!isClerkConfigured()) return <>{children}</>;
  return <SignedInRedirectInner>{children}</SignedInRedirectInner>;
}

function SignedInRedirectInner({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  if (isSignedIn) return <Navigate to="/" />;
  return <>{children}</>;
}
