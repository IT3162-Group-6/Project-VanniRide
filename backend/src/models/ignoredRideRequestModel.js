const mongoose = require('mongoose');

const ignoredRideRequestSchema = new mongoose.Schema(
  {
    rider_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Ride',
    },
    ignored_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'ignored_ride_requests',
    versionKey: false,
  }
);

ignoredRideRequestSchema.index(
  { rider_id: 1, ride_id: 1 },
  { unique: true }
);
ignoredRideRequestSchema.index({ rider_id: 1, ignored_at: 1 });

module.exports =
  mongoose.models.IgnoredRideRequest ||
  mongoose.model('IgnoredRideRequest', ignoredRideRequestSchema);
