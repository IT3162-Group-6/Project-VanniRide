const mongoose = require('mongoose');
const { PAYMENT_STATUSES } = require('../constants/rideConstants');

const paymentSchema = new mongoose.Schema(
  {
    ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'Ride',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    payment_method: {
      type: String,
      required: true,
      enum: ['CASH'],
      default: 'CASH',
    },
    payment_status: {
      type: String,
      required: true,
      enum: PAYMENT_STATUSES,
      default: 'PENDING',
    },
    confirmed_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'User',
    },
    created_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paid_at: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'payments',
    versionKey: false,
  }
);

paymentSchema.index({ payment_status: 1 });
paymentSchema.index({ confirmed_by: 1 });

module.exports =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
