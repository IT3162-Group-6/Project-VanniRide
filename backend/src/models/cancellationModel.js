const mongoose = require('mongoose');

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
      trim: true,
      maxlength: 500,
      default: null,
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

module.exports =
  mongoose.models.Cancellation ||
  mongoose.model('Cancellation', cancellationSchema);
