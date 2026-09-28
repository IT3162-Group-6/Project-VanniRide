const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
  getAuthenticatedUser,
  validateObjectId,
} = require('../utils/authenticatedUser');
const Payment = require('../models/paymentModel');
const Ride = require('../models/rideModel');

const serializePayment = (paymentDocument) => {
  const payment = paymentDocument.toObject
    ? paymentDocument.toObject()
    : paymentDocument;

  return {
    id: payment._id.toString(),
    rideId: payment.ride_id.toString(),
    paymentMethod: payment.payment_method,
    paymentStatus: payment.payment_status,
    amount: payment.amount,
    confirmedBy: payment.confirmed_by?.toString() || null,
    createdAt: payment.created_at,
    paidAt: payment.paid_at || null,
  };
};

const getAccessibleRide = async (rideId, userId, role) => {
  validateObjectId(rideId, 'ride ID');
  const ride = await Ride.findById(rideId).lean();

  if (!ride) {
    throw new AppError('Ride not found', 404);
  }

  const isCustomer = role === 'CUSTOMER' && ride.customer_id.equals(userId);
  const isRider = role === 'RIDER' && ride.rider_id?.equals(userId);
  if (!isCustomer && !isRider) {
    throw new AppError('You are not authorized to access this payment', 403);
  }

  return ride;
};

exports.getPayment = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  const ride = await getAccessibleRide(req.params.rideId, userId, role);
  const payment = await Payment.findOne({ ride_id: ride._id });

  if (!payment) {
    throw new AppError('Payment record not found', 404);
  }

  res.status(200).json({
    success: true,
    data: { payment: serializePayment(payment) },
  });
});

exports.markPaymentPaid = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['RIDER']);
  const ride = await getAccessibleRide(req.params.rideId, userId, 'RIDER');

  if (ride.status !== 'COMPLETED') {
    throw new AppError('Payment can only be confirmed after ride completion', 409);
  }

  const paidAt = new Date();
  const payment = await Payment.findOneAndUpdate(
    { ride_id: ride._id, payment_status: 'PENDING' },
    {
      $set: {
        payment_status: 'PAID',
        confirmed_by: userId,
        paid_at: paidAt,
      },
    },
    { returnDocument: 'after', runValidators: true }
  );

  if (!payment) {
    const existingPayment = await Payment.findOne({ ride_id: ride._id }).lean();
    if (!existingPayment) {
      throw new AppError('Payment record not found', 404);
    }
    throw new AppError('Cash payment has already been confirmed', 409);
  }

  res.status(200).json({
    success: true,
    message: 'Cash payment confirmed successfully',
    data: { payment: serializePayment(payment) },
  });
});
