const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
  getAuthenticatedUser,
  validateObjectId,
} = require('../utils/authenticatedUser');
const AdminAuditLog = require('../models/adminAuditLogModel');
const Cancellation = require('../models/cancellationModel');
const CancellationRequest = require('../models/cancellationRequestModel');
const ChatAccessRequest = require('../models/chatAccessRequestModel');
const Message = require('../models/messageModel');
const Payment = require('../models/paymentModel');
const Rating = require('../models/ratingModel');
const Ride = require('../models/rideModel');
const Rider = require('../models/riderModel');
const User = require('../models/userModel');
const {
  expireElapsedChatAccess,
  serializeChatAccessRequest,
} = require('../services/chatService');
const { CHAT_ACCESS_DURATION_MS } = require('../constants/rideConstants');
const {
  emitCancellationResolved,
  emitChatAccessUpdated,
  emitRiderApprovalUpdated,
  emitRideForceCancelled,
  emitRideStatusChanged,
} = require('../utils/socketEvents');
const {
  releaseRiderAfterRide,
  serializeRiderProfile,
} = require('../services/riderService');

const normalizeReason = (value) => {
  if (typeof value !== 'string') {
    throw new AppError('An administrative reason is required', 400);
  }
  const reason = value.trim();
  if (!reason) {
    throw new AppError('An administrative reason is required', 400);
  }
  if (reason.length > 500) {
    throw new AppError('Administrative reason cannot exceed 500 characters', 400);
  }
  return reason;
};

const serializeUser = (userDocument) => {
  const user = userDocument.toObject ? userDocument.toObject() : userDocument;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    accountStatus: user.account_status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

const serializeRide = (rideDocument) => {
  const ride = rideDocument.toObject ? rideDocument.toObject() : rideDocument;
  return {
    id: ride._id.toString(),
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
    acceptedAt: ride.accepted_at || null,
    arrivedAt: ride.arrived_at || null,
    startedAt: ride.started_at || null,
    completedAt: ride.completed_at || null,
    cancelledAt: ride.cancelled_at || null,
  };
};

const serializePayment = (paymentDocument) => {
  const payment = paymentDocument.toObject
    ? paymentDocument.toObject()
    : paymentDocument;
  return {
    id: payment._id.toString(),
    rideId: payment.ride_id.toString(),
    amount: payment.amount,
    paymentMethod: payment.payment_method,
    paymentStatus: payment.payment_status,
    confirmedBy: payment.confirmed_by?.toString() || null,
    createdAt: payment.created_at,
    paidAt: payment.paid_at || null,
  };
};

const serializeCancellation = (cancellationDocument) => {
  const cancellation = cancellationDocument.toObject
    ? cancellationDocument.toObject()
    : cancellationDocument;
  return {
    id: cancellation._id.toString(),
    rideId: cancellation.ride_id.toString(),
    cancelledBy: cancellation.cancelled_by.toString(),
    reason: cancellation.reason,
    previousStatus: cancellation.previous_status,
    cancellationMode: cancellation.cancellation_mode,
    cancelledAt: cancellation.cancelled_at,
  };
};

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

const createAuditLog = (entry) => AdminAuditLog.create(entry);

const serializeAdminMessage = (message, sender) => ({
  id: message._id.toString(),
  rideId: message.ride_id.toString(),
  sender: sender
    ? {
        id: sender._id.toString(),
        name: sender.name,
        role: sender.role,
      }
    : null,
  messageText: message.message_text,
  sentAt: message.sent_at,
});

const serializeAdminParticipant = (user, rider = null) =>
  user
    ? {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        vehicle: rider?.vehicle
          ? `${rider.vehicle.model} · ${rider.vehicle.registration_number}`
          : null,
      }
    : null;

exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find().sort({ created_at: -1 });
  return res.status(200).json({
    success: true,
    results: users.length,
    data: { users: users.map(serializeUser) },
  });
});

