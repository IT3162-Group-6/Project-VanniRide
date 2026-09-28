const {
  processExpiredCancellationRequests,
} = require('../services/cancellationService');
const {
  emitCancellationResolvedWithIo,
} = require('../utils/socketEvents');

const runSweep = async (io) => {
  const results = await processExpiredCancellationRequests();
  for (const result of results) {
    emitCancellationResolvedWithIo(
      io,
      result.ride,
      result.cancellationRequest
    );
    if (result.ride?.status === 'CANCELLED') {
      io?.to(`ride_${result.ride._id}`).emit('ride_status_changed', {
        rideId: result.ride._id.toString(),
        status: result.ride.status,
        riderId: result.ride.rider_id?.toString() || null,
        updatedAt: new Date().toISOString(),
      });
    }
  }
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

module.exports = { runSweep, startCancellationWorker };
