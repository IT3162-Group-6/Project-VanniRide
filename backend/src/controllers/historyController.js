const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { getAuthenticatedUser } = require('../utils/authenticatedUser');
const Cancellation = require('../models/cancellationModel');
const Payment = require('../models/paymentModel');
const Rating = require('../models/ratingModel');
const Ride = require('../models/rideModel');
const Rider = require('../models/riderModel');
const User = require('../models/userModel');

const ACTIVE_RIDE_STATUSES = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED'];

const serializePayment = (payment) =>
  payment
    ? {
        id: payment._id.toString(),
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        paymentStatus: payment.payment_status,
        confirmedBy: payment.confirmed_by?.toString() || null,
        createdAt: payment.created_at,
        paidAt: payment.paid_at || null,
      }
    : null;

const serializeCancellation = (cancellation) =>
  cancellation
    ? {
        id: cancellation._id.toString(),
        cancelledBy: cancellation.cancelled_by.toString(),
        reason: cancellation.reason,
        previousStatus: cancellation.previous_status,
        cancellationMode: cancellation.cancellation_mode,
        cancelledAt: cancellation.cancelled_at,
      }
    : null;

const serializeRating = (rating) =>
  rating
    ? {
        id: rating._id.toString(),
        rating: rating.rating,
        review: rating.review || null,
        createdAt: rating.created_at,
      }
    : null;

const serializeParticipant = (user) =>
  user
    ? {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
      }
    : null;

const indexByRideId = (documents) =>
  new Map(documents.map((item) => [item.ride_id.toString(), item]));

exports.getMyHistory = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  const rideFilter =
    role === 'CUSTOMER' ? { customer_id: userId } : { rider_id: userId };
  const rides = await Ride.find(rideFilter).sort({ requested_at: -1 }).lean();
  const rideIds = rides.map((ride) => ride._id);

  const [payments, cancellations, ratings] = await Promise.all([
    Payment.find({ ride_id: { $in: rideIds } }).lean(),
    Cancellation.find({ ride_id: { $in: rideIds } }).lean(),
    Rating.find({ ride_id: { $in: rideIds } }).lean(),
  ]);
  const participantField = role === 'CUSTOMER' ? 'rider_id' : 'customer_id';
  const participantIds = [
    ...new Set(
      rides
        .map((ride) => ride[participantField]?.toString())
        .filter(Boolean)
    ),
  ];
  const participants = participantIds.length
    ? await User.find({ _id: { $in: participantIds } })
        .select('name phone')
        .lean()
    : [];

  const paymentsByRide = indexByRideId(payments);
  const cancellationsByRide = indexByRideId(cancellations);
  const ratingsByRide = indexByRideId(ratings);
  const participantsById = new Map(
    participants.map((participant) => [participant._id.toString(), participant])
  );
  const history = rides.map((ride) => {
    const rideId = ride._id.toString();
    const participant = participantsById.get(
      ride[participantField]?.toString()
    );
    return {
      ride: {
        id: rideId,
        customerId: ride.customer_id.toString(),
        riderId: ride.rider_id?.toString() || null,
        rideType: ride.request_type,
        deliveryCategory: ride.delivery_category || null,
        pickupLocation: ride.pickup_location,
        destination: ride.destination,
        distanceKm: ride.distance_km,
        estimatedFare: ride.fare_amount,
        status: ride.status,
        requestedAt: ride.requested_at,
        completedAt: ride.completed_at || null,
        cancelledAt: ride.cancelled_at || null,
      },
      participant: serializeParticipant(participant),
      payment: serializePayment(paymentsByRide.get(rideId)),
      cancellation: serializeCancellation(cancellationsByRide.get(rideId)),
      rating: serializeRating(ratingsByRide.get(rideId)),
    };
  });

  const paidPayments = payments.filter(
    (payment) => payment.payment_status === 'PAID'
  );
  const completed = rides.filter((ride) => ride.status === 'COMPLETED').length;
  const cancelled = rides.filter((ride) => ride.status === 'CANCELLED').length;
  const active = rides.filter((ride) =>
    ACTIVE_RIDE_STATUSES.includes(ride.status)
  ).length;
  const summary = {
    currency: 'LKR',
    rides: {
      total: rides.length,
      active,
      completed,
      cancelled,
    },
    payments: {
      paid: paidPayments.length,
      pending: payments.length - paidPayments.length,
      totalPaidAmount: paidPayments.reduce(
        (total, payment) => total + payment.amount,
        0
      ),
    },
    cancellations: { total: cancellations.length },
    ratings:
      role === 'CUSTOMER'
        ? { submitted: ratings.length }
        : {
            received: ratings.length,
            averageRating: ratings.length
              ? Math.round(
                  (ratings.reduce((total, item) => total + item.rating, 0) /
                    ratings.length) *
                    100
                ) / 100
              : null,
          },
  };

  return res.status(200).json({
    success: true,
    results: history.length,
    data: { summary, history },
  });
});

exports.getRiderEarnings = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['RIDER']);
  const riderExists = await Rider.exists({ user_id: userId });
  if (!riderExists) {
    throw new AppError('Rider profile not found', 404);
  }

  const completedRides = await Ride.find({
    rider_id: userId,
    status: 'COMPLETED',
  })
    .select('request_type completed_at')
    .sort({ completed_at: -1 })
    .lean();
  const ridesById = new Map(
    completedRides.map((ride) => [ride._id.toString(), ride])
  );
  const payments = await Payment.find({
    ride_id: { $in: completedRides.map((ride) => ride._id) },
  })
    .sort({ paid_at: -1, created_at: -1 })
    .lean();
  const paidPayments = payments.filter(
    (payment) => payment.payment_status === 'PAID'
  );
  const pendingPayments = payments.filter(
    (payment) => payment.payment_status === 'PENDING'
  );
  const earnings = paidPayments.map((payment) => {
    const ride = ridesById.get(payment.ride_id.toString());
    return {
      paymentId: payment._id.toString(),
      rideId: payment.ride_id.toString(),
      rideType: ride?.request_type || null,
      amount: payment.amount,
      currency: 'LKR',
      completedAt: ride?.completed_at || null,
      paidAt: payment.paid_at || null,
    };
  });

  return res.status(200).json({
    success: true,
    results: earnings.length,
    data: {
      summary: {
        currency: 'LKR',
        totalEarnings: paidPayments.reduce(
          (total, payment) => total + payment.amount,
          0
        ),
        paidRideCount: paidPayments.length,
        pendingReceiptAmount: pendingPayments.reduce(
          (total, payment) => total + payment.amount,
          0
        ),
        pendingReceiptCount: pendingPayments.length,
      },
      earnings,
    },
  });
});
