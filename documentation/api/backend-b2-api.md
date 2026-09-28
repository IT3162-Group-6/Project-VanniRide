# Vanni Ride Backend Member 2 API

This document describes the ride lifecycle, cash payment, and text chat APIs
implemented on the `backend-ride` branch.

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

The PATCH endpoint changes `PENDING` to `PAID` and records `paidAt`.

## Chat endpoints

- `GET /api/rides/:rideId/messages` - Customer or assigned rider
- `POST /api/rides/:rideId/messages` - Customer or assigned rider during an
  active assigned ride

```json
{
  "messageText": "I am waiting near the main gate."
}
```

Only text messages are supported. History remains readable after the ride.

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
assigned rider.

## Local setup

Copy `.env.example` to `.env`, then run:

```text
npm install
npm test
npm start
```

Tests use the isolated `vanniRideDB_test` database and remove it afterward.
