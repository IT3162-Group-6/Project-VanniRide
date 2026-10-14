const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'Ride',
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    rider_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    created_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'ratings',
    versionKey: false,
  }
);

ratingSchema.index({ rider_id: 1, created_at: -1 });
ratingSchema.index({ customer_id: 1 });

module.exports =
  mongoose.models.Rating || mongoose.model('Rating', ratingSchema);