exports.getAllRiders = catchAsync(async (req, res) => {
  const approvalStatus = req.query?.approvalStatus
    ? String(req.query.approvalStatus).toUpperCase()
    : null;
  if (
    approvalStatus &&
    !['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)
  ) {
    throw new AppError(
      'Approval status must be PENDING, APPROVED, or REJECTED',
      400
    );
  }

  const riders = await Rider.find(
    approvalStatus ? { approval_status: approvalStatus } : {}
  )
    .sort({ created_at: -1 })
    .lean();
  const userIds = riders.map((rider) => rider.user_id);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const usersById = new Map(
    users.map((user) => [user._id.toString(), serializeUser(user)])
  );

  const results = riders.map((rider) => ({
    ...serializeRiderProfile(rider),
    user: usersById.get(rider.user_id.toString()) || null,
  }));
  return res.status(200).json({
    success: true,
    results: results.length,
    data: { riders: results },
  });
});

exports.reviewRiderApproval = catchAsync(async (req, res) => {
  const { userId: adminId } = getAuthenticatedUser(req, ['ADMIN']);
  validateObjectId(req.params.riderUserId, 'rider user ID');
  const decision = String(req.body.decision || '').toUpperCase();
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    throw new AppError('Decision must be APPROVE or REJECT', 400);
  }
  const reason = normalizeReason(req.body.reason);
  const rider = await Rider.findOne({ user_id: req.params.riderUserId }).lean();
  if (!rider) throw new AppError('Rider profile not found', 404);
  if (rider.availability_status === 'BUSY') {
    throw new AppError('A busy rider cannot be reviewed', 409);
  }
  const approvalStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  if (rider.approval_status === approvalStatus) {
    throw new AppError(`Rider is already ${approvalStatus}`, 409);
  }

  const reviewedAt = new Date();
  const updatedRider = await Rider.findOneAndUpdate(
    {
      _id: rider._id,
      approval_status: rider.approval_status,
      availability_status: { $ne: 'BUSY' },
    },
    {
      $set: {
        approval_status: approvalStatus,
        availability_status: 'UNAVAILABLE',
        review_reason: reason,
        reviewed_by: adminId,
        reviewed_at: reviewedAt,
      },
    },
    { returnDocument: 'after', runValidators: true }
  );
  if (!updatedRider) {
    throw new AppError('Rider profile changed before it could be reviewed', 409);
  }

  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'RIDER_APPROVAL_REVIEWED',
      target_type: 'RIDER',
      target_id: rider._id,
      reason,
      before: {
        approval_status: rider.approval_status,
        availability_status: rider.availability_status,
        review_reason: rider.review_reason || null,
        reviewed_by: rider.reviewed_by || null,
        reviewed_at: rider.reviewed_at || null,
      },
      after: {
        approval_status: updatedRider.approval_status,
        availability_status: updatedRider.availability_status,
        review_reason: updatedRider.review_reason,
        reviewed_by: updatedRider.reviewed_by,
        reviewed_at: updatedRider.reviewed_at,
      },
    });
  } catch (error) {
    await Rider.updateOne(
      { _id: updatedRider._id, approval_status: approvalStatus },
      {
        $set: {
          approval_status: rider.approval_status,
          availability_status: rider.availability_status,
          review_reason: rider.review_reason || null,
          reviewed_by: rider.reviewed_by || null,
          reviewed_at: rider.reviewed_at || null,
        },
      }
    );
    throw error;
  }

  emitRiderApprovalUpdated(req, updatedRider);
  return res.status(200).json({
    success: true,
    message: `Rider ${approvalStatus.toLowerCase()} successfully`,
    data: { riderProfile: serializeRiderProfile(updatedRider) },
  });
});

