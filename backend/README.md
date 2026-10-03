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
- `CORS_ORIGINS` - comma-separated exact frontend origins; explicitly required
  in production
- `ROUTING_BASE_URL` - OSRM-compatible routing service
- `GEOCODING_USER_AGENT` and `GEOCODING_CONTACT` - identification for the
  geocoding provider

See `.env.example` for the full configuration. The server validates critical
production settings before opening its port. Browser origins not listed in
`CORS_ORIGINS` are rejected for both HTTP and Socket.IO.

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

Create or rotate the initial administrator with environment values documented
in `.env.example`:

```powershell
npm run seed:admin
```

For disposable local demonstration accounts, follow
`documentation/integration/end-to-end-test-guide.md`. Never run demo seed data
against production.
