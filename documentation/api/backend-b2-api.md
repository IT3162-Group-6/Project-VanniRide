# Vanni Ride Backend Member 2 API

This document describes the ride lifecycle, cash payment, and text chat APIs
integrated on the `backend-integration` branch.

## Authentication dependency

All endpoints require Member B1's JWT authentication middleware to populate:

```js
req.user = {
  id: '<MongoDB user ObjectId>',
  role: 'CUSTOMER' // or RIDER
};
```

The B2 controllers also enforce the role and MongoDB ObjectId requirements.

## Ride workflow

```text
REQUESTED -> ACCEPTED -> ARRIVED -> STARTED -> COMPLETED
```

Cancellation is supported from `REQUESTED` and `ACCEPTED`. Rides are retained
after cancellation and a separate cancellation record is created.

## Location format

```json
{
  "address": "University of Vavuniya",
  "latitude": 8.7581,
  "longitude": 80.4982
}
```

Distance is estimated from the coordinates. Fare is stored as an estimated
cash fare in LKR.

## Ride endpoints

### Create a ride

`POST /api/rides/request` - Customer only

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

`rideType` may be `TRANSPORT` or `DELIVERY`. A delivery may optionally include
`deliveryCategory` with `FOOD`, `WATER`, or `PARCEL`.

### List available rides

`GET /api/rides/available` - Available rider only

### List the current user's rides

`GET /api/rides/mine` - Customer or rider

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
- `GET /api/admin/rides`
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

Every administrator mutation requires a reason and creates a durable audit log.
Approving chat access grants both ride participants exactly 24 hours of sending
access. Administrators can monitor ride history but cannot rewrite ride status
or historical lifecycle timestamps.

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
