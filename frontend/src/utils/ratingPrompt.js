export const findRatingPromptRide = (rides, dismissedRideIds = [], preferredRideId = null) => {
  const dismissed = new Set(dismissedRideIds);
  const candidates = (rides || []).filter((ride) =>
    ride.status === 'completed' && ride.rider && !ride.rating && !dismissed.has(ride.id)
  );
  return candidates.find((ride) => ride.id === preferredRideId) || candidates[0] || null;
};
