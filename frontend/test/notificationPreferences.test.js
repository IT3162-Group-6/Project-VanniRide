import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  readNotificationPreferences,
  shouldShowNotificationPopup,
  writeNotificationPreferences,
} from '../src/utils/notificationPreferences.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};

test('stores normalized notification preferences per user', () => {
  const storage = createStorage();
  writeNotificationPreferences('user-1', {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    sound: false,
    unknown: false,
  }, storage);

  const preferences = readNotificationPreferences('user-1', storage);
  assert.equal(preferences.sound, false);
  assert.equal(preferences.popupEnabled, true);
  assert.equal('unknown' in preferences, false);
});

test('optional popup categories respect the master and category switches', () => {
  assert.equal(shouldShowNotificationPopup(
    { type: 'CHAT_MESSAGE' },
    { ...DEFAULT_NOTIFICATION_PREFERENCES, popupEnabled: false }
  ), false);
  assert.equal(shouldShowNotificationPopup(
    { type: 'RIDE_REQUEST' },
    { ...DEFAULT_NOTIFICATION_PREFERENCES, rideRequests: false }
  ), false);
});

test('critical service alerts bypass the optional popup master switch', () => {
  assert.equal(shouldShowNotificationPopup(
    { type: 'RIDE_CANCELLED' },
    { ...DEFAULT_NOTIFICATION_PREFERENCES, popupEnabled: false }
  ), true);
  assert.equal(shouldShowNotificationPopup(
    { type: 'RIDER_APPROVAL' },
    { ...DEFAULT_NOTIFICATION_PREFERENCES, popupEnabled: false }
  ), true);
});
