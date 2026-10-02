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

## Customer ride and cash history

Customer dashboard, active ride, history, and profile summaries use the real
ride/history endpoints. Active rides poll for status changes and display the
stored cash payment state. The old wallet panels now show paid and pending cash
information plus the account's rolling one-hour cancellation allowance.

Cancellation always requires a reason. Requested and accepted rides cancel
immediately. Once a trip has started, the page displays the pending 15-minute
mutual confirmation, lets the responding participant cancel or resume, and
shows the remaining allowance. The arrived state follows the backend rule and
does not offer cancellation.

## Rider workflow

Rider screens use the real approval and availability profile. Pending or
rejected riders remain offline and cannot load requests. Approved riders can
go online, accept an available request, progress it through arrived, started,
and completed states, handle mutual cancellation, and confirm cash only after
completion. Vehicle changes return the rider to pending approval.

Rider history and dashboard earnings use confirmed backend cash payments;
pending cash receipts are shown separately and can be confirmed from history.
