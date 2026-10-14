const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    token_hash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    used_at: {
      type: Date,
      default: null,
    },
    created_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { collection: 'password_reset_tokens', versionKey: false }
);

passwordResetTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
passwordResetTokenSchema.index({ user_id: 1, created_at: -1 });

module.exports =
  mongoose.models.PasswordResetToken ||
  mongoose.model('PasswordResetToken', passwordResetTokenSchema);
