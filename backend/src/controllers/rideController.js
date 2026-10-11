const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Ride = require('../models/rideModel');
const Rider = require('../models/riderModel');
const IgnoredRideRequest = require('../models/ignoredRideRequestModel');
const CancellationRequest = require('../models/cancellationRequestModel');
const Payment = require('../models/paymentModel');
const User = require('../models/userModel');
const {
  CANCELLABLE_RIDE_STATUSES,
  DELIVERY_CATEGORIES,
  NEXT_RIDE_STATUS,
  RIDE_TYPES,
} = require('../constants/rideConstants');
const {
  calculateFare,
} = require('../utils/fareCalculator');
const {
  calculateRoadDistanceKm,
} = require('../services/routingService');
const {
  releaseRiderAfterRide,
} = require('../services/riderService');
const {
  getAuthenticatedUser,
  validateObjectId,
} = require('../utils/authenticatedUser');
const {
  emitNewRideRequest,
  emitCancellationRequested,
  emitCancellationResolved,
  emitRideStatusChanged,
} = require('../utils/socketEvents');
const {
  createImmediateCancellation,
  createStartedCancellationRequest,
  respondToCancellationRequest,
} = require('../services/cancellationService');
const {
  normalizeDeliveryDetails,
  serializeDeliveryDetails,
} = require('../utils/deliveryDetails');

const ACTIVE_RIDE_STATUSES = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'STARTED'];

const validateRideId = (rideId) => {
  validateObjectId(rideId, 'ride ID');
};

const normalizeLocation = (location, label) => {
  if (!location || typeof location !== 'object') {
    throw new AppError(`${label} location is required`, 400);
  }

  const address = String(location.address || '').trim();
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!address) {
    throw new AppError(`${label} address is required`, 400);
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError(`${label} coordinates must be valid numbers`, 400);
  }

  if (latitude < -90 || latitude > 90) {
    throw new AppError(`${label} latitude must be between -90 and 90`, 400);
  }

  if (longitude < -180 || longitude > 180) {
    throw new AppError(
      `${label} longitude must be between -180 and 180`,
      400
    );
  }

  return { address, latitude, longitude };
};

const serializeLocation = (location) => ({
  address: location.address,
  latitude: location.latitude,
  longitude: location.longitude,
});

const serializeUserSummary = (user) =>
  user
    ? {
        id: user._id.toString(),
        name: user.name,
        phone: user.phone,
      }
    : null;

const serializeRide = (rideDocument, participants = {}) => {
  const ride = rideDocument.toObject ? rideDocument.toObject() : rideDocument;

  return {
    id: ride._id.toString(),
    customerId: ride.customer_id.toString(),
    riderId: ride.rider_id ? ride.rider_id.toString() : null,
    rideType: ride.request_type,
    deliveryCategory: ride.delivery_category,
    deliveryDetails: serializeDeliveryDetails(ride.delivery_details),
    pickupLocation: serializeLocation(ride.pickup_location),
    destination: serializeLocation(ride.destination),
    distanceKm: ride.distance_km,
    estimatedFare: ride.fare_amount,
    status: ride.status,
    requestedAt: ride.requested_at,
    acceptedAt: ride.accepted_at || null,
    arrivedAt: ride.arrived_at || null,
    startedAt: ride.started_at || null,
    completedAt: ride.completed_at || null,
    cancelledAt: ride.cancelled_at || null,
    assignedRider: serializeUserSummary(participants.assignedRider),
    customer: serializeUserSummary(participants.customer),
  };
};

const serializeRidesForViewer = async (rides, role) => {
  const participantField = role === 'CUSTOMER' ? 'rider_id' : 'customer_id';
  const ids = [
    ...new Set(
      rides
        .map((ride) => ride[participantField]?.toString())
        .filter(Boolean)
    ),
  ];
  const users = ids.length
    ? await User.find({ _id: { $in: ids } }).select('name phone').lean()
    : [];
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  return rides.map((ride) => {
    const participant = usersById.get(ride[participantField]?.toString());
    return serializeRide(
      ride,
      role === 'CUSTOMER'
        ? { assignedRider: participant }
        : { customer: participant }
    );
  });
};

