# Vanni Ride — Database Design

## 1. Database Overview

Vanni Ride is a transportation and delivery coordination platform for the University of Vavuniya community.

The system uses MongoDB as its database for storing persistent application data, including user information, rider information, service requests, conversations, payments, cancellations, ratings, and other system data.

The database must maintain data integrity, relationships between entities, validation rules, and information required for ride history and administrative monitoring.

---

## 2. Database Technology

**Database:** MongoDB

**Database Name:** `vanniRideDB`

**Database Type:** NoSQL Document Database

The application will communicate with MongoDB through the backend application. The frontend will not directly access the database.

---

## 3. Main Collections

The initial database design contains the following core collections:

1. `users`
2. `riders`
3. `rides`
4. `payments`
5. `messages`
6. `cancellations`

The project proposal also identifies ratings/reviews as a system feature. A separate `ratings` collection will be finalized only after the team confirms the exact rating requirements.

---

# 4. USERS Collection

The `users` collection stores common information about all registered users.

A user can have one of the following roles:

* CUSTOMER
* RIDER
* ADMIN

## Fields

| Field            | Data Type | Required | Description                        |
| ---------------- | --------- | -------- | ---------------------------------- |
| `_id`            | ObjectId  | Yes      | Unique MongoDB document identifier |
| `name`           | String    | Yes      | User's name                        |
| `email`          | String    | Yes      | User's email address               |
| `phone`          | String    | Yes      | User's phone number                |
| `password_hash`  | String    | Yes      | Hashed user password               |
| `role`           | String    | Yes      | User role                          |
| `account_status` | String    | Yes      | Current account status             |
| `created_at`     | Date      | Yes      | Account creation date/time         |

## Validation Rules

* Required fields cannot be empty.
* Email must be valid.
* Email must be unique.
* Password must satisfy the agreed minimum requirements before hashing.
* `role` must contain an approved role.
* `account_status` must contain an approved account status.

## Allowed Roles

```text
CUSTOMER
RIDER
ADMIN
```

## Proposed Account Status

```text
ACTIVE
INACTIVE
```

---

# 5. RIDERS Collection

The `riders` collection stores information specific to users who provide transportation or delivery services.

A rider is linked to an existing user through `user_id`.

## Fields

| Field                 | Data Type | Required | Description                         |
| --------------------- | --------- | -------- | ----------------------------------- |
| `_id`                 | ObjectId  | Yes      | Unique rider document identifier    |
| `user_id`             | ObjectId  | Yes      | Reference to the corresponding user |
| `availability_status` | String    | Yes      | Current rider availability          |

## Allowed Availability Statuses

```text
AVAILABLE
UNAVAILABLE
BUSY
```

## Rules

* A rider must be associated with a valid user.
* Only available riders should be considered for available requests.
* When a rider accepts a ride, their availability may become `BUSY`.
* After completion or cancellation, the rider may become `AVAILABLE`, depending on the final team decision.

---

# 6. RIDES Collection

The `rides` collection stores transportation and delivery service requests.

A ride is created by a customer and may later be assigned to a rider.

## Fields

| Field             | Data Type | Required | Description                      |
| ----------------- | --------- | -------- | -------------------------------- |
| `_id`             | ObjectId  | Yes      | Unique ride document identifier  |
| `customer_id`     | ObjectId  | Yes      | Customer who created the request |
| `rider_id`        | ObjectId  | No       | Rider assigned to the request    |
| `request_type`    | String    | Yes      | Type of requested service        |
| `pickup_location` | Object    | Yes      | Pickup coordinates/location      |
| `destination`     | Object    | Yes      | Destination coordinates/location |
| `status`          | String    | Yes      | Current ride status              |
| `requested_at`    | Date      | Yes      | Time the request was created     |
| `accepted_at`     | Date      | No       | Time the request was accepted    |
| `started_at`      | Date      | No       | Time the service started         |
| `completed_at`    | Date      | No       | Time the service completed       |
| `cancelled_at`    | Date      | No       | Time the request was cancelled   |

## Location Structure

The initial location structure can contain:

```text
pickup_location
    latitude
    longitude

destination
    latitude
    longitude
```

The exact location representation must remain consistent with the agreed backend/API design.

---