exports.updateUserStatus = catchAsync(async (req, res) => {
  const { userId: adminId } = getAuthenticatedUser(req, ['ADMIN']);
  validateObjectId(req.params.userId, 'user ID');
  const accountStatus = String(req.body.accountStatus || '').toUpperCase();
  if (!['ACTIVE', 'SUSPENDED'].includes(accountStatus)) {
    throw new AppError('Account status must be ACTIVE or SUSPENDED', 400);
  }
  if (adminId.equals(req.params.userId)) {
    throw new AppError('Administrators cannot change their own account status', 403);
  }
  const reason = normalizeReason(req.body.reason);

  const previousUser = await User.findById(req.params.userId).lean();
  if (!previousUser) {
    throw new AppError('User not found', 404);
  }
  if (previousUser.account_status === accountStatus) {
    throw new AppError(`User account is already ${accountStatus}`, 409);
  }

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: previousUser._id,
      account_status: previousUser.account_status,
      token_version: previousUser.token_version,
    },
    {
      $set: { account_status: accountStatus },
      $inc: { token_version: 1 },
    },
    { returnDocument: 'after', runValidators: true }
  );
  if (!updatedUser) {
    throw new AppError('User account changed before it could be updated', 409);
  }

  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'USER_STATUS_CHANGED',
      target_type: 'USER',
      target_id: previousUser._id,
      reason,
      before: {
        account_status: previousUser.account_status,
        token_version: previousUser.token_version,
      },
      after: {
        account_status: updatedUser.account_status,
        token_version: updatedUser.token_version,
      },
    });
  } catch (error) {
    await User.updateOne(
      {
        _id: updatedUser._id,
        account_status: updatedUser.account_status,
        token_version: updatedUser.token_version,
      },
      {
        $set: {
          account_status: previousUser.account_status,
          token_version: previousUser.token_version,
        },
      }
    );
    throw error;
  }

  return res.status(200).json({
    success: true,
    message: `User account updated to ${accountStatus}`,
    data: { user: serializeUser(updatedUser) },
  });
});

exports.getAllRides = catchAsync(async (req, res) => {
  const rides = await Ride.find().sort({ requested_at: -1 }).lean();
  const userIds = [
    ...new Set(
      rides.flatMap((ride) =>
        [ride.customer_id, ride.rider_id]
          .filter(Boolean)
          .map((id) => id.toString())
      )
    ),
  ];
  const [users, riders] = await Promise.all([
    User.find({ _id: { $in: userIds } }).lean(),
    Rider.find({ user_id: { $in: userIds } }).lean(),
  ]);
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));
  const ridersByUserId = new Map(
    riders.map((rider) => [rider.user_id.toString(), rider])
  );
  const serializedRides = rides.map((ride) => ({
    ...serializeRide(ride),
    customer: serializeAdminParticipant(
      usersById.get(ride.customer_id.toString())
    ),
    assignedRider: ride.rider_id
      ? serializeAdminParticipant(
          usersById.get(ride.rider_id.toString()),
          ridersByUserId.get(ride.rider_id.toString())
        )
      : null,
  }));
  return res.status(200).json({
    success: true,
    results: rides.length,
    data: { rides: serializedRides },
  });
});

exports.getRideMessages = catchAsync(async (req, res) => {
  const { userId: adminId } = getAuthenticatedUser(req, ['ADMIN']);
  validateObjectId(req.params.rideId, 'ride ID');
  const reason = normalizeReason(req.query?.reason);
  const rideExists = await Ride.exists({ _id: req.params.rideId });
  if (!rideExists) throw new AppError('Ride not found', 404);

  const requestedLimit = Number(req.query?.limit || 50);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw new AppError('Message limit must be a positive integer', 400);
  }
  const limit = Math.min(requestedLimit, 100);
  const filter = { ride_id: req.params.rideId };
  if (req.query?.before) {
    validateObjectId(req.query.before, 'message cursor');
    filter._id = { $lt: req.query.before };
  }

  const descendingMessages = await Message.find(filter)
    .sort({ sent_at: -1, _id: -1 })
    .limit(limit)
    .lean();
  const messages = [...descendingMessages].reverse();
  const senderIds = [...new Set(messages.map((item) => item.sender_id.toString()))];
  const senders = await User.find({ _id: { $in: senderIds } })
    .select('name role')
    .lean();
  const sendersById = new Map(
    senders.map((sender) => [sender._id.toString(), sender])
  );
  const serializedMessages = messages.map((message) =>
    serializeAdminMessage(message, sendersById.get(message.sender_id.toString()))
  );
  const nextCursor =
    descendingMessages.length === limit
      ? descendingMessages[descendingMessages.length - 1]._id.toString()
      : null;

  await createAuditLog({
    admin_id: adminId,
    action: 'RIDE_MESSAGES_VIEWED',
    target_type: 'RIDE',
    target_id: req.params.rideId,
    reason,
    before: {},
    after: {
      returned_count: messages.length,
      requested_limit: limit,
      before_cursor: req.query?.before || null,
      next_cursor: nextCursor,
    },
  });

  return res.status(200).json({
    success: true,
    results: serializedMessages.length,
    data: { messages: serializedMessages, nextCursor },
  });
});