const serializeCancellationRequest = (requestDocument) => {
  if (!requestDocument) return null;
  const request = requestDocument.toObject
    ? requestDocument.toObject()
    : requestDocument;

  return {
    id: request._id.toString(),
    rideId: request.ride_id.toString(),
    requestedBy: request.requested_by.toString(),
    respondingUserId: request.responding_user_id.toString(),
    reason: request.reason,
    status: request.status,
    requestedAt: request.requested_at,
    expiresAt: request.expires_at,
    respondedAt: request.responded_at || null,
    resolvedAt: request.resolved_at || null,
  };
};

const ensureRideAccess = async (ride, userId, role) => {
  if (role === 'CUSTOMER' && ride.customer_id.equals(userId)) {
    return;
  }

  if (role === 'RIDER') {
    if (ride.rider_id?.equals(userId)) {
      return;
    }

    if (ride.status === 'REQUESTED' && !ride.rider_id) {
      const availableRider = await Rider.exists({
        user_id: userId,
        availability_status: 'AVAILABLE',
        approval_status: 'APPROVED',
      });
      if (availableRider) {
        return;
      }
    }
  }

  throw new AppError('You are not authorized to access this ride', 403);
};

exports.requestRide = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['CUSTOMER']);
  const rideType = String(req.body.rideType || '').toUpperCase();
  const deliveryCategory = req.body.deliveryCategory
    ? String(req.body.deliveryCategory).toUpperCase()
    : null;

  if (!RIDE_TYPES.includes(rideType)) {
    throw new AppError('Ride type must be TRANSPORT or DELIVERY', 400);
  }

  if (deliveryCategory && !DELIVERY_CATEGORIES.includes(deliveryCategory)) {
    throw new AppError(
      'Delivery category must be FOOD, WATER, or PARCEL',
      400
    );
  }

  if (rideType === 'DELIVERY' && !deliveryCategory) {
    throw new AppError('Delivery category is required for delivery requests', 400);
  }

  if (rideType === 'TRANSPORT' && deliveryCategory) {
    throw new AppError('Transport requests cannot have a delivery category', 400);
  }

  if (rideType === 'TRANSPORT' && req.body.deliveryDetails) {
    throw new AppError('Transport requests cannot have delivery details', 400);
  }

  const deliveryDetails =
    rideType === 'DELIVERY'
      ? normalizeDeliveryDetails(req.body.deliveryDetails, deliveryCategory)
      : null;

  const activeRideExists = await Ride.exists({
    customer_id: userId,
    request_type: rideType,
    status: { $in: ACTIVE_RIDE_STATUSES },
  });
  if (activeRideExists) {
    throw new AppError(
      `You already have an active ${rideType.toLowerCase()} request`,
      409
    );
  }

  const pickupLocation = normalizeLocation(req.body.pickupLocation, 'Pickup');
  const destination = normalizeLocation(req.body.destination, 'Destination');
  if (
    pickupLocation.latitude === destination.latitude &&
    pickupLocation.longitude === destination.longitude
  ) {
    throw new AppError('Pickup and destination must be different', 400);
  }
  const distanceKm = await calculateRoadDistanceKm(
    pickupLocation,
    destination
  );
  const estimatedFare = calculateFare(rideType, distanceKm);

  let ride;
  try {
    ride = await Ride.create({
      customer_id: userId,
      rider_id: null,
      request_type: rideType,
      delivery_category: rideType === 'DELIVERY' ? deliveryCategory : null,
      delivery_details: deliveryDetails,
      pickup_location: pickupLocation,
      destination,
      distance_km: distanceKm,
      fare_amount: estimatedFare,
      status: 'REQUESTED',
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(
        `You already have an active ${rideType.toLowerCase()} request`,
        409
      );
    }
    throw error;
  }

  try {
    await Payment.create({
      ride_id: ride._id,
      amount: estimatedFare,
      payment_method: 'CASH',
      payment_status: 'PENDING',
      confirmed_by: null,
      paid_at: null,
    });
  } catch (error) {
    await Ride.deleteOne({ _id: ride._id, status: 'REQUESTED' });
    throw error;
  }

  emitNewRideRequest(req, ride);

  res.status(201).json({
    success: true,
    message: 'Ride requested successfully',
    data: { ride: serializeRide(ride) },
  });
});

