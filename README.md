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
| `CLERK_SECRET_KEY`           | Server only (`/api/share`) | Starts with `sk_test_` or `sk_live_`. **Do not** prefix this with `VITE_`. Required on Vercel so Pro can send Clerk invitation emails. |

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

## Pro invites (preview only)

A Clerk user with **Pro** turned on can invite a parent by email from the **Pro** tab. The parent signs in and sees that plan under **Schedule → Shared with you**. Parents do not get a Pro tab.

This stays off production until the preview branch is merged. GitHub Pages and synlumae.com are unchanged by the preview itself.

### Mark one therapist as Pro

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → **Users**
2. Open the therapist account
3. **Public metadata** → set `{ "isPro": true }` and save
4. That person signs out and back in on the preview

`isPro` must be the boolean `true`, not the text `"true"`.

### Vercel env vars for the preview

Set these on the **neurohelper** project for **Preview** (and Production only if you later want this on synlumae.com). Do not put them in git.

| Variable | Required | Where it comes from |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk → API keys. Already used by the app. |
| `CLERK_SECRET_KEY` | Yes, for live invites | Clerk → API keys. Server only. Starts with `sk_test_` or `sk_live_`. |
| `UPSTASH_REDIS_REST_URL` | Yes, for live invites | Vercel → Storage → Upstash Redis / KV. |
| `UPSTASH_REDIS_REST_TOKEN` | Yes, for live invites | Same store. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Alias | Used if the Upstash names are not set. |
| `CLERK_AUTHORIZED_PARTIES` | No | Only if session checks reject the preview host. |

Create the database with **Vercel → Storage → Create → Upstash Redis** (Marketplace) and connect it to this project. Vercel injects the REST URL and token. No SQL schema.

Open `https://<preview>/api/share/health`. A ready preview looks like `{ "ok": true, "clerk": true, "store": "redis" }`.

### Clerk email and redirect URLs

Invites use Clerk’s Backend API (`invitations.createInvitation`, `notify: true`). The email is Clerk’s standard invitation, not a custom template. It does **not** include a child’s last name or other detail — only a link back to this app.

In Clerk → **Configure → Developers → Paths / Redirect URLs** (and **Domains → Allowed origins** if sign-in says the host is not allowed), add the preview origin, for example:

- `https://<preview-host>.vercel.app`
- `https://<preview-host>.vercel.app/invite/*` if the dashboard asks for a path

Do **not** change the Clerk primary / Frontend API domain. Do **not** change DNS or synlumae.com.

If the person **already has a Clerk account**, Clerk will not send another invitation email. The invite is still saved. Copy the link, or ask them to sign in with that email — the plan shows up on Schedule. In Clerk **Development**, also check spam. If no email arrives, open Clerk → **Users → Invitations** to see whether Clerk accepted it.

### How Sam tries it

1. Open the Vercel preview for this pull request (not synlumae.com, not GitHub Pages).
2. Hard-refresh and sign in. **Continue as Pro** is not on this preview. It exists only in local `npm run dev`, and it does not call the live share API.
3. Sign in as the therapist whose public metadata has `"isPro": true`. Confirm **Activities** and **Pro** are both there. A profile role tag does not add the Pro tab.
4. **Pro** → add a patient (first name + age band) → open them → **Plans** → **Apply** the weekday calm-hour template to today → **Share** → invite the parent’s email.
5. The parent opens the email (or the copied link), creates an account or signs in with that email, and opens **Schedule**. **Shared with you** shows the plan. There is no Pro tab.
6. **Profile → Log out** on each account between the two sign-ins.
7. On a signed-in account that is **not** Pro, open **Profile**. **Synlumae Pro for professionals** is a short request form (not a banner on Activities). Submit it. The status becomes **Pending**. Pro stays off until you set Clerk public metadata `isPro` to `true`, then that person signs out and back in. The status then shows **Approved**.
8. Sign in as **samlooijenstein@gmail.com** and open **Profile** to see **Pro requests waiting**. That list is the review inbox. Approval is still done by hand in Clerk. A role tag of Therapist does not grant Pro.

## Production

```sh
npm run build
```

Static output is in `dist/client` (`index.html` plus hashed `/assets`).

### Vercel

This app is a **static SPA** plus one Node function, `/api/share`, for Pro invites. `vercel.json` sets Framework to Other, Output Directory to `dist/client`, and rewrites client routes to `/index.html` (hashed `/assets/*` and `/api/*` are not rewritten to the shell).

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
