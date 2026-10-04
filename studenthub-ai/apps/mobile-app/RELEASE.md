# Release runbook — App Store & Google Play

Everything the repo can prepare is ready. The steps below marked **[external]**
need accounts, money or a hosted backend that only you can provide.

---

## 0. Status

| Item | Status |
|---|---|
| `app.json` — bundle IDs, versions, permissions, splash, plugins | ✅ done |
| `eas.json` — dev / preview / production profiles | ✅ done |
| `eas-cli` installed as a devDependency (v24.10.0) | ✅ done |
| Build & submit npm scripts | ✅ done |
| Privacy policy draft | ✅ `docs/privacy-policy.md` |
| App Store listing copy (fastlane `deliver` layout) | ✅ `store/ios/en-US/` |
| Play listing copy + Data safety answers | ✅ `store/android/` |
| Screenshots | ❌ **[external]** — cannot be captured headlessly |
| Expo account + EAS project ID | ❌ **[external]** |
| Apple Developer Program / Play Console | ❌ **[external]** |
| Production API host | ❌ **[external]** — the app currently points at `localhost` |
| Deployment config (Dockerfile + compose + env template) | ✅ shipped — **Dockerfile itself untested** (no Docker here) |
| Account deletion endpoint | ✅ `DELETE /api/auth/account` + Profile → Delete account |

---

## 1. One-time setup **[external]**

```bash
cd apps/mobile-app
npx eas-cli login              # create a free account at expo.dev
npx eas-cli init               # creates the EAS project, writes projectId into app.json
npx eas-cli build:configure
```

`eas init` fills in `expo.extra.eas.projectId`. That ID links builds to your
Expo project — without it every `eas build` fails.

Then create the store records:

- **Apple**: enroll at <https://developer.apple.com/programs/> — **USD 99/year**
  → App Store Connect → *My Apps* → **+** → New App → note the App ID.
- **Google**: register at <https://play.google.com/console> — **USD 25 one-time**
  → *All apps* → *Create app* → note the package name `com.studenthub.ai`.

Put both IDs into `eas.json` under `submit.production`.

---

## 2. Host the backend **[external] — blocks everything**

The app is useless against `http://localhost:4000`. Before a real build:

1. Deploy `backend/` somewhere with HTTPS (Railway, Fly.io, Render, a VPS).
2. Provision PostgreSQL 16+, run `npm run db:push && npm run db:seed && npm run db:import`.
3. Set `CORS_ORIGIN` in `backend/.env` to the domains of the web frontends.
4. **Rotate the database password** — `studenthub:studenthub` is committed in
   `.env.example` and must never reach production.
5. Put the URL in the matching `eas.json` profile `env` block:

```json
"production": { "env": { "EXPO_PUBLIC_API_BASE_URL": "https://api.yourdomain.com/api" } }
```

> `EXPO_PUBLIC_*` values are **inlined into the JS bundle** at build time. Changing
> them later requires a **new build** — an OTA update will not fix it.

Verify before building:

```bash
curl -s "$EXPO_PUBLIC_API_BASE_URL/places?latitude=26.1535&longitude=91.6646&radius=30" | head -c 300
curl -s "$EXPO_PUBLIC_API_BASE_URL/colleges"
```

### Docker deployment (repo ships this)

| File | Purpose |
|---|---|
| `backend/Dockerfile` | Two-stage image: build TS + generate Prisma client, then prod deps only |
| `.dockerignore` | Keeps `node_modules`, `.env` and `.git` out of the build context |
| `docker-compose.prod.yml` | API + PostgreSQL 18, non-root, health checks, **DB not published to the host** |
| `.env.production.example` | Every required secret, documented |

```bash
cp .env.production.example .env.production   # then edit EVERY REPLACE value
npm run deploy:init                          # prisma db push + seed
npm run deploy:up                            # build + start API and Postgres
npm run deploy:logs
```

> ⚠️ **The Dockerfile has not been executed** — Docker is not installed in the
> development environment. What *was* verified is the exact thing it runs:
> `npm run build:api` (72 files) → `NODE_ENV=production node backend/dist/server.js`
> answered `environment: "production"`, served 689 real listings, 5 colleges,
> returned 401 on unauthenticated `DELETE /auth/account`, and sent correct CORS
> headers. Run `docker build -f backend/Dockerfile -t studenthub-api .` before
> relying on it.

Behind TLS: put nginx/Caddy in front of the published `API_PORT` and point
`EXPO_PUBLIC_API_BASE_URL` at that HTTPS origin.

---

## 3. Fill in the placeholders

| Value | Status | Where |
|---|---|---|
| Developer email `rd6725771@gmail.com` | ✅ done | `docs/privacy-policy.md` |
| Developer name `Rahul Das` | ✅ done | `docs/privacy-policy.md`, `apps/mobile-app/LICENSE` |
| **Privacy policy URL** | ⏳ **needs your host URL** | `store/ios/en-US/privacy_policy_url.txt`, `store/android/privacy_policy_url.txt` |
| **Support URL** | ⏳ needs your host URL | `store/ios/en-US/support_url.txt` |
| **Marketing URL** | ⏳ optional | `store/ios/en-US/marketing_url.txt` |
| `ascAppId`, `appleId`, `teamId` | ⏳ external | `eas.json` |
| `serviceAccountKeyPath` | ⏳ external | `eas.json` — Play service-account JSON, keep it **out of git** |