exports.getAvailableRides = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['RIDER']);
  const rider = await Rider.findOne({ user_id: userId }).lean();

  if (!rider) {
    throw new AppError('Rider profile not found', 404);
  }

  if (rider.approval_status !== 'APPROVED') {
    throw new AppError(
      `Rider approval is ${rider.approval_status.toLowerCase()}`,
      403
    );
  }

  if (rider.availability_status !== 'AVAILABLE') {
    throw new AppError('Only available riders can view ride requests', 403);
  }

  const rides = await Ride.find({ status: 'REQUESTED', rider_id: null })
    .sort({ requested_at: 1 })
    .lean();

  const ignoredRequests = rides.length
    ? await IgnoredRideRequest.find({
        rider_id: userId,
        ride_id: { $in: rides.map((ride) => ride._id) },
      }).lean()
    : [];
  const ignoredByRideId = new Map(
    ignoredRequests.map((request) => [request.ride_id.toString(), request])
  );
  const serializedRides = rides
    .map((ride) => {
      const ignoredRequest = ignoredByRideId.get(ride._id.toString());
      return {
        ...serializeRide(ride),
        ignored: Boolean(ignoredRequest),
        ignoredAt: ignoredRequest?.ignored_at || null,
      };
    })
    .sort((left, right) => Number(left.ignored) - Number(right.ignored));

  res.status(200).json({
    success: true,
    results: serializedRides.length,
    data: { rides: serializedRides },
  });
});

exports.ignoreRideRequest = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['RIDER']);
  validateRideId(req.params.rideId);

  const [rider, ride] = await Promise.all([
    Rider.findOne({ user_id: userId }).lean(),
    Ride.findById(req.params.rideId).lean(),
  ]);

  if (!rider) {
    throw new AppError('Rider profile not found', 404);
  }
  if (rider.approval_status !== 'APPROVED') {
    throw new AppError(
      `Rider approval is ${rider.approval_status.toLowerCase()}`,
      403
    );
  }
  if (rider.availability_status !== 'AVAILABLE') {
    throw new AppError('Only available riders can ignore ride requests', 403);
  }
  if (!ride) {
    throw new AppError('Ride not found', 404);
  }
  if (ride.status !== 'REQUESTED' || ride.rider_id) {
    throw new AppError('This ride is no longer available', 409);
  }

  const ignoredRequest = await IgnoredRideRequest.findOneAndUpdate(
    { rider_id: userId, ride_id: ride._id },
    {
      $setOnInsert: {
        rider_id: userId,
        ride_id: ride._id,
        ignored_at: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Ride request moved to the ignored section',
    data: {
      rideId: ride._id.toString(),
      ignored: true,
      ignoredAt: ignoredRequest.ignored_at,
    },
  });
});

exports.restoreRideRequest = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['RIDER']);
  validateRideId(req.params.rideId);

  await IgnoredRideRequest.deleteOne({
    rider_id: userId,
    ride_id: req.params.rideId,
  });

  res.status(200).json({
    success: true,
    message: 'Ride request restored',
    data: { rideId: req.params.rideId, ignored: false },
  });
});

exports.getMyRides = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  const filter =
    role === 'CUSTOMER' ? { customer_id: userId } : { rider_id: userId };
  const rides = await Ride.find(filter).sort({ requested_at: -1 }).lean();
  const serializedRides = await serializeRidesForViewer(rides, role);

  res.status(200).json({
    success: true,
    results: rides.length,
    data: { rides: serializedRides },
  });
});

exports.getRideById = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  validateRideId(req.params.rideId);

  const ride = await Ride.findById(req.params.rideId);
  if (!ride) {
    throw new AppError('Ride not found', 404);
  }

  await ensureRideAccess(ride, userId, role);

  const participant = await User.findById(
    role === 'CUSTOMER' ? ride.rider_id : ride.customer_id
  )
    .select('name phone')
    .lean();

  res.status(200).json({
    success: true,
    data: {
      ride: serializeRide(
        ride,
        role === 'CUSTOMER'
          ? { assignedRider: participant }
          : { customer: participant }
      ),
    },
  });
});

