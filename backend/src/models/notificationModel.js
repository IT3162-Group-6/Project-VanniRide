const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'RIDE_REQUEST',
  'RIDE_ACCEPTED',
  'RIDE_STATUS',
  'RIDE_CANCELLED',
  'CANCELLATION_REQUESTED',
  'CANCELLATION_RESOLVED',
  'CHAT_MESSAGE',
  'CHAT_ACCESS',
  'RIDER_APPROVAL',
  'PAYMENT_CONFIRMED',
  'SYSTEM',
];

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    type: { type: String, required: true, enum: NOTIFICATION_TYPES },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    link: { type: String, default: null, maxlength: 300 },
    ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'Ride',
    },
    is_read: { type: Boolean, required: true, default: false },
    read_at: { type: Date, default: null },
    created_at: { type: Date, required: true, default: Date.now },
  },
  { collection: 'notifications', versionKey: false }
);

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });
notificationSchema.index({ created_at: -1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
