const getIo = (req) => req.app?.get('io');

const rideRoom = (rideId) => `ride_${rideId}`;
const userRoom = (userId) => `user_${userId}`;

const statusPayload = (ride) => ({
  rideId: ride._id.toString(),
  status: ride.status,
  riderId: ride.rider_id ? ride.rider_id.toString() : null,
  updatedAt: new Date().toISOString(),
});

const cancellationPayload = (request) => ({
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
});

const emitNewRideRequest = (req, ride) => {
  const io = getIo(req);
  if (!io) return;

  io.to('role_RIDER').emit('new_ride_request', {
    rideId: ride._id.toString(),
    rideType: ride.request_type,
    pickupLocation: ride.pickup_location,
    destination: ride.destination,
    estimatedFare: ride.fare_amount,
  });
};

const emitRideStatusChanged = (req, ride) => {
  const io = getIo(req);
  if (!io) return;

  let emitter = io
    .to(rideRoom(ride._id.toString()))
    .to(userRoom(ride.customer_id.toString()));

  if (ride.rider_id) {
    emitter = emitter.to(userRoom(ride.rider_id.toString()));
  }

  emitter.emit('ride_status_changed', statusPayload(ride));
};

const emitCancellationRequested = (req, ride, cancellationRequest) => {
  const io = getIo(req);
  if (!io) return;
  io.to(rideRoom(ride._id.toString()))
    .to(userRoom(cancellationRequest.responding_user_id.toString()))
    .emit('cancellation_requested', cancellationPayload(cancellationRequest));
};

const emitCancellationResolvedWithIo = (io, ride, cancellationRequest) => {
  if (!io || !cancellationRequest) return;
  let emitter = io
    .to(rideRoom(cancellationRequest.ride_id.toString()))
    .to(userRoom(cancellationRequest.requested_by.toString()))
    .to(userRoom(cancellationRequest.responding_user_id.toString()));
  emitter.emit('cancellation_resolved', {
    ...cancellationPayload(cancellationRequest),
    rideStatus: ride?.status || null,
  });
};

const emitCancellationResolved = (req, ride, cancellationRequest) => {
  emitCancellationResolvedWithIo(getIo(req), ride, cancellationRequest);
};

module.exports = {
  emitNewRideRequest,
  emitCancellationRequested,
  emitCancellationResolved,
  emitCancellationResolvedWithIo,
  emitRideStatusChanged,
  rideRoom,
  userRoom,
};
