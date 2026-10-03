# Vanni Ride Database Setup Guide

This folder contains the MongoDB database setup, sample data, and common query scripts for the Vanni Ride project.

## Database Name

The MongoDB database used by this project is:

`vanniRideDB`

## Main Collections

The database currently contains the following collections:

- `users`
- `riders`
- `rides`
- `payments`
- `messages`
- `cancellations`
- `cancellation_requests`
- `ratings`
- `chat_access_requests`
- `admin_audit_logs`

## Folder Structure

```text
database/
├── setup/
│   ├── create-collections.js
│   ├── migrate-rider-approval.js
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

## Setup Order

MongoDB must be running before executing the scripts.

Open Command Prompt in the project folder:

```bat
cd /d E:\Project-VanniRide
```

Then run the scripts in the following order.

### 1. Create Collections

```bat
mongosh database\setup\create-collections.js
```

This creates the required MongoDB collections if they do not already exist.

### 2. Migrate Existing Rider Profiles

```bat
mongosh database\setup\migrate-rider-approval.js
```

This safely changes legacy rider profiles to `PENDING` and `UNAVAILABLE` before
the stricter validation rules are applied. Legacy riders must submit their
vehicle information before an administrator can approve them.

### 3. Apply Validation Rules

```bat
mongosh database\setup\validators.js
```

This applies MongoDB JSON Schema validation to the collections.

Validation is used to prevent invalid values such as:

- invalid user roles
- invalid rider availability values
- incomplete vehicle information
- invalid rider approval values
- invalid ride statuses
- invalid payment values
- empty messages
- empty cancellation reasons
- ratings outside the range 1 to 5

### 4. Create Indexes

```bat
mongosh database\setup\indexes.js
```

This creates the indexes used by the database.

The index script is safe to rerun during upgrades. If it finds a legacy index
with the correct fields but weaker options, it checks for duplicate data before
replacing that index. It stops with an explanatory error instead of silently
removing a conflicting unique constraint when duplicates exist.

Indexes are used to:

- prevent duplicate user emails
- prevent duplicate rider profiles
- prevent duplicate vehicle registration numbers
- support rider approval queues
- improve ride queries
- support payment lookup
- retrieve messages efficiently
- support cancellation count queries
- retrieve rider ratings efficiently
- resolve pending mutual cancellations after their deadline
- review and expire post-completion chat access

### 5. Insert Sample Data

```bat
mongosh database\sample-data\seed-data.js
```

This inserts sample users, rider data, ride data, payment data, messages, and a rating.

The script checks for existing sample data before inserting new records. If the
accounts already exist, it safely refreshes their demo password and active
status without duplicating ride history.

Local test credentials:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `customer@test.com` | `VanniRideDemo123!` |
| Rider | `rider@test.com` | `VanniRideDemo123!` |
| Administrator | `admin@test.com` | `VanniRideDemo123!` |

These credentials are deliberately for local testing only. Never seed them in
a production database.

### 6. Run Common Queries

```bat
mongosh database\queries\common-queries.js
```

This runs example MongoDB queries for:

- available riders
- riders awaiting approval
- requested rides
- active customer rides
- rider-assigned rides
- completed rides
- pending payments
- ride messages
- rolling one-hour cancellation count
- rider ratings
- ride/customer relationships
- ride/rider relationships

## Main Database Rules

### User Roles

- `CUSTOMER`
- `RIDER`
- `ADMIN`

### Rider Availability

- `AVAILABLE`
- `UNAVAILABLE`
- `BUSY`

### Rider Approval

- `PENDING`
- `APPROVED`
- `REJECTED`

Every new rider supplies a vehicle type, model, registration number, and colour.
Only an approved rider can become available or accept a request.

### Ride Request Types

- `TRANSPORT`
- `DELIVERY`

Delivery categories:

- `FOOD`
- `WATER`
- `PARCEL`

### Ride Statuses

- `REQUESTED`
- `ACCEPTED`
- `ARRIVED`
- `STARTED`
- `COMPLETED`
- `CANCELLED`

### Payment

Current payment method:

- `CASH`

Payment statuses:

- `PENDING`
- `PAID`

### Ratings

Ratings must be between:

`1` and `5`

## Important Notes

- Cancelled rides are not deleted from the database.
- Riders become `BUSY` after accepting an active ride.
- Riders return to `AVAILABLE` after completing or cancelling a ride according to the application flow.
- One ride currently has one payment record.
- One ride currently has one rating record.
- A user may initiate at most 5 final cancellations in a rolling 60-minute period across transport and delivery requests.
- Resumed cancellation requests do not consume the allowance.
- Administrator force-cancellation does not consume a participant's allowance.
- Sample passwords are only test values and are not intended for production use.

## Database Documentation

Detailed information about the database design, fields, relationships, validation rules, indexes, and tested flows is available in:

`documentation/database/database-design.md`

The approved integration schema additions are documented in:

`documentation/database/integration-schema-update.md`

