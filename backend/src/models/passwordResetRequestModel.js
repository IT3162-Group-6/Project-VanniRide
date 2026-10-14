const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'RESOLVED'],
      default: 'PENDING',
      index: true,
    },
    requested_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    resolved_at: {
      type: Date,
      default: null,
    },
    resolved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { collection: 'password_reset_requests', versionKey: false }
);

passwordResetRequestSchema.index({ status: 1, requested_at: 1 });

module.exports =
  mongoose.models.PasswordResetRequest ||
  mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
