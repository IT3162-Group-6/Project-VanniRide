import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INSTALL_DISMISS_DURATION_MS,
  getAndroidMajorVersion,
  isAndroidDevice,
  isIosDevice,
  isLegacyAndroidPwaDevice,
  isStandaloneMode,
  rememberInstallPromptDismissal,
  wasInstallPromptDismissed,
} from '../src/utils/pwa.js';

test('detects standalone display mode and legacy iOS standalone mode', () => {
  assert.equal(isStandaloneMode({ matchMedia: () => ({ matches: true }) }, {}), true);
  assert.equal(isStandaloneMode({ matchMedia: () => ({ matches: false }) }, { standalone: true }), true);
  assert.equal(isStandaloneMode({ matchMedia: () => ({ matches: false }) }, {}), false);
});

test('detects iPhones and touch-capable iPads reporting as a Mac', () => {
  assert.equal(isIosDevice({ userAgent: 'Mozilla/5.0 (iPhone)', platform: 'iPhone' }), true);
  assert.equal(isIosDevice({ userAgent: 'Mozilla/5.0', platform: 'MacIntel', maxTouchPoints: 5 }), true);
  assert.equal(isIosDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14)', platform: 'Linux armv8l' }), false);
});

test('detects Android devices without treating desktop browsers as Android', () => {
  assert.equal(isAndroidDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7)' }), true);
  assert.equal(isAndroidDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }), false);
});

test('identifies Android versions that need the browser-shortcut fallback', () => {
  const androidEight = { userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; LDN-LX2) Chrome/138.0.7204.179' };
  const androidFourteen = { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7)' };
  assert.equal(getAndroidMajorVersion(androidEight), 8);
  assert.equal(isLegacyAndroidPwaDevice(androidEight), true);
  assert.equal(isLegacyAndroidPwaDevice(androidFourteen), false);
  assert.equal(isLegacyAndroidPwaDevice({ userAgent: 'Mozilla/5.0 (iPhone)' }), false);
});

test('remembers an install dismissal for seven days', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const now = 1_000_000_000;
  rememberInstallPromptDismissal(storage, now);
  assert.equal(wasInstallPromptDismissed(storage, now + INSTALL_DISMISS_DURATION_MS - 1), true);
  assert.equal(wasInstallPromptDismissed(storage, now + INSTALL_DISMISS_DURATION_MS), false);
});
