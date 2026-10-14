export const ICON_BY_NOTIFICATION_TYPE = Object.freeze({
  RIDE_REQUEST: 'route',
  RIDE_ACCEPTED: 'check',
  RIDE_STATUS: 'pin',
  RIDE_CANCELLED: 'close',
  CANCELLATION_REQUESTED: 'clock',
  CANCELLATION_RESOLVED: 'check',
  CHAT_MESSAGE: 'chat',
  CHAT_ACCESS: 'chat',
  RIDER_APPROVAL: 'bike',
  PAYMENT_CONFIRMED: 'wallet',
  SYSTEM: 'bell',
});

export const notificationListPath = (role) => `/${String(role || 'customer').toLowerCase()}/notifications`;

export const notificationPopupPath = (notification, role) => {
  if (notification?.type === 'RIDE_REQUEST') return '/rider/requests';
  if (notification?.type === 'CHAT_MESSAGE' && notification.link) return notification.link;
  return notificationListPath(role);
};

export const relativeNotificationTime = (value, now = Date.now()) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};
