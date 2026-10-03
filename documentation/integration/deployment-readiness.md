# Vanni Ride Deployment Readiness

Date: 2026-10-03

This checklist prepares the integrated application for a hosting environment.
It does not select a hosting provider or contain production credentials.

## Security status

- Frontend full dependency audit: zero known vulnerabilities.
- Backend full dependency audit: zero known vulnerabilities.
- JWT authorization uses stored roles and token-version revocation.
- Suspended accounts are rejected by the backend.
- HTTP and Socket.IO accept only configured browser origins.
- Express technology disclosure is disabled.
- API responses include content-type, frame, and referrer safety headers.
- JSON and form bodies are limited to 100 KB.
- Hosted restarts disconnect sockets, stop background workers, close HTTP, and
  release MongoDB through graceful SIGTERM/SIGINT handling.
- Production startup rejects missing database/JWT values, placeholder or short
  JWT secrets, missing explicit CORS origins, invalid environments, invalid
  ports, and unsafe cancellation-worker intervals.
- Demo credentials and local `.env` files are not suitable for production.

## Backend environment

Set these values through the hosting platform's secret manager:

```text
NODE_ENV=production
PORT=<platform port>
MONGODB_URI=<private production MongoDB URI>
JWT_SECRET=<random value of at least 32 characters>
JWT_EXPIRES_IN=7d
CORS_ORIGINS=https://<frontend-domain>
ROUTING_BASE_URL=<OSRM-compatible provider>
ROUTING_PROFILE=driving
ROUTING_ALTERNATIVES=3
ROUTING_TIMEOUT_MS=5000
GEOCODING_BASE_URL=https://nominatim.openstreetmap.org
GEOCODING_USER_AGENT=VanniRide/1.0 (<team contact>)
GEOCODING_CONTACT=<team contact email>
GEOCODING_MIN_INTERVAL_MS=1000
GEOCODING_TIMEOUT_MS=5000
GEOCODING_CACHE_TTL_MS=86400000
GEOCODING_RESULT_LIMIT=5
CANCELLATION_SWEEP_INTERVAL_MS=30000
```

Do not put secrets in Git, frontend variables, screenshots, or reports.

## Frontend environment

Build with:

```text
VITE_API_URL=https://<backend-domain>/api
VITE_USE_MOCK_AUTH=false
VITE_USE_MOCK_DATA=false
```

The hosting platform must serve `frontend/dist`, use HTTPS, and route unknown
application paths to `index.html` so React Router links work after refresh.
Keep OpenStreetMap attribution visible.

## Database preparation

1. Create a backup or snapshot before applying database changes.
2. Run collection creation, migration, validation, and index scripts in the
   order documented by `database/README.md`.
3. Do not run `database/sample-data/seed-data.js` in production.
4. Create the initial administrator with `npm run seed:admin` and a strong
   password supplied through temporary environment variables.
5. Remove those temporary administrator variables after the command finishes.

## Release commands

```powershell
cd backend
npm ci --omit=dev
npm audit --omit=dev
npm start

cd ..\frontend
npm ci
npm test
npm run lint
npm run build
```

Before release, the complete repository verification remains:

```powershell
cd backend
npm test

cd ..\frontend
npm test
npm run lint
npm run build
```

## Post-deployment smoke checks

1. `GET /health` returns HTTP 200 and `database: connected`.
2. An unlisted browser origin is rejected.
3. Customer and rider registration/login work over HTTPS.
4. A newly registered rider is pending and cannot go online.
5. Admin approval enables rider availability.
6. Customer request, rider acceptance, chat, status progression, completion,
   cash confirmation, rating, and histories work.
7. Mutual cancellation and its 15-minute worker work while no browser is open.
8. Admin statistics, audited chat viewing, force cancellation, and payment
   correction work.
9. Expired and revoked tokens return to login.
10. Application and database logs contain no passwords, JWTs, or connection
    strings.

## Hosting decisions still required from the team

- Backend hosting provider and public API domain
- Frontend hosting provider and public application domain
- Production MongoDB provider, region, backups, and access controls
- Controlled routing/geocoding capacity for expected usage
- Central log retention and alerting
- Reverse-proxy or platform rate limiting for login and public API endpoints
