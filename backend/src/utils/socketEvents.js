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

const messagePayload = (message) => ({
  id: message._id.toString(),
  rideId: message.ride_id.toString(),
  senderId: message.sender_id.toString(),
  messageText: message.message_text,
  sentAt: message.sent_at,
});

const chatAccessPayload = (request) => ({
  id: request._id.toString(),
  rideId: request.ride_id.toString(),
  requestedBy: request.requested_by.toString(),
  riderId: request.rider_id.toString(),
  reason: request.reason,
  status: request.status,
  reviewedBy: request.reviewed_by?.toString() || null,
  requestedAt: request.requested_at,
  reviewedAt: request.reviewed_at || null,
  approvedFrom: request.approved_from || null,
  approvedUntil: request.approved_until || null,
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

const emitNewMessage = (req, message) => {
  const io = getIo(req);
  if (!io) return;
  io.to(rideRoom(message.ride_id.toString())).emit(
    'new_message',
    messagePayload(message)
  );
};

const emitChatAccessUpdated = (req, ride, chatAccessRequest) => {
  const io = getIo(req);
  if (!io) return;
  io.to(userRoom(ride.customer_id.toString()))
    .to(userRoom(ride.rider_id.toString()))
    .to('role_ADMIN')
    .emit('chat_access_updated', chatAccessPayload(chatAccessRequest));
};

const emitRiderApprovalUpdated = (req, rider) => {
  const io = getIo(req);
  if (!io) return;
  const payload = {
    riderUserId: rider.user_id.toString(),
    approvalStatus: rider.approval_status,
    reviewReason: rider.review_reason || null,
    reviewedAt: rider.reviewed_at || null,
    availabilityStatus: rider.availability_status,
  };
  io.to(userRoom(rider.user_id.toString()))
    .to('role_ADMIN')
    .emit('rider_approval_updated', payload);
};

const emitRideForceCancelled = (req, ride, reason) => {
  const io = getIo(req);
  if (!io) return;
  let emitter = io
    .to(rideRoom(ride._id.toString()))
    .to(userRoom(ride.customer_id.toString()))
    .to('role_ADMIN');
  if (ride.rider_id) {
    emitter = emitter.to(userRoom(ride.rider_id.toString()));
  }
  emitter.emit('ride_force_cancelled', {
    ...statusPayload(ride),
    reason,
  });
};

module.exports = {
  emitChatAccessUpdated,
  emitNewRideRequest,
  emitNewMessage,
  emitCancellationRequested,
  emitCancellationResolved,
  emitCancellationResolvedWithIo,
  emitRideStatusChanged,
  emitRiderApprovalUpdated,
  emitRideForceCancelled,
  rideRoom,
  userRoom,
};
