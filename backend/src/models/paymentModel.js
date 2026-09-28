const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'Ride',
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
      enum: ['PENDING', 'PAID'],
      default: 'PENDING',
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

module.exports =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
