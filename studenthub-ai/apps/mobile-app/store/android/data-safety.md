# Google Play — Data safety form answers

Paste these into **Play Console → App content → Data safety**. They match
`docs/privacy-policy.md`; change both together if the app's behaviour changes.

---

## Is your app safe to collect or share any of the required user data types?

**Yes** — but only the types below. No data is sold, and no data is shared for
advertising or analytics.

## Required data types

### Personal info

| Data | Collected? | Shared? | Is it optional or required? | Purpose | Ephemeral or persistent? | Deletion requested by user supported? |
|---|---|---|---|---|---|---|
| Name (display name) | Collected | Not shared | Required to create an account | App functionality, Account management | Persistent | **Yes** — email the support address |
| Email address | Collected | Not shared | Required to create an account | App functionality, Account management | Persistent | **Yes** — email the support address |

### Location

| Data | Collected? | Shared? | Optional or required? | Purpose | Ephemeral or persistent? | Deletion supported? |
|---|---|---|---|---|---|---|
| Approximate location (city-level) | Collected | Not shared | Optional | App functionality (default discovery area) | Persistent — the *name* of the city only | **Yes** |
| Precise location | Collected | **Not shared** | Optional — the user can deny it | App functionality (nearby search radius) | **Ephemeral** — used in memory for one query, never written to the database | Not applicable (never stored) |

> Only **foreground**, **one-shot** location. No background location is requested,
> so do **not** tick any background-location declaration.

### App activity

| Data | Collected? | Shared? | Optional or required? | Purpose | Ephemeral or persistent? | Deletion supported? |
|---|---|---|---|---|---|---|
| App interactions (saved places, visit plans, search history) | Collected | Not shared | Optional | App functionality | Persistent — **on the user's device only**, not synced to a server | Yes — clearing app data |
| Account activity (login session) | Collected | Not shared | Required | Account management, Fraud prevention/security | Persistent | **Yes** |

### Photos and videos

| Data | Collected? | Shared? | Purpose | Notes |
|---|---|---|---|---|
| Photos (owner listing photos) | Not collected by the current build | — | — | The student app reads no photos; owner uploads are a separate surface |

---

## Questions to answer in the form

| Question | Answer |
|---|---|
| Is all required user data collected and handled in a **encrypted in transit**? | **Yes** — HTTPS in production |
| Is all required user data collected and handled in a **encrypted at rest**? | **Yes** — managed database storage |
| Can users request data deletion? | **Yes** — via the support email |
| Does your app use data for advertising or analytics? | **No** — no ad or analytics SDKs are present |
| Do you share data with third parties for other purposes? | **No** |
| Is the app designed for children under 13? | **No** |

---

## Account deletion (required for apps with accounts)

Play requires an in-app or web account-deletion path.

- **Status: IMPLEMENTED in this build.**
  - **UI:** Profile tab → **Delete account** → native confirmation dialog.
  - **API:** `DELETE /api/auth/account` with the session token and body
    `{ "confirm": "DELETE" }` (rate-limited to 5/min).
  - **What it removes:** the account row, saved places, visit plans, reviews,
    favourites, the owner profile and its offers — on the server *and* the local
    device copy (saved places, history, name, campus, location).
  - **What it keeps:** the listings themselves. A place is a real OpenStreetMap
    business, not the owner's personal data, so deleting the account detaches
    ownership (`Place.ownerId → null`) and drops the business name, phone and
    verification badge, while the listing stays browsable.
- Backup path: users can also email the support address; respond within 30 days.
- Verified end-to-end against PostgreSQL: anonymous call → 401, wrong
  confirmation → 400, success → 200, repeat → 404, personal data rows → 0.
