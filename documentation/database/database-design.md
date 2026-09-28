# Vanni Ride - Database Design

## 1. Database Overview

Vanni Ride is a transportation and delivery coordination platform for the University of Vavuniya community.

The system uses MongoDB to store persistent application data including users, rider profiles, ride and delivery requests, payments, chat messages, cancellations, and ratings.

The frontend does not directly access MongoDB. Database operations are performed through the backend application.

---

## 2. Database Technology

- Database: MongoDB
- Database Name: `vanniRideDB`
- Database Type: NoSQL Document Database

---

## 3. Final Main Collections

The Vanni Ride database currently contains seven main collections:

1. `users`
2. `riders`
3. `rides`
4. `payments`
5. `messages`
6. `cancellations`
7. `ratings`

All seven collections have been created and tested.

---

# 4. Users Collection

The `users` collection stores common information about all registered users.

## Fields

- `_id` - MongoDB ObjectId
- `name` - User's full name
- `email` - User email address
- `phone` - User phone number
- `password_hash` - Hashed password value
- `role` - User role
- `account_status` - Current account status
- `created_at` - Account creation date and time

## Allowed Roles

- `CUSTOMER`
- `RIDER`
- `ADMIN`

## Account Status

- `ACTIVE`
- `SUSPENDED`

## Indexes

A unique index is created on:

```text
email
```

This prevents multiple user accounts from using the same email address.

## Validation

MongoDB JSON Schema validation checks:

- name must be a non-empty string
- email must be a non-empty string
- phone must be a non-empty string
- password_hash must be a non-empty string
- role must be `CUSTOMER`, `RIDER`, or `ADMIN`
- account_status must be `ACTIVE` or `SUSPENDED`
- created_at must be a date

The validator was tested using an invalid role value:

```text
DRIVER
```

MongoDB correctly rejected the document.

---

# 5. Riders Collection

The `riders` collection stores information specific to users who provide transport or delivery services.

A rider profile is connected to a user account through `user_id`.

## Fields

- `_id` - MongoDB ObjectId
- `user_id` - References `users._id`
- `availability_status` - Current rider availability

## Rider Availability

- `AVAILABLE`
- `UNAVAILABLE`
- `BUSY`

## Relationship

```text
riders.user_id
       ->
users._id
```

The relationship was successfully tested using MongoDB `$lookup`.

## Indexes

A unique index is created on:

```text
user_id
```

This prevents one user from having multiple rider profiles.

## Validation

MongoDB validation checks:

- user_id must be an ObjectId
- availability_status must be `AVAILABLE`, `UNAVAILABLE`, or `BUSY`

The validator was tested with:

```text
FREE
```

MongoDB correctly rejected the invalid availability value.

---

# 6. Rides Collection

The `rides` collection stores transportation and delivery requests created by customers.

## Fields

- `_id` - MongoDB ObjectId
- `customer_id` - References the customer in `users`
- `rider_id` - References the accepted rider in `users`
- `request_type` - `TRANSPORT` or `DELIVERY`
- `delivery_category` - `FOOD`, `WATER`, `PARCEL`, or `null`
- `pickup_location` - Pickup address and coordinates
- `destination` - Destination address and coordinates
- `distance_km` - Calculated distance
- `fare_amount` - Calculated fare
- `status` - Current ride status
- `created_at` - Request creation time
- `accepted_at` - Rider acceptance time
- `arrived_at` - Rider arrival time
- `started_at` - Ride start time
- `completed_at` - Ride completion time
- `cancelled_at` - Ride cancellation time

## Request Types

- `TRANSPORT`
- `DELIVERY`

For delivery requests, supported categories are:

- `FOOD`
- `WATER`
- `PARCEL`

For transport requests:

```text
delivery_category = null
```

## Location Structure

Example:

```text
pickup_location
    address
    latitude
    longitude

destination
    address
    latitude
    longitude
```

This structure supports later map and route integration.

## Ride Statuses

- `REQUESTED`
- `ACCEPTED`
- `ARRIVED`
- `STARTED`
- `COMPLETED`
- `CANCELLED`

## Normal Ride Flow

```text
REQUESTED
   ->
ACCEPTED
   ->
ARRIVED
   ->
STARTED
   ->
COMPLETED
```

