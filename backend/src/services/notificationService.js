const Notification = require('../models/notificationModel');
const { userRoom } = require('../utils/socketEvents');

const serializeNotification = (document) => {
  const value = document.toObject ? document.toObject() : document;
  return {
    id: value._id.toString(),
    type: value.type,
    title: value.title,
    message: value.message,
    link: value.link || null,
    rideId: value.ride_id?.toString() || null,
    isRead: value.is_read,
    readAt: value.read_at || null,
    createdAt: value.created_at,
  };
};

const createNotification = async ({
  userId,
  type,
  title,
  message,
  link = null,
  rideId = null,
  io = null,
}) => {
  if (!userId) return null;
  const notification = await Notification.create({
    user_id: userId,
    type,
    title,
    message,
    link,
    ride_id: rideId,
  });
  const serialized = serializeNotification(notification);
  io?.to(userRoom(userId.toString())).emit('notification_created', serialized);
  return notification;
};

const createNotifications = async ({ userIds, ...details }) => {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean).map(String))];
  return Promise.all(
    uniqueIds.map((userId) => createNotification({ ...details, userId }))
  );
};

const notifySafely = async (details) => {
  try {
    return await createNotification(details);
  } catch (error) {
    console.error(`Notification creation failed: ${error.message}`);
    return null;
  }
};

const notifyManySafely = async (details) => {
  try {
    return await createNotifications(details);
  } catch (error) {
    console.error(`Notification creation failed: ${error.message}`);
    return [];
  }
};

const resolveRideRequestNotifications = async ({
  rideId,
  outcome,
  acceptedByUserId = null,
  io = null,
}) => {
  const normalizedOutcome = String(outcome || '').toUpperCase();
  if (!['ACCEPTED', 'CANCELLED'].includes(normalizedOutcome)) {
    throw new Error('Ride-request notification outcome must be ACCEPTED or CANCELLED');
  }

  const filter = { ride_id: rideId, type: 'RIDE_REQUEST' };
  const unreadUpdate = {
    is_read: false,
    read_at: null,
    link: '/rider/requests',
  };

  if (normalizedOutcome === 'CANCELLED') {
    await Notification.updateMany(filter, {
      $set: {
        ...unreadUpdate,
        title: 'Request cancelled',
        message: 'The customer cancelled this request before it was accepted.',
      },
    });
  } else {
    await Notification.updateMany(
      acceptedByUserId
        ? { ...filter, user_id: { $ne: acceptedByUserId } }
        : filter,
      {
        $set: {
          ...unreadUpdate,
          title: 'Request no longer available',
          message: 'Another rider accepted this request.',
        },
      }
    );
    if (acceptedByUserId) {
      await Notification.updateMany(
        { ...filter, user_id: acceptedByUserId },
        {
          $set: {
            title: 'Request accepted by you',
            message: 'Open your active request to continue.',
            link: `/rider/active?rideId=${rideId}`,
            is_read: true,
            read_at: new Date(),
          },
        }
      );
    }
  }

  const notifications = await Notification.find(filter).lean();
  notifications.forEach((notification) => {
    io?.to(userRoom(notification.user_id.toString())).emit(
      'notification_updated',
      serializeNotification(notification)
    );
  });
  return notifications;
};

const resolveRideRequestNotificationsSafely = async (details) => {
  try {
    return await resolveRideRequestNotifications(details);
  } catch (error) {
    console.error(`Ride-request notification update failed: ${error.message}`);
    return [];
  }
};

module.exports = {
  createNotification,
  createNotifications,
  notifySafely,
  notifyManySafely,
  resolveRideRequestNotifications,
  resolveRideRequestNotificationsSafely,
  serializeNotification,
};
