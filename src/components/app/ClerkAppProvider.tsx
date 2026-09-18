import { ClerkProvider } from "@clerk/react";
import { ui } from "@clerk/ui";
import { useRouter } from "@tanstack/react-router";
import { type ReactNode } from "react";

import {
  clerkAppearance,
  clerkAppUrls,
  getClerkPublishableKey,
  isClerkConfigured,
} from "@/lib/clerk";
import { toRouterPath } from "@/lib/paths";

function ClerkRouterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const publishableKey = getClerkPublishableKey();
  const urls = clerkAppUrls();

  if (!publishableKey) return children;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      ui={ui}
      appearance={clerkAppearance}
      afterSignOutUrl={urls.afterSignOutUrl}
      signInUrl={urls.signInUrl}
      signUpUrl={urls.signUpUrl}
      signInFallbackRedirectUrl={urls.afterAuthUrl}
      signUpFallbackRedirectUrl={urls.afterAuthUrl}
      signInForceRedirectUrl={urls.afterAuthUrl}
      signUpForceRedirectUrl={urls.afterAuthUrl}
      routerPush={(to) => {
        const path = toRouterPath(to);
        if (path.startsWith("http://") || path.startsWith("https://")) {
          window.location.assign(path);
          return;
        }
        void router.history.push(path);
      }}
      routerReplace={(to) => {
        const path = toRouterPath(to);
        if (path.startsWith("http://") || path.startsWith("https://")) {
          window.location.replace(path);
          return;
        }
        void router.history.replace(path);
      }}
    >
      {children}
    </ClerkProvider>
  );
}

export function ClerkAppProvider({ children }: { children: ReactNode }) {
  if (!isClerkConfigured()) return children;
  return <ClerkRouterProvider>{children}</ClerkRouterProvider>;
}
