# Vanni Ride End-to-End Test Guide

This guide verifies the integrated customer, rider, and administrator workflow
without changing the production database or using real payment services.

## Automated verification

MongoDB must be available at the test URI configured by `MONGODB_TEST_URI`, or
at `mongodb://127.0.0.1:27017/vanniRideDB_test` when the variable is omitted.
The test suite drops only that test database after it finishes.

```powershell
cd backend
npm test

cd ..\frontend
npm test
npm run lint
npm run build
```

The backend suite includes an HTTP-level journey that registers a customer and
rider, approves the rider as an administrator, creates and accepts a request,
exchanges a message, progresses the ride, resumes a mutual cancellation,
completes the ride, confirms cash, submits a rating, and checks both histories
and administrator statistics.

## Optional local demo data

Never run the sample seed against production. For a disposable local database:

```powershell
mongosh database\setup\create-collections.js
mongosh database\setup\migrate-rider-approval.js
mongosh database\setup\validators.js
mongosh database\setup\indexes.js
mongosh database\sample-data\seed-data.js
```

All three local accounts use the password `VanniRideDemo123!`:

| Role | Email |
| --- | --- |
| Customer | `customer@test.com` |
| Rider | `rider@test.com` |
| Administrator | `admin@test.com` |

The rider is already approved and available. The seed also provides a completed
ride, paid cash record, conversation, and rating for history screens.

## Manual browser journey

1. Start MongoDB and the backend with `npm start` from `backend`.
2. Start the frontend with `npm run dev` from `frontend`.
3. Register a fresh rider and confirm that the rider is pending and offline.
4. Log in as administrator and approve the rider with an audit reason.
5. Log in as the rider, go online, and leave the request list open.
6. Register or log in as a customer and create a transport request using the map.
7. Accept it as the rider; confirm the rider becomes busy.
8. Exchange text messages from both accounts.
9. Move the ride through arrived and started.
10. Request cancellation from one participant and choose Resume from the other.
11. Complete the ride and confirm receipt of the cash payment as the rider.
12. Rate the rider from customer history.
13. Confirm both histories, rider earnings/rating, and admin statistics.
14. Request post-completion chat access as the customer, approve it as admin,
    and confirm that both participants can send messages during the approval
    window.

## Expected safety checks

- A pending or rejected rider cannot go online or accept a request.
- A busy rider cannot change availability or vehicle information.
- A customer cannot update ride status or confirm cash.
- An unrelated rider cannot access a ride or its messages.
- Started cancellation needs the other participant, or auto-cancels after 15
  minutes if unanswered.
- A resumed cancellation does not consume one of the five hourly cancellations.
- Admin chat viewing, user changes, ride cancellation, and payment corrections
  require audit reasons.
- Expired, revoked, and suspended sessions return to authentication.
