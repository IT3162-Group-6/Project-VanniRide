const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    ride_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Ride',
      index: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    message_text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
    sent_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'messages',
    versionKey: false,
  }
);

messageSchema.index({ ride_id: 1, sent_at: 1 });

module.exports =
  mongoose.models.Message || mongoose.model('Message', messageSchema);
