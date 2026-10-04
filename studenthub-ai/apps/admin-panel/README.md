# StudentHub AI — Admin Panel (standalone)

Standalone web console where StudentHub staff moderate the marketplace: approve
or reject owner listings, verify businesses and manage the colleges that anchor
student discovery. It lives in its own workspace — `apps/admin-panel` — and
shares the same backend, palette and screen logic as the admin tools inside
`apps/mobile-app`.

## Quick start

From `/home/rd/Desktop/my-app/studenthub-ai`:

```bash
npm run dev:backend     # API on http://localhost:4000 (separate terminal)
npm run dev:admin       # admin panel on http://localhost:8083
```

Open **http://localhost:8083**. Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev:admin` | Expo web dev server, port 8083 |
| `npm run test:admin-panel` | Moderation-rule + API-client tests (`node --test`) |
| `npm run typecheck --workspace @studenthub/admin-panel` | TypeScript check |
| `npm run export:web --workspace @studenthub/admin-panel` | Static web export (`dist/web`) |

## Configuration

- `apps/admin-panel/.env` sets `EXPO_PUBLIC_API_BASE_URL` (default
  `http://localhost:4000/api`). Copy `.env.example` if it is missing. Use the
  computer's LAN IP for phone access.
- The backend only allows configured origins (see `backend/.env`
  `CORS_ORIGIN`) — it must include `http://localhost:8083` and
  `http://127.0.0.1:8083` for this console to call the API.
- There is **no offline demo mode** here: without the API, sign-in and every
  screen show a clear error instead of fake data. A small, clearly-badged set
  of **sample** values covers the few dashboard widgets the API cannot feed
  (see *Sample data* above); it is off with one click.

## Signing in

There is **no admin self-registration**, by design: an admin is an ordinary
account with `role: ADMIN`, so sign-in (`src/screens/SignIn.tsx`) posts to the
shared `POST /api/auth/login` with an email or phone + password. The gate is the
same rule as the in-app console:

- not signed in → the sign-in form.
- signed in as STUDENT or OWNER → the sign-in form with a plain note that the
  console needs an ADMIN account (the account itself is untouched).
- signed in as ADMIN → the console.

Sessions persist in `localStorage` under `studenthub-admin-session`, so the
panel remembers the login across reloads and signs out with one click.

**Development login** (after `npm run db:seed`):
`demo.admin@studenthub.local` / `admin-password-123`.

## What's inside

The console is a sidebar dashboard (`src/screens/Dashboard.tsx`): a branded
sidebar (nav, **Quick Stats**, a Premium card, **Log Out**), a top bar (global
search with **Ctrl/Cmd + K**, notifications, the signed-in admin with an online
dot, a **Sample data** toggle) and a welcome header with a working date-range
control. Eleven sidebar entries each mount a real, API-backed screen; badges
keep live counts visible and the header's **⟳ Refresh** re-reads every payload
at once.

1. **Dashboard** (`Overview.tsx`) — the reference layout: four KPI cards with
   sparklines (users, listings, bookings, reviews), a **Categories
   Distribution** donut, a **Platform Growth** line chart, quick actions, a
   **Recent Listings** table, a **Recent Bookings** table, a notifications
   panel, **Top Categories**, **Top Rated Places**, a projection-only **Live
   Map** and the **Business Owner Requests** queue (verify inline).
2. **Users** (`Users.tsx`) — accounts grouped by role, plus the owner roster.
3. **Listings** (`Listings.tsx`) — the moderation queue: status filters with
   counts (`Pending`, `Active`, `Rejected`, `Unpublished`, `All`), text search
   from the header, and per-row **Approve**, **Reject**, **Unpublish** and
   **Delete**. Buttons follow the backend's legal transitions (an `ACTIVE`
   listing offers Unpublish, not Approve) and delete takes a second click.
4. **Bookings** (`Bookings.tsx`) — visit requests by status. The API stores
   counts, not named rows, so the per-student table is a sample surface.
5. **Reviews** (`Reviews.tsx`) — listings ranked by review volume, with the
   review-weighted average rating.
6. **Categories** (`Categories.tsx`) — the category donut, legend and shares.
7. **Analytics** (`Analytics.tsx`) — listings and visits by status plus the
   category mix; the growth chart falls back to real counts with sample off.
8. **Business Owners** (`Businesses.tsx`) — every owner account with its
   listings, contact and join date, plus a verified/unverified toggle.
9. **Colleges** (`Colleges.tsx`) — add a campus (name, city, state, latitude,
   longitude, prefilled for Guwahati) above the list and its listing counts.
   Duplicate name + city comes back as a 409 and is shown inline.
10. **Reports** (`Reports.tsx`) — live summaries that download as CSV, built
    from the same payload the screen renders.
11. **Settings** (`Settings.tsx`) — the signed-in admin, the API connection and
    the sample-data switch.

### Sample data