# 7. Request Types

The project supports transportation and delivery services.

The proposed request types are:

```text
TRANSPORT
DELIVERY
```

The team must finalize the exact information required for each request type before implementation.

At minimum, every ride request contains:

* Customer
* Pickup location
* Destination
* Request type
* Request time
* Current status

No additional delivery/item fields should be added unless they are part of the approved project scope.

---

# 8. Ride Status

The database, backend, and frontend must use the same ride status values.

## Status Values

```text
REQUESTED
ACCEPTED
ARRIVED
STARTED
COMPLETED
CANCELLED
```

## Standard Ride Flow

```text
REQUESTED
     ↓
ACCEPTED
     ↓
ARRIVED
     ↓
STARTED
     ↓
COMPLETED
```

Cancellation can result in:

```text
REQUESTED → CANCELLED
```

and, if permitted by the final project rules:

```text
ACCEPTED → CANCELLED
```

---

# 9. Ride Acceptance Rules

A rider can accept a ride only when:

1. The rider is available.
2. The ride status is still `REQUESTED`.
3. Another rider has not already been assigned.

When a ride is accepted:

```text
ride.status = ACCEPTED
ride.rider_id = selected rider
```

The corresponding acceptance time should also be recorded.

---

# 10. PAYMENTS Collection

Vanni Ride uses cash-only payments.

The database records the payment status but does not process electronic payments.

## Fields

| Field            | Data Type | Required | Description                        |
| ---------------- | --------- | -------- | ---------------------------------- |
| `_id`            | ObjectId  | Yes      | Unique payment document identifier |
| `ride_id`        | ObjectId  | Yes      | Related ride                       |
| `payment_method` | String    | Yes      | Payment method                     |
| `payment_status` | String    | Yes      | Current payment status             |
| `paid_at`        | Date      | No       | Time payment was confirmed         |

## Payment Method

```text
CASH
```

## Payment Status

```text
PENDING
PAID
```

## Payment Flow

```text
Ride Created
     ↓
Payment = PENDING
     ↓
Ride Completed
     ↓
Customer pays rider in cash
     ↓
Payment = PAID
```

The team must finalize who confirms that the cash payment was received.

---

# 11. MESSAGES Collection

The `messages` collection stores text messages exchanged between a customer and the rider assigned to a particular ride.

## Fields

| Field          | Data Type | Required | Description               |
| -------------- | --------- | -------- | ------------------------- |
| `_id`          | ObjectId  | Yes      | Unique message identifier |
| `ride_id`      | ObjectId  | Yes      | Related ride              |
| `sender_id`    | ObjectId  | Yes      | User who sent the message |
| `message_text` | String    | Yes      | Text content              |
| `sent_at`      | Date      | Yes      | Message timestamp         |

## Rules

* Sender must belong to the relevant ride.
* Message cannot be empty.
* Chat is restricted to the customer and assigned rider.
* Messages are associated with a specific ride.
* Conversation history should be retained.

## Not Included

The chat system does not include:

* Images
* Files
* Voice messages
* Video calls

---

# 12. CANCELLATIONS Collection

Cancelled rides should not be deleted from the database.

A cancellation record is stored separately for tracking and history.

## Fields

| Field          | Data Type | Required               | Description                    |
| -------------- | --------- | ---------------------- | ------------------------------ |
| `_id`          | ObjectId  | Yes                    | Unique cancellation identifier |
| `ride_id`      | ObjectId  | Yes                    | Cancelled ride                 |
| `cancelled_by` | ObjectId  | Yes                    | User who cancelled             |
| `reason`       | String    | Depends on final rules | Cancellation reason            |
| `cancelled_at` | Date      | Yes                    | Cancellation time              |

## Cancellation Rules

Before acceptance:

```text
REQUESTED → CANCELLED
```

The team must decide whether cancellation after acceptance is allowed.

After the ride has started, cancellation is normally not allowed unless the approved project requirements specify otherwise.

Cancelled rides remain stored for:

* Ride history
* Administrative monitoring
* Statistics
* Cancellation records

---

# 13. Relationships

The main database relationships are:

```text
USER
 ├── Customer
 ├── Rider Profile
 └── Admin
```

Core ride relationship:

