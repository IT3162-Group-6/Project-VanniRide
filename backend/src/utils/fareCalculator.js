const AppError = require('./appError');

const BASE_FARES = Object.freeze({
  TRANSPORT: 200,
  DELIVERY: 150,
});
const RATE_PER_KM = 80;
const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistanceKm = (pickupLocation, destination) => {
  const lat1 = Number(pickupLocation?.latitude);
  const lon1 = Number(pickupLocation?.longitude);
  const lat2 = Number(destination?.latitude);
  const lon2 = Number(destination?.longitude);

  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) {
    throw new AppError(
      'Pickup and destination coordinates must be valid numbers',
      400
    );
  }

  if (
    Math.abs(lat1) > 90 ||
    Math.abs(lat2) > 90 ||
    Math.abs(lon1) > 180 ||
    Math.abs(lon2) > 180
  ) {
    throw new AppError('Pickup or destination coordinates are out of range', 400);
  }

  const latitudeDifference = toRadians(lat2 - lat1);
  const longitudeDifference = toRadians(lon2 - lon1);
  const firstLatitude = toRadians(lat1);
  const secondLatitude = toRadians(lat2);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const distance =
    2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(distance * 100) / 100;
};

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

module.exports = { calculateDistanceKm, calculateFare };
