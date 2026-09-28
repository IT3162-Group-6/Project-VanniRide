const getIo = (req) => req.app?.get('io');

const rideRoom = (rideId) => `ride_${rideId}`;
const userRoom = (userId) => `user_${userId}`;

const statusPayload = (ride) => ({
  rideId: ride._id.toString(),
  status: ride.status,
  riderId: ride.rider_id ? ride.rider_id.toString() : null,
  updatedAt: new Date().toISOString(),
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

module.exports = {
  emitNewRideRequest,
  emitRideStatusChanged,
  rideRoom,
  userRoom,
};