```text
Customer
    ↓
creates
    ↓
Ride
    ↓
assigned to
    ↓
Rider
```

Additional relationships:

```text
Ride → Payment

Ride → Messages

Ride → Cancellation
```

## Reference Fields

```text
riders.user_id
        ↓
users._id

rides.customer_id
        ↓
users._id

rides.rider_id
        ↓
riders._id

payments.ride_id
        ↓
rides._id

messages.ride_id
        ↓
rides._id

messages.sender_id
        ↓
users._id

cancellations.ride_id
        ↓
rides._id

cancellations.cancelled_by
        ↓
users._id
```

---

# 14. Data Integrity Rules

The database design must maintain the following rules:

### User

* Email must be unique.
* Required registration fields must be present.
* User role must be valid.

### Rider

* Rider must reference a valid user.
* Rider availability must use an approved status.

### Ride

* Customer must be identified.
* Pickup location is required.
* Destination is required.
* Request type is required.
* Ride status must be valid.
* A ride can only be accepted when it is still `REQUESTED`.
* A ride cannot have multiple riders assigned simultaneously.

### Payment

* Payment must reference a valid ride.
* Payment method must be `CASH`.
* Payment status must be valid.

### Message

* Message must reference a valid ride.
* Sender must be authorized for the ride.
* Message text cannot be empty.

### Cancellation

* Cancellation must reference a valid ride.
* The user who cancelled must be recorded.
* Cancellation time must be recorded.

---

# 15. Database Naming Convention

The database will use `snake_case` naming.

Examples:

```text
customer_id
rider_id
request_type
pickup_location
ride_status
created_at
completed_at
```

The final API/frontend naming convention must be agreed upon by the development team and documented consistently.

---

# 16. Proposed Indexes

Indexes will be added based on the application's expected queries.

Initial candidates include:

```text
users.email
riders.user_id
riders.availability_status
rides.customer_id
rides.rider_id
rides.status
payments.ride_id
messages.ride_id
cancellations.ride_id
```

The final index list will be confirmed after the required database queries are identified.

---

# 17. Ratings

The project proposal includes rating/review functionality.

However, the Master Specification's suggested main database entities do not explicitly list a ratings collection.

Therefore, ratings should not be implemented until the team confirms:

* Whether ratings are required in the final scope.
* Who can rate whom.
* Whether a rating is associated with a completed ride.
* Rating scale.
* Whether written feedback is required.
* Whether one rating is allowed per ride.

If approved, a separate `ratings` collection can be designed.

---

# 18. Database Decisions Pending Team Confirmation

The following decisions must be finalized before the database design is considered completely frozen:

1. Exact request types.
2. Exact information required for transport and delivery requests.
3. Whether customers can have multiple active requests.
4. Rider matching/selection rules.
5. Automatic rider availability changes.
6. Whether customers can cancel after rider acceptance.
7. Who confirms cash payment.
8. How the payment/fare amount is stored.
9. Chat retention rules.
10. Final rating/review requirements.

No major fields should be added without team agreement.

---

# 19. Database Development Principle

The database should be developed and integrated progressively.

Initial integration stages:

```text
Registration/Login
       ↓
Users Database
```

Then:

```text
Customer Creates Request
       ↓
Backend
       ↓
Rides Database
```

Then:

```text
Rider Views Request
       ↓
Rider Accepts
       ↓
Ride Database Updated
       ↓
Customer Sees Assigned Rider
```

Further integrations will include:

```text
Payment
Chat
Cancellation
Ratings
Administration
```

---

# 20. Database Responsibility

The database team is responsible for:

* Database design
* ER/data model
* Collections
* Relationships
* Constraints
* Validation rules
* Queries
* Database updates
* Test/sample data
* Database documentation
* Supporting database integration
* Database-related testing and fixes

Backend API implementation remains the responsibility of the backend team.

---

# 21. Definition of Database Completion

The database component will be considered complete when:

* Database design is finalized.
* Required collections are implemented.
* Relationships are implemented.
* Validation rules are implemented.
* Required indexes are implemented.
* Sample/test data is available.
* Required database queries work correctly.
* Database operations have been tested.
* Backend integration has been completed and verified.
* Database documentation is complete.
* No critical database-related issues remain.
