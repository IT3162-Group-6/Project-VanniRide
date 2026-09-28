const AppError = require('./appError');

const BASE_FARES = Object.freeze({
  TRANSPORT: 200,
  DELIVERY: 150,
});
const RATE_PER_KM = 80;
const calculateFare = (rideType, distanceKm) => {
  const normalizedRideType = String(rideType || '').toUpperCase();
  const normalizedDistance = Number(distanceKm);

  if (!Object.hasOwn(BASE_FARES, normalizedRideType)) {
    throw new AppError('Ride type must be TRANSPORT or DELIVERY', 400);
  }

  if (!Number.isFinite(normalizedDistance) || normalizedDistance < 0) {
    throw new AppError('Distance must be a non-negative number', 400);
  }

  return BASE_FARES[normalizedRideType] + Math.round(normalizedDistance * RATE_PER_KM);
};

module.exports = { calculateFare };
