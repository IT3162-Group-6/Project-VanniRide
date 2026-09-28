const mongoose = require('mongoose');
const {
  CHAT_ACCESS_REQUEST_STATUSES,
} = require('../constants/rideConstants');

const chatAccessRequestSchema = new mongoose.Schema(
  {
    ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Ride',
    },
    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    rider_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
    status: {
      type: String,
      required: true,
      enum: CHAT_ACCESS_REQUEST_STATUSES,
      default: 'PENDING',
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'User',
    },
    requested_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
    approved_from: {
      type: Date,
      default: null,
    },
    approved_until: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'chat_access_requests',
    versionKey: false,
  }
);

chatAccessRequestSchema.index({ status: 1, requested_at: 1 });
chatAccessRequestSchema.index({ ride_id: 1, approved_until: 1 });
chatAccessRequestSchema.index(
  { ride_id: 1, requested_by: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

module.exports =
  mongoose.models.ChatAccessRequest ||
  mongoose.model('ChatAccessRequest', chatAccessRequestSchema);
