# Vanni Ride Free Deployment Runbook

The current academic/demo deployment uses:

- Cloudflare Pages for the React frontend;
- Railway for the Node.js and Socket.IO backend;
- MongoDB Atlas Free for persistent data; and
- OpenRouteService Free for autocomplete, reverse geocoding, and routing.

The root `render.yaml` remains a supported alternative backend deployment
manifest, but it is not used by the current hosted application.

Do not commit database passwords, API keys, JWT secrets, or administrator
credentials. Enter them only in the relevant service dashboard.

## Deployment order

1. Create and secure the MongoDB Atlas Free cluster.
2. Create an OpenRouteService account and API key.
3. Push the reviewed branch to GitHub.
4. Create the Railway backend from the GitHub repository with `backend` as its
   root directory and `npm start` as its start command.
5. Create the Cloudflare Pages frontend from the same GitHub repository.
6. Add the final Cloudflare URL to Railway's `CORS_ORIGINS` value.
7. Add the final Railway URL plus `/api` to Cloudflare's `VITE_API_URL` value.
8. Redeploy both services after those URLs are known.

## Railway backend settings

The current Railway service deploys the `backend` directory from GitHub `main`
and exposes `https://project-vanniride-production.up.railway.app`. Configure a
health check for `/health` and retain the generated public domain.

Railway requires these secret or deployment-specific values:

- `MONGODB_URI`: Atlas application connection string;
- `OPENROUTESERVICE_API_KEY`: secret OpenRouteService key; and
- `CORS_ORIGINS`: exact Cloudflare URL, without a trailing slash; and
- `FRONTEND_URL`: exact Cloudflare URL reserved for future reset links.

The current password recovery workflow is administrator-assisted and does not
require an email provider or custom domain. Resend variables are optional and
reserved for a later self-service email recovery phase.

The service must report HTTP 200 at `/health` before a release is accepted.

## Cloudflare Pages frontend settings

Use these dashboard values:

```text
Root directory: frontend
Build command: npm run build
Build output directory: dist
Production environment variable:
VITE_API_URL=https://project-vanniride-production.up.railway.app/api
```

Cloudflare Pages automatically treats this React build as a single-page
application because it has an `index.html` and no top-level `404.html`.
The included `_headers` file adds basic browser security headers and long-term
caching only for Vite's fingerprinted assets.

## Free-tier behavior

- Railway usage is credit-based. Monitor the project credit balance and expiry
  in the Railway dashboard before demonstrations.
- MongoDB Atlas is the persistent store. Do not store uploads or application
  data on Railway's temporary filesystem.
- If a free quota is exhausted and no payment method is attached, leave the
  service disabled until its quota resets rather than upgrading it.

## Required smoke checks after deployment

These are short deployment checks, not the postponed full end-to-end test:

1. Open the Railway `/health` URL and confirm the database is connected.
2. Open the Cloudflare URL and refresh a nested route such as `/login`.
3. Confirm an allowed university account can reach the deployed backend.
4. Confirm a location suggestion and route preview load without exposing the
   OpenRouteService key in the browser developer tools.
5. Confirm the notification socket reconnects after the backend wakes.
