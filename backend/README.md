# Vanni Ride Backend

Express, MongoDB, JWT, and Socket.IO backend for the Vanni Ride customer,
rider, and administrator applications.

## Local setup

Requirements:

- Node.js 20 or newer
- MongoDB available locally or through a private deployment

```powershell
Copy-Item .env.example .env
npm install
npm start
```

The API listens on `PORT` and reports readiness at `GET /health`. A successful
readiness response requires an active MongoDB connection.

## Required configuration

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - signing key; production requires a non-placeholder value of
  at least 32 characters
- `UNIVERSITY_EMAIL_DOMAIN` - domain allowed for public customer and rider
  registration; defaults to `vau.ac.lk`
- `ALLOW_NON_UNIVERSITY_EMAILS` - local testing bypass; it cannot be enabled
  in production
- `CORS_ORIGINS` - comma-separated exact frontend origins; explicitly required
  in production
- `ROUTING_BASE_URL` - OSRM-compatible routing service
- `GEOCODING_USER_AGENT` and `GEOCODING_CONTACT` - identification for the
  geocoding provider
- `FRONTEND_URL`, `RESEND_API_KEY`, and `PASSWORD_RESET_FROM_EMAIL` - optional
  future transactional email recovery settings

See `.env.example` for the full configuration. The server validates critical
production settings before opening its port. Browser origins not listed in
`CORS_ORIGINS` are rejected for both HTTP and Socket.IO.

Password recovery currently creates an account-neutral administrator request.
An administrator verifies the requester, sets a temporary password from the
Users page, and records a verification note. Resolving the request revokes all
existing sessions and is written to the administrator audit log. The dormant
email-token implementation can be enabled later after a sender is verified.

## Verification

```powershell
npm test
npm audit --omit=dev
```

The test suite uses `MONGODB_TEST_URI` when provided and otherwise uses
`mongodb://127.0.0.1:27017/vanniRideDB_test`. It drops only the test database.
It includes authorization, API-contract, Socket.IO, administrator, and complete
customer-to-rider HTTP journey coverage.

## Administrative setup

Create or rotate the three predefined administrators with the numbered
environment values documented in `.env.example`. The command is idempotent:
existing administrators are updated and their previous sessions are revoked.
Passwords are read from environment secrets and are never printed.

```powershell
npm run seed:admins
```

All three administrators sign in through the normal `/login` page using their
configured email address and password. `npm run seed:admin` remains an alias for
the same three-account command.

For disposable local demonstration accounts, follow
`documentation/integration/end-to-end-test-guide.md`. Never run demo seed data
against production.