exports.forceCancelRide = catchAsync(async (req, res) => {
  const { userId: adminId } = getAuthenticatedUser(req, ['ADMIN']);
  validateObjectId(req.params.rideId, 'ride ID');
  const reason = normalizeReason(req.body.reason);
  const activeStatuses = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED'];
  const previousRide = await Ride.findById(req.params.rideId).lean();
  if (!previousRide) throw new AppError('Ride not found', 404);
  if (!activeStatuses.includes(previousRide.status)) {
    throw new AppError(
      `A ride in ${previousRide.status} status cannot be force-cancelled`,
      409
    );
  }

  const riderBefore = previousRide.rider_id
    ? await Rider.findOne({ user_id: previousRide.rider_id }).lean()
    : null;
  const pendingRequest = await CancellationRequest.findOne({
    ride_id: previousRide._id,
    status: 'PENDING',
  }).lean();
  const cancelledAt = new Date();
  const cancelledRide = await Ride.findOneAndUpdate(
    { _id: previousRide._id, status: previousRide.status },
    { $set: { status: 'CANCELLED', cancelled_at: cancelledAt } },
    { returnDocument: 'after', runValidators: true }
  );
  if (!cancelledRide) {
    throw new AppError('Ride status changed before it could be cancelled', 409);
  }

  let cancellation;
  let resolvedRequest = null;
  let riderAvailability = riderBefore?.availability_status || null;
  try {
    cancellation = await Cancellation.create({
      ride_id: previousRide._id,
      cancelled_by: adminId,
      reason,
      previous_status: previousRide.status,
      cancellation_mode: 'ADMIN_FORCE',
      cancelled_at: cancelledAt,
    });
    if (pendingRequest) {
      resolvedRequest = await CancellationRequest.findOneAndUpdate(
        { _id: pendingRequest._id, status: 'PENDING' },
        {
          $set: {
            status: 'ADMIN_CANCELLED',
            responded_at: null,
            resolved_at: cancelledAt,
          },
        },
        { returnDocument: 'after', runValidators: true }
      );
      if (!resolvedRequest) {
        throw new AppError(
          'Cancellation request changed before admin cancellation completed',
          409
        );
      }
    }
    if (previousRide.rider_id) {
      riderAvailability = await releaseRiderAfterRide(previousRide.rider_id);
    }
    await createAuditLog({
      admin_id: adminId,
      action: 'RIDE_FORCE_CANCELLED',
      target_type: 'RIDE',
      target_id: previousRide._id,
      reason,
      before: {
        ride_status: previousRide.status,
        rider_availability: riderBefore?.availability_status || null,
        cancellation_request_status: pendingRequest?.status || null,
      },
      after: {
        ride_status: cancelledRide.status,
        rider_availability: riderAvailability,
        cancellation_request_status: resolvedRequest?.status || null,
      },
    });
  } catch (error) {
    await Promise.allSettled([
      cancellation?._id
        ? Cancellation.deleteOne({ _id: cancellation._id })
        : Promise.resolve(),
      Ride.updateOne(
        { _id: previousRide._id, status: 'CANCELLED', cancelled_at: cancelledAt },
        {
          $set: { status: previousRide.status },
          $unset: { cancelled_at: '' },
        }
      ),
      pendingRequest
        ? CancellationRequest.updateOne(
            { _id: pendingRequest._id, status: 'ADMIN_CANCELLED' },
            {
              $set: {
                status: 'PENDING',
                responded_at: pendingRequest.responded_at || null,
                resolved_at: pendingRequest.resolved_at || null,
              },
            }
          )
        : Promise.resolve(),
      riderBefore
        ? Rider.updateOne(
            { _id: riderBefore._id },
            { $set: { availability_status: riderBefore.availability_status } }
          )
        : Promise.resolve(),
    ]);
    throw error;
  }

  if (resolvedRequest) {
    emitCancellationResolved(req, cancelledRide, resolvedRequest);
  }
  emitRideStatusChanged(req, cancelledRide);
  emitRideForceCancelled(req, cancelledRide, reason);

  return res.status(200).json({
    success: true,
    message: 'Ride force-cancelled successfully',
    data: {
      ride: serializeRide(cancelledRide),
      cancellation: serializeCancellation(cancellation),
    },
  });
});

