## Backend connection

Copy `.env.example` to `.env` when a custom API address is required. By
default, registration, login, session restoration, profile editing, and logout
connect to `http://localhost:5000/api`.

Authentication stores the backend JWT under `vr_token`, sends it as a Bearer
token, restores the current account from `GET /api/users/profile`, and clears
expired sessions. API roles are normalized to the lowercase role names already
used by the existing frontend routes.

The login page includes password recovery. The forgot-password form always
shows an account-neutral response and creates an administrator review request.
After identity verification, an administrator assigns a temporary password
from the Users page. Resolving the request revokes existing sessions.

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

## Live updates and active request maps

Socket.IO delivers ride progress, cancellation, notification, chat, and
available-request changes immediately. A 20-second timed refresh remains as a
recovery fallback if the live connection is interrupted.

A persistent banner appears while the browser reports that the device is
offline and clears automatically after reconnection. When a pending request is
cancelled or accepted by another rider, its stored notification is replaced in
real time and the request-detail page reports that it is no longer available.

New stored notifications also appear as dismissible in-app popups. Ride-request
popups take riders to the available-request list, chat popups open the relevant
conversation, and other popup types open the notification page. The top-bar
bell opens the five most recent notifications without leaving the current page
and includes a link to the full notification page.

Every role has a Settings page. Notification popup categories, sound, and
vibration are saved per account on the current device and apply immediately.
Disabling optional popups does not remove stored notifications from the bell or
notification page. Cancellation, account/access decision, and payment alerts
remain popup-enabled; users may still disable their sound and vibration.

Active requests and request-detail pages display the stored pickup and
destination on OpenStreetMap. Riders can open the appropriate pickup or
destination in Google Maps for navigation through a free Maps URL that does
not require a Google API key.

Application pages are loaded on demand to keep the initial download smaller.

## Customer ride and cash history

Customer dashboard, active ride, history, and profile summaries use the real
ride/history endpoints. Active requests update through the live connection and
display the stored cash payment state. The old wallet panels now show paid and
pending cash information plus the account's rolling one-hour cancellation
allowance.

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

The active-request screen provides an external Google Maps navigation link.
Immediately after acceptance it routes the rider to the stored pickup
coordinate; after pickup it routes to the stored destination. Google Maps
provides turn-by-turn navigation while Vanni Ride remains responsible for the
request status and customer communication.

## Chat and rider ratings

Customer and rider chat pages now load their real ride conversations and poll
for new messages. Messaging is enabled for accepted, arrived, and started rides.
Completed conversations remain readable, but become writable only while an
administrator-approved post-completion access window is active. Either the
customer or rider can submit the access reason from the completed conversation,
including for a lost item, and both participants see whether the request is
still pending.

After a completed ride or delivery, the customer sees a skippable one-to-five
star rating dialog with an optional review. Skipping dismisses that ride's
prompt on the current browser, while the customer can still rate it later from
Ride History. The rider dashboard shows the backend's current average and total
rating count.

## Administrator operations

Administrator dashboards now use the protected backend data instead of the
browser demo store. Administrators can approve or reject rider applications,
suspend or reactivate accounts, review post-completion chat requests, inspect a
ride conversation with an audited reason, and force-cancel active rides. The
ride details page also supports audited corrections to completed-ride cash
payments. Dashboard totals come from the backend statistics endpoint.

## Integration hardening

Protected API failures now clear invalid or suspended sessions and return the
user to authentication instead of leaving a stale signed-in interface. Rider
availability refreshes after acceptance, completion, and cancellation; busy
riders cannot manually change availability. Active rider pages and available
request lists poll for server changes, so mutual cancellation requests,
automatic cancellation, and rides accepted by somebody else become visible
without a manual reload.
