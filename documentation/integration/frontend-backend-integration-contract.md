# VanniRide Frontend-Backend Integration Contract

Status: Approved for implementation
Contract version: 1.0
Approved: 2 October 2026
Applies to branch: `frontend-backend-integration`

## 1. Purpose and authority

This contract records the approved additions required to integrate the uploaded
frontend with the MongoDB-backed API. It supplements version 1.1 of
`canonical-contract.md` and takes precedence over older mock data, frontend
assumptions, and the earlier bounded-admin rule where they conflict.

The master specification remains the primary product authority. The following
features are explicit team-approved additions:

- live OpenStreetMap-based pickup and destination selection;
- rider vehicle information and administrator approval;
- an administrator's audited ability to view ride conversations;
- an administrator's audited ability to force-cancel active rides; and
- replacement of wallet UI with cash-payment and cancellation information.

Existing frontend structure, theme, colours, navigation, cards, tables, and
responsive layout must be preserved. Integration may add controls inside the
existing design but must not redesign it.

## 2. Integration method

Implementation proceeds as vertical slices:

1. MongoDB contract and validation.
2. Mongoose model and backend authorization.
3. HTTP and Socket.IO contract.
4. Automated backend tests.
5. Frontend service adapter.
6. Existing frontend screen connection.
7. End-to-end verification.

The real API is the source of truth. The frontend may retain an optional mock
mode for demonstrations, but integration and production builds use the real
API by default.

## 3. Map, geocoding, routing, and fare contract

### 3.1 Technology responsibilities

- Leaflet or React Leaflet provides the interactive map component.
- OpenStreetMap supplies the visible map tiles.
- A configurable Nominatim-compatible service performs deliberate place search
  and reverse geocoding through the backend.
- The existing configurable OSRM-compatible backend adapter calculates road
  route distance, estimated duration, and route geometry.
- The backend remains authoritative for distance and fare.

OpenStreetMap attribution must remain visible on the map. Tile, geocoding, and
routing base URLs must be configurable and must not be scattered through UI
components.

### 3.2 Frontend interaction

The customer can:

- click the map to select pickup and destination;
- drag either marker to correct its position;
- use their browser-provided current location as pickup after granting consent;
- submit a text search by pressing a Search button; and
- see the selected addresses, route line, road distance, estimated duration,
  and estimated fare before confirming.

Search-as-you-type autocomplete is not permitted when using the public
Nominatim service. Search is user-triggered, throttled globally to comply with
the configured provider, and cached by the backend. Location permission denial
must not block manual map selection.

### 3.3 Map API

All endpoints require authentication. Search and reverse-geocoding are
available to customers creating a request. Route preview is customer-only.

#### Search for a place

```text
GET /api/maps/search?q=<query>
```

Rules:

- `q` is trimmed and must contain at least three visible characters.
- Results are limited to a small configurable count, initially five.
- The backend sets a provider-identifying User-Agent and contact identity.
- Identical normalized queries are cached.
- The backend returns HTTP 429 when its provider throttle is exhausted rather
  than silently violating the provider policy.

Response resource:

```json
{
  "places": [
    {
      "displayName": "University of Vavuniya, Sri Lanka",
      "latitude": 8.758,
      "longitude": 80.497,
      "providerPlaceId": "provider-specific-string"
    }
  ]
}
```

#### Resolve a selected point

```text
GET /api/maps/reverse?latitude=<latitude>&longitude=<longitude>
```

Response resource:

```json
{
  "place": {
    "displayName": "Resolved address",
    "latitude": 8.758,
    "longitude": 80.497
  }
}
```

When reverse geocoding is unavailable, the frontend may display rounded
coordinates as the address label. It must not invent an address.

#### Preview a route and fare

```text
POST /api/maps/route-preview
```

Request:

