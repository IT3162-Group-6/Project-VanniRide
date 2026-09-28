# Vanni Ride Canonical Integration Contract

Status: Approved for implementation  
Contract version: 1.0  
Authority: Vanni Ride Pre-Development Master Specification plus confirmed team decisions

## 1. Purpose

This document is the single contract for integrating the Vanni Ride backend and
MongoDB work. Where an older branch, document, model, validator, API example, or
Postman request disagrees with this contract, this contract takes precedence on
the `backend-integration` branch.

Database documents use `snake_case`. API request and response bodies use
`camelCase`. Backend mapping code is responsible for converting between them.

## 2. Technology and Scope

- Backend: Node.js, Express, Mongoose, Socket.IO
- Database: MongoDB
- Authentication: JWT with server-side token invalidation on logout
- Roles: `CUSTOMER`, `RIDER`, `ADMIN`
- Account statuses: `ACTIVE`, `SUSPENDED`
- Payment method: cash only
- Chat: text only
- Ride request types: `TRANSPORT`, `DELIVERY`
- Delivery categories: `FOOD`, `WATER`, `PARCEL`
- `PARCEL` is displayed to users as "Other/Parcel".
- Rider ratings are included in version one.
- Live GPS tracking, card payments, files, images, voice, and video chat are out
  of scope.

## 3. Roles and Permissions

### Customer

- Register, log in, log out, and manage their profile.
- Maintain at most one active transport request and one active delivery request.
- Create, view, and cancel their own requests.
- View the assigned rider.
- Chat only with the rider assigned to their ride.
- View their ride, cancellation, and payment history.
- Rate the rider once after a completed ride.
- Request temporary post-completion chat access.
- View their remaining cancellation allowance.

### Rider

- Register, log in, log out, and manage their profile.
- Set availability to `AVAILABLE` or `UNAVAILABLE` while not handling a ride.
- View available ride requests only while `AVAILABLE`.
- Accept a request atomically; ignoring a request is the version-one reject
  behavior and creates no database record.
- Update only rides assigned to them.
- Chat only with the customer assigned to their ride.
- Confirm receipt of cash after a completed ride.
- View their ride, payment, earnings, and rating history.

### Administrator

- Log in through a protected, pre-created administrator account.
- View users, riders, rides, payments, cancellations, ratings, and statistics.
- Suspend and reactivate accounts.
- Review post-completion chat access requests.
- Correct documented payment disputes.
- Cannot rewrite the normal ride lifecycle or historical ride records.
- Additional admin functionality may be added only after a future team decision.

## 4. Canonical Status Values

### Ride

```text
REQUESTED -> ACCEPTED -> ARRIVED -> STARTED -> COMPLETED
```

Cancellation results in `CANCELLED`. These are the only ride status values:

- `REQUESTED`
- `ACCEPTED`
- `ARRIVED`
- `STARTED`
- `COMPLETED`
- `CANCELLED`

A pending mutual cancellation does not introduce another ride status. The ride
remains `STARTED` until the cancellation request is resolved.

### Rider availability

- `AVAILABLE`
- `UNAVAILABLE`
- `BUSY`

Accepting a ride changes `AVAILABLE` to `BUSY`. Completion or final cancellation
changes `BUSY` back to `AVAILABLE`.

### Payment

- `PENDING`
- `PAID`

### Administrative request statuses

- Cancellation request: `PENDING`, `CONFIRMED`, `RESUMED`, `AUTO_CANCELLED`
- Chat access request: `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`

## 5. MongoDB Collections and Fields

MongoDB automatically provides `_id` as an ObjectId. All referenced IDs below
must also be ObjectIds.

### `users`

Required fields:

- `name`: non-empty string
- `email`: normalized, unique string
- `phone`: non-empty string
- `password_hash`: bcrypt password hash
- `role`: `CUSTOMER`, `RIDER`, or `ADMIN`
- `account_status`: `ACTIVE` or `SUSPENDED`
- `token_version`: non-negative integer used to invalidate JWTs
- `created_at`: date
- `updated_at`: date

### `riders`

Required fields:

- `user_id`: unique reference to `users._id`
- `availability_status`: `AVAILABLE`, `UNAVAILABLE`, or `BUSY`
- `created_at`: date
- `updated_at`: date

### `rides`

Required fields:

- `customer_id`: reference to a customer user
- `rider_id`: rider user reference or `null`
- `request_type`: `TRANSPORT` or `DELIVERY`
- `delivery_category`: `FOOD`, `WATER`, `PARCEL`, or `null`
- `pickup_location`: `{ address, latitude, longitude }`
- `destination`: `{ address, latitude, longitude }`
- `distance_km`: non-negative road-route distance
- `fare_amount`: non-negative estimated cash fare in LKR
- `status`: canonical ride status
- `requested_at`: date

Lifecycle timestamps, nullable until applicable:

- `accepted_at`
- `arrived_at`
- `started_at`
- `completed_at`
- `cancelled_at`

Rules:

