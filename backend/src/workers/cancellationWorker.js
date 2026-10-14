const {
  processExpiredCancellationRequests,
} = require('../services/cancellationService');
const {
  emitCancellationResolvedWithIo,
} = require('../utils/socketEvents');
const { notifySafely } = require('../services/notificationService');

const runSweep = async (io) => {
  const results = await processExpiredCancellationRequests();
  for (const result of results) {
    emitCancellationResolvedWithIo(
      io,
      result.ride,
      result.cancellationRequest
    );
    const ride = result.ride;
    if (ride && result.cancellationRequest?.status === 'AUTO_CANCELLED') {
      await Promise.all([
        notifySafely({
          userId: ride.customer_id,
          type: 'CANCELLATION_RESOLVED',
          title: 'Ride cancelled automatically',
          message: 'The cancellation response time expired, so the ride was cancelled automatically.',
          link: '/customer/history',
          rideId: ride._id,
          io,
        }),
        notifySafely({
          userId: ride.rider_id,
          type: 'CANCELLATION_RESOLVED',
          title: 'Ride cancelled automatically',
          message: 'The cancellation response time expired, so the ride was cancelled automatically.',
          link: '/rider/history',
          rideId: ride._id,
          io,
        }),
      ]);
    }
    if (ride?.status === 'CANCELLED') {
      io?.to(`ride_${ride._id}`).emit('ride_status_changed', {
        rideId: ride._id.toString(),
        status: ride.status,
        riderId: ride.rider_id?.toString() || null,
        updatedAt: new Date().toISOString(),
      });
    }
  }
};

const createCancellationReconciliationMiddleware = ({
  minimumIntervalMs = 5000,
  sweep = runSweep,
  now = Date.now,
  onError = (error) => {
    console.error(`Cancellation reconciliation failed: ${error.message}`);
  },
} = {}) => {
  const safeMinimumIntervalMs = Math.max(0, Number(minimumIntervalMs) || 0);
  let lastSuccessfulSweepAt = null;
  let sweepPromise = null;

  return async (req, _res, next) => {
    const requestedAt = Number(now());
    const recentlyReconciled =
      lastSuccessfulSweepAt !== null &&
      requestedAt - lastSuccessfulSweepAt < safeMinimumIntervalMs;

    if (recentlyReconciled) {
      next();
      return;
    }

    if (!sweepPromise) {
      sweepPromise = Promise.resolve()
        .then(() => sweep(req.app.get('io')))
        .then(() => {
          lastSuccessfulSweepAt = Number(now());
        })
        .catch((error) => {
          onError(error);
        })
        .finally(() => {
          sweepPromise = null;
        });
    }

    await sweepPromise;
    next();
  };
};

const startCancellationWorker = (io, intervalMs = 30000) => {
  const safeInterval =
    Number.isFinite(Number(intervalMs)) && Number(intervalMs) >= 1000
      ? Number(intervalMs)
      : 30000;

  runSweep(io).catch((error) => {
    console.error(`Cancellation sweep failed: ${error.message}`);
  });
  const timer = setInterval(() => {
    runSweep(io).catch((error) => {
      console.error(`Cancellation sweep failed: ${error.message}`);
    });
  }, safeInterval);
  timer.unref();

  return () => clearInterval(timer);
};

module.exports = {
  createCancellationReconciliationMiddleware,
  runSweep,
  startCancellationWorker,
};
