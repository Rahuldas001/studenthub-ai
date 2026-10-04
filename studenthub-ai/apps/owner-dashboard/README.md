# StudentHub AI — Owner Dashboard (standalone)

Standalone web dashboard where PG/hostel/restaurant owners manage their
business: register the owner account, create the business profile, run
listings through moderation, and answer student visit requests. It lives in
its own workspace — `apps/owner-dashboard` — and shares the same backend,
palette, and screen logic as the owner tools inside `apps/mobile-app`.

## Quick start

From `/home/rd/Desktop/my-app/studenthub-ai`:

```bash
npm run dev:backend     # API on http://localhost:4000 (separate terminal)
npm run dev:owner       # dashboard on http://localhost:8082
```

Open **http://localhost:8082**. Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev:owner` | Expo web dev server, port 8082 |
| `npm run test:owner-dashboard` | Helper-formula tests (`node --test`) |
| `npm run typecheck --workspace @studenthub/owner-dashboard` | TypeScript check |
| `npm run export:web --workspace @studenthub/owner-dashboard` | Static web export (`dist/web`) |

## Configuration

- `apps/owner-dashboard/.env` sets `EXPO_PUBLIC_API_BASE_URL` (default
  `http://localhost:4000/api`). Copy `.env.example` if it is missing. Use the
  computer's LAN IP for phone access.
- The backend only allows configured origins (see `backend/.env`
  `CORS_ORIGIN`) — it must include `http://localhost:8082` and
  `http://127.0.0.1:8082` for this dashboard to call the API.
- There is **no offline demo mode** here: without the API, sign-in and
  registration show a clear error instead of fake data.

## What's inside (all owner things, one place)

Sign in (`src/screens/SignIn.tsx`) with an email or phone + password, or
register an OWNER account **and** its business profile in one call
(`POST /api/auth/owner/register`): your name, email/phone, password (8+ chars),
business name (required) and business phone (optional, 10–16 digits). Signed-in
student accounts are told plainly that owner tools need an OWNER account and can
switch accounts. OWNER accounts without a business profile get the onboarding
form (`src/screens/Onboarding.tsx`, `POST /api/owner/profile`).

Complete owner accounts get the dashboard: a flat chip bar (`Dashboard.tsx`)
switches between the same screens the mobile app mounts from its own owner tab
bar, in the same order — Overview, Listings, Requests, Offers, Reviews,
Analytics, Profile, Account. Each screen is its own file in `src/screens/` and
takes the same `{ tab, form }` navigation object, so the two codebases read
near-identically; the data is the same server-backed data, so both dashboards
show identical numbers for one account.

1. **Overview** — KPI tiles (views, saves, enquiries, confirmed visits, rating,
   live promos) with 7-day deltas, a request strip, your listings, the 7-day
   views chart, promo chips and recent reviews.
2. **Listings** — status filters with counts and per-card actions: **Edit**,
   **Pause/Resume**, **Resubmit**, **Delete**. The full-screen listing form
   (`ListingForm.tsx`) covers basics (category, name, description, gender,
   facilities), location (address + latitude/longitude), price & contact (price
   + billing unit, public phone, WhatsApp number, cover image URL, opening
   hours, price band) and previews the listing card as you type. New listings
   always enter `PENDING`; editing an `ACTIVE` one sends it back for re-review.
3. **Requests** — the visit-request inbox with status filters, student details,
   and call / WhatsApp buttons; `PENDING → CONFIRMED|CANCELLED`,
   `CONFIRMED → COMPLETED|CANCELLED`.
4. **Offers** — create/edit promos (title, description, discount %, valid-till
   date, target listing or all listings), pause/resume toggles and delete.
   Nothing is stored on the device: offers live in Postgres and follow the
   account to the mobile app.
5. **Reviews** — rating histogram plus the reply inbox; one-line owner replies
   are published on the student-facing place page and can be edited or removed.
6. **Analytics** — range switch (7/30/90 days), KPI row, daily views/saves chart
   and a per-listing breakdown.
7. **Profile** — business name, phone, verification badge and the public
   directory entry, editable in place (`PATCH /api/owner/profile`).
8. **Account** — signed-in identity plus sign-out (two clicks to confirm).

Because this is a web app, `Alert.alert` dialogs are replaced by two-click
confirmations (delete listing, sign out) and there is no bottom tab bar — the
chip bar above the content does that job.

## Files

