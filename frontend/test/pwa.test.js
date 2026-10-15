import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INSTALL_DISMISS_DURATION_MS,
  isIosDevice,
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
