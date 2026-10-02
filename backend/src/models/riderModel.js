const mongoose = require('mongoose');
const {
  RIDER_APPROVAL_STATUSES,
  RIDER_AVAILABILITY,
} = require('../constants/rideConstants');

const vehicleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    model: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    registration_number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 1,
      maxlength: 30,
      match: /^[A-Z0-9 -]+$/,
    },
    color: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
  },
  { _id: false }
);

const riderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'User',
    },
    availability_status: {
      type: String,
      required: true,
      enum: RIDER_AVAILABILITY,
      default: 'UNAVAILABLE',
    },
    vehicle: {
      type: vehicleSchema,
      required: true,
    },
    approval_status: {
      type: String,
      required: true,
      enum: RIDER_APPROVAL_STATUSES,
      default: 'PENDING',
    },
    review_reason: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 500,
      default: null,
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'riders',
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

riderSchema.index({ availability_status: 1 });
riderSchema.index({ approval_status: 1 });
riderSchema.index(
  { 'vehicle.registration_number': 1 },
  {
    unique: true,
    partialFilterExpression: {
      'vehicle.registration_number': { $type: 'string' },
    },
  }
);

module.exports = mongoose.models.Rider || mongoose.model('Rider', riderSchema);