exports.getAllCancellations = catchAsync(async (req, res) => {
  const cancellations = await Cancellation.find()
    .sort({ cancelled_at: -1 })
    .lean();
  return res.status(200).json({
    success: true,
    results: cancellations.length,
    data: { cancellations: cancellations.map(serializeCancellation) },
  });
});

exports.getAllPayments = catchAsync(async (req, res) => {
  const payments = await Payment.find().sort({ created_at: -1 }).lean();
  return res.status(200).json({
    success: true,
    results: payments.length,
    data: { payments: payments.map(serializePayment) },
  });
});

exports.correctPayment = catchAsync(async (req, res) => {
  const { userId: adminId } = getAuthenticatedUser(req, ['ADMIN']);
  validateObjectId(req.params.paymentId, 'payment ID');
  const reason = normalizeReason(req.body.reason);
  const payment = await Payment.findById(req.params.paymentId).lean();
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }
  const completedRide = await Ride.exists({
    _id: payment.ride_id,
    status: 'COMPLETED',
  });
  if (!completedRide) {
    throw new AppError(
      'Only payments for completed rides can be administratively corrected',
      409
    );
  }

  const hasAmount = Object.hasOwn(req.body, 'amount');
  const hasStatus = Object.hasOwn(req.body, 'paymentStatus');
  if (!hasAmount && !hasStatus) {
    throw new AppError('Provide an amount or paymentStatus to correct', 400);
  }

  let amount = payment.amount;
  if (hasAmount) {
    if (
      typeof req.body.amount !== 'number' ||
      !Number.isFinite(req.body.amount) ||
      req.body.amount < 0
    ) {
      throw new AppError('Payment amount must be a non-negative number', 400);
    }
    amount = req.body.amount;
  }

  let paymentStatus = payment.payment_status;
  if (hasStatus) {
    paymentStatus = String(req.body.paymentStatus || '').toUpperCase();
    if (!['PENDING', 'PAID'].includes(paymentStatus)) {
      throw new AppError('Payment status must be PENDING or PAID', 400);
    }
  }
  if (amount === payment.amount && paymentStatus === payment.payment_status) {
    throw new AppError('The requested payment correction makes no changes', 409);
  }

  const paidAt =
    paymentStatus === 'PAID' ? payment.paid_at || new Date() : null;
  const confirmedBy = paymentStatus === 'PAID' ? payment.confirmed_by : null;
  const updatedPayment = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      amount: payment.amount,
      payment_status: payment.payment_status,
    },
    {
      $set: {
        amount,
        payment_status: paymentStatus,
        confirmed_by: confirmedBy,
        paid_at: paidAt,
      },
    },
    { returnDocument: 'after', runValidators: true }
  );
  if (!updatedPayment) {
    throw new AppError('Payment changed before it could be corrected', 409);
  }

  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'PAYMENT_CORRECTED',
      target_type: 'PAYMENT',
      target_id: payment._id,
      reason,
      before: {
        amount: payment.amount,
        payment_status: payment.payment_status,
        confirmed_by: payment.confirmed_by || null,
        paid_at: payment.paid_at || null,
      },
      after: {
        amount: updatedPayment.amount,
        payment_status: updatedPayment.payment_status,
        confirmed_by: updatedPayment.confirmed_by || null,
        paid_at: updatedPayment.paid_at || null,
      },
    });
  } catch (error) {
    await Payment.updateOne(
      {
        _id: updatedPayment._id,
        amount: updatedPayment.amount,
        payment_status: updatedPayment.payment_status,
      },
      {
        $set: {
          amount: payment.amount,
          payment_status: payment.payment_status,
          confirmed_by: payment.confirmed_by || null,
          paid_at: payment.paid_at || null,
        },
      }
    );
    throw error;
  }

  return res.status(200).json({
    success: true,
    message: 'Payment dispute correction recorded successfully',
    data: { payment: serializePayment(updatedPayment) },
  });
});

