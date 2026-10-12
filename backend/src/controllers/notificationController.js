const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Notification = require('../models/notificationModel');
const User = require('../models/userModel');
const { getAuthenticatedUser, validateObjectId } = require('../utils/authenticatedUser');
const {
  createNotifications,
  serializeNotification,
} = require('../services/notificationService');

exports.getNotifications = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req);
  const requestedLimit = Number(req.query.limit || 50);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw new AppError('Notification limit must be a positive integer', 400);
  }
  const limit = Math.min(requestedLimit, 100);
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user_id: userId })
      .sort({ created_at: -1, _id: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ user_id: userId, is_read: false }),
  ]);

  res.status(200).json({
    success: true,
    results: notifications.length,
    data: {
      notifications: notifications.map(serializeNotification),
      unreadCount,
    },
  });
});

exports.markNotificationRead = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req);
  validateObjectId(req.params.notificationId, 'notification ID');
  const now = new Date();
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, user_id: userId },
    { $set: { is_read: true, read_at: now } },
    { returnDocument: 'after', runValidators: true }
  );
  if (!notification) throw new AppError('Notification not found', 404);

  res.status(200).json({
    success: true,
    data: { notification: serializeNotification(notification) },
  });
});

exports.markAllNotificationsRead = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req);
  const now = new Date();
  const result = await Notification.updateMany(
    { user_id: userId, is_read: false },
    { $set: { is_read: true, read_at: now } }
  );
  res.status(200).json({
    success: true,
    data: { updatedCount: result.modifiedCount },
  });
});

exports.broadcastSystemNotification = catchAsync(async (req, res) => {
  getAuthenticatedUser(req, ['ADMIN']);
  const title = String(req.body.title || '').trim();
  const message = String(req.body.message || '').trim();
  const link = String(req.body.link || '').trim() || null;
  const roles = Array.isArray(req.body.roles)
    ? [...new Set(req.body.roles.map((role) => String(role).toUpperCase()))]
    : ['CUSTOMER', 'RIDER'];

  if (!title || title.length > 120) {
    throw new AppError('Title is required and cannot exceed 120 characters', 400);
  }
  if (!message || message.length > 500) {
    throw new AppError('Message is required and cannot exceed 500 characters', 400);
  }
  if (roles.length === 0 || roles.some((role) => !['CUSTOMER', 'RIDER', 'ADMIN'].includes(role))) {
    throw new AppError('Roles must contain CUSTOMER, RIDER, or ADMIN', 400);
  }
  if (link && (!link.startsWith('/') || link.length > 300)) {
    throw new AppError('Notification link must be an internal application path', 400);
  }

  const recipients = await User.find({ role: { $in: roles }, account_status: 'ACTIVE' })
    .select('_id')
    .lean();
  const notifications = await createNotifications({
    userIds: recipients.map((user) => user._id),
    type: 'SYSTEM',
    title,
    message,
    link,
    io: req.app?.get('io'),
  });

  res.status(201).json({
    success: true,
    message: 'System notification sent',
    data: { recipientCount: notifications.length },
  });
});