A sample ride was successfully tested through this complete lifecycle.

## Rider Availability Flow

When a rider accepts a ride:

```text
AVAILABLE -> BUSY
```

After the ride is completed:

```text
BUSY -> AVAILABLE
```

## Relationships

```text
rides.customer_id
       ->
users._id
```

```text
rides.rider_id
       ->
users._id
```

Both relationships were successfully tested using MongoDB `$lookup`.

## Indexes

The following indexes were created:

```text
{ customer_id: 1, status: 1 }
{ rider_id: 1, status: 1 }
{ status: 1 }
```

These indexes support common ride queries.

## Validation

MongoDB validation checks:

- required ride fields
- customer_id ObjectId
- rider_id ObjectId or null
- valid request type
- valid delivery category
- pickup location structure
- destination structure
- numeric distance
- numeric fare
- valid ride status
- valid timestamp fields

The validator was tested using:

```text
request_type: CAR
status: DONE
```

MongoDB correctly rejected the invalid document.

---

# 7. Payments Collection

The `payments` collection stores payment information related to rides.

Vanni Ride currently uses cash payments.

## Fields

- `_id` - MongoDB ObjectId
- `ride_id` - References `rides._id`
- `amount` - Payment amount
- `payment_method` - Payment method
- `payment_status` - Current payment status
- `confirmed_by` - Rider user who confirmed the cash payment
- `created_at` - Payment record creation time
- `paid_at` - Payment confirmation time

## Payment Method

```text
CASH
```

## Payment Status

- `PENDING`
- `PAID`

## Payment Flow

```text
Ride completed
      ->
Payment PENDING
      ->
Customer pays cash
      ->
Rider confirms payment
      ->
Payment PAID
```

When payment is confirmed:

- payment_status becomes `PAID`
- confirmed_by stores the rider user ID
- paid_at stores the confirmation time

## Relationships

```text
payments.ride_id
       ->
rides._id
```

```text
payments.confirmed_by
       ->
users._id
```

Both relationships were successfully tested.

## Indexes

- Unique index on `{ ride_id: 1 }`
- Index on `{ payment_status: 1 }`
- Index on `{ confirmed_by: 1 }`

The unique ride index ensures one ride currently has one payment record.

## Validation

Validation checks:

- ride_id must be an ObjectId
- amount must be numeric and non-negative
- payment_method must be `CASH`
- payment_status must be `PENDING` or `PAID`
- confirmed_by must be an ObjectId or null
- created_at must be a date
- paid_at must be a date or null

The validator was tested using:

```text
payment_method: CARD
payment_status: SUCCESS
```

MongoDB correctly rejected the document.

---

# 8. Messages Collection

The `messages` collection stores text messages between the customer and assigned rider for a ride.

## Fields

- `_id` - MongoDB ObjectId
- `ride_id` - References the related ride
- `sender_id` - References the user who sent the message
- `message` - Text content
- `created_at` - Message timestamp

## Relationships

```text
messages.ride_id
       ->
rides._id
```

```text
messages.sender_id
       ->
users._id
```

Both relationships were tested using MongoDB `$lookup`.

## Chat Rules

- messages belong to a specific ride
- chat is intended for the customer and assigned rider
- messages must not be empty
- text-only communication is currently supported

Images, files, voice messages, and video calls are not part of the current design.

## Sample Test

Customer message:

```text
I am near the university gate.
```

Rider reply:

```text
Okay, I am coming to the gate now.
```

Messages were successfully retrieved in chronological order.

## Indexes

```text
{ ride_id: 1, created_at: 1 }
{ sender_id: 1 }
```

## Validation

Validation checks:

- ride_id must be an ObjectId
- sender_id must be an ObjectId
- message must be a non-empty string
- created_at must be a date

An empty message was intentionally tested and MongoDB correctly rejected it.

---

# 9. Cancellations Collection

The `cancellations` collection stores cancellation history.

Cancelled rides are not deleted.

Instead:

```text
ride.status = CANCELLED
```

and a cancellation document is stored separately.

## Fields

- `_id` - MongoDB ObjectId
- `ride_id` - References the cancelled ride
- `cancelled_by` - References the user who cancelled
- `reason` - Cancellation reason
- `cancelled_at` - Cancellation time

## Cancellation Flow

A sample ride was tested using:

