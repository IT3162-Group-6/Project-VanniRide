const AppError = require('../utils/appError');
const Cancellation = require('../models/cancellationModel');
const CancellationRequest = require('../models/cancellationRequestModel');
const Ride = require('../models/rideModel');
const Rider = require('../models/riderModel');
const { releaseRiderAfterRide } = require('./riderService');
const {
  CANCELLATION_LIMIT,
  CANCELLATION_RESPONSE_MS,
  CANCELLATION_WINDOW_MS,
} = require('../constants/rideConstants');

const getCancellationAllowance = async (userId, now = new Date()) => {
  const windowStart = new Date(now.getTime() - CANCELLATION_WINDOW_MS);
  const [finalCancellations, pendingRequests] = await Promise.all([
    Cancellation.find({
      cancelled_by: userId,
      cancelled_at: { $gte: windowStart },
    })
      .select('cancelled_at')
      .sort({ cancelled_at: 1 })
      .lean(),
    CancellationRequest.find({
      requested_by: userId,
      status: 'PENDING',
    })
      .select('expires_at')
      .sort({ expires_at: 1 })
      .lean(),
  ]);

  const used = finalCancellations.length + pendingRequests.length;
  const resetCandidates = finalCancellations
    .map(
      (item) => new Date(item.cancelled_at).getTime() + CANCELLATION_WINDOW_MS
    )
    .filter((timestamp) => timestamp > now.getTime());

  return {
    limit: CANCELLATION_LIMIT,
    used,
    remaining: Math.max(0, CANCELLATION_LIMIT - used),
    pendingReservations: pendingRequests.length,
    resetsAt:
      resetCandidates.length > 0
        ? new Date(Math.min(...resetCandidates))
        : null,
  };
};

const assertCancellationAvailable = async (userId, now) => {
  const allowance = await getCancellationAllowance(userId, now);
  if (allowance.remaining <= 0) {
    throw new AppError(
      'Cancellation limit reached. Try again after a cancellation leaves the rolling one-hour window.',
      409
    );
  }
  return allowance;
};

const rollbackFinalCancellation = async ({
  cancellationId,
  rideId,
  cancelledAt,
  previousStatus,
  riderId,
  riderWasReleased,
}) => {
  await Promise.allSettled([
    Cancellation.deleteOne({ _id: cancellationId }),
    Ride.updateOne(
      { _id: rideId, status: 'CANCELLED', cancelled_at: cancelledAt },
      { $set: { status: previousStatus }, $unset: { cancelled_at: '' } }
    ),
    riderWasReleased && riderId
      ? Rider.updateOne(
          {
            user_id: riderId,
            availability_status: { $in: ['AVAILABLE', 'UNAVAILABLE'] },
          },
          { $set: { availability_status: 'BUSY' } }
        )
      : Promise.resolve(),
  ]);
};

const releaseAssignedRider = async (riderId) => {
  if (!riderId) return false;
  await releaseRiderAfterRide(riderId);
  return true;
};

const createImmediateCancellation = async ({
  ride,
  userId,
  reason,
  now = new Date(),
}) => {
  await assertCancellationAvailable(userId, now);
  const previousStatus = ride.status;
  const cancelledRide = await Ride.findOneAndUpdate(
    { _id: ride._id, status: previousStatus },
    { $set: { status: 'CANCELLED', cancelled_at: now } },
    { returnDocument: 'after', runValidators: true }
  );
  if (!cancelledRide) {
    throw new AppError('Ride status changed before it could be cancelled', 409);
  }

  let cancellation;
  let riderWasReleased = false;
  try {
    cancellation = await Cancellation.create({
      ride_id: ride._id,
      cancelled_by: userId,
      reason,
      previous_status: previousStatus,
      cancellation_mode: 'IMMEDIATE',
      cancelled_at: now,
    });
    riderWasReleased = await releaseAssignedRider(ride.rider_id);
  } catch (error) {
    await rollbackFinalCancellation({
      cancellationId: cancellation?._id,
      rideId: ride._id,
      cancelledAt: now,
      previousStatus,
      riderId: ride.rider_id,
      riderWasReleased,
    });
    throw error;
  }

  return {
    ride: cancelledRide,
    cancellation,
    allowance: await getCancellationAllowance(userId, now),
  };
};

const createStartedCancellationRequest = async ({
  ride,
  userId,
  respondingUserId,
  reason,
  now = new Date(),
}) => {
  await assertCancellationAvailable(userId, now);

  try {
    const cancellationRequest = await CancellationRequest.create({
      ride_id: ride._id,
      requested_by: userId,
      responding_user_id: respondingUserId,
      reason,
      status: 'PENDING',
      requested_at: now,
      expires_at: new Date(now.getTime() + CANCELLATION_RESPONSE_MS),
      responded_at: null,
      resolved_at: null,
    });

    const rideStillStarted = await Ride.exists({
      _id: ride._id,
      status: 'STARTED',
    });
    if (!rideStillStarted) {
      await CancellationRequest.deleteOne({ _id: cancellationRequest._id });
      throw new AppError(
        'Ride status changed before cancellation could be requested',
        409
      );
    }

    return {
      cancellationRequest,
      allowance: await getCancellationAllowance(userId, now),
    };
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(
        'A cancellation response is already pending for this ride',
        409
      );
    }
    throw error;
  }
};

