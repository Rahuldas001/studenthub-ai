# StudentHub AI

**Everything a Student Needs** — student discovery around Gauhati University,
Guwahati, Assam.

## One student app: Android, iOS and web

Expo SDK 57, React Native, React Native Web and TypeScript now power all three
platforms through Metro. The single frontend is at
`/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app`. The historical folder name
is retained, but it is a universal app. The separate Vite app has been removed.
The Express API, PostgreSQL/Prisma setup and shared contracts remain.

Current scope: Welcome → Get Started → registration/login (or Continue as
guest), Home with search plus budget/sort/gender
filters, demo cards, optional API loading with offline fallback, mock AI and
cross-platform future-feature notices.
Student accounts are live: register/login (email or phone + password), bearer
sessions, and server-persisted favorites plus visit requests for signed-in
students. All bundled listings are **fictional and unverified**.

**Ported from the former Vite app:** the Welcome screen flow,
full place pages (details from `GET /places/:id`, reviews list + write-a-review
form), advanced filters (maximum budget, sort by rating/distance/price, and a
PG/hostel gender preference) and the saved-list flow (Saved tab, server-synced
for signed-in students). Payments, real AI and bookings remain deferred.

Home now includes Leaflet/OpenStreetMap in a web iframe/native WebView, showing
the college and category-filtered places without an API key. Map assets and tiles
require internet. Device geolocation (expo-location) centers the map on the
user with a "you are here" marker, falling back to campus on denial. Place
pages include the reviews list and a write-a-review form (`POST /api/reviews`);
Profile → History keeps the last 20 viewed places on-device.
## Run

Requires Node **22.13+**, npm, and optionally Docker for PostgreSQL.

```bash
cd /home/rd/Desktop/my-app/studenthub-ai
npm run setup
npm run dev
```

Open **http://localhost:8081**. This starts Expo web and the API on port 4000.
No database or API key is required for the offline student demo.

| Command | Purpose |
| --- | --- |
| `npm run dev:web` | Expo web only, port 8081 |
| `npm run dev:student` | Alias for Expo web |
| `npm run dev:owner` | Owner dashboard web app, port 8082 |
| `npm run dev:admin` | Admin panel web console, port 8083 |
| `npm run dev:mobile` | Expo terminal/QR for Expo Go |
| `npm run dev:android` | Launch Android emulator/device |
| `npm run dev:ios` | Launch iOS simulator (macOS required) |
| `npm run dev:backend` | API only |
| `npm run typecheck` | All workspace TypeScript checks |
| `npm run build` | Compile backend and export Expo web |
| `npm run build:web` | Export static web assets |
| `npm run build:mobile` | Export Android, iOS and web bundles |

For a phone, run `npm run dev:mobile`, scan the QR with a compatible Expo Go
version (SDK 57), and keep phone and computer on the same network. Linux cannot
run an iOS simulator locally. Exports are JavaScript/assets, **not APK/IPA
binaries** or a substitute for testing on a physical device.

Web output: `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/dist/web`.
All-platform output: `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/dist/all`.
Serve the web output with a static host; use HTTPS for deployed APIs.

## Environment

`npm run setup:env` creates missing workspace `.env` files without overwriting
existing files. Environment files are gitignored.

- `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/.env`: optionally set
  `EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api` for web. Use your computer's
  LAN IP on a physical phone, or `10.0.2.2` on Android Emulator. Unset means
  offline demo. Restart Expo after editing.
- `/home/rd/Desktop/my-app/studenthub-ai/backend/.env`: set
  `CORS_ORIGIN` to every web origin that calls the API — the Expo web app, the
  owner dashboard (port 8082) and the admin panel (port 8083):
  `CORS_ORIGIN=http://localhost:8081,http://127.0.0.1:8081,http://localhost:8082,http://127.0.0.1:8082,http://localhost:8083,http://127.0.0.1:8083`.
  **Existing setups must replace the old port 5173 origin**, as setup does not
  overwrite local configuration. Add exact LAN/deployed web origins as needed.
  `PORT` defaults to 4000; `DATABASE_URL` configures PostgreSQL. Set
  `AUTH_SECRET` to a long random value in any shared deployment; the default
  development secret only signs local tokens.

Never put credentials in `EXPO_PUBLIC_` variables: they are bundled into the
client. Database/provider secrets belong on the backend.

Optional database setup:

```bash
npm run db:up
npm run db:push
npm run db:seed
```

Use `db:migrate` for migrations, `db:generate` for Prisma client generation,
`db:studio` for inspection and `db:down` to stop the container. Backend reads
support a demo fallback. This is a development foundation, not production auth.

Seeded development logins (`npm run db:seed`): `demo.student@studenthub.local` /
`student-password-123` (student app), `demo.owner@studenthub.local` /
`owner-password-123` (owner dashboard) and `demo.admin@studenthub.local` /
`admin-password-123` (admin panel).

## Architecture

- API: `/home/rd/Desktop/my-app/studenthub-ai/backend`
- Shared types: `/home/rd/Desktop/my-app/studenthub-ai/packages/types`
- Owner dashboard UI (in-app, Expo):
  - `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/src/screens/Owner.tsx` — dashboard screen (sidebar → Owner Tools)
  - `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/src/context/OwnerContext.tsx` — owner state (profile, listings, inbox)
  - `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/src/services/owner.ts` — `/api/owner/*` API client
  - `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/src/services/auth.ts` — owner registration (`/api/auth/owner/register`)
  - `/home/rd/Desktop/my-app/studenthub-ai/apps/owner-dashboard` — standalone owner dashboard (Expo web, port 8082): the same owner screens as the in-app tools — overview, listings + editor, visit requests, offers, reviews, analytics, profile, account — over the same `/api/owner/*` data
- Admin console UI (in-app, Expo):
  - `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/src/screens/Admin.tsx` — console screen (sidebar → Admin Panel)
  - `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/src/context/AdminContext.tsx` — moderation/owners/colleges state
  - `/home/rd/Desktop/my-app/studenthub-ai/apps/mobile-app/src/services/admin.ts` — `/api/admin/*` API client
  - `/home/rd/Desktop/my-app/studenthub-ai/apps/admin-panel` — standalone admin console (Expo web, port 8083): a full sidebar dashboard (KPI cards, category donut, growth chart, recent listings/bookings, mini-map, verification queue) plus Users, Listings, Bookings, Reviews, Categories, Analytics, Business Owners, Colleges, Reports and Settings screens — all over the same four `/api/admin/*` payloads. A badged **Sample data** toggle fills the few widgets the API cannot feed

API base: `http://localhost:4000/api`. Check `GET /health`, `GET /places` and
`GET /places/:id`. Responses use `{ "success": true, "data": ... }` or
`{ "success": false, "message": ... }`. Accounts: `POST /api/auth/register`,
`POST /api/auth/login` (email or phone), `GET /api/auth/me` (bearer token) and
`POST /api/auth/logout`. Signed-in favorites/reviews/visit requests persist in
PostgreSQL; guests keep device-local data with no account required.