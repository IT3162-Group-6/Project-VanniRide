import { getLocationLabels } from './locationLabels.js';

const validCoordinate = (value) =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

const destinationQuery = (location) => {
  if (!location) return '';
  if (
    typeof location === 'object' &&
    validCoordinate(location.latitude) &&
    validCoordinate(location.longitude)
  ) {
    return `${Number(location.latitude)},${Number(location.longitude)}`;
  }
  if (typeof location === 'object') return String(location.address || '').trim();
  return String(location).trim();
};
export const buildGoogleMapsNavigationUrl = (location) => {
  const destination = destinationQuery(location);
  if (!destination) return null;
  const parameters = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'driving',
    dir_action: 'navigate',
  });
  return `https://www.google.com/maps/dir/?${parameters.toString()}`;
};

export const riderNavigation = (ride) => {
  if (!ride) return null;
  const status = String(ride.apiStatus || ride.status || '').toUpperCase();
  if (!['ACCEPTED', 'ARRIVED', 'STARTED', 'ONTHEWAY', 'PICKED'].includes(status)) {
    return null;
  }
  const toPickup = status === 'ACCEPTED';
  const labels = getLocationLabels(ride.type, ride.deliveryCategory);
  const location = toPickup
    ? ride.pickupLocation || ride.pickup
    : ride.destination || ride.dropoff;
  const url = buildGoogleMapsNavigationUrl(location);
  return url
    ? { url, label: `Navigate to ${String(toPickup ? labels.pickup : labels.destination).toLowerCase()}` }
    : null;
};
