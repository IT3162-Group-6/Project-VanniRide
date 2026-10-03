# Vanni Ride Backend Member 2 API

This document describes the authentication, profile, map support, ride
lifecycle, cancellation, cash payment, text chat, rating, history, earnings,
and administration APIs on the integration branch.

## Authentication dependency

All endpoints require Member B1's JWT authentication middleware to populate:

```js
req.user = {
  id: '<MongoDB user ObjectId>',
  role: 'CUSTOMER' // or RIDER
};
```

The B2 controllers also enforce the role and MongoDB ObjectId requirements.

## Authentication and profile endpoints

- `POST /api/auth/register` - Register a `CUSTOMER` or `RIDER` account.
- `POST /api/auth/login` - Return a JWT for an active account.
- `POST /api/auth/logout` - Invalidate all tokens issued with the current token
  version.
- `GET /api/users/profile` - Return the authenticated user profile.
- `PUT /api/users/profile` - Update the authenticated user's name or phone.
- `PATCH /api/users/rider/availability` - Rider-only switch between `AVAILABLE`
  and `UNAVAILABLE`; only an approved, non-busy rider may use it.
- `PUT /api/users/rider/profile` - Rider-only vehicle update. A changed vehicle
  returns the rider to `PENDING` approval and `UNAVAILABLE`.

Rider registration requires `vehicle.type`, `vehicle.model`,
`vehicle.registrationNumber`, and `vehicle.color`. New riders remain
`PENDING` and cannot receive or accept ride requests until an administrator
approves them.

All protected endpoints require `Authorization: Bearer <token>`. Tokens are
rejected if the user no longer exists, the account is suspended, the embedded
role differs from the stored role, or logout has invalidated the token version.

## Ride workflow

```text
REQUESTED -> ACCEPTED -> ARRIVED -> STARTED -> COMPLETED
```

Immediate cancellation is supported from `REQUESTED` and `ACCEPTED`.
`ARRIVED` and `STARTED` use mutual cancellation. Rides are retained after
cancellation and a separate cancellation record is created.

## Location format

```json
{
  "address": "University of Vavuniya",
  "latitude": 8.7581,
  "longitude": 80.4982
}
```

Distance follows the shortest road route returned by the configured
OSRM-compatible service, rather than a straight line. Fare is stored as an
estimated cash fare in LKR.

## Map support endpoints

These authenticated customer endpoints support an OpenStreetMap/Leaflet user
interface without exposing geocoding traffic directly from the browser:

- `GET /api/maps/search?q=Vavuniya` - Search through the configured
  Nominatim-compatible provider.
- `GET /api/maps/reverse?latitude=8.7514&longitude=80.4971` - Convert a selected
  coordinate to an address.
- `POST /api/maps/route-preview` - Return the shortest route distance,
  estimated duration, GeoJSON line, and estimated fare without creating a
  ride.

Search and reverse requests are cached and serialized by the backend. Do not
implement keystroke-by-keystroke autocomplete against the public Nominatim
service.

## Ride endpoints

### Create a ride

`POST /api/rides` - Customer only

```json
{
  "rideType": "TRANSPORT",
  "pickupLocation": {
    "address": "University of Vavuniya",
    "latitude": 8.7581,
    "longitude": 80.4982
  },
  "destination": {
    "address": "Vavuniya Town",
    "latitude": 8.7514,
    "longitude": 80.4971
  }
}
```

`rideType` may be `TRANSPORT` or `DELIVERY`. A delivery must include
`deliveryCategory` with `FOOD`, `WATER`, or `PARCEL`.

### List available rides

`GET /api/rides/available` - Available rider only

### List the current user's rides

`GET /api/rides` - Customer or rider

### Get one ride

`GET /api/rides/:rideId` - Ride participant, or an available rider viewing an
unassigned request

### Accept a ride

`PATCH /api/rides/:rideId/accept` - Available rider only

Acceptance atomically requires the ride to still be `REQUESTED` and unassigned.
The rider becomes `BUSY`.

### Advance ride status

`PATCH /api/rides/:rideId/status` - Assigned rider only

```json
{
  "status": "ARRIVED"
}
```

Only the next expected status is accepted. After `COMPLETED`, the rider becomes
`AVAILABLE`.

### Cancel a ride

`PATCH /api/rides/:rideId/cancel` - Customer or assigned rider

```json
{
  "reason": "Plans changed"
}
```

`REQUESTED` and `ACCEPTED` rides cancel immediately. Cancelling a `STARTED`
ride creates a request for the other participant:

- `GET /api/rides/:rideId/cancellation-request` - Retrieve the pending request.
- `PATCH /api/rides/:rideId/cancellation-request` - Respond with `CANCEL` or
  `RESUME`.

```json
{
  "decision": "CANCEL"
}
```

The response window is 15 minutes. If no response arrives, the ride is
cancelled automatically. Each account may initiate at most five cancellations
in a rolling one-hour window; the current allowance is available from
`GET /api/users/cancellation-allowance`.

