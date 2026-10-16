const LABELS = Object.freeze({
  TRANSPORT: {
    pickup: 'Pickup',
    destination: 'Destination',
  },
  FOOD: {
    pickup: 'Food pickup location',
    destination: 'Food delivery location',
  },
  WATER: {
    pickup: 'Bottle collection & final drop-off',
    destination: 'Water filling source',
  },
  PARCEL: {
    pickup: 'Parcel collection point',
    destination: 'Parcel delivery point',
  },
});

export const getLocationLabels = (rideType, deliveryCategory) => {
  const normalizedRideType = String(rideType || '').toUpperCase();
  const normalizedCategory = String(deliveryCategory || '').toUpperCase();
  return normalizedRideType === 'DELIVERY'
    ? (LABELS[normalizedCategory] || LABELS.PARCEL)
    : LABELS.TRANSPORT;
};
