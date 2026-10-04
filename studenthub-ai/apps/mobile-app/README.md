# StudentHub AI — universal Expo app

Single student frontend for Android, iOS **and web**. The historical directory
name is retained; there is no separate Vite app.

From `/home/rd/Desktop/my-app/studenthub-ai`:

```bash
npm run dev:web       # http://localhost:8081
npm run dev:mobile    # Expo Go / device QR
npm run build:web    # static web assets
npm run build:mobile # all-platform JavaScript/assets, not APK/IPA
```

Uses Expo SDK 57 and Metro. Optional API configuration belongs in
`/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/.env` as
`EXPO_PUBLIC_API_BASE_URL`. Use the computer's LAN IP for phones, not localhost.
There is **no offline demo dataset**: without a reachable API the app shows an
explicit error rather than fake listings. API failures fall back after an
eight-second timeout and the source line explains what went wrong.

Search/category filters work. AI is a fixed example. Student accounts are in:
**Get Started** (`src/screens/Auth.tsx`) offers registration and login (email or
phone + password), and Profile keeps the session actions (sign out, show welcome
again); signed-in students get server-persisted favorites and visit requests.
An account is required — guest exploration has been removed. The Home map uses
Leaflet and OpenStreetMap in a web
iframe/native WebView, with category-filtered markers. Internet is required for
map assets and tiles.

Phase 1 screen flow: **Welcome → Get Started → registration/login → Home**.
Registration asks for **location permission** so discovery can centre on the
nearest campus; the chosen city is stored on the account.
Welcome → **List your business** opens the **business welcome** (the "Grow Your
Business With Students" hero), whose **Create Business Profile** and **Sign In**
buttons open owner registration/sign-in (OWNER account plus business profile in
one call). Both paths land on the owner dashboard, and any OWNER session always
opens it. Signing out from the owner or admin tools returns to the Welcome screen.
The Welcome/sign-in flow shows once per device; saved places, visit plans and
history stay on this device. The Home
location row opens the college picker (`src/screens/Campus.tsx`); there is no
hamburger/slide-out menu — navigation is the bottom tabs plus Profile.

Place pages show the reviews list with a write-a-review form
(`POST /api/reviews`; needs the API). Profile → History keeps the last 20
opened places on this device. The Home map asks for device location
(`expo-location`), centers on it with a "you are here" marker, and says so in
its caption; denial falls back to the campus view. The filter panel adds a
maximum budget, sort by rating/distance/price, and a PG/hostel gender
preference (food and services stay visible under any preference).

## Owner tools (Phase 2)

Sidebar → **Owner Tools** opens the in-app owner dashboard
(`src/screens/Owner.tsx`), backed by the owner APIs:

- Sign in with an OWNER account, or register a business in one step
  (`POST /api/auth/owner/register`). Student accounts see a hint to switch.
- OWNER accounts without a business profile get an onboarding form
  (`POST /api/owner/profile`).
- **Listings** tab: status-filtered cards with pending-request counts; add a
  listing (enters `PENDING` review), edit name/address/price (edits send an
  `ACTIVE` listing back to `PENDING`), unpublish/resubmit, delete.
- **Requests** tab: visit-request inbox; confirm/decline pending requests,
  mark confirmed ones completed, cancel. Filters re-query the API.

Dev logins after `npm run db:seed`:

- Student: `demo.student@studenthub.local` / `student-password-123` — lands on
  the student tabs (Home, Saved, Bookings, Profile).
- Owner: `demo.owner@studenthub.local` / `owner-password-123` (owns Green Valley
  PG) — lands on the owner dashboard.

Completing **Welcome → List your business** registers the OWNER account and
lands on the owner dashboard right away; sign-in is role-driven, so an OWNER
session always opens the owner dashboard and a student session always opens the
home tabs.

The same owner tooling also ships as a standalone web app in
`/home/rd/Desktop/my-app/studenthub-ai/apps/owner-dashboard` —
`npm run dev:owner` serves it on **http://localhost:8082** (see its README for
setup, features, and the API reference).

## Admin tools (Phase 3)

Sidebar → **Admin Panel** opens the moderation console
(`src/screens/Admin.tsx`), backed by the admin APIs:

- Role gate: anonymous visitors get a sign-in form, signed-in students/owners
  are told plainly that an admin account is required (no form that would 403).
- **Overview strip**: listings pending review, live listings, students, and
  verified/total businesses (`GET /api/admin/overview`).
- **Moderation** tab: status filters (pending/live/rejected/unpublished/all)
  with counts. Approve, reject or unpublish a listing — only legal transitions
  are offered; deleting removes any listing (`GET/PATCH/DELETE
  /api/admin/places`). `PENDING` is not a moderation target, so owners
  resubmit instead.
- **Businesses** tab: owner account, email, listing count and verification
  state; verify or remove verification (`GET/PATCH /api/admin/owners`).
- **Colleges** tab: the launch geography with listing counts and a form to add
  a college (`GET/POST /api/admin/colleges`).

Dev admin login after `npm run db:seed`:
`demo.admin@studenthub.local` / `admin-password-123`.
Admins need the API configured (`EXPO_PUBLIC_API_BASE_URL`) — there is no
offline mode for the console.

## Store release (Android / iOS)

The app is configured for **EAS Build** and store submission:

| File | Purpose |
|---|---|
| `app.json` | Bundle IDs (`com.studenthub.ai`), `version`/`buildNumber`/`versionCode`, location permission strings, splash, config plugins |
| `eas.json` | `development` / `preview` / `production` build profiles + submit config |
| `store/ios/en-US/` | App Store listing copy in fastlane `deliver` layout |
| `store/android/` | Play listing copy + Data safety form answers |
| `../../docs/privacy-policy.md` | Privacy policy (host it publicly before submitting) |
| `RELEASE.md` | **Step-by-step runbook** |

```bash
npm run config:check   # validate app.json + plugins
npm run build:apk      # Android APK (preview/sideload)
npm run build:ios      # iOS, App Store profile
npm run build:android  # Android AAB for Play
npm run submit:ios
npm run submit:android
```

`eas-cli` is a devDependency, so `npx eas-cli …` works without a global install.
Nothing is buildable until you run `npx eas-cli login` and `npx eas-cli init`
(creates the EAS project ID), and the backend must be on a real HTTPS host first —
`EXPO_PUBLIC_API_BASE_URL` is inlined into the bundle, so it cannot be changed by
an OTA update. See `RELEASE.md` for the full checklist, screenshot requirements
and review notes.


Full setup/CORS notes: `/home/rd/Desktop/my-app/studenthub-ai/README.md`.