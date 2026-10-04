# StudentHub AI scope

Expo is the single frontend for Android, iOS and web. Vite is removed. The API,
Prisma schema and shared types remain unchanged in structure.

Implemented: guest Home, search/category filtering, demo cards, optional API
loading, offline fallback and cross-platform AI/feature notices.

Home includes an interactive Leaflet/OpenStreetMap map in web iframe/native WebView, with category-filtered markers. Network access is required for map assets and tiles; device geolocation is not yet implemented.

Pending migration: onboarding, advanced filters, details and
saved-list persistence. Expo is not yet feature-equivalent to the retired app.

Deferred: real auth, payments, AI, bookings, owner/admin UI, delivery, matching
and analytics. All bundled listings/reviews are fictional development data.