## Backend connection

Copy `.env.example` to `.env` when a custom API address is required. By
default, registration, login, session restoration, profile editing, and logout
connect to `http://localhost:5000/api`.

Authentication stores the backend JWT under `vr_token`, sends it as a Bearer
token, restores the current account from `GET /api/users/profile`, and clears
expired sessions. API roles are normalized to the lowercase role names already
used by the existing frontend routes.

Rider registration includes vehicle type, model, registration number, and
colour. A newly registered rider can sign in but remains pending and offline
until administrator approval.

`VITE_USE_MOCK_DATA=true` temporarily keeps the not-yet-integrated ride and
administration screens on their existing browser demo data. It is deliberately
separate from authentication and will be removed after those screens are
connected in later phases.

Run `npm test`, `npm run lint`, and `npm run build` to verify this frontend.

## Customer map request flow

The customer request page uses Leaflet with OpenStreetMap tiles. Customers can
select pickup and destination by clicking or dragging map markers, deliberately
search for a place, reverse-resolve a selected point, or use browser location
for pickup. Search and reverse geocoding are sent through the authenticated
backend rather than directly to public Nominatim.

The fare step displays the backend's shortest-road distance, estimated time,
route line, and cash fare. Ride creation sends only the selected request type,
delivery category, and locations; the backend recalculates distance and fare so
client values cannot be forged.
