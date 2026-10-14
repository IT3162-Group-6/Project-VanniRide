const mongoose = require('mongoose');
const { CANCELLATION_MODES } = require('../constants/rideConstants');

const cancellationSchema = new mongoose.Schema(
  {
    ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Ride',
      index: true,
    },
    cancelled_by: {
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
    previous_status: {
      type: String,
      required: true,
      enum: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED'],
    },
    cancellation_mode: {
      type: String,
      required: true,
      enum: CANCELLATION_MODES,
    },
    cancelled_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'cancellations',
    versionKey: false,
  }
);

cancellationSchema.index({ cancelled_by: 1, cancelled_at: 1 });

module.exports =
  mongoose.models.Cancellation ||
  mongoose.model('Cancellation', cancellationSchema);