exports.acceptRide = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['RIDER']);
  validateRideId(req.params.rideId);

  const rider = await Rider.findOneAndUpdate(
    {
      user_id: userId,
      availability_status: 'AVAILABLE',
      approval_status: 'APPROVED',
    },
    { $set: { availability_status: 'BUSY' } },
    { returnDocument: 'after' }
  );

  if (!rider) {
    const currentRider = await Rider.findOne({ user_id: userId }).lean();
    if (!currentRider) {
      throw new AppError('Rider profile not found', 404);
    }
    if (currentRider.approval_status !== 'APPROVED') {
      throw new AppError(
        `Rider approval is ${currentRider.approval_status.toLowerCase()}`,
        403
      );
    }
    throw new AppError('Rider must be available to accept a ride', 409);
  }

  const acceptedAt = new Date();
  let ride;
  try {
    ride = await Ride.findOneAndUpdate(
      { _id: req.params.rideId, status: 'REQUESTED', rider_id: null },
      {
        $set: {
          rider_id: userId,
          status: 'ACCEPTED',
          accepted_at: acceptedAt,
        },
      },
      { returnDocument: 'after', runValidators: true }
    );
  } catch (error) {
    await Rider.updateOne(
      { user_id: userId, availability_status: 'BUSY' },
      { $set: { availability_status: 'AVAILABLE' } }
    );
    throw error;
  }

  if (!ride) {
    await Rider.updateOne(
      { user_id: userId, availability_status: 'BUSY' },
      { $set: { availability_status: 'AVAILABLE' } }
    );
    throw new AppError('This ride is no longer available', 409);
  }

  emitRideStatusChanged(req, ride);

  const customer = await User.findById(ride.customer_id)
    .select('name phone')
    .lean();

  res.status(200).json({
    success: true,
    message: 'Ride accepted successfully',
    data: { ride: serializeRide(ride, { customer }) },
  });
});

exports.updateRideStatus = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['RIDER']);
  validateRideId(req.params.rideId);

  const targetStatus = String(req.body.status || '').toUpperCase();
  const currentStatus = Object.entries(NEXT_RIDE_STATUS).find(
    ([, nextStatus]) => nextStatus === targetStatus
  )?.[0];

  if (!currentStatus) {
    throw new AppError(
      'Status must progress to ARRIVED, STARTED, or COMPLETED',
      400
    );
  }

  const timestampFields = {
    ARRIVED: 'arrived_at',
    STARTED: 'started_at',
    COMPLETED: 'completed_at',
  };

  const transitionedAt = new Date();
  const ride = await Ride.findOneAndUpdate(
    {
      _id: req.params.rideId,
      rider_id: userId,
      status: currentStatus,
    },
    {
      $set: {
        status: targetStatus,
        [timestampFields[targetStatus]]: transitionedAt,
      },
    },
    { returnDocument: 'after', runValidators: true }
  );

  if (!ride) {
    const existingRide = await Ride.findById(req.params.rideId).lean();
    if (!existingRide) {
      throw new AppError('Ride not found', 404);
    }
    if (!existingRide.rider_id?.equals(userId)) {
      throw new AppError('Only the assigned rider can update this ride', 403);
    }
    throw new AppError(
      `Cannot change ride from ${existingRide.status} to ${targetStatus}`,
      409
    );
  }

  if (targetStatus === 'COMPLETED') {
    const pendingCancellation = await CancellationRequest.exists({
      ride_id: ride._id,
      status: 'PENDING',
    });
    if (pendingCancellation) {
      await Ride.updateOne(
        {
          _id: ride._id,
          status: 'COMPLETED',
          completed_at: transitionedAt,
        },
        {
          $set: { status: 'STARTED' },
          $unset: { completed_at: '' },
        }
      );
      throw new AppError(
        'Resolve the pending cancellation request before completing the ride',
        409
      );
    }

    try {
      await releaseRiderAfterRide(userId);
    } catch (error) {
      await Ride.updateOne(
        {
          _id: ride._id,
          status: 'COMPLETED',
          completed_at: transitionedAt,
        },
        {
          $set: { status: 'STARTED' },
          $unset: { completed_at: '' },
        }
      );
      throw error;
    }

  }

  emitRideStatusChanged(req, ride);

  const customer = await User.findById(ride.customer_id)
    .select('name phone')
    .lean();

  res.status(200).json({
    success: true,
    message: `Ride marked as ${targetStatus}`,
    data: { ride: serializeRide(ride, { customer }) },
  });
});

