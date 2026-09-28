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

## Folder Structure

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

### 2. Apply Validation Rules

```bat
mongosh database\setup\validators.js
```

This applies MongoDB JSON Schema validation to the collections.

Validation is used to prevent invalid values such as:

- invalid user roles
- invalid rider availability values
- invalid ride statuses
- invalid payment values
- empty messages
- empty cancellation reasons
- ratings outside the range 1 to 5

### 3. Create Indexes

```bat
mongosh database\setup\indexes.js
```

This creates the indexes used by the database.

Indexes are used to:

- prevent duplicate user emails
- prevent duplicate rider profiles
- improve ride queries
- support payment lookup
- retrieve messages efficiently
- support cancellation count queries
- retrieve rider ratings efficiently
- resolve pending mutual cancellations after their deadline
- review and expire post-completion chat access

### 4. Insert Sample Data

```bat
mongosh database\sample-data\seed-data.js
```

This inserts sample users, rider data, ride data, payment data, messages, and a rating.

The script checks for existing sample data before inserting new records.

### 5. Run Common Queries

```bat
mongosh database\queries\common-queries.js
```

This runs example MongoDB queries for:

- available riders
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
- Sample passwords are only test values and are not intended for production use.

## Database Documentation

Detailed information about the database design, fields, relationships, validation rules, indexes, and tested flows is available in:

`documentation/database/database-design.md`