Both `CANCEL` and `RESUME` responses include the current serialized ride. A
resumed ride is returned with status `STARTED`, allowing clients to refresh
their state without making a second ride request.

## Cash payment endpoints

Every new ride receives a payment record with:

```text
payment_method = CASH
payment_status = PENDING
```

- `GET /api/rides/:rideId/payment` - Customer or assigned rider
- `PATCH /api/rides/:rideId/payment` - Assigned rider after ride completion

The PATCH endpoint atomically changes `PENDING` to `PAID` and records both the
assigned rider in `confirmedBy` and the confirmation time in `paidAt`. The
amount returned by the API is the authoritative amount stored on the payment
record, initially copied from the ride estimate when the ride is created.

## Chat endpoints

- `GET /api/rides/:rideId/messages` - Customer or assigned rider
- `POST /api/rides/:rideId/messages` - Customer or assigned rider during an
  active assigned ride, or during an active approved post-completion window
- `POST /api/rides/:rideId/chat-access-requests` - Ride customer requests
  temporary post-completion access and supplies a reason

```json
{
  "messageText": "I am waiting near the main gate."
}
```

Only text messages are supported. History remains readable after the ride.
Completed rides are read-only unless an administrator approves a request; an
approval allows both ride participants to send messages for 24 hours. Cancelled
rides always remain read-only.

## Socket.io

Connect with a JWT in the Socket.io authentication payload:

```js
io(baseUrl, { auth: { token } });
```

Client events:

- `join_ride` with `{ rideId }`
- `send_message` with `{ rideId, messageText }`

Server events:

- `new_ride_request`
- `ride_status_changed`
- `new_message`
- `rider_approval_updated`
- `ride_force_cancelled`

Socket rooms and messages are restricted to the authenticated customer and
assigned rider. Socket authentication verifies the account still exists, is
active, has the token's role, and has not logged out since the token was issued.
The same checks run again for ride joins and message sends. Messages created
through either HTTP or Socket.IO emit `new_message` to the ride room.

## Rider rating endpoints

- `POST /api/rides/:rideId/rating` - The ride customer submits one rating after
  completion.
- `GET /api/riders/:riderId/ratings` - Authenticated users retrieve the rider's
  ratings plus the average and total count. Here `riderId` is the rider's user
  ID.

```json
{
  "rating": 5,
  "review": "Safe and friendly service"
}
```

The rating must be numeric and between 1 and 5. The review is optional text up
to 1,000 characters. A completed ride can be rated only once, and the customer
cannot rate a rider from somebody else's ride.

## Administrator endpoints

All endpoints below require an authenticated `ADMIN` account:

- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId/status`
- `GET /api/admin/riders`
- `PATCH /api/admin/riders/:riderUserId/approval`
- `GET /api/admin/rides`
- `GET /api/admin/rides/:rideId/messages`
- `PATCH /api/admin/rides/:rideId/cancel`
- `GET /api/admin/cancellations`
- `GET /api/admin/payments`
- `PATCH /api/admin/payments/:paymentId`
- `GET /api/admin/ratings`
- `GET /api/admin/chat-access-requests`
- `PATCH /api/admin/chat-access-requests/:requestId`
- `GET /api/admin/statistics`

Account status request:

```json
{
  "accountStatus": "SUSPENDED",
  "reason": "Documented policy violation"
}
```

Payment dispute correction for a completed ride:

```json
{
  "amount": 300,
  "paymentStatus": "PAID",
  "reason": "Verified cash receipt"
}
```

Chat-access decision:

```json
{
  "decision": "APPROVE",
  "reason": "Lost-item contact is justified"
}
```

Rider approval decision:

```json
{
  "decision": "APPROVE",
  "reason": "Vehicle and rider documents verified"
}
```

Viewing a conversation requires a reason query parameter, for example
`?reason=Investigating%20a%20safety%20report&limit=50`. The audit record stores
the access reason and result count, but not message text.

Administrator force cancellation request:

```json
{
  "reason": "Safety intervention by operations"
}
```

Every sensitive administrator operation requires a reason and creates a durable audit log.
Approving chat access grants both ride participants exactly 24 hours of sending
access. Force cancellation is limited to active rides, preserves historical
lifecycle timestamps, resolves a pending mutual-cancellation request as
`ADMIN_CANCELLED`, releases the rider, and does not consume either
participant's cancellation allowance.

## Customer and rider history endpoints

- `GET /api/users/history` - Returns the authenticated customer or rider's
  rides with the linked payment, cancellation, rating, and other participant.
- `GET /api/users/rider/earnings` - Rider-only confirmed cash earnings and
  pending receipt summary.

History summaries report ride counts, payment counts, paid totals,
cancellations, and ratings. Rider earnings include only stored `PAID` payment
amounts for completed rides; the fare is never recalculated for reporting.

## Local setup

Copy `.env.example` to `.env`, then run:

```text
npm install
npm test
npm start
```

Tests use the isolated `vanniRideDB_test` database and remove it afterward.
