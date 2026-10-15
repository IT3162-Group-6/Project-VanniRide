export const INSTALL_DISMISS_KEY = 'vanni-ride:pwa-install-dismissed-at';
export const INSTALL_DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function isStandaloneMode(windowObject = globalThis.window, navigatorObject = globalThis.navigator) {
  return Boolean(
    windowObject?.matchMedia?.('(display-mode: standalone)').matches
      || navigatorObject?.standalone === true
  );
}

export function isIosDevice(navigatorObject = globalThis.navigator) {
  const userAgent = navigatorObject?.userAgent || '';
  const platform = navigatorObject?.platform || '';
  const touchPoints = Number(navigatorObject?.maxTouchPoints || 0);
  return /iPad|iPhone|iPod/i.test(userAgent)
    || (platform === 'MacIntel' && touchPoints > 1);
}

export function wasInstallPromptDismissed(
  storage = globalThis.localStorage,
  now = Date.now()
) {
  try {
    const dismissedAt = Number(storage?.getItem(INSTALL_DISMISS_KEY) || 0);
    return dismissedAt > 0 && now - dismissedAt < INSTALL_DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

export function rememberInstallPromptDismissal(
  storage = globalThis.localStorage,
  now = Date.now()
) {
  try {
    storage?.setItem(INSTALL_DISMISS_KEY, String(now));
  } catch {
    // Installation remains available from the browser menu when storage is blocked.
  }
}