```text
REQUESTED -> CANCELLED
```

A cancellation record was then created.

## Relationships

```text
cancellations.ride_id
       ->
rides._id
```

```text
cancellations.cancelled_by
       ->
users._id
```

Both relationships were successfully tested.

## Cancellation Limit Support

The database supports counting how many cancellations a user has made during the previous 7 days.

The agreed rule is:

```text
Maximum 5 cancellations within 7 days
```

A 7-day count query was successfully tested.

The exact application action after reaching the limit is not yet implemented in the database and will be handled according to final application rules.

## Indexes

- Unique index on `{ ride_id: 1 }`
- Index on `{ cancelled_by: 1, cancelled_at: 1 }`

## Validation

Validation checks:

- ride_id must be an ObjectId
- cancelled_by must be an ObjectId
- reason must be a non-empty string
- cancelled_at must be a date

An empty cancellation reason was intentionally tested and MongoDB correctly rejected it.

---

# 10. Ratings Collection

The `ratings` collection stores customer ratings and reviews for completed rides.

## Fields

- `_id` - MongoDB ObjectId
- `ride_id` - References the completed ride
- `customer_id` - Customer who submitted the rating
- `rider_id` - Rider who received the rating
- `rating` - Numeric value from 1 to 5
- `review` - Optional text feedback
- `created_at` - Rating creation time

## Rating Flow

After a completed ride, a customer can provide a rating and optional review for the rider.

A sample rating was successfully tested:

```text
rating: 5
review: Good service
```

## Relationships

```text
ratings.ride_id
       ->
rides._id
```

```text
ratings.customer_id
       ->
users._id
```

```text
ratings.rider_id
       ->
users._id
```

All three relationships were successfully tested using MongoDB `$lookup`.

## Indexes

- Unique index on `{ ride_id: 1 }`
- Index on `{ rider_id: 1, created_at: -1 }`
- Index on `{ customer_id: 1 }`

## Validation

Validation checks:

- ride_id must be an ObjectId
- customer_id must be an ObjectId
- rider_id must be an ObjectId
- rating must be between 1 and 5
- review must be a string or null
- created_at must be a date

The validator was tested using:

```text
rating: 6
```

MongoDB correctly rejected the document.

---

# 11. Main Database Relationships

```text
USERS
  |
  +--> RIDERS
  |
  +--> RIDES as customer
  |
  +--> RIDES as rider
  |
  +--> MESSAGES as sender
  |
  +--> CANCELLATIONS as cancelled_by
  |
  +--> RATINGS as customer/rider

RIDES
  |
  +--> PAYMENTS
  |
  +--> MESSAGES
  |
  +--> CANCELLATIONS
  |
  +--> RATINGS
```

Important reference fields:

```text
riders.user_id -> users._id

rides.customer_id -> users._id
rides.rider_id -> users._id

payments.ride_id -> rides._id
payments.confirmed_by -> users._id

messages.ride_id -> rides._id
messages.sender_id -> users._id

cancellations.ride_id -> rides._id
cancellations.cancelled_by -> users._id

ratings.ride_id -> rides._id
ratings.customer_id -> users._id
ratings.rider_id -> users._id
```

---

# 12. Implemented Indexes

## Users

```text
email - UNIQUE
```

## Riders

```text
user_id - UNIQUE
```

## Rides

```text
customer_id + status
rider_id + status
status
```

## Payments

```text
ride_id - UNIQUE
payment_status
confirmed_by
```

## Messages

```text
ride_id + created_at
sender_id
```

## Cancellations

```text
ride_id - UNIQUE
cancelled_by + cancelled_at
```

## Ratings

```text
ride_id - UNIQUE
rider_id + created_at
customer_id
```

---

# 13. MongoDB Validation

JSON Schema validation has been implemented for all seven collections:

```text
users
riders
rides
payments
messages
cancellations
ratings
```

Validation is configured using:

```text
validationLevel: strict
validationAction: error
```

Invalid-data tests were performed successfully for all major collections.

---

# 14. Sample and Test Data

The current local database contains sample records including:

- Test Customer
- Test Rider
- Rider profile
- Completed ride
- Cancelled ride
- Cash payment
- Customer message
- Rider message
- Cancellation record
- Rider rating

