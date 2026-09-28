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


## Implemented Database Structure

### Users Collection

Fields:

- `_id` - MongoDB ObjectId
- `name` - User's full name
- `email` - User email address
- `phone` - User phone number
- `password_hash` - Hashed password value
- `role` - CUSTOMER, RIDER, or ADMIN
- `account_status` - Account status such as ACTIVE or SUSPENDED
- `created_at` - Account creation date and time

A unique index has been created on the `email` field to prevent duplicate user accounts.

### Riders Collection

Fields:

- `_id` - MongoDB ObjectId
- `user_id` - References the corresponding `_id` in the users collection
- `availability_status` - AVAILABLE, UNAVAILABLE, or BUSY

A unique index has been created on `user_id` so that one user cannot have multiple rider profiles.

### User-Rider Relationship

The `riders.user_id` field references `users._id`.

The relationship was tested successfully using MongoDB `$lookup`.

Current sample data includes:

- One CUSTOMER user
- One RIDER user
- One Rider profile with availability status `AVAILABLE`

## Rides Collection

The `rides` collection stores transport and delivery requests created by customers.

### Fields

- `_id` - MongoDB ObjectId
- `customer_id` - References the customer in the `users` collection
- `rider_id` - References the accepted rider in the `users` collection; initially `null`
- `request_type` - `TRANSPORT` or `DELIVERY`
- `delivery_category` - `FOOD`, `WATER`, `PARCEL`, or `null`
- `pickup_location` - Contains address, latitude, and longitude
- `destination` - Contains address, latitude, and longitude
- `distance_km` - Calculated distance of the request
- `fare_amount` - Calculated fare for the request
- `status` - Current ride status
- `created_at` - Request creation date and time
- `accepted_at` - Time the rider accepted the request
- `arrived_at` - Time the rider arrived
- `started_at` - Time the ride started
- `completed_at` - Time the ride completed
- `cancelled_at` - Time the ride was cancelled

### Ride Status Flow

The supported ride statuses are:

- `REQUESTED`
- `ACCEPTED`
- `ARRIVED`
- `STARTED`
- `COMPLETED`
- `CANCELLED`

A sample ride was tested through the following lifecycle:

`REQUESTED → ACCEPTED → ARRIVED → STARTED → COMPLETED`

When a rider accepts a ride, the rider availability status changes from `AVAILABLE` to `BUSY`.

After the ride is completed, the rider availability status returns to `AVAILABLE`.

### Relationships

`rides.customer_id` references `users._id`.

`rides.rider_id` references `users._id`.

Both customer and rider relationships were tested successfully using MongoDB `$lookup`.

### Ride Indexes

The following indexes were created:

- `{ customer_id: 1, status: 1 }`
- `{ rider_id: 1, status: 1 }`
- `{ status: 1 }`

These indexes support common queries such as finding customer rides, rider assignments, and rides by status.

### Ride Validation

MongoDB JSON Schema validation was added to the `rides` collection.

Validation currently checks:

- required ride fields
- valid ObjectId fields
- `request_type` values
- delivery category values
- pickup and destination structure
- numeric distance and fare values
- valid ride statuses
- ride timestamp field types

The validator was tested using intentionally invalid values (`request_type: "CAR"` and `status: "DONE"`), and MongoDB correctly rejected the document.


## Payments Collection

The `payments` collection stores payment information related to completed rides.

### Fields

- `_id` - MongoDB ObjectId
- `ride_id` - References the related ride in the `rides` collection
- `amount` - Payment amount
- `payment_method` - Payment method used
- `payment_status` - Current payment status
- `confirmed_by` - References the rider user who confirmed receiving the cash
- `created_at` - Date and time the payment record was created
- `paid_at` - Date and time the payment was confirmed as paid

### Payment Flow

The current implementation uses cash payments.

The supported payment flow is:

`PENDING → PAID`

When a ride is completed, a payment record can be created with status `PENDING`.

After the customer pays cash, the rider confirms the payment.

The payment status is then updated to `PAID`, the rider ID is stored in `confirmed_by`, and the `paid_at` timestamp is recorded.

### Relationships

`payments.ride_id` references `rides._id`.

`payments.confirmed_by` references `users._id`.

