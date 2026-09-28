

const mongoose = require('mongoose');
const {
  DELIVERY_CATEGORIES,
  RIDE_STATUSES,
  RIDE_TYPES,
} = require('../constants/rideConstants');

const locationSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: [true, 'Location address is required'],
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Location latitude is required'],
      min: [-90, 'Latitude must be at least -90'],
      max: [90, 'Latitude must be at most 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Location longitude is required'],
      min: [-180, 'Longitude must be at least -180'],
      max: [180, 'Longitude must be at most 180'],
    },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    rider_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'User',
    },
    request_type: {
      type: String,
      required: true,
      enum: RIDE_TYPES,
    },
    delivery_category: {
      type: String,
      default: null,
      enum: [...DELIVERY_CATEGORIES, null],
    },
    pickup_location: {
      type: locationSchema,
      required: true,
    },
    destination: {
      type: locationSchema,
      required: true,
    },
    distance_km: {
      type: Number,
      required: true,
      min: 0,
    },
    fare_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: RIDE_STATUSES,
      default: 'REQUESTED',
    },
    requested_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    accepted_at: Date,
    arrived_at: Date,
    started_at: Date,
    completed_at: Date,
    cancelled_at: Date,
  },
  {
    collection: 'rides',
    versionKey: false,
  }
);

rideSchema.index({ customer_id: 1, status: 1 });
rideSchema.index({ rider_id: 1, status: 1 });
rideSchema.index({ status: 1 });

module.exports = mongoose.models.Ride || mongoose.model('Ride', rideSchema);