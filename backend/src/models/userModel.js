const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    password_hash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ['CUSTOMER', 'RIDER', 'ADMIN'],
    },
    account_status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },
    token_version: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    collection: 'users',
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
