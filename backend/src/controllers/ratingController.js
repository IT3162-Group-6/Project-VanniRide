const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
  getAuthenticatedUser,
  validateObjectId,
} = require('../utils/authenticatedUser');
const Rating = require('../models/ratingModel');
const Ride = require('../models/rideModel');
const Rider = require('../models/riderModel');

const serializeRating = (ratingDocument) => {
  const rating = ratingDocument.toObject
    ? ratingDocument.toObject()
    : ratingDocument;

  return {
    id: rating._id.toString(),
    rideId: rating.ride_id.toString(),
    customerId: rating.customer_id.toString(),
    riderId: rating.rider_id.toString(),
    rating: rating.rating,
    review: rating.review || null,
    createdAt: rating.created_at,
  };
};

const normalizeRating = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError('Rating must be a number from 1 through 5', 400);
  }
  if (value < 1 || value > 5) {
    throw new AppError('Rating must be between 1 and 5', 400);
  }
  return value;
};

const normalizeReview = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new AppError('Review must be text', 400);
  }
  const review = value.trim();
  if (!review) return null;
  if (review.length > 1000) {
    throw new AppError('Review cannot exceed 1000 characters', 400);
  }
  return review;
};

exports.createRating = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['CUSTOMER']);
  validateObjectId(req.params.rideId, 'ride ID');

  const ride = await Ride.findById(req.params.rideId).lean();
  if (!ride) {
    throw new AppError('Ride not found', 404);
  }
  if (!ride.customer_id.equals(userId)) {
    throw new AppError('Only the ride customer can rate this rider', 403);
  }
  if (ride.status !== 'COMPLETED') {
    throw new AppError('A rider can only be rated after ride completion', 409);
  }
  if (!ride.rider_id) {
    throw new AppError('Completed ride has no assigned rider', 409);
  }

  const ratingValue = normalizeRating(req.body.rating);
  const review = normalizeReview(req.body.review);

  let rating;
  try {
    rating = await Rating.create({
      ride_id: ride._id,
      customer_id: userId,
      rider_id: ride.rider_id,
      rating: ratingValue,
      review,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError('This ride has already been rated', 409);
    }
    throw error;
  }

  return res.status(201).json({
    success: true,
    message: 'Rider rating submitted successfully',
    data: { rating: serializeRating(rating) },
  });
});

exports.getRiderRatings = catchAsync(async (req, res) => {
  getAuthenticatedUser(req, ['CUSTOMER', 'RIDER', 'ADMIN']);
  validateObjectId(req.params.riderId, 'rider ID');

  const riderId = req.params.riderId;
  const riderExists = await Rider.exists({ user_id: riderId });
  if (!riderExists) {
    throw new AppError('Rider not found', 404);
  }

  const ratings = await Rating.find({ rider_id: riderId })
    .sort({ created_at: -1 })
    .lean();
  const totalRatings = ratings.length;
  const averageRating = totalRatings
    ? Math.round(
        (ratings.reduce((sum, item) => sum + item.rating, 0) / totalRatings) *
          100
      ) / 100
    : null;

  return res.status(200).json({
    success: true,
    results: totalRatings,
    data: {
      riderId,
      summary: { averageRating, totalRatings },
      ratings: ratings.map(serializeRating),
    },
  });
});