exports.getAllRatings = catchAsync(async (req, res) => {
  const ratings = await Rating.find().sort({ created_at: -1 }).lean();
  return res.status(200).json({
    success: true,
    results: ratings.length,
    data: { ratings: ratings.map(serializeRating) },
  });
});

exports.getChatAccessRequests = catchAsync(async (req, res) => {
  await expireElapsedChatAccess();
  const requests = await ChatAccessRequest.find()
    .sort({ requested_at: -1 })
    .lean();
  return res.status(200).json({
    success: true,
    results: requests.length,
    data: {
      chatAccessRequests: requests.map(serializeChatAccessRequest),
    },
  });
});

exports.reviewChatAccessRequest = catchAsync(async (req, res) => {
  const { userId: adminId } = getAuthenticatedUser(req, ['ADMIN']);
  validateObjectId(req.params.requestId, 'chat access request ID');
  const decision = String(req.body.decision || '').toUpperCase();
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    throw new AppError('Decision must be APPROVE or REJECT', 400);
  }
  const reason = normalizeReason(req.body.reason);
  const request = await ChatAccessRequest.findById(req.params.requestId).lean();
  if (!request) {
    throw new AppError('Chat access request not found', 404);
  }
  if (request.status !== 'PENDING') {
    throw new AppError('Chat access request has already been reviewed', 409);
  }
  const ride = await Ride.findById(request.ride_id).lean();
  if (!ride) {
    throw new AppError('The ride linked to this request no longer exists', 409);
  }
  if (decision === 'APPROVE' && ride.status !== 'COMPLETED') {
    throw new AppError(
      'Chat access can only be approved for a completed ride',
      409
    );
  }

  const now = new Date();
  const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const approvedUntil =
    status === 'APPROVED'
      ? new Date(now.getTime() + CHAT_ACCESS_DURATION_MS)
      : null;
  const updatedRequest = await ChatAccessRequest.findOneAndUpdate(
    { _id: request._id, status: 'PENDING' },
    {
      $set: {
        status,
        reviewed_by: adminId,
        reviewed_at: now,
        approved_from: status === 'APPROVED' ? now : null,
        approved_until: approvedUntil,
      },
    },
    { returnDocument: 'after', runValidators: true }
  );
  if (!updatedRequest) {
    throw new AppError('Chat access request was reviewed concurrently', 409);
  }

  try {
    await createAuditLog({
      admin_id: adminId,
      action: 'CHAT_ACCESS_REVIEWED',
      target_type: 'CHAT_ACCESS_REQUEST',
      target_id: request._id,
      reason,
      before: {
        status: request.status,
        reviewed_by: request.reviewed_by || null,
        reviewed_at: request.reviewed_at || null,
        approved_from: request.approved_from || null,
        approved_until: request.approved_until || null,
      },
      after: {
        status: updatedRequest.status,
        reviewed_by: updatedRequest.reviewed_by,
        reviewed_at: updatedRequest.reviewed_at,
        approved_from: updatedRequest.approved_from || null,
        approved_until: updatedRequest.approved_until || null,
      },
    });
  } catch (error) {
    await ChatAccessRequest.updateOne(
      {
        _id: updatedRequest._id,
        status: updatedRequest.status,
        reviewed_at: updatedRequest.reviewed_at,
      },
      {
        $set: {
          status: request.status,
          reviewed_by: request.reviewed_by || null,
          reviewed_at: request.reviewed_at || null,
          approved_from: request.approved_from || null,
          approved_until: request.approved_until || null,
        },
      }
    );
    throw error;
  }

  emitChatAccessUpdated(req, ride, updatedRequest);

  return res.status(200).json({
    success: true,
    message:
      status === 'APPROVED'
        ? 'Post-completion chat access approved for 24 hours'
        : 'Post-completion chat access rejected',
    data: {
      chatAccessRequest: serializeChatAccessRequest(updatedRequest),
    },
  });
});