```json
{
  "rideType": "TRANSPORT",
  "deliveryCategory": null,
  "pickupLocation": {
    "address": "Selected pickup",
    "latitude": 8.758,
    "longitude": 80.497
  },
  "destination": {
    "address": "Selected destination",
    "latitude": 8.751,
    "longitude": 80.503
  }
}
```

Response resource:

```json
{
  "routePreview": {
    "distanceKm": 3.42,
    "durationMinutes": 9,
    "estimatedFare": 474,
    "routeGeometry": {
      "type": "LineString",
      "coordinates": [[80.497, 8.758], [80.503, 8.751]]
    }
  }
}
```

The preview endpoint performs no database write. `POST /api/rides` recalculates
the route and fare before saving so a client cannot submit a forged value.
Pickup and destination must be different valid coordinates. Straight-line
distance is not a routing fallback.

### 3.4 Stored ride data

The required stored ride fields remain pickup/destination address and
coordinates, authoritative road distance, and fare. Estimated duration and
route geometry are returned to the client but are not required to be stored in
version one. Historical route playback is outside scope.

This map is for request selection and route display. Continuous live GPS rider
tracking remains outside scope.

## 4. Rider vehicle and approval contract

### 4.1 MongoDB `riders` fields

The existing `riders` collection is the rider profile and is extended with:

- `vehicle.type`: required trimmed string, maximum 50 characters;
- `vehicle.model`: required trimmed string, maximum 100 characters;
- `vehicle.registration_number`: required normalized uppercase string, maximum
  30 characters;
- `vehicle.color`: required trimmed string, maximum 50 characters;
- `approval_status`: `PENDING`, `APPROVED`, or `REJECTED`;
- `review_reason`: nullable trimmed string, maximum 500 characters;
- `reviewed_by`: nullable administrator user reference;
- `reviewed_at`: nullable date; and
- normal `created_at` and `updated_at` dates.

`approval_status` defaults to `PENDING`. `availability_status` defaults to
`UNAVAILABLE`.

Vehicle registration numbers are unique after normalization. The database has
indexes for `approval_status`, `availability_status`, and unique
`vehicle.registration_number`.

### 4.2 Registration and profile rules

- Customer registration is unchanged.
- Rider registration requires the four vehicle fields.
- A rider may authenticate while approval is pending or rejected so they can
  see the decision and update their profile.
- Only an `APPROVED` rider with an `ACTIVE` account may become `AVAILABLE`, see
  available requests, accept a ride, or use rider work functions.
- Updating any vehicle field after approval changes approval back to `PENDING`,
  clears the prior review fields, and sets availability to `UNAVAILABLE`.
- A `BUSY` rider cannot change vehicle information.
- Account suspension and rider approval are separate controls.

### 4.3 Rider profile API

`GET /api/users/profile` includes `riderProfile` for a rider.

```text
PUT /api/users/rider/profile
```

Request:

```json
{
  "vehicle": {
    "type": "Motorcycle",
    "model": "Honda Dio",
    "registrationNumber": "NP-7788",
    "color": "Black"
  }
}
```

The response returns the normalized rider profile and whether reapproval was
triggered.

### 4.4 Admin rider API

```text
GET /api/admin/riders?approvalStatus=PENDING
PATCH /api/admin/riders/:riderUserId/approval
```

Review request:

```json
{
  "decision": "APPROVE",
  "reason": "Vehicle details reviewed"
}
```

`decision` is `APPROVE` or `REJECT`. A non-empty reason is mandatory for every
decision. Approval review records `reviewed_by` and `reviewed_at`. Rejection
sets availability to `UNAVAILABLE`. Concurrent reviews return HTTP 409.

Every review creates an admin audit entry:

- action: `RIDER_APPROVAL_REVIEWED`;
- target type: `RIDER`; and
- before/after approval, availability, and review values.

### 4.5 Approval event

Server event:

```text
rider_approval_updated
```

Payload includes rider user ID, approval status, review reason, reviewed date,
and current availability. It is sent to the affected rider and the admin role
room.