A few of the reference dashboard's widgets need data the backend does not
store: a month-over-month growth series, the per-cent deltas, named booking
rows and a notification stream. Those values live in `src/sample.ts`, are
badged **SAMPLE**, and render only while the header's **Sample data** toggle is
on (on by default). Everything derived from real rows — the donut, the recent
listings, the top-rated leaderboard, the mini-map, the counts — is live whether
the toggle is on or off. Turn it off for a strictly real-data view; the
dashboard then substitutes honest equivalents (listings by category instead of
the growth line, visit-request statuses instead of named bookings).

## Files

- `App.tsx` — session gate: sign-in form, or the console for ADMIN tokens
- `src/api.ts` — fetch client for the `{ success, data }` envelope
- `src/auth.ts` — login + `localStorage` session load/save/clear
- `src/SessionContext.tsx` — session state and hydration
- `src/admin.ts` — `/api/admin/*` API client (+ filter and status constants)
- `src/AdminContext.tsx` — overview + queue + owners + colleges, one refresh,
  plus the **Sample data** toggle
- `src/adminExtras.ts` — pure rules behind the moderation UI (stat tiles,
  status rows, moderation buttons, college validation), unit-tested
- `src/dashboardData.ts` — pure dashboard derivations (category mix, ratings
  leaderboard, review totals, status summaries, activity feed, map projection),
  unit-tested
- `src/sample.ts` — fenced sample fixtures for the widgets the API cannot feed
- `src/kit.tsx` — dashboard kit (cards, stat cards, sparklines, line chart,
  donut, mini-map, quick actions)
- `src/ui.tsx` — shared cards, buttons, chips, status pills, thumbnails
- `src/screens/{Dashboard,Overview,Users,Listings,Bookings,Reviews,Categories,Analytics,Businesses,Colleges,Reports,Settings,SignIn}.tsx`
- `tests/admin.test.cjs` — runs the real modules through the TypeScript
  transpiler: moderation transitions, stat + dashboard derivations, sample
  integrity, college validation, session round-trips and every service
  path/method/body

## Backend API

All under `http://localhost:4000/api`, bearer token with `role: ADMIN`:

- `GET /api/admin/overview` — platform counters: users by role, listings by
  status, visit requests by status, verified/total businesses.
- `GET /api/admin/places?status=` — moderation queue with previews and counts;
  `status` is one of `PENDING`, `ACTIVE`, `REJECTED`, `INACTIVE`.
- `PATCH /api/admin/places/:id` — `ACTIVE`, `REJECTED` or `INACTIVE` only.
  `PENDING` is rejected with 400 (owners resubmit instead) and repeating the
  current status is a 409.
- `DELETE /api/admin/places/:id` — removes any listing.
- `GET /api/admin/owners?verified=` — businesses with account details and
  listing counts, plus verified/unverified counts.
- `PATCH /api/admin/owners/:id` — `{ "verified": true | false }`; repeating the
  current value is a 409.
- `GET /api/admin/colleges` — launch geography with listing counts.
- `POST /api/admin/colleges` — name, city, state, latitude, longitude; 409 when
  the name already exists in that city.

Auth notes: anonymous callers get 401, students and owners get 403. Admin
accounts are ordinary accounts with `role: ADMIN`, so
`POST /api/auth/login` issues the token — there is no separate admin login.

## Relationship to the mobile app

The in-app console (`apps/mobile-app/src/screens/Admin.tsx`, reached from the
mobile sidebar → **Admin Panel**) and this standalone app are the same feature
set, screen for screen: same `/api/admin/*` payloads, same moderation rules, so
an action performed in either console is immediately visible in the other (both
re-read the four payloads after every change). The shared logic is ported, not
re-invented: `src/admin.ts` and `src/AdminContext.tsx` here mirror
`src/services/admin.ts` and `src/context/AdminContext.tsx` there, and
`src/ui.tsx` mirrors the `src/components/ui.tsx` kit the mobile console uses.

What genuinely differs:

- **Shell** — mobile mounts the console as a page inside the student app, with an
  Overview strip of KPI tiles above three chip tabs; this app owns the window
  and uses a sidebar with count badges.
- **Dialogs** — the mobile console deletes a listing on the first tap; here
  delete asks for a second click, because a web click is cheap to misplace and
  the delete cannot be undone.
- **Extracted rules** — the mobile console keeps its moderation rules, counters
  and college validation inline in `Admin.tsx`; this app puts them in the pure
  `src/adminExtras.ts` and `src/dashboardData.ts` so they can be unit-tested
  without rendering.
- **Surface area** — this app adds the Users, Bookings, Reviews, Categories,
  Analytics and Reports screens the mobile console folds into its Overview
  strip, and a full dashboard atop the same four `/api/admin/*` payloads.
- **Session storage** — mobile reuses the student app's session; this app keeps
  its own `localStorage` key, so the two consoles sign in independently while
  reading and writing the same Postgres rows.
- **Tests** — both consoles have a `tests/admin.test.cjs`. The mobile one
  asserts the endpoints, verbs and bodies of `src/services/admin.ts`; this app's
  suite covers the same wire contract *and* exercises the extracted rules
  (`src/adminExtras.ts`) directly.

Full student/owner setup notes live in
`/home/rd/Desktop/my-app/studenthub-ai/README.md`.