Both relationships were tested successfully using MongoDB `$lookup`.

### Payment Indexes

The following indexes were created:

- Unique index on `{ ride_id: 1 }`
- Index on `{ payment_status: 1 }`
- Index on `{ confirmed_by: 1 }`

The unique `ride_id` index ensures that one ride cannot have more than one payment record.

### Payment Validation

MongoDB JSON Schema validation was added to the `payments` collection.

Validation currently checks:

- required payment fields
- valid ObjectId values
- non-negative payment amount
- payment method must be `CASH`
- payment status must be `PENDING` or `PAID`
- valid date fields
- `confirmed_by` may contain a rider ObjectId or `null`

The validator was tested using intentionally invalid values (`payment_method: "CARD"` and `payment_status: "SUCCESS"`), and MongoDB correctly rejected the document.


## Messages Collection

The `messages` collection stores text chat messages between the customer and the assigned rider for a ride.

### Fields

- `_id` - MongoDB ObjectId
- `ride_id` - References the related ride in the `rides` collection
- `sender_id` - References the user who sent the message
- `message` - Text content of the message
- `created_at` - Date and time the message was sent

### Chat Flow

Messages are linked to a specific ride.

Both the customer and the assigned rider can send messages related to that ride.

A sample two-way conversation was tested successfully:

- Customer sent: `I am near the university gate.`
- Rider replied: `Okay, I am coming to the gate now.`

Messages were retrieved in chronological order using the `created_at` field.

### Relationships

`messages.ride_id` references `rides._id`.

`messages.sender_id` references `users._id`.

Both relationships were tested successfully using MongoDB `$lookup`.

### Message Indexes

The following indexes were created:

- `{ ride_id: 1, created_at: 1 }`
- `{ sender_id: 1 }`

The ride and timestamp index helps retrieve chat messages for a ride in chronological order.

### Message Validation

MongoDB JSON Schema validation was added to the `messages` collection.

Validation currently checks:

- `ride_id` must be a valid ObjectId
- `sender_id` must be a valid ObjectId
- `message` must be a string
- `message` cannot be empty
- `created_at` must be a date

The validator was tested using an empty message (`message: ""`), and MongoDB correctly rejected the document.



## Cancellations Collection

The `cancellations` collection stores cancellation records for rides that have been cancelled.

### Fields

- `_id` - MongoDB ObjectId
- `ride_id` - References the cancelled ride in the `rides` collection
- `cancelled_by` - References the user who cancelled the ride
- `reason` - Reason for cancellation
- `cancelled_at` - Date and time the cancellation occurred

### Cancellation Flow

When a ride is cancelled, the ride itself is not deleted.

Instead, the ride status is updated to `CANCELLED`, and a separate cancellation record is created.

A sample cancellation was tested using a ride in `REQUESTED` status.

The ride was updated from:

`REQUESTED → CANCELLED`

A cancellation record was then created with the user who cancelled the ride, the cancellation reason, and the cancellation timestamp.

### Relationships

`cancellations.ride_id` references `rides._id`.

`cancellations.cancelled_by` references `users._id`.

Both relationships were tested successfully using MongoDB `$lookup`.

### Cancellation Limit Support

The current design supports checking how many cancellations a user has made within the last 7 days.

A query was tested successfully to count cancellations made by a user during the previous 7-day period.

The project rule currently allows a maximum of 5 cancellations within a 7-day period.

The database stores the required cancellation history, while the exact action taken after reaching the limit will be handled according to the final application rules.

### Cancellation Indexes

The following indexes were created:

- Unique index on `{ ride_id: 1 }`
- Index on `{ cancelled_by: 1, cancelled_at: 1 }`

The unique ride index prevents multiple cancellation records for the same ride.

The cancelled user and timestamp index supports time-based cancellation checks such as the 7-day cancellation count.

### Cancellation Validation

MongoDB JSON Schema validation was added to the `cancellations` collection.

Validation currently checks:

- `ride_id` must be a valid ObjectId
- `cancelled_by` must be a valid ObjectId
- `reason` must be a non-empty string
- `cancelled_at` must be a valid date

The validator was tested using an empty cancellation reason (`reason: ""`), and MongoDB correctly rejected the document.