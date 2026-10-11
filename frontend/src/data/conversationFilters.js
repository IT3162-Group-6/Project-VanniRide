export const CONVERSATION_FILTERS = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]);

const ACTIVE_STATUSES = new Set(['accepted', 'ontheway', 'picked']);
const CONVERSATION_STATUSES = new Set([
  ...ACTIVE_STATUSES,
  'completed',
  'cancelled',
]);

export const isConversationRide = (ride, participantKey) =>
  Boolean(ride?.[participantKey]) && CONVERSATION_STATUSES.has(ride.status);

export const filterConversations = (rides, filter) => {
  if (filter === 'active') {
    return rides.filter((ride) => ACTIVE_STATUSES.has(ride.status));
  }
  if (filter === 'completed') {
    return rides.filter((ride) => ride.status === 'completed');
  }
  if (filter === 'cancelled') {
    return rides.filter((ride) => ride.status === 'cancelled');
  }
  return rides;
};