- A transport request must have `delivery_category = null`.
- A delivery request must have one approved delivery category.
- Active statuses are `REQUESTED`, `ACCEPTED`, `ARRIVED`, and `STARTED`.
- A customer may have no more than one active `TRANSPORT` and one active
  `DELIVERY` request at the same time.

### `payments`

Required fields:

- `ride_id`: unique reference to `rides._id`
- `amount`: non-negative fare amount
- `payment_method`: `CASH`
- `payment_status`: `PENDING` or `PAID`
- `confirmed_by`: rider user reference or `null`
- `created_at`: date
- `paid_at`: date or `null`

One pending payment is created with each ride. Only the assigned rider may mark
it paid after the ride is `COMPLETED`. An administrator may correct a documented
payment dispute through an audited admin operation.

### `messages`

Required fields:

- `ride_id`: reference to `rides._id`
- `sender_id`: reference to `users._id`
- `message_text`: non-empty text, maximum 1,000 characters
- `sent_at`: date

### `cancellations`

This collection contains final cancellation history, not pending requests.

Required fields:

- `ride_id`: unique reference to `rides._id`
- `cancelled_by`: user who initiated the final cancellation
- `reason`: non-empty string, maximum 500 characters
- `previous_status`: `REQUESTED`, `ACCEPTED`, or `STARTED`
- `cancellation_mode`: `IMMEDIATE`, `MUTUAL`, or `AUTO_TIMEOUT`
- `cancelled_at`: date

### `cancellation_requests`

Used only when cancellation is requested after the ride is `STARTED`.

Required fields:

- `ride_id`: reference to the active ride
- `requested_by`: initiating customer or rider
- `responding_user_id`: the other ride participant
- `reason`: non-empty string, maximum 500 characters
- `status`: `PENDING`, `CONFIRMED`, `RESUMED`, or `AUTO_CANCELLED`
- `requested_at`: date
- `expires_at`: exactly 15 minutes after `requested_at`
- `responded_at`: date or `null`
- `resolved_at`: date or `null`

Only one pending cancellation request may exist for a ride.

### `ratings`

Required fields:

- `ride_id`: unique reference to a completed ride
- `customer_id`: the ride's customer
- `rider_id`: the ride's assigned rider
- `rating`: numeric value from 1 through 5
- `review`: optional string or `null`, maximum 1,000 characters
- `created_at`: date

Only the ride customer may create the rating, and only after `COMPLETED`.

### `chat_access_requests`

Used when a customer needs to contact a rider after ride completion.

Required fields:

- `ride_id`: reference to a completed ride
- `requested_by`: the ride customer
- `rider_id`: the assigned rider
- `reason`: non-empty string, maximum 500 characters
- `status`: `PENDING`, `APPROVED`, `REJECTED`, or `EXPIRED`
- `reviewed_by`: admin user reference or `null`
- `requested_at`: date
- `reviewed_at`: date or `null`
- `approved_from`: date or `null`
- `approved_until`: date or `null`

Approval grants both ride participants access to send messages for 24 hours.
Message history is never deleted when access expires.

## 6. Cancellation Rules

### Before the ride starts

- The customer may cancel their own ride while it is `REQUESTED` or `ACCEPTED`.
- The assigned rider may cancel while it is `ACCEPTED`.
- Cancellation is immediate and requires a reason.
- The ride is retained and its status becomes `CANCELLED`.

### After the ride starts

1. Either participant submits a cancellation request and reason.
2. The ride remains `STARTED`.
3. The other participant is asked to choose `CANCEL` or `RESUME`.
4. `CANCEL` finalizes the cancellation using mode `MUTUAL`.
5. `RESUME` leaves the ride in `STARTED` and resolves the request as `RESUMED`.
6. No response within 15 minutes finalizes cancellation using mode
   `AUTO_TIMEOUT` and request status `AUTO_CANCELLED`.

The timeout must be recoverable after a server restart; it cannot depend only on
an in-memory timer.

### Rolling cancellation allowance

- A user may initiate at most five final cancellations in a rolling 60-minute
  window.
- The sixth final cancellation attempt is blocked until an earlier cancellation
  falls outside the window.
- `TRANSPORT` and `DELIVERY` cancellations use the same shared allowance.
- Rejected/resumed pending requests do not consume an allowance.
- A pending started-ride cancellation temporarily reserves one allowance so
  concurrent requests cannot exceed the limit. Resuming releases it.
- A confirmed or automatically finalized started-ride cancellation is counted
  against the initiating user.
- API responses expose `limit`, `used`, `remaining`, `pendingReservations`, and
  `resetsAt` for the earliest finalized cancellation leaving the window.
- Customers must be able to view their remaining allowance.

## 7. Routing and Fare Contract

- The customer supplies pickup and destination addresses and coordinates.
- The backend requests alternative road routes from an OSRM-compatible routing
  provider through a configurable adapter and uses the shortest distance among
  the routes returned by that provider.
- Straight-line distance must not be silently used as a fallback.
- If the routing provider cannot calculate a route, the request returns a
  service-unavailable error and does not create a ride.
- Live location tracking is not included.

Version-one fare calculation:

```text
TRANSPORT = LKR 200 base fare + LKR 80 per road-route kilometre
DELIVERY  = LKR 150 base fare + LKR 80 per road-route kilometre
```

The final estimate is rounded to the nearest whole LKR and stored in both the
ride and its pending payment record.

## 8. Chat Contract

- Chat is available after assignment during `ACCEPTED`, `ARRIVED`, and `STARTED`.
- Only the ride customer and assigned rider may read or send messages.
- Messages are text only and retained permanently as ride history.
- After `COMPLETED` or `CANCELLED`, history remains readable and sending is
  disabled. Only a `COMPLETED` ride can receive temporary post-completion
  approval; cancelled rides remain read-only.
- Only the customer may request post-completion access.
- An administrator approves or rejects the request.
- Approval enables both participants to send messages for 24 hours.

## 9. Canonical HTTP API

All private endpoints require `Authorization: Bearer <token>`.

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

Public registration accepts only `CUSTOMER` and `RIDER`. Admin accounts are
created through protected setup tooling.

### User and rider profile

- `GET /api/users/profile`
- `PUT /api/users/profile`
- `PATCH /api/users/rider/availability`
- `GET /api/users/cancellation-allowance`

### Rides

- `POST /api/rides`
- `GET /api/rides` - current user's ride history
- `GET /api/rides/available` - available riders only
- `GET /api/rides/:rideId`
- `PATCH /api/rides/:rideId/accept`
- `PATCH /api/rides/:rideId/status`
- `PATCH /api/rides/:rideId/cancel`
- `GET /api/rides/:rideId/cancellation-request` - retrieve a pending request
- `PATCH /api/rides/:rideId/cancellation-request` - other participant chooses
  `CANCEL` or `RESUME`

For a `REQUESTED` or `ACCEPTED` ride, the cancel endpoint returns the final
cancelled ride. For a `STARTED` ride, it returns HTTP 202 with the pending
cancellation request.

### Payment

- `GET /api/rides/:rideId/payment`
- `PATCH /api/rides/:rideId/payment`

### Chat

- `GET /api/rides/:rideId/messages`
- `POST /api/rides/:rideId/messages`
- `POST /api/rides/:rideId/chat-access-requests`

### Ratings

- `POST /api/rides/:rideId/rating`
- `GET /api/riders/:riderId/ratings`

### Administration

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

## 10. API Data and Error Standards

Successful single-resource response:

```json
{
  "success": true,
  "data": {
    "resource": {}
  }
}
```

Successful list response:

```json
{
  "success": true,
  "results": 0,
  "data": {
    "resources": []
  }
}
```

Error response:

```json
{
  "success": false,
  "code": "MACHINE_READABLE_CODE",
  "message": "Human-readable explanation."
}
```

Validation errors may additionally include a `details` array. Stack traces and
internal database errors must not be returned in production.

Expected status codes:

- `200` successful read/update
- `201` resource created
- `202` started-ride cancellation awaiting confirmation
- `400` invalid request data
- `401` missing, invalid, expired, or logged-out token
- `403` authenticated but unauthorized or suspended
- `404` resource not found
- `409` lifecycle, availability, duplicate, or quota conflict
- `503` routing provider unavailable

## 11. Socket.IO Contract

Socket connections require the same JWT checks as HTTP requests, including user
existence, token version, account status, and role.

Client events:

- `join_ride`
- `send_message`

Server events:

- `new_ride_request` - available riders only
- `ride_status_changed`
- `new_message`
- `cancellation_requested`
- `cancellation_resolved`
- `chat_access_updated`

Room membership never replaces authorization checks against MongoDB.

## 12. Required Indexes

- Unique `users.email`
- Unique `riders.user_id`
- `riders.availability_status`
- `rides.customer_id + rides.request_type + rides.status`
- `rides.rider_id + rides.status`
- `rides.status + rides.requested_at`
- Unique `payments.ride_id`
- `payments.payment_status`
- `messages.ride_id + messages.sent_at`
- Unique `cancellations.ride_id`
- `cancellations.cancelled_by + cancellations.cancelled_at`
- Partial unique pending request index for `cancellation_requests.ride_id`
- `cancellation_requests.requested_by + cancellation_requests.status`
- Unique `ratings.ride_id`
- `ratings.rider_id + ratings.created_at`
- `chat_access_requests.status + chat_access_requests.requested_at`
- `chat_access_requests.ride_id + chat_access_requests.approved_until`

## 13. Integration and Definition of Done

Work is integrated on `backend-integration`. Teammate source branches are not
modified. A feature is done only when:

1. Its implementation follows this contract.
2. Unit/API tests pass.
3. MongoDB validators accept the resulting documents.
4. Authorization and negative cases are tested.
5. It is exercised as part of the complete user journey.
6. Documentation and the Postman collection are updated.
7. Another team member reviews it before any merge to `main`.
