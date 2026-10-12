

const mongoose = require('mongoose');
const {
  DELIVERY_CATEGORIES,
  FOOD_TYPES,
  PARCEL_TYPES,
  RIDE_STATUSES,
  RIDE_TYPES,
  WATER_CONTAINER_TYPES,
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

const foodItemSchema = new mongoose.Schema(
  {
    food_type: { type: String, required: true, enum: FOOD_TYPES },
    other_name: { type: String, default: null, maxlength: 100 },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    description: { type: String, default: null, maxlength: 300 },
  },
  { _id: false }
);

const waterItemSchema = new mongoose.Schema(
  {
    container_type: {
      type: String,
      required: true,
      enum: WATER_CONTAINER_TYPES,
    },
    other_description: { type: String, default: null, maxlength: 200 },
    quantity: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false }
);

const deliveryDetailsSchema = new mongoose.Schema(
  {
    receiver_name: { type: String, default: null, maxlength: 100 },
    receiver_phone: { type: String, default: null },
    food_order: {
      type: new mongoose.Schema(
        {
          outlet_code: { type: String, default: null, maxlength: 80 },
          outlet_name: { type: String, required: true, maxlength: 150 },
          items: {
            type: [foodItemSchema],
            required: true,
            validate: {
              validator: (items) => items.length >= 1 && items.length <= 20,
              message: 'Food order must contain 1 to 20 item lines',
            },
          },
        },
        { _id: false }
      ),
      default: null,
    },
    water_order: {
      type: new mongoose.Schema(
        {
          items: {
            type: [waterItemSchema],
            required: true,
            validate: {
              validator: (items) => items.length >= 1 && items.length <= 20,
              message: 'Water order must contain 1 to 20 item lines',
            },
          },
        },
        { _id: false }
      ),
      default: null,
    },
    parcel_order: {
      type: new mongoose.Schema(
        {
          parcel_type: { type: String, required: true, enum: PARCEL_TYPES },
          other_type: { type: String, default: null, maxlength: 100 },
          weight_kg: { type: Number, required: true, min: 0.1, max: 50 },
          notes: { type: String, default: null, maxlength: 500 },
        },
        { _id: false }
      ),
      default: null,
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
    delivery_details: {
      type: deliveryDetailsSchema,
      default: null,
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
rideSchema.index(
  { customer_id: 1, request_type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED'] },
    },
  }
);
rideSchema.index({ rider_id: 1, status: 1 });
rideSchema.index({ status: 1, requested_at: 1 });

rideSchema.pre('validate', function validateDeliveryCategory() {
  if (this.request_type === 'TRANSPORT' && this.delivery_category !== null) {
    this.invalidate(
      'delivery_category',
      'Transport rides cannot have a delivery category'
    );
  }

  if (this.request_type === 'TRANSPORT' && this.delivery_details !== null) {
    this.invalidate(
      'delivery_details',
      'Transport rides cannot have delivery details'
    );
  }

  if (this.request_type === 'DELIVERY' && !this.delivery_category) {
    this.invalidate(
      'delivery_category',
      'Delivery category is required for delivery requests'
    );
  }

  if (this.delivery_details) {
    const populatedSections = [
      this.delivery_details.food_order ? 'FOOD' : null,
      this.delivery_details.water_order ? 'WATER' : null,
      this.delivery_details.parcel_order ? 'PARCEL' : null,
    ].filter(Boolean);
    if (
      populatedSections.length !== 1 ||
      populatedSections[0] !== this.delivery_category
    ) {
      this.invalidate(
        'delivery_details',
        'Delivery details must match the selected delivery category'
      );
    }
    if (
      this.delivery_category === 'PARCEL' &&
      (!this.delivery_details.receiver_name || !this.delivery_details.receiver_phone)
    ) {
      this.invalidate(
        'delivery_details',
        'Parcel deliveries require a receiver name and phone number'
      );
    }
  }
});

module.exports = mongoose.models.Ride || mongoose.model('Ride', rideSchema);
