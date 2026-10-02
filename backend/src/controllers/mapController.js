const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const {
  DELIVERY_CATEGORIES,
  RIDE_TYPES,
} = require('../constants/rideConstants');
const {
  reverseGeocode,
  searchPlaces,
} = require('../services/geocodingService');
const { calculateRoadRoute } = require('../services/routingService');
const { calculateFare } = require('../utils/fareCalculator');

const normalizeCoordinates = (latitudeValue, longitudeValue, label) => {
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new AppError(`${label} latitude must be between -90 and 90`, 400);
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new AppError(
      `${label} longitude must be between -180 and 180`,
      400
    );
  }
  return { latitude, longitude };
};

const normalizeLocation = (value, label) => {
  if (!value || typeof value !== 'object') {
    throw new AppError(`${label} location is required`, 400);
  }
  const address = String(value.address || '').trim();
  if (!address) throw new AppError(`${label} address is required`, 400);
  return {
    address,
    ...normalizeCoordinates(value.latitude, value.longitude, label),
  };
};

const assertDifferentLocations = (pickupLocation, destination) => {
  if (
    pickupLocation.latitude === destination.latitude &&
    pickupLocation.longitude === destination.longitude
  ) {
    throw new AppError('Pickup and destination must be different', 400);
  }
};

exports.search = catchAsync(async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (query.length < 3) {
    throw new AppError('Search query must contain at least 3 characters', 400);
  }
  const places = await searchPlaces(query);
  res.status(200).json({
    success: true,
    results: places.length,
    data: { places },
  });
});

exports.reverse = catchAsync(async (req, res) => {
  const coordinates = normalizeCoordinates(
    req.query.latitude,
    req.query.longitude,
    'Selected location'
  );
  const place = await reverseGeocode(
    coordinates.latitude,
    coordinates.longitude
  );
  res.status(200).json({ success: true, data: { place } });
});

exports.previewRoute = catchAsync(async (req, res) => {
  const rideType = String(req.body.rideType || '').toUpperCase();
  const deliveryCategory = req.body.deliveryCategory
    ? String(req.body.deliveryCategory).toUpperCase()
    : null;
  if (!RIDE_TYPES.includes(rideType)) {
    throw new AppError('Ride type must be TRANSPORT or DELIVERY', 400);
  }
  if (rideType === 'DELIVERY' && !DELIVERY_CATEGORIES.includes(deliveryCategory)) {
    throw new AppError(
      'Delivery category must be FOOD, WATER, or PARCEL',
      400
    );
  }
  if (rideType === 'TRANSPORT' && deliveryCategory) {
    throw new AppError('Transport requests cannot have a delivery category', 400);
  }

  const pickupLocation = normalizeLocation(req.body.pickupLocation, 'Pickup');
  const destination = normalizeLocation(req.body.destination, 'Destination');
  assertDifferentLocations(pickupLocation, destination);
  const route = await calculateRoadRoute(pickupLocation, destination);
  if (!route.routeGeometry || route.durationMinutes === null) {
    throw new AppError(
      'The road-routing service did not return a displayable route',
      503
    );
  }

  res.status(200).json({
    success: true,
    data: {
      routePreview: {
        ...route,
        estimatedFare: calculateFare(rideType, route.distanceKm),
      },
    },
  });
});

exports.assertDifferentLocations = assertDifferentLocations;