exports.cancelRide = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  validateRideId(req.params.rideId);

  const ride = await Ride.findById(req.params.rideId);
  if (!ride) {
    throw new AppError('Ride not found', 404);
  }

  const isCustomer = role === 'CUSTOMER' && ride.customer_id.equals(userId);
  const isAssignedRider =
    role === 'RIDER' && ride.rider_id?.equals(userId);

  if (!isCustomer && !isAssignedRider) {
    throw new AppError('You are not authorized to cancel this ride', 403);
  }

  const reason = String(req.body.reason || '').trim();
  if (!reason) {
    throw new AppError('Cancellation reason is required', 400);
  }

  if (CANCELLABLE_RIDE_STATUSES.includes(ride.status)) {
    const result = await createImmediateCancellation({
      ride,
      userId,
      reason,
    });
    emitRideStatusChanged(req, result.ride);

    return res.status(200).json({
      success: true,
      message: 'Ride cancelled successfully',
      data: {
        ride: serializeRide(result.ride),
        cancellationAllowance: result.allowance,
      },
    });
  }

  if (ride.status === 'STARTED') {
    const respondingUserId = isCustomer ? ride.rider_id : ride.customer_id;
    const result = await createStartedCancellationRequest({
      ride,
      userId,
      respondingUserId,
      reason,
    });
    emitCancellationRequested(req, ride, result.cancellationRequest);

    return res.status(202).json({
      success: true,
      message: 'Cancellation confirmation requested from the other participant',
      data: {
        cancellationRequest: serializeCancellationRequest(
          result.cancellationRequest
        ),
        cancellationAllowance: result.allowance,
      },
    });
  }

  throw new AppError(`A ride in ${ride.status} status cannot be cancelled`, 409);
});

exports.getPendingCancellationRequest = catchAsync(async (req, res) => {
  const { userId, role } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  validateRideId(req.params.rideId);

  const ride = await Ride.findById(req.params.rideId);
  if (!ride) throw new AppError('Ride not found', 404);
  await ensureRideAccess(ride, userId, role);

  const cancellationRequest = await CancellationRequest.findOne({
    ride_id: ride._id,
    status: 'PENDING',
  });
  if (!cancellationRequest) {
    throw new AppError('No pending cancellation request was found', 404);
  }

  return res.status(200).json({
    success: true,
    data: {
      cancellationRequest: serializeCancellationRequest(cancellationRequest),
    },
  });
});

exports.respondToCancellation = catchAsync(async (req, res) => {
  const { userId } = getAuthenticatedUser(req, ['CUSTOMER', 'RIDER']);
  validateRideId(req.params.rideId);
  const decision = String(req.body.decision || '').toUpperCase();
  if (!['CANCEL', 'RESUME'].includes(decision)) {
    throw new AppError('Decision must be CANCEL or RESUME', 400);
  }

  const result = await respondToCancellationRequest({
    rideId: req.params.rideId,
    respondingUserId: userId,
    decision,
  });
  emitCancellationResolved(req, result.ride, result.cancellationRequest);
  if (result.ride?.status === 'CANCELLED') {
    emitRideStatusChanged(req, result.ride);
  }

  return res.status(200).json({
    success: true,
    message:
      result.ride?.status === 'CANCELLED'
        ? 'Ride cancelled successfully'
        : 'Ride will resume',
    data: {
      ride: result.ride ? serializeRide(result.ride) : null,
      cancellationRequest: serializeCancellationRequest(
        result.cancellationRequest
      ),
      cancellationAllowance: result.allowance || null,
    },
  });
});
