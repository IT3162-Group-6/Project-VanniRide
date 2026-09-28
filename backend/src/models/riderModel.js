const mongoose = require('mongoose');
const { RIDER_AVAILABILITY } = require('../constants/rideConstants');

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
  },
  {
    collection: 'riders',
    versionKey: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

riderSchema.index({ availability_status: 1 });

module.exports = mongoose.models.Rider || mongoose.model('Rider', riderSchema);
