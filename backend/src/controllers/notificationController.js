const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { getAuthenticatedUser } = require('../utils/authenticatedUser');

const serializeNotification = (notificationDoc) => {
  const doc =
    typeof notificationDoc.toObject === 'function'
      ? notificationDoc.toObject()
      : notificationDoc;

  return {
    id: doc._id.toString(),
    recipient: doc.recipient?.toString() || doc.recipient,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    isRead: Boolean(doc.isRead),
    relatedRide: doc.relatedRide ? doc.relatedRide.toString() : null,
    metadata: doc.metadata || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

exports.getNotifications = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req);

  const rawPage = parseInt(req.query.page, 10);
  const rawLimit = parseInt(req.query.limit, 10);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const skip = (page - 1) * limit;

  const [total, unreadCount, notifications] = await Promise.all([
    Notification.countDocuments({ recipient: userId }),
    Notification.countDocuments({ recipient: userId, isRead: false }),
    Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

  return res.status(200).json({
    success: true,
    results: notifications.length,
    unreadCount,
    data: {
      notifications: notifications.map(serializeNotification),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
  });
});

exports.markAsRead = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req);
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Notification not found', 404);
  }

  const notification = await Notification.findOne({
    _id: id,
    recipient: userId,
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  notification.isRead = true;
  await notification.save();

  return res.status(200).json({
    success: true,
    data: {
      notification: serializeNotification(notification),
    },
  });
});

exports.markAllAsRead = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req);

  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } }
  );

  return res.status(200).json({
    success: true,
    updatedCount: result.modifiedCount,
    data: {
      updatedCount: result.modifiedCount,
    },
  });
});

module.exports.serializeNotification = serializeNotification;