```
apps/owner-dashboard/
├── App.tsx                    # shell: header, role gate (sign-in → onboarding → dashboard)
├── index.ts                   # registerRootComponent entry
├── app.json / tsconfig.json   # Expo + TS config (web via Metro, port 8082)
├── .env(.example)             # EXPO_PUBLIC_API_BASE_URL
├── tests/owner.test.cjs       # node:test suite over the shipped helper modules
└── src/
    ├── api.ts                 # envelope-aware fetch client (token, 8s timeout)
    ├── auth.ts                # session type + login/register-owner + localStorage
    ├── owner.ts               # /api/owner/* client + listing form helpers
    ├── ownerExtras.ts         # offers, listing extras, validation (no storage)
    ├── SessionContext.tsx     # session state (signIn, signUpOwner, signOut)
    ├── OwnerContext.tsx       # profile, listings, inbox, refresh
    ├── OwnerExtrasContext.tsx # offers/reviews/analytics cache + mutations
    ├── OwnerKit.tsx           # shared owner widgets (top bar, stat tiles, pills…)
    ├── ui.tsx                 # colors, Button, Chip, Empty, PlaceImage, styles
    └── screens/
        ├── SignIn.tsx         # sign in / register business
        ├── Onboarding.tsx     # create business profile
        ├── Dashboard.tsx      # chip tab bar + listing-form swap
        ├── Overview.tsx       # KPIs, requests, listings, chart, promos, reviews
        ├── Listings.tsx       # filters, cards, edit/pause/resubmit/delete
        ├── ListingForm.tsx    # create/edit listing incl. WhatsApp/hours/band
        ├── Requests.tsx       # inbox + phone / WhatsApp actions
        ├── Offers.tsx         # promo CRUD + pause toggle
        ├── Reviews.tsx        # histogram + owner replies
        ├── Analytics.tsx      # range KPIs, daily chart, per-listing rows
        ├── Profile.tsx        # business profile editor
        └── Account.tsx        # identity + sign-out
```

## Tests
```
bash
npm run test:owner-dashboard           # from the repo root
npm test                               # from this folder
```
`tests/owner.test.cjs` transpiles and imports the real `src/ownerExtras.ts` and
`src/owner.ts` (no copies), then covers offer-draft validation, the offer
payload builder, badge/target text, live-offer expiry, the extras ⇄ API row
mapping, and the listing form round-trip including the WhatsApp / opening-hours
/ price-band fields.

## Backend API

All under `http://localhost:4000/api`, bearer token with `role: OWNER`:

- `POST /api/auth/owner/register` — account + business profile in one call.
  Body: `displayName`, `email` and/or `phone`, `password` (8+ chars),
  `businessName`, optional `businessPhone`.
- `POST /api/owner/profile` — create the business profile for an OWNER
  account that lacks one (409 when it already exists).
- `GET /api/owner/places?status=` — own listings with moderation status and
  per-place pending-request counts, plus counts by status.
- `POST /api/owner/places` — create a listing; always enters `PENDING`
  review. Only `ACTIVE` listings appear in student discovery. Accepts the
  extras fields `whatsapp`, `openingHours` and `priceBand`
  (`BUDGET` | `MID` | `PREMIUM`) alongside the core fields.
- `PATCH /api/owner/places/:id` — edit content (editing an `ACTIVE` listing
  sends it back to `PENDING`); explicit `PENDING`/`INACTIVE` only.
- `DELETE /api/owner/places/:id` — delete an owned listing.
- `GET /api/owner/visit-requests?placeId=&status=` — inbox across owned
  places with counts by status.
- `PATCH /api/owner/visit-requests/:id` — `PENDING → CONFIRMED/CANCELLED`,
  `CONFIRMED → COMPLETED`; anything else is 409.
- `GET|POST /api/owner/offers`, `PATCH|DELETE /api/owner/offers/:id` — promo
  CRUD; `PATCH {"active": false}` pauses one, `placeId: null` targets every
  listing.
- `GET /api/owner/reviews` — the reply inbox across owned listings, each row
  carrying the public review plus the owner's `reply`.
- `POST|DELETE /api/owner/reviews/:id/reply` — publish (`{"reply": "…"}`) or
  remove the owner reply shown on the student-facing place page.
- `GET /api/owner/analytics?range=7|30|90` — totals with previous-period
  deltas, daily series and a per-listing breakdown.

Auth notes: anonymous callers get 401, signed-in students get 403. Regular
student login (`POST /api/auth/login`) also returns OWNER tokens — there is
no separate owner login.

**Development login** (after `npm run db:seed`):
`demo.owner@studenthub.local` / `owner-password-123` — owns Green Valley PG.
A student account for the student app: `demo.student@studenthub.local` /
`student-password-123` (owner tools return 403 for it).

## Relationship to the mobile app

The in-app owner dashboard (`apps/mobile-app/src/screens/Owner.tsx`, reached
from the mobile sidebar → **Owner Tools**) and this standalone app are the same
feature set, screen for screen. Every owner screen is ported against a shared
`OwnerNav` shape (`{ tab, form }`), so the two implementations read
near-identically and stay easy to diff; `OwnerKit.tsx`, `ownerExtras.ts` and
`owner.ts` here mirror `src/components/OwnerKit.tsx`,
`src/utils/ownerExtras.ts` and `src/services/owner.ts` over there.

What genuinely differs:

- **Shell** — mobile uses a bottom tab bar inside the student app; this app uses
  a flat chip bar with its own header.
- **Dialogs** — `Alert.alert` confirmations become two-click confirm buttons,
  since `Alert` is a no-op on web.
- **Session storage** — mobile keeps the token in expo-file-system storage, this
  app in `localStorage`, so the two dashboards sign in independently while
  reading and writing the same Postgres rows.

Full student/admin setup notes live in
`/home/rd/Desktop/my-app/studenthub-ai/README.md`.