exports.getAdminStatistics = catchAsync(async (req, res) => {
  const [
    userStatsRows,
    rideStatusRows,
    paymentStatsRows,
    ratingStatsRows,
    riderApprovalRows,
  ] =
    await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            customers: {
              $sum: { $cond: [{ $eq: ['$role', 'CUSTOMER'] }, 1, 0] },
            },
            riders: {
              $sum: { $cond: [{ $eq: ['$role', 'RIDER'] }, 1, 0] },
            },
            admins: {
              $sum: { $cond: [{ $eq: ['$role', 'ADMIN'] }, 1, 0] },
            },
            active: {
              $sum: {
                $cond: [{ $eq: ['$account_status', 'ACTIVE'] }, 1, 0],
              },
            },
            suspended: {
              $sum: {
                $cond: [{ $eq: ['$account_status', 'SUSPENDED'] }, 1, 0],
              },
            },
          },
        },
      ]),
      Ride.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [{ $eq: ['$payment_status', 'PENDING'] }, 1, 0],
              },
            },
            paid: {
              $sum: { $cond: [{ $eq: ['$payment_status', 'PAID'] }, 1, 0] },
            },
            totalPaidAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$payment_status', 'PAID'] },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
      ]),
      Rating.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            averageRating: { $avg: '$rating' },
          },
        },
      ]),
      Rider.aggregate([
        { $group: { _id: '$approval_status', count: { $sum: 1 } } },
      ]),
    ]);

  const [totalCancellations, pendingChatAccessRequests] = await Promise.all([
    Cancellation.countDocuments(),
    ChatAccessRequest.countDocuments({ status: 'PENDING' }),
  ]);
  const userStats = userStatsRows[0] || {
    total: 0,
    customers: 0,
    riders: 0,
    admins: 0,
    active: 0,
    suspended: 0,
  };
  const byStatus = Object.fromEntries(
    rideStatusRows.map((item) => [item._id, item.count])
  );
  const activeRideStatuses = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED'];
  const activeRides = activeRideStatuses.reduce(
    (total, status) => total + (byStatus[status] || 0),
    0
  );
  const totalRides = Object.values(byStatus).reduce(
    (total, count) => total + count,
    0
  );
  const paymentStats = paymentStatsRows[0] || {
    total: 0,
    pending: 0,
    paid: 0,
    totalPaidAmount: 0,
  };
  const ratingStats = ratingStatsRows[0] || {
    total: 0,
    averageRating: null,
  };
  const riderApprovals = Object.fromEntries(
    riderApprovalRows.map((item) => [item._id, item.count])
  );

  return res.status(200).json({
    success: true,
    data: {
      statistics: {
        users: {
          total: userStats.total,
          customers: userStats.customers,
          riders: userStats.riders,
          admins: userStats.admins,
          active: userStats.active,
          suspended: userStats.suspended,
        },
        rides: {
          total: totalRides,
          active: activeRides,
          completed: byStatus.COMPLETED || 0,
          cancelled: byStatus.CANCELLED || 0,
          byStatus,
        },
        payments: {
          total: paymentStats.total,
          pending: paymentStats.pending,
          paid: paymentStats.paid,
          totalPaidAmount: paymentStats.totalPaidAmount,
        },
        cancellations: { total: totalCancellations },
        ratings: {
          total: ratingStats.total,
          averageRating:
            ratingStats.averageRating === null
              ? null
              : Math.round(ratingStats.averageRating * 100) / 100,
        },
        chatAccessRequests: { pending: pendingChatAccessRequests },
        riderApprovals: {
          pending: riderApprovals.PENDING || 0,
          approved: riderApprovals.APPROVED || 0,
          rejected: riderApprovals.REJECTED || 0,
        },
      },
    },
  });
});
