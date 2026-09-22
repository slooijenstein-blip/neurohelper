import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import { ClerkAppProvider } from "@/components/app/ClerkAppProvider";
import { ClerkProfileSync } from "@/components/app/ClerkProfileSync";
import { I18nProvider } from "@/i18n/I18nProvider";
import { LOCALE_STORAGE_KEY, resolveLocale } from "@/i18n/locales";
import { translate } from "@/i18n/translate";
import { DemoPersonaSync } from "@/components/app/DemoPersonaSync";
import { AppStoreProvider } from "@/lib/app-store";
import { CalendarStoreProvider } from "@/lib/calendar/store";

import appCss from "../styles.css?url";

function shellT(key: string) {
  let stored: string | null = null;
  let browser: string | null = null;
  if (typeof window !== "undefined") {
    try {
      stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      stored = null;
    }
    browser = navigator.language;
  }
  return translate(resolveLocale({ stored, browser }), key);
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {shellT("errors.notFoundTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{shellT("errors.notFoundBody")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {shellT("common.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {shellT("errors.pageFailedTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{shellT("errors.pageFailedBody")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {shellT("common.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {shellT("common.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Synlumae" },
      {
        name: "description",
        content: "Activities, routines, and community for neurodiverse kids and their caregivers.",
      },
      { name: "author", content: "Synlumae" },
      { property: "og:title", content: "Synlumae — Activities & routines for neurodiverse kids" },
      {
        property: "og:description",
        content:
          "Discover activities, build daily schedules, track progress, and share routines with parents, teachers, therapists, and creators.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `${import.meta.env.BASE_URL}og-image.png` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${import.meta.env.BASE_URL}og-image.png` },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Nunito:wght@400;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: `${import.meta.env.BASE_URL}favicon.ico`,
        type: "image/x-icon",
        sizes: "any",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: `${import.meta.env.BASE_URL}favicon-32x32.png`,
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        href: `${import.meta.env.BASE_URL}icon-192.png`,
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: `${import.meta.env.BASE_URL}apple-touch-icon.png`,
      },
      { rel: "manifest", href: `${import.meta.env.BASE_URL}site.webmanifest` },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <ClerkAppProvider>
      <QueryClientProvider client={queryClient}>
        <AppStoreProvider>
          <CalendarStoreProvider>
            <I18nProvider>
              <ClerkProfileSync />
              <DemoPersonaSync />
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </I18nProvider>
          </CalendarStoreProvider>
        </AppStoreProvider>
      </QueryClientProvider>
    </ClerkAppProvider>
  );
}
