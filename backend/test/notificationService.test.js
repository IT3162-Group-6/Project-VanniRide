const assert = require('node:assert/strict');
const test = require('node:test');

const Notification = require('../src/models/notificationModel');
const {
  resolveRideRequestNotifications,
} = require('../src/services/notificationService');

const notification = ({ id, userId, rideId, title, message, isRead = false }) => ({
  _id: id,
  user_id: userId,
  ride_id: rideId,
  type: 'RIDE_REQUEST',
  title,
  message,
  link: '/rider/requests',
  is_read: isRead,
  read_at: null,
  created_at: new Date('2026-10-14T10:00:00.000Z'),
});
const stubNotificationModel = (t, results) => {
  const originalUpdateMany = Notification.updateMany;
  const originalFind = Notification.find;
  const updates = [];

  Notification.updateMany = async (filter, update) => {
    updates.push({ filter, update });
    return { acknowledged: true };
  };
  Notification.find = () => ({ lean: async () => results });

  t.after(() => {
    Notification.updateMany = originalUpdateMany;
    Notification.find = originalFind;
  });
  return updates;
};

const socketRecorder = () => {
  const events = [];
  return {
    events,
    io: {
      to(room) {
        return {
          emit(event, payload) {
            events.push({ room, event, payload });
          },
        };
      },
    },
  };
};

test('marks rider request notifications as cancelled and broadcasts replacements', async (t) => {
  const rideId = 'ride-cancelled';
  const updates = stubNotificationModel(t, [notification({
    id: 'notice-1',
    userId: 'rider-1',
    rideId,
    title: 'New ride request',
    message: 'Open the request.',
  })]);
  const { io, events } = socketRecorder();

  await resolveRideRequestNotifications({ rideId, outcome: 'CANCELLED', io });

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].filter, { ride_id: rideId, type: 'RIDE_REQUEST' });
  assert.equal(updates[0].update.$set.title, 'Request cancelled');
  assert.equal(updates[0].update.$set.is_read, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].room, 'user_rider-1');
  assert.equal(events[0].event, 'notification_updated');
});

test('distinguishes the accepting rider from riders who missed the request', async (t) => {
  const rideId = 'ride-accepted';
  const updates = stubNotificationModel(t, [
    notification({ id: 'notice-1', userId: 'rider-1', rideId, title: 'Request accepted by you', message: 'Continue.', isRead: true }),
    notification({ id: 'notice-2', userId: 'rider-2', rideId, title: 'Request no longer available', message: 'Another rider accepted.' }),
  ]);
  const { io, events } = socketRecorder();

  await resolveRideRequestNotifications({
    rideId,
    outcome: 'ACCEPTED',
    acceptedByUserId: 'rider-1',
    io,
  });

  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0].filter.user_id, { $ne: 'rider-1' });
  assert.equal(updates[0].update.$set.title, 'Request no longer available');
  assert.equal(updates[1].filter.user_id, 'rider-1');
  assert.equal(updates[1].update.$set.title, 'Request accepted by you');
  assert.equal(updates[1].update.$set.is_read, true);
  assert.equal(events.length, 2);
  assert.deepEqual(events.map(({ room }) => room), ['user_rider-1', 'user_rider-2']);
});
