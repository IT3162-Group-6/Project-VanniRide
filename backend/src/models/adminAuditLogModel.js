const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_STATUS_CHANGED',
        'PAYMENT_CORRECTED',
        'CHAT_ACCESS_REVIEWED',
        'RIDER_APPROVAL_REVIEWED',
        'RIDE_MESSAGES_VIEWED',
        'RIDE_FORCE_CANCELLED',
      ],
    },
    target_type: {
      type: String,
      required: true,
      enum: ['USER', 'PAYMENT', 'CHAT_ACCESS_REQUEST', 'RIDER', 'RIDE'],
    },
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    created_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'admin_audit_logs',
    versionKey: false,
  }
);

adminAuditLogSchema.index({ admin_id: 1, created_at: -1 });
adminAuditLogSchema.index({ target_type: 1, target_id: 1, created_at: -1 });

module.exports =
  mongoose.models.AdminAuditLog ||
  mongoose.model('AdminAuditLog', adminAuditLogSchema);
