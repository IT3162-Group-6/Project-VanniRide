// A simple rule-based fare calculator for the campus
const calculateFare = (rideType, distanceKm = 1) => {
  const BASE_FARE = rideType === 'DELIVERY' ? 150 : 200; // Base fare in LKR
  const RATE_PER_KM = 80;

  return BASE_FARE + Math.round(distanceKm * RATE_PER_KM);
};

module.exports = { calculateFare };