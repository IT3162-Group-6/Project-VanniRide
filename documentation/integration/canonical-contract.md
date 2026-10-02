# Vanni Ride Canonical Integration Contract

Status: Approved for implementation  
Contract version: 1.1
Authority: Vanni Ride Pre-Development Master Specification plus confirmed team decisions

## 1. Purpose

This document is the single contract for integrating the Vanni Ride backend and
MongoDB work. Where an older branch, document, model, validator, API example, or
Postman request disagrees with this contract, this contract takes precedence on
the `frontend-backend-integration` branch. The approved frontend integration
details are defined in `frontend-backend-integration-contract.md`.

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
- Live pickup/destination selection and road-route display use OpenStreetMap,
  a Nominatim-compatible geocoder, Leaflet, and the existing OSRM-compatible
  backend adapter.
- Rider vehicle information and administrator approval are included.
- Live continuous GPS tracking, card payments, files, images, voice, and video
  chat are out of scope.

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
- Supply vehicle information and receive administrator approval before working.
- Set availability to `AVAILABLE` or `UNAVAILABLE` while approved and not
  handling a ride.
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
- Approve or reject rider vehicle profiles.
- View ride conversations through a reasoned and audited admin endpoint.
- Force-cancel an active ride through a reasoned and audited safety operation.
- Correct documented payment disputes.
- Cannot rewrite completed or already-cancelled historical ride records.
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

### Rider approval

- `PENDING`
- `APPROVED`
- `REJECTED`

Only an approved rider with an active account may become available or accept a
ride.

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
- `vehicle`: required object containing `type`, `model`,
  `registration_number`, and `color`
- `approval_status`: `PENDING`, `APPROVED`, or `REJECTED`
- `review_reason`: string or `null`
- `reviewed_by`: admin user reference or `null`
- `reviewed_at`: date or `null`
- `created_at`: date
- `updated_at`: date

Vehicle registration numbers are normalized and unique. New riders start
`PENDING` and `UNAVAILABLE`. Changing approved vehicle information resets the
rider to `PENDING` and `UNAVAILABLE`.

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
payment dispute through an audited admin operation. Rider confirmation records
the assigned rider in `confirmed_by`, records `paid_at`, and returns the amount
stored on the payment rather than recalculating it.

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
- `previous_status`: `REQUESTED`, `ACCEPTED`, `ARRIVED`, or `STARTED`
- `cancellation_mode`: `IMMEDIATE`, `MUTUAL`, `AUTO_TIMEOUT`, or `ADMIN_FORCE`
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
Each completed ride may be rated once. The rider ratings endpoint uses the
rider's user ID and returns the individual ratings plus `averageRating` and
`totalRatings`; the average is `null` when no ratings exist.

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

### `admin_audit_logs`

Every administrator mutation and sensitive conversation view is recorded as an
append-only audit entry.

Required fields:

- `admin_id`: administrator user reference
- `action`: `USER_STATUS_CHANGED`, `PAYMENT_CORRECTED`,
  `CHAT_ACCESS_REVIEWED`, `RIDER_APPROVAL_REVIEWED`,
  `RIDE_MESSAGES_VIEWED`, or `RIDE_FORCE_CANCELLED`
- `target_type`: `USER`, `PAYMENT`, `CHAT_ACCESS_REQUEST`, `RIDER`, or `RIDE`
- `target_id`: targeted document reference
- `reason`: non-empty administrative reason, maximum 500 characters
- `before`: object containing the relevant values before the change
- `after`: object containing the relevant values after the change
- `created_at`: date

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

An administrator force-cancellation is a separate, audited safety operation. It
may cancel any active status without participant confirmation, never consumes a
participant allowance, and cannot alter a completed or cancelled ride.

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
- An administrator force-cancellation never consumes either participant's
  allowance.

## 7. Routing and Fare Contract

- The customer supplies pickup and destination addresses and coordinates.
- The frontend selects those coordinates with an attributed Leaflet map using
  OpenStreetMap tiles. Deliberate address search and reverse geocoding pass
  through a configurable, throttled, cached backend adapter. Public Nominatim
  is not used for search-as-you-type autocomplete.
- The backend requests alternative road routes from an OSRM-compatible routing
  provider through a configurable adapter and uses the shortest distance among
  the routes returned by that provider. Route preview also returns estimated
  duration and GeoJSON route geometry for display.
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
- Expired approval records transition to `EXPIRED` when access is checked;
  message history remains readable.
- Messages created through either the HTTP endpoint or Socket.IO emit the same
  `new_message` payload to the ride room.
- An administrator may view a paginated ride conversation only through the
  reasoned, audited admin endpoint. Viewing does not permit the admin to send a
  message or change participant chat access.

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
- `PUT /api/users/rider/profile`
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

### Customer and rider history

- `GET /api/users/history` - participant-scoped ride, payment, cancellation,
  and rating history with a role-specific summary
- `GET /api/users/rider/earnings` - rider-only confirmed earnings and pending
  receipt summary for completed rides

Earnings use the authoritative amount stored on each payment. Only `PAID`
payments count toward confirmed earnings; `PENDING` completed-ride payments are
reported separately as pending receipts.

### Administration

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

Administrator mutations require a non-empty `reason`. Account management only
allows `ACTIVE` and `SUSPENDED`, invalidates existing sessions by incrementing
the user's token version, and prevents administrators from changing their own
status. Payment corrections apply only to completed rides and may correct the
stored amount and/or `PENDING`/`PAID` status without rewriting the ride fare or
lifecycle. A chat-access approval lasts exactly 24 hours. Each mutation stores
an `admin_audit_logs` entry containing its before/after values.

Admin conversation viewing also requires a non-empty audit reason. Admin force
cancellation is limited to active statuses, records `ADMIN_FORCE`, resolves any
pending mutual request without charging the participant allowance, releases the
rider appropriately, and cannot alter completed or already-cancelled rides.

### Map services

- `GET /api/maps/search`
- `GET /api/maps/reverse`
- `POST /api/maps/route-preview`

Map search is deliberate rather than autocomplete. Route preview performs no
database write; ride creation independently recalculates distance and fare.

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
existence, token version, account status, and role. Session validity is checked
again when joining a ride room and sending a message.

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
- `rider_approval_updated`
- `ride_force_cancelled`

Room membership never replaces authorization checks against MongoDB.

## 12. Required Indexes

- Unique `users.email`
- Unique `riders.user_id`
- `riders.availability_status`
- `riders.approval_status`
- Unique normalized `riders.vehicle.registration_number`
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
- `admin_audit_logs.admin_id + admin_audit_logs.created_at`
- `admin_audit_logs.target_type + admin_audit_logs.target_id + admin_audit_logs.created_at`

## 13. Integration and Definition of Done

Work is integrated on `frontend-backend-integration`. Teammate source branches
are not modified. A feature is done only when:

1. Its implementation follows this contract.
2. Unit/API tests pass.
3. MongoDB validators accept the resulting documents.
4. Authorization and negative cases are tested.
5. It is exercised as part of the complete user journey.
6. Documentation and the Postman collection are updated.
7. Another team member reviews it before any merge to `main`.
