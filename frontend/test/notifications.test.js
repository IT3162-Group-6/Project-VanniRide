import assert from 'node:assert/strict';
import test from 'node:test';

import {
  notificationListPath,
  notificationPopupPath,
  relativeNotificationTime,
} from '../src/utils/notifications.js';

test('routes request and chat popups to the action the user expects', () => {
  assert.equal(
    notificationPopupPath({ type: 'RIDE_REQUEST', link: '/rider/requests/ride-1' }, 'rider'),
    '/rider/requests'
  );
  assert.equal(
    notificationPopupPath({ type: 'CHAT_MESSAGE', link: '/customer/chat?rideId=ride-1' }, 'customer'),
    '/customer/chat?rideId=ride-1'
  );
});

test('routes ordinary popups to the role notification page', () => {
  assert.equal(notificationPopupPath({ type: 'RIDE_ACCEPTED' }, 'customer'), '/customer/notifications');
  assert.equal(notificationListPath('ADMIN'), '/admin/notifications');
});

test('formats notification ages without producing negative times', () => {
  const now = new Date('2026-10-14T12:00:00.000Z').getTime();
  assert.equal(relativeNotificationTime('2026-10-14T11:55:00.000Z', now), '5 min ago');
  assert.equal(relativeNotificationTime('2026-10-13T10:00:00.000Z', now), '1 day ago');
  assert.equal(relativeNotificationTime('2026-10-14T12:01:00.000Z', now), 'Just now');
});
