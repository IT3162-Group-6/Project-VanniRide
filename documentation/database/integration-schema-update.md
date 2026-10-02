# Frontend Integration Database Schema Update

Status: Approved for implementation
Schema update: 2 October 2026
Applies to: `frontend-backend-integration`

## Purpose

This update adds the database support required for vehicle registration, rider
approval, audited administrator conversation viewing, and administrator
force-cancellation. It supplements the original database design and follows the
canonical integration contract version 1.1.

## Updated `riders` collection

Each rider profile contains:

```text
user_id
availability_status
vehicle.type
vehicle.model
vehicle.registration_number
vehicle.color
approval_status
review_reason
reviewed_by
reviewed_at
created_at
updated_at
```

Approval statuses are:

- `PENDING`
- `APPROVED`
- `REJECTED`

Vehicle registration numbers are normalized to uppercase by the application
and contain only uppercase letters, numbers, spaces, and hyphens. They are
protected by a unique partial index. The partial index permits a controlled
upgrade of legacy rider documents that do not have vehicle information yet.

New rider records must contain a complete vehicle object. Legacy riders are set
to `PENDING` and `UNAVAILABLE` by the migration script and must complete their
vehicle profile through the application before an administrator can approve
them.

## Updated cancellation values

`cancellations.previous_status` now supports:

- `REQUESTED`
- `ACCEPTED`
- `ARRIVED`
- `STARTED`

`cancellations.cancellation_mode` now additionally supports:

- `ADMIN_FORCE`

An admin force-cancellation records the administrator in `cancelled_by`. It
does not consume the customer's or rider's hourly cancellation allowance.

## Updated admin audit values

The following actions are added:

- `RIDER_APPROVAL_REVIEWED`
- `RIDE_MESSAGES_VIEWED`
- `RIDE_FORCE_CANCELLED`

The following target types are added:

- `RIDER`
- `RIDE`

Conversation content is not copied into an audit record. A message-view audit
stores only operational metadata such as the result count and requested page or
cursor.

## Added indexes

```text
riders.approval_status
unique riders.vehicle.registration_number when the field is a string
```

Existing rider indexes remain in force.

## Upgrade order

For a database that already contains data:

1. Back up the database.
2. Run `database/setup/create-collections.js`.
3. Run `database/setup/migrate-rider-approval.js`.
4. Run `database/setup/validators.js`.
5. Run `database/setup/indexes.js`.
6. Have every migrated rider complete vehicle information.
7. Approve riders through the audited admin workflow.

For a new empty database, use the same order; the migration safely changes
nothing, and the sample seed complies with the new validator.

## Validation expectations

- Incomplete new vehicle objects are rejected.
- Unsupported approval states are rejected.
- Duplicate vehicle registration numbers are rejected.
- Unsupported cancellation modes and previous statuses are rejected.
- Unsupported audit actions and target types are rejected.
- Existing ride, payment, chat, rating, and cancellation-request validation
  remains unchanged.