### Hosting the privacy policy (no domain required)

`docs/privacy-policy.md` must be reachable at a **public HTTPS URL** — both
stores reject the submission without a working link.

**Chosen: Netlify.** A ready-made 2-page site ships in **`docs/site/`**
(`index.html` + `privacy.html` — no build step, no JS, no third-party requests):

1. Open <https://app.netlify.com/drop>
2. Drag the `docs/site` folder onto the page
3. Rename the site (Site settings → Change site name), e.g. `studenthub-ai`
4. Verify in an **incognito window** that `…/privacy.html` renders
5. Paste the URLs here:

| File | Value |
|---|---|
| `store/ios/en-US/privacy_policy_url.txt` | `https://<site>.netlify.app/privacy.html` |
| `store/android/privacy_policy_url.txt` | `https://<site>.netlify.app/privacy.html` |
| `store/ios/en-US/support_url.txt` | `https://<site>.netlify.app/` |
| `store/ios/en-US/marketing_url.txt` | optional |

Alternatives, if you ever want them: a public GitHub repo
(`…/blob/main/docs/privacy-policy.md`) or GitHub Pages
(`https://<user>.github.io/<repo>/privacy`).

> Never upload `privacy-policy.md` itself — Netlify serves it as a
> `text/markdown` **file download**, which counts as a broken privacy policy.
> Always use the HTML version in `docs/site/`.
>
> Remember `EXPO_PUBLIC_API_BASE_URL` is a *separate* problem: the API still
> needs a host (§2). Netlify hosting these two pages does **not** host the API.


---

## 4. Screenshots **[external]**

You must attach these; they cannot be generated in CI.

**App Store** (6.7" and 5.5" displays required; 6.9" recommended)
- 3–8 PNG/JPEG, min **1242 × 2688**
- Suggested: Welcome → Discover (place cards) → Place detail with map →
  Save / visit plan → Owner dashboard

**Google Play**
- Phone: min **1080 × 1920**, at least 2
- Optional but recommended: 1024 × 500 feature graphic, 288 × 288 app icon

Run the app against production data first so screenshots show real listings:

```bash
npm run build:preview    # installable APK on your phone
```

---

## 5. Build

```bash
cd apps/mobile-app
npm run config:check     # validates app.json + plugins resolve
npm run build:apk        # Android APK (preview) — sideload / screenshots
npm run build:ios        # iOS, App Store profile
npm run build:android    # Android AAB for Play
```

First Android build you must choose **app signing by Google Play** (recommended).
First iOS build needs an **App Store Connect** managed signing profile — EAS will
offer to create it.

---

## 6. Submit

```bash
npm run submit:ios
npm run submit:android   # starts on the Internal testing track
```

Or upload the binaries manually:
- App Store Connect → *TestFlight* → *App Store Connect upload*
- Play Console → *Testing → Internal testing* → upload the `.aab`

### Review information & notes

Apple requires a test account. Create a real one and provide it:

| Field | Value |
|---|---|
| Sign-in required | **Yes** |
| User / password | `demo.student@studenthub.local` / `student-password-123` |
| Contact info | your name, email, phone |
| Notes for review | see below |

**Review notes (paste into App Store Connect):**

> The app requires an account to browse. A test login is provided above.
> Location permission is optional and used only for a one-shot nearby search; the
> app is fully functional if denied (a city can be chosen manually). The map
> loads OpenStreetMap tiles over the network. No login is required to reach the
> permission prompt — decline it and select a city on the campus screen.

---

## 7. Before production approval (Google)

- [x] **Account deletion** in-app — Profile → Delete account (`DELETE /api/auth/account`)
- [ ] Data safety form filled from `store/android/data-safety.md`
- [ ] Privacy policy URL live
- [ ] Content rating questionnaire completed
- [ ] Target audience set to 13+ (not designed for children)
- [ ] Store listing complete (icon, screenshots, short + full description)

Before App Review passes:

- [ ] Privacy policy URL + support URL live
- [ ] App Privacy questionnaire matches `docs/privacy-policy.md`
- [ ] Encryption export compliance: `ITSAppUsesNonExemptEncryption = false` is already set
- [ ] Screenshots on both required device sizes
- [ ] Age rating questionnaire

---

## 8. Version bumps

| File | Field | Meaning |
|---|---|---|
| `app.json` | `expo.version` | **User-visible** version (`1.0.0`) |
| `app.json` | `expo.ios.buildNumber` | iOS build — `eas.json` has `autoIncrement: true` |
| `app.json` | `expo.android.versionCode` | Android build — also auto-incremented |
| `package.json` | `version` | npm package version, unrelated to stores |

`runtimeVersion.policy = appVersion` means OTA updates only apply to users on the
same `expo.version` — bump `version` whenever you ship native changes.

---

## 9. Day-to-day after launch

```bash
npx eas update --branch production --message "fix empty state"   # OTA JS-only fix
npm run build:ios && npm run submit:ios                          # native fix
```

Only JS/asset changes can ship via `eas update`. Anything touching native modules
(`expo-location`, `react-native-webview`, permissions, plugins) needs a full build.
