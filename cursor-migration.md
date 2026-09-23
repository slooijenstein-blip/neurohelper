# Cursor migration — Synlumae (repo: neurohelper)

This project was built in Lovable.dev. create a 'cursor-migration.md' file that gives me a clear overview of this codebase and contains these instructions.

Keep this file in the repo. When working in Cursor, treat the quote above as standing instructions: maintain this overview, and do not reintroduce Lovable-specific packages, telemetry, or APIs.

## What this app is

**Synlumae** (public brand; synlumae.com) is a phone-framed web app for parents, teachers, therapists, and caregivers. GitHub repo is still `slooijenstein-blip/neurohelper`.

Auth is Clerk (`@clerk/react` SPA SDK). Schedule / community / journey / help data still lives in the browser (`localStorage` key `motor-skill-buddy-v1`). There is no app database yet. Child first name/age are device-local and are not stored on the Clerk user.

Live (GitHub Pages): https://slooijenstein-blip.github.io/neurohelper/

Clerk development keys only work on localhost. Pages can host the static UI; production sessions belong on Vercel + synlumae.com with `pk_live_` keys. See README.

## Stack

- React 19 + TypeScript
- TanStack Start / Router / Query (file-based routes in `src/routes/`)
- Vite 8 + Tailwind CSS 4
- Clerk (`@clerk/react` + `@clerk/ui`) for email auth — not `@clerk/tanstack-react-start` (that needs a server)
- shadcn/ui (Radix) in `src/components/ui/`
- Client SPA production build (`spa.enabled` in `vite.config.ts`) for static hosting

## Layout

```
src/
  routes/           # TanStack file routes. index.tsx is `/`. __root.tsx is the shell.
                    # sign-in/ and sign-up/ are Clerk catch-all routes.
  router.tsx        # createRouter; respects Vite BASE_URL for GitHub Pages
  server.ts         # SSR fetch wrapper (dev / Start server)
  start.ts          # Start middleware (errors + CSRF for leftover server fns)
  lib/
    app-store.tsx   # Profiles, schedule, community seed data, persistence
    clerk.ts        # Publishable key + Clerk appearance
    clerk-profile.ts# Clerk user → local profile name mapping
    help-content.ts # Caregiver help hubs (no diagnostic claims)
    activities-data.ts
    journey.functions.ts  # Local (non-AI) progress summary
  components/app/   # Product UI: tabs, auth, community, schedule, help
  components/ui/    # Shared primitives
  styles.css        # phone-shell (≤767px) + desktop sidebar (≥768px)
  hooks/use-mobile.tsx  # 768px breakpoint (same as Tailwind md)
```

`PhoneApp` is mobile-first: a 480px phone chrome with a bottom tab bar. From `md` (768px) it becomes a full-width desktop workspace with a left sidebar. Same tabs and localStorage data. The shell is shown only when Clerk reports a session (or the DEV-only Continue as Sam bypass).

## Screens (tabs)

| Tab          | File                                                  | Role                                          |
| ------------ | ----------------------------------------------------- | --------------------------------------------- |
| Sign in / up | `AuthScreen.tsx` + `routes/sign-in`, `routes/sign-up` | Clerk email auth; DEV-only Continue as Sam    |
| Activities   | `ActivitiesTab.tsx`                                   | Filterable library (age range slider, skills) |
| Schedule     | `ScheduleTab.tsx`                                     | Daily routine, templates, calendar share      |
| Journey      | `JourneyTab.tsx`                                      | Child progress, observations, local summary   |
| Community    | `CommunityTab.tsx`                                    | Posts, articles, follow                       |
| Help         | `HelpTab.tsx` + `help-content.ts`                     | Caregiver hubs, emergency disclaimer          |
| Profile      | `ProfileTab.tsx`                                      | Edit caregiver identity, Clerk account, local child fields, log out |

State is provided by `AppStoreProvider` in `src/routes/__root.tsx`. Clerk wraps the tree via `ClerkAppProvider`.

## Commands

```sh
npm i
cp .env.example .env.local   # VITE_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY + Upstash REST vars for /api/share
npm run dev           # http://localhost:8080
npm run build         # dist/client (copy `_shell.html` → `index.html` + `404.html` for Pages)
npm run deploy:pages  # required after user-visible fixes: build + publish origin/gh-pages
npm run lint
npm test              # clerk-profile helpers (local edits vs Clerk sync)
```

GitHub Pages needs `BASE_PATH=/neurohelper/` at build time. After any user-visible change, run `npm run deploy:pages` so https://slooijenstein-blip.github.io/neurohelper/ matches local. Do not force-push `gh-pages`. Do not add GitHub Actions unless the `workflow` OAuth scope is available. Clerk **test** keys will not sign users in on github.io.

## Lovable disconnect (done)

Do **not** add these back:

- `@lovable.dev/vite-tanstack-config` — replaced by a standard Vite config
- `src/lib/lovable-error-reporting.ts` — editor telemetry
- `LOVABLE_API_KEY` / `https://ai.gateway.lovable.dev` — Journey summary is local text now
- `.lovable/` project metadata
- README / AGENTS.md copy that syncs commits back to Lovable

Vite now uses `@tanstack/react-start/plugin/vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, and `vite-tsconfig-paths` only.
