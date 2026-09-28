const mongoose = require('mongoose');
const {
  CANCELLATION_REQUEST_STATUSES,
} = require('../constants/rideConstants');

const cancellationRequestSchema = new mongoose.Schema(
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
    responding_user_id: {
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
      enum: CANCELLATION_REQUEST_STATUSES,
      default: 'PENDING',
    },
    requested_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    responded_at: {
      type: Date,
      default: null,
    },
    resolved_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'cancellation_requests',
    versionKey: false,
  }
);

cancellationRequestSchema.index(
  { ride_id: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);
cancellationRequestSchema.index({ status: 1, expires_at: 1 });
cancellationRequestSchema.index({ responding_user_id: 1, status: 1 });
cancellationRequestSchema.index({ requested_by: 1, status: 1 });

module.exports =
  mongoose.models.CancellationRequest ||
  mongoose.model('CancellationRequest', cancellationRequestSchema);