const finalizeStartedCancellation = async ({
  requestId,
  respondingUserId,
  automatic = false,
  now = new Date(),
}) => {
  const claimFilter = {
    _id: requestId,
    status: 'PENDING',
    expires_at: automatic ? { $lte: now } : { $gt: now },
  };
  if (!automatic) claimFilter.responding_user_id = respondingUserId;

  const resolutionStatus = automatic ? 'AUTO_CANCELLED' : 'CONFIRMED';
  const claimed = await CancellationRequest.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        status: resolutionStatus,
        responded_at: automatic ? null : now,
        resolved_at: now,
      },
    },
    { returnDocument: 'after', runValidators: true }
  );
  if (!claimed) return null;

  const ride = await Ride.findById(claimed.ride_id);
  if (!ride || ride.status !== 'STARTED') {
    const resumedRequest = await CancellationRequest.findOneAndUpdate(
      { _id: claimed._id, status: resolutionStatus },
      {
        $set: {
          status: 'RESUMED',
          responded_at: automatic ? null : now,
          resolved_at: now,
        },
      },
      { returnDocument: 'after', runValidators: true }
    );
    return {
      cancellationRequest: resumedRequest || claimed,
      ride,
      notCancelled: true,
    };
  }

  const cancelledRide = await Ride.findOneAndUpdate(
    { _id: ride._id, status: 'STARTED' },
    { $set: { status: 'CANCELLED', cancelled_at: now } },
    { returnDocument: 'after', runValidators: true }
  );
  if (!cancelledRide) {
    await CancellationRequest.updateOne(
      { _id: claimed._id, status: resolutionStatus },
      { $set: { status: 'PENDING', responded_at: null, resolved_at: null } }
    );
    return null;
  }

  let cancellation;
  let riderWasReleased = false;
  try {
    cancellation = await Cancellation.create({
      ride_id: ride._id,
      cancelled_by: claimed.requested_by,
      reason: claimed.reason,
      previous_status: 'STARTED',
      cancellation_mode: automatic ? 'AUTO_TIMEOUT' : 'MUTUAL',
      cancelled_at: now,
    });
    riderWasReleased = await releaseAssignedRider(ride.rider_id);
  } catch (error) {
    await rollbackFinalCancellation({
      cancellationId: cancellation?._id,
      rideId: ride._id,
      cancelledAt: now,
      previousStatus: 'STARTED',
      riderId: ride.rider_id,
      riderWasReleased,
    });
    await CancellationRequest.updateOne(
      { _id: claimed._id, status: resolutionStatus },
      { $set: { status: 'PENDING', responded_at: null, resolved_at: null } }
    );
    throw error;
  }

  return {
    cancellationRequest: claimed,
    cancellation,
    ride: cancelledRide,
    allowance: await getCancellationAllowance(claimed.requested_by, now),
  };
};

const resumeStartedRide = async ({ requestId, respondingUserId, now }) => {
  const cancellationRequest = await CancellationRequest.findOneAndUpdate(
    {
      _id: requestId,
      status: 'PENDING',
      responding_user_id: respondingUserId,
      expires_at: { $gt: now },
    },
    {
      $set: {
        status: 'RESUMED',
        responded_at: now,
        resolved_at: now,
      },
    },
    { returnDocument: 'after', runValidators: true }
  );
  if (!cancellationRequest) return null;

  const ride = await Ride.findById(cancellationRequest.ride_id);
  if (!ride) {
    throw new AppError('The ride linked to this cancellation no longer exists', 409);
  }

  return {
    cancellationRequest,
    ride,
    allowance: await getCancellationAllowance(
      cancellationRequest.requested_by,
      now
    ),
  };
};

const respondToCancellationRequest = async ({
  rideId,
  respondingUserId,
  decision,
  now = new Date(),
}) => {
  const pending = await CancellationRequest.findOne({
    ride_id: rideId,
    status: 'PENDING',
  });
  if (!pending) {
    throw new AppError('No pending cancellation request was found', 404);
  }
  if (!pending.responding_user_id.equals(respondingUserId)) {
    throw new AppError(
      'Only the other ride participant can answer this request',
      403
    );
  }

  if (pending.expires_at <= now) {
    const automaticResult = await finalizeStartedCancellation({
      requestId: pending._id,
      automatic: true,
      now,
    });
    if (!automaticResult) {
      throw new AppError('Cancellation request has already been resolved', 409);
    }
    return automaticResult;
  }

  if (decision === 'RESUME') {
    const result = await resumeStartedRide({
      requestId: pending._id,
      respondingUserId,
      now,
    });
    if (!result) {
      throw new AppError('Cancellation request has already been resolved', 409);
    }
    return result;
  }

  const result = await finalizeStartedCancellation({
    requestId: pending._id,
    respondingUserId,
    automatic: false,
    now,
  });
  if (!result) {
    throw new AppError('Cancellation request has already been resolved', 409);
  }
  return result;
};

const processExpiredCancellationRequests = async ({
  now = new Date(),
  limit = 100,
} = {}) => {
  const expired = await CancellationRequest.find({
    status: 'PENDING',
    expires_at: { $lte: now },
  })
    .select('_id')
    .limit(limit)
    .lean();
  const results = [];

  for (const request of expired) {
    try {
      const result = await finalizeStartedCancellation({
        requestId: request._id,
        automatic: true,
        now,
      });
      if (result) results.push(result);
    } catch (error) {
      console.error(
        `Automatic cancellation failed for ${request._id}: ${error.message}`
      );
    }
  }

  return results;
};

module.exports = {
  createImmediateCancellation,
  createStartedCancellationRequest,
  finalizeStartedCancellation,
  getCancellationAllowance,
  processExpiredCancellationRequests,
  respondToCancellationRequest,
};
