# Vanni Ride PWA deployment

Vanni Ride is deployed as a Progressive Web App through the existing Cloudflare
Pages frontend. It does not require an app-store package or a separate PWA
server.

## Installation

- Android browsers that support the install event show an in-app **Install**
  suggestion. The browser still performs and controls the final installation.
- Android 8 and 9 are limited to Chrome 138 and can fail to launch the installed
  WebAPK shell. On these versions, Vanni Ride suppresses the PWA install action
  and offers a guided home-screen browser shortcut instead. Full standalone PWA
  support therefore requires Android 10 or newer.
- On iPhone and iPad, the app explains the Safari flow: **Share** then
  **Add to Home Screen**.
- When launched from the installed icon, the app runs in standalone portrait
  mode with Vanni Ride branding and maskable icons.
- Dismissing the install suggestion hides it for seven days. Installation
  remains available from the browser menu.

## Updates and offline behavior

- A waiting service-worker release displays an **Update** action instead of
  silently reloading an active ride screen.
- The application shell, bundled pages, icons, and decorative assets are
  precached so the installed app can launch without a connection.
- Google font files use bounded runtime caches.
- API responses, ride data, messages, user data, and map-routing responses are
  deliberately not cached. The existing offline banner tells users when live
  operations cannot be completed safely.
- Cloudflare serves `sw.js` with no-cache headers so clients can discover new
  releases promptly. Hashed application assets remain immutable.

## Release verification

From `frontend/` run:

```text
npm run lint
npm test
npm run build
```

A successful build must generate `dist/manifest.webmanifest`, `dist/sw.js`, and
the Workbox runtime file. After Cloudflare deploys `main`, verify the production
manifest and service worker over HTTPS before testing installation on a phone.