## 5. Administrator conversation management and viewing

### 5.1 Existing chat-access management

The existing post-completion chat-access request workflow remains unchanged.
It manages whether the customer and rider may resume messaging after a
completed ride.

### 5.2 Admin conversation viewing

The existing frontend Conversation Log is retained and connected to:

```text
GET /api/admin/rides/:rideId/messages
```

Rules:

- administrator authentication and `ACTIVE` account are required;
- the ride must exist;
- pagination is mandatory using `limit` and an opaque cursor or documented
  page parameters;
- messages are returned oldest-to-newest within the requested page;
- returned sender data is limited to ID, name, and role;
- viewing does not grant the admin permission to send a message;
- viewing does not change participant chat permissions; and
- every successful viewing is audited because conversation content is
  sensitive.

The audit entry uses:

- action: `RIDE_MESSAGES_VIEWED`;
- target type: `RIDE`;
- reason: the administrator-provided viewing reason; and
- metadata in `after`, including returned message count and applied page/cursor.

The request therefore requires a non-empty `reason` query parameter or an
equivalent auditable request mechanism. Message bodies must not be copied into
the audit log.

## 6. Administrator force-cancellation

```text
PATCH /api/admin/rides/:rideId/cancel
```

Request:

```json
{
  "reason": "Safety or operational reason"
}
```

Rules:

- only an `ACTIVE` administrator may use the endpoint;
- a non-empty reason is mandatory;
- only `REQUESTED`, `ACCEPTED`, `ARRIVED`, or `STARTED` rides may be force
  cancelled;
- `COMPLETED` and `CANCELLED` rides are immutable;
- force-cancellation bypasses participant mutual confirmation;
- any pending mutual cancellation request is resolved without consuming the
  initiating participant's allowance;
- a pending mutual request is retained with status `ADMIN_CANCELLED`;
- the ride becomes `CANCELLED` and retains its full history;
- an assigned `BUSY` rider returns to `AVAILABLE` only if still approved and
  active; otherwise the rider becomes `UNAVAILABLE`;
- an admin force-cancellation does not count toward either participant's
  five-per-hour cancellation allowance; and
- concurrent lifecycle changes return HTTP 409.

The cancellation record uses:

- `cancelled_by`: administrator user ID;
- `cancellation_mode`: `ADMIN_FORCE`;
- `previous_status`: the actual active status, including `ARRIVED`; and
- the supplied administrative reason.

The audit entry uses:

- action: `RIDE_FORCE_CANCELLED`;
- target type: `RIDE`; and
- before/after ride status, rider availability, and pending cancellation
  request resolution values.

Server event:

```text
ride_force_cancelled
```

It is sent to the customer, assigned rider, ride room, and admin role room. The
normal `ride_status_changed` event is also emitted so existing clients update.

## 7. Wallet-section replacement

There is no stored wallet, card, top-up, or saved-payment-method feature.

The existing customer wallet card is repurposed without changing its visual
style to display:

- payment method: Cash;
- current ride payment status when applicable;
- cancellation allowance remaining out of five;
- pending cancellation reservations; and
- the next allowance reset time when applicable.

The existing backend payment and cancellation-allowance endpoints provide this
data. No wallet collection or wallet endpoint is added.

## 8. Frontend compatibility adapter

Frontend API internals map backend contracts into the current component-facing
shape while pages are migrated. Required conversions include:

- response `data` unwrapping;
- MongoDB `_id` or API `id` normalization;
- uppercase backend roles to lowercase route keys;
- `REQUESTED`, `ARRIVED`, and `STARTED` into the current visual timeline labels;
- `TRANSPORT` into the displayed label Ride;
- snake_case database concepts into camelCase API data; and
- server dates into safe display values.

The adapter must not translate or suppress authorization, validation, conflict,
or service-unavailable errors. Pages receive actionable error messages.

## 9. Added HTTP endpoint summary

