# Vanni Ride Free Deployment Runbook

This repository is prepared for a free academic/demo deployment using:

- Cloudflare Pages for the React frontend;
- Render Free for the Node.js and Socket.IO backend;
- MongoDB Atlas Free for persistent data; and
- OpenRouteService Free for autocomplete, reverse geocoding, and routing.

Do not commit database passwords, API keys, JWT secrets, or administrator
credentials. Enter them only in the relevant service dashboard.

## Deployment order

1. Create and secure the MongoDB Atlas Free cluster.
2. Create an OpenRouteService account and API key.
3. Push the reviewed branch to GitHub.
4. Create the Render backend from the root `render.yaml` Blueprint.
5. Create the Cloudflare Pages frontend from the same GitHub repository.
6. Add the final Cloudflare URL to Render's `CORS_ORIGINS` value.
7. Add the final Render URL plus `/api` to Cloudflare's `VITE_API_URL` value.
8. Redeploy both services after those URLs are known.

## Render backend settings

The root `render.yaml` supplies the free plan, Singapore region, backend root
directory, build/start commands, health check, safe public settings, and
generated JWT secret.

Render will ask for these secret or deployment-specific values:

- `MONGODB_URI`: Atlas application connection string;
- `OPENROUTESERVICE_API_KEY`: secret OpenRouteService key; and
- `CORS_ORIGINS`: exact Cloudflare URL, without a trailing slash.

The service must report HTTP 200 at `/health` before Render marks the deploy
healthy. The generated `onrender.com` URL is sufficient; a paid domain is not
required.

## Cloudflare Pages frontend settings

Use these dashboard values:

```text
Root directory: frontend
Build command: npm run build
Build output directory: dist
Production environment variable:
VITE_API_URL=https://<render-service>.onrender.com/api
```

Cloudflare Pages automatically treats this React build as a single-page
application because it has an `index.html` and no top-level `404.html`.
The included `_headers` file adds basic browser security headers and long-term
caching only for Vite's fingerprinted assets.

## Free-tier behavior

- The Render backend sleeps after its free-tier inactivity period. The first
  request after sleeping can take about a minute.
- Cancellation timestamps are reconciled before the first API response after
  wake-up.
- MongoDB Atlas is the persistent store. Do not store uploads or application
  data on Render's temporary filesystem.
- If a free quota is exhausted and no payment method is attached, leave the
  service disabled until its quota resets rather than upgrading it.

## Required smoke checks after deployment

These are short deployment checks, not the postponed full end-to-end test:

1. Open the Render `/health` URL and confirm the database is connected.
2. Open the Cloudflare URL and refresh a nested route such as `/login`.
3. Confirm an allowed university account can reach the deployed backend.
4. Confirm a location suggestion and route preview load without exposing the
   OpenRouteService key in the browser developer tools.
5. Confirm the notification socket reconnects after the backend wakes.
