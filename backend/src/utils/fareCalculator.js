const AppError = require('./appError');

const BASE_FARES = Object.freeze({
  TRANSPORT: 200,
  DELIVERY: 150,
});
const RATE_PER_KM = Object.freeze({
  TRANSPORT: 80,
  DELIVERY: 60,
});

const calculateDeliveryHandlingCharge = (deliveryCategory, deliveryDetails) => {
  if (!deliveryDetails) return 0;

  if (deliveryCategory === 'FOOD') {
    const parcelCount = deliveryDetails.food_order.items.reduce(
      (total, item) => total + item.quantity,
      0
    );
    return parcelCount * 25;
  }

  if (deliveryCategory === 'WATER') {
    const bottleCount = deliveryDetails.water_order.items.reduce(
      (total, item) => total + item.quantity,
      0
    );
    return bottleCount * 30;
  }

  if (deliveryCategory === 'PARCEL') {
    return Math.ceil(deliveryDetails.parcel_order.weight_kg) * 15;
  }

  return 0;
};

const calculateFareBreakdown = (
  rideType,
  distanceKm,
  deliveryCategory = null,
  deliveryDetails = null
) => {
  const normalizedRideType = String(rideType || '').toUpperCase();
  const normalizedDistance = Number(distanceKm);

  if (!Object.hasOwn(BASE_FARES, normalizedRideType)) {
    throw new AppError('Ride type must be TRANSPORT or DELIVERY', 400);
  }

  if (!Number.isFinite(normalizedDistance) || normalizedDistance < 0) {
    throw new AppError('Distance must be a non-negative number', 400);
  }

  const baseFare = BASE_FARES[normalizedRideType];
  const distanceCharge = Math.round(
    normalizedDistance * RATE_PER_KM[normalizedRideType]
  );
  const handlingCharge =
    normalizedRideType === 'DELIVERY'
      ? calculateDeliveryHandlingCharge(deliveryCategory, deliveryDetails)
      : 0;

  return {
    baseFare,
    distanceCharge,
    handlingCharge,
    total: baseFare + distanceCharge + handlingCharge,
  };
};

const calculateFare = (...args) => calculateFareBreakdown(...args).total;

module.exports = { calculateFare, calculateFareBreakdown };