```text
GET   /api/maps/search
GET   /api/maps/reverse
POST  /api/maps/route-preview
PUT   /api/users/rider/profile
GET   /api/admin/riders
PATCH /api/admin/riders/:riderUserId/approval
GET   /api/admin/rides/:rideId/messages
PATCH /api/admin/rides/:rideId/cancel
```

All existing version-one endpoints remain in force.

## 10. Added constants

### Rider approval

- `PENDING`
- `APPROVED`
- `REJECTED`

### Cancellation mode

- existing: `IMMEDIATE`, `MUTUAL`, `AUTO_TIMEOUT`
- added: `ADMIN_FORCE`

### Administrative audit actions

- existing: `USER_STATUS_CHANGED`, `PAYMENT_CORRECTED`,
  `CHAT_ACCESS_REVIEWED`
- added: `RIDER_APPROVAL_REVIEWED`, `RIDE_MESSAGES_VIEWED`,
  `RIDE_FORCE_CANCELLED`

### Administrative audit target types

- existing: `USER`, `PAYMENT`, `CHAT_ACCESS_REQUEST`
- added: `RIDER`, `RIDE`

## 11. Configuration contract

Backend configuration adds:

- `GEOCODING_BASE_URL`;
- `GEOCODING_USER_AGENT` containing the application identity;
- `GEOCODING_CONTACT`;
- `GEOCODING_MIN_INTERVAL_MS`, no lower than the selected provider policy;
- `GEOCODING_CACHE_TTL_MS`; and
- map-result limits and provider timeouts.

Frontend configuration adds:

- `VITE_API_BASE_URL`;
- `VITE_USE_MOCK`, default `false` for integration;
- `VITE_MAP_TILE_URL`; and
- `VITE_MAP_ATTRIBUTION`.

Secrets must not be exposed through `VITE_` variables. Tile providers that
require secret server credentials must be accessed according to their provider
contract rather than embedding a secret in browser code.

## 12. Security, privacy, and failure behavior

- Map popups and address fields must escape untrusted provider/user content.
- Coordinates, vehicle fields, admin reasons, query limits, and IDs are
  validated on the backend.
- Admin conversation access and force-cancellation are always audited.
- Sensitive message content is never copied into logs or audit metadata.
- Map-provider unavailability returns a clear 503 response; it does not create
  a partial ride.
- Geocoding throttling returns 429 with retry information where possible.
- Route preview and ride creation have bounded network timeouts.
- Browser geolocation is used only after consent and is not continuously
  tracked.

## 13. Phase acceptance criteria

Implementation of this contract is complete only when:

1. MongoDB validators and indexes match every new field and enum.
2. Rider registration and vehicle reapproval rules are tested.
3. Pending/rejected riders cannot perform rider work actions.
4. Admin rider review is authorized, concurrent-safe, and audited.
5. Map search obeys provider throttling/caching rules and has no autocomplete.
6. Route preview returns GeoJSON, duration, road distance, and authoritative
   fare without writing a ride.
7. Ride creation independently recalculates the route and fare.
8. Admin chat viewing is paginated, reasoned, authorized, and audited.
9. Admin force-cancellation preserves history, releases the rider correctly,
   bypasses mutual confirmation, and does not consume participant allowance.
10. Added Socket.IO events reach only the intended rooms.
11. The wallet interface is repurposed with no wallet persistence or endpoints.
12. Existing frontend structure, theme, colours, and responsive behavior remain
    visually consistent.
13. Backend tests, frontend lint/build, API collection checks, and end-to-end
    flows pass.

## 14. External service references

- OpenStreetMap Tile Usage Policy:
  `https://operations.osmfoundation.org/policies/tiles/`
- Nominatim Usage Policy:
  `https://operations.osmfoundation.org/policies/nominatim/`
- Leaflet Quick Start Guide:
  `https://leafletjs.com/examples/quick-start/`
- OSRM HTTP API:
  `https://project-osrm.org/docs/v26.4.0/http`
