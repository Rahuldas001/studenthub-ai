# Privacy Policy — StudentHub AI

**Effective date:** 4 October 2026

StudentHub AI ("the App") helps students find hostels, PGs, restaurants and other places near their campus. This policy explains what the App collects, what it does not, and how to reach us.

> **Before you publish:** both Apple and Google require this policy at a **live public HTTPS URL**. Hosting options without owning a domain are listed in `apps/mobile-app/RELEASE.md` §3 — GitHub Pages or a public GitHub repository both work.

---

## 1. What we collect

### Account information
When you create an account we store:

| Field | Required | Why |
|---|---|---|
| Email address | Yes | Sign in and account recovery |
| Display name | Yes | Shown to owners when you contact them |
| Password | Yes | Stored only as a salted hash (scrypt), never in plain text |
| Role | Yes | Student, owner or admin access level |
| Home city | Optional | Picks your default discovery area |
| Phone number | Owners only | Shown on your listings so students can call |

We do **not** collect your date of birth, gender, government ID, payment card, or contacts.

### Location

Location is **optional** and used only when you tap "Use my location":

- The App requests **foreground** location permission and reads a **single, one-shot** fix. There is no background or continuous tracking.
- The coordinates are used **on your device** to pick the nearest campus, and are passed to the App's API as a URL parameter for the nearby-search radius.
- **Your precise coordinates are never written to the database.** The server keeps only the *name* of the city you choose. Query coordinates are used in memory to filter results and are then discarded.
- You can deny the permission, or set a city manually instead — the App works fully without location.

### Stored on your device

Saved places, visit plans, recently viewed history, your display name, chosen campus and chosen city are stored **locally on your phone** inside the App's private storage. They are not synced to our servers. Clearing the App's data or deleting the App removes them.

### What we do **not** collect

- No advertising identifiers, IDFV/IDFA, or advertising SDKs.
- No third-party analytics, crash reporters, or tracking pixels (no Sentry, Firebase Analytics, Amplitude, etc.).
- No contacts, photos, microphone, or camera access.
- No precise location in the background.
- No data sold or shared for cross-context behavioural advertising.

---

## 2. Third-party services

The App displays a campus map. To render it, the App contacts two public services:

| Service | What it receives | Purpose |
|---|---|---|
| [OpenStreetMap](https://tile.openstreetmap.org) tile servers | Your IP address | Map imagery |
| [unpkg](https://unpkg.com) (Leaflet library) | Your IP address | Serving the map library |

Neither is used for analytics or advertising. Map imagery is © OpenStreetMap contributors, licensed [ODbL](https://www.openstreetmap.org/copyright). Business listings in the App are imported from OpenStreetMap under the same licence.

The App's API is hosted by us (or our infrastructure provider) and receives your email, display name, and any search coordinates you send.

---

## 3. How we protect data

- Passwords hashed with **scrypt** and a 16-byte random salt; verified in constant time.
- Transport security via HTTPS in production; security headers via `helmet`.
- Cross-origin access restricted to an explicit allow-list.
- Database access restricted to the application; no public write endpoints.

No system is perfectly secure. Please use a unique password.

---

## 4. Sharing and retention

We do not sell personal information. We share it only:

- with **listings owners** when *you* contact them (your name and phone number, if you provide it);
- with service providers who host the database and API, under contract;
- where required by law.

We keep account data until you delete your account. Because listings are sourced from OpenStreetMap, place records themselves are public-data derived and are not personal account data.

---

## 5. Your rights

Depending on your region (GDPR, UK GDPR, CCPA/CPRA and similar laws) you may ask to access, correct, export, or delete your personal data, or object to its processing.

To do any of this, email **rd6725771@gmail.com** with the address on your account. We respond within 30 days. You may also withdraw the location permission at any time from your phone's settings.

**Account deletion is available in the app itself:** Profile → *Delete account*. This permanently removes your account, saved places, visit plans, history and reviews from our servers, and clears the same data from your device. It cannot be undone. Listings themselves are kept, because a place is a real-world business rather than your personal data.

---

## 6. Children

The App is intended for students and adults. It is not directed at children under 13 (under 16 in the EEA/UK), and we do not knowingly collect their data. Contact us if you believe a child has provided us data and we will delete it.

---

## 7. Changes

We may update this policy. The effective date above changes when we do. Material changes will be announced in the App.

---

## 8. Contact


**Email:** rd6725771@gmail.com
**Developer:** Rahul Das
**Postal address:** available on request by email

This policy is also available in the repository at `docs/privacy-policy.md`.
