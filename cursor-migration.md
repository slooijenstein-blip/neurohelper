# Cursor migration — NeuroHelper

This project was built in Lovable.dev. create a 'cursor-migration.md' file that gives me a clear overview of this codebase and contains these instructions.

Keep this file in the repo. When working in Cursor, treat the quote above as standing instructions: maintain this overview, and do not reintroduce Lovable-specific packages, telemetry, or APIs.

## What this app is

**NeuroHelper** is a phone-framed web app for parents, teachers, therapists, and caregivers. Demo data lives in the browser (`localStorage` key `motor-skill-buddy-v1`). There is no database.

Live (GitHub Pages): https://slooijenstein-blip.github.io/neurohelper/

## Stack

- React 19 + TypeScript
- TanStack Start / Router / Query (file-based routes in `src/routes/`)
- Vite 8 + Tailwind CSS 4
- shadcn/ui (Radix) in `src/components/ui/`
- Client SPA production build (`spa.enabled` in `vite.config.ts`) for static hosting

## Layout

```
src/
  routes/           # TanStack file routes. index.tsx is `/`. __root.tsx is the shell.
  router.tsx        # createRouter; respects Vite BASE_URL for GitHub Pages
  server.ts         # SSR fetch wrapper (dev / Start server)
  start.ts          # Start middleware (errors + CSRF for leftover server fns)
  lib/
    app-store.tsx   # Profiles, schedule, community seed data, persistence
    activities-data.ts
    journey.functions.ts  # Local (non-AI) progress summary
  components/app/   # Product UI: tabs, login, community, schedule
  components/ui/    # Shared primitives
  styles.css
```

## Screens (tabs)

| Tab | File | Role |
| --- | --- | --- |
| Login | `LoginScreen.tsx` | Continue as Sam or create a profile |
| Activities | `ActivitiesTab.tsx` | Filterable library (age range slider, skills) |
| Schedule | `ScheduleTab.tsx` | Daily routine, templates, calendar share |
| Journey | `JourneyTab.tsx` | Child progress, observations, local summary |
| Community | `CommunityTab.tsx` | Posts, articles, follow |
| Profile | `ProfileTab.tsx` | Identity, child, reset / switch identity |

State is provided by `AppStoreProvider` in `src/routes/index.tsx`.

## Commands

```sh
npm i
npm run dev      # http://localhost:8080
npm run build    # dist/client (copy `_shell.html` → `index.html` + `404.html` for Pages)
npm run lint
```

GitHub Pages needs `BASE_PATH=/neurohelper/` at build time.

## Lovable disconnect (done)

Do **not** add these back:

- `@lovable.dev/vite-tanstack-config` — replaced by a standard Vite config
- `src/lib/lovable-error-reporting.ts` — editor telemetry
- `LOVABLE_API_KEY` / `https://ai.gateway.lovable.dev` — Journey summary is local text now
- `.lovable/` project metadata
- README / AGENTS.md copy that syncs commits back to Lovable

Vite now uses `@tanstack/react-start/plugin/vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, and `vite-tsconfig-paths` only.