These records were used to test relationships, lifecycle changes, validation, indexes, and queries.

---

# 15. Reusable Database Scripts

Reusable MongoDB scripts are stored inside the project repository.

```text
database/
├── setup/
│   ├── create-collections.js
│   ├── validators.js
│   └── indexes.js
│
├── sample-data/
│   └── seed-data.js
│
├── queries/
│   └── common-queries.js
│
└── README.md
```

## create-collections.js

Creates all required collections if they do not already exist.

## validators.js

Applies MongoDB JSON Schema validation.

## indexes.js

Creates required indexes.

## seed-data.js

Adds reusable sample data and prevents duplicate sample users.

## common-queries.js

Contains useful queries including:

- available riders
- requested rides
- active customer rides
- rider assigned rides
- completed rides
- pending payments
- ride messages
- 7-day cancellation count
- rider ratings
- ride/customer lookup
- ride/rider lookup

All reusable scripts have been executed and tested successfully.

---

# 16. Database Setup

MongoDB must be running.

From the project folder:

```bat
cd /d E:\Project-VanniRide
```

Run:

```bat
mongosh database\setup\create-collections.js
```

Then:

```bat
mongosh database\setup\validators.js
```

Then:

```bat
mongosh database\setup\indexes.js
```

Optional sample data:

```bat
mongosh database\sample-data\seed-data.js
```

Common query tests:

```bat
mongosh database\queries\common-queries.js
```

More setup information is available in:

```text
database/README.md
```

---

# 17. Database Rules

The implemented database supports the following important application rules:

- user emails are unique
- one user can have one rider profile
- a customer cannot have more than one active request according to the application rule
- only available riders should accept available requests
- one rider accepts a request
- rider becomes `BUSY` while handling an active ride
- rider returns to `AVAILABLE` after completion according to application flow
- cancelled rides remain stored
- cash payment is confirmed by the rider
- payment changes from `PENDING` to `PAID`
- chat is linked to a ride
- cancellation history supports the 5-per-7-day rule
- rating values are restricted to 1 through 5

Some of these higher-level business rules require backend enforcement in addition to database validation.

---

# 18. Database Testing Completed

The following database-level tests have been performed:

- user-rider relationship test
- customer-ride relationship test
- rider-ride relationship test
- full ride lifecycle test
- rider availability lifecycle test
- payment relationship test
- cash payment confirmation test
- customer-rider message test
- cancellation relationship test
- 7-day cancellation count test
- rating relationship test
- invalid user role test
- invalid rider availability test
- invalid ride values test
- invalid payment values test
- empty message test
- empty cancellation reason test
- invalid rating value test
- reusable setup script tests
- reusable query script tests

---

# 19. GitHub Database Work

Database development is maintained on the dedicated:

```text
database
```

branch.

The database folder contains reproducible setup, validation, index, seed, and query scripts.

Database documentation is stored in:

```text
documentation/database/database-design.md
```

The main branch is not used directly for unfinished database development.

---

# 20. Remaining Integration Work

The core database design and implementation are complete for the current project stage.

The following work requires coordination with other team members:

- connect backend registration/login to `users`
- connect rider management to `riders`
- connect ride APIs to `rides`
- connect cash payment confirmation to `payments`
- connect chat functionality to `messages`
- connect cancellation APIs to `cancellations`
- connect rating functionality to `ratings`
- verify authorization rules in the backend
- perform integration testing
- resolve database-related integration bugs
- coordinate formal testing with the D2 member

---

# 21. Database Responsibility

The D1 database responsibility includes:

- database design
- collections
- relationships
- validation
- indexes
- sample/test data
- database queries
- reusable database scripts
- database documentation
- database updates
- database integration support

Backend API implementation remains the responsibility of the backend team.

Formal testing and integration testing are coordinated with the D2 testing member.

---

# 22. Current Completion Status

The following D1 database work is complete:

- database design
- seven main collections
- collection relationships
- MongoDB validation
- indexes
- sample data
- common queries
- invalid-data testing
- lifecycle testing
- reusable setup scripts
- database setup guide
- database documentation

Remaining work is mainly:

- backend integration
- integration verification
- D2 formal testing
- database-related fixes discovered during integration

Therefore, the standalone database implementation is complete for the current development stage and ready for integration with the rest of the Vanni Ride system.