# Synlumae

Activities, schedules, journey tracking, help, and a community feed for neurodiverse families.

Public brand: **Synlumae** (synlumae.com). GitHub repository is still `slooijenstein-blip/neurohelper`.

## Run locally

```sh
npm i
cp .env.example .env.local   # then paste your Clerk keys (see Auth setup)
npm run dev
npm test
```

Open [http://localhost:8080/](http://localhost:8080/).

## Auth setup (Clerk)

Slice 1 uses [Clerk](https://clerk.com) for email sign-up, sign-in, password reset, and sessions.

This app is a **Vite / TanStack Start SPA**. The matching Clerk SDK is **`@clerk/react`** (client-side). We do **not** use `@clerk/tanstack-react-start` here, because that SDK expects server middleware — GitHub Pages cannot run that.

### 1. Create a Clerk application

1. Sign in at [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Create an application named Synlumae
3. Enable **Email** sign-in (password + email code is Clerk’s default)

### 2. Environment variables

Copy `.env.example` to `.env.local` (never commit `.env.local`):

| Variable                     | Where it is used   | Notes                                                                                                                                                                                                |
| ---------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Browser (required) | Starts with `pk_test_` (dev) or `pk_live_` (production). Safe to expose in the client. Vite only exposes variables that start with `VITE_`.                                                          |
| `CLERK_SECRET_KEY`           | Server only        | Starts with `sk_test_` or `sk_live_`. **Do not** prefix this with `VITE_`. This static SPA does not read it at runtime; keep it for the Clerk Dashboard, webhooks, and a future host such as Vercel. |

Optional (the app also sets these from Vite `BASE_URL`):

- `VITE_CLERK_SIGN_IN_URL` — default `/sign-in`
- `VITE_CLERK_SIGN_UP_URL` — default `/sign-up`

In the Clerk Dashboard → **Paths** / allowed origins, add:

- Development: `http://localhost:8080`
- Later production: `https://synlumae.com` (and the Vercel URL)

### 3. How to test (simple)

1. `cp .env.example .env.local`, paste your Clerk publishable key, then `npm run dev` and open http://localhost:8080 — you should land on **Sign in**
2. Click **Sign up**, use your email and a password, complete Clerk’s email check
3. You should see the Activities / Schedule / Journey / Community / **Help** / Profile tabs (desktop sidebar + mobile tab bar)
4. Open **Help** — the caregiver help hubs should still be there
5. Refresh the page — you should still be signed in
6. On the sign-in screen, click **Forgot password**, follow the email, set a new password
7. Open **Profile** — tap **Edit profile** to change your name, role, location, and bio. Those save on this device; your name is also sent to Clerk (not child details). **Manage account** opens Clerk for email/password. Child first name/age stay on this device. Click **Log out** — you should return to sign-in; refresh should stay signed out
8. “Continue as Sam” appears **only** with `npm run dev` (not in production builds)

Child first name / age stay in this browser (`localStorage` key `motor-skill-buddy-v1`). They are not sent to Clerk.

## Shared schedules (Slice 2)

Parents can add a child (first name + age band), build a day plan, and invite others by email.

**Storage choice:** there is no app database yet. Sharing uses a Clerk-authenticated `/api/family` endpoint on Vercel. Child records, memberships, invites, and day plans are stored in the invited users’ Clerk **private metadata** (server-only, via `CLERK_SECRET_KEY`). That is the smallest durable store that works with the current static SPA + Clerk setup and does not add a second auth system.

Known limits: Clerk metadata is small (~8KB per user), so we keep about three weeks of day plans. GitHub Pages has no API, so sharing is local-only there. Production sharing is on [synlumae.com](https://synlumae.com).

### How to try it locally

1. Put `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local`
2. `npm run dev` and sign in
3. Open **Children** → add a child → **Invite** someone by email (copy the link)
4. Open **Schedule** (Day) → **Start a 1-hour afternoon plan**
5. The invited person signs in with that email, opens the invite link, and sees the same plan

Without `CLERK_SECRET_KEY`, the Children/Schedule UI still works on this device only (including **Continue as Sam** in `npm run dev`).

### Env vars

| Variable                     | Where                  | Notes                                                             |
| ---------------------------- | ---------------------- | ----------------------------------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Browser                | Unchanged from Slice 1                                            |
| `CLERK_SECRET_KEY`           | Server (`/api/family`) | Now required for cross-user sharing on Vercel                     |
| `CLERK_AUTHORIZED_PARTIES`   | Server, optional       | Extra JWT origins. localhost and synlumae.com are already allowed |

Do not change DNS, the Vercel domain, or Clerk’s Primary/Frontend API domain.

## Production

```sh
npm run build
```

Static output is in `dist/client` (`index.html` plus hashed `/assets`).

### Vercel

This app is a **static SPA**. `vercel.json` sets Framework to Other, Output Directory to `dist/client`, and rewrites client routes to `/index.html` (hashed `/assets/*` are still served as files).

Do not add the `nitro()` Vite plugin for this host. Nitro’s Vercel preset writes `.vercel/output` (Build Output API) and can replace that static publish with an empty deploy. Clerk env var names stay `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`.

### GitHub Pages vs Clerk

Live Pages URL: [https://slooijenstein-blip.github.io/neurohelper/](https://slooijenstein-blip.github.io/neurohelper/).

`npm run deploy:pages` still publishes the static SPA. Clerk **development** keys (`pk_test_`) only work on **localhost**. They will not complete sign-in on `github.io`.

Workable path today:

1. Test auth with `npm run dev` (and `npm run preview` on localhost)
2. Keep GitHub Pages as a static preview of the UI
3. For real production sessions, move the host to **Vercel** (or similar) on **synlumae.com**, create a Clerk **production** instance (`pk_live_` / `sk_live_`), and add that domain in the Clerk Dashboard

To bake a publishable key into a Pages build, export `VITE_CLERK_PUBLISHABLE_KEY` in the shell before `npm run deploy:pages`. Never put `CLERK_SECRET_KEY` in a client build.

See [cursor-migration.md](cursor-migration.md) for a codebase overview.
