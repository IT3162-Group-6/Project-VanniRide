export const NOTIFICATION_PREFERENCES_EVENT = 'vanni-ride:notification-preferences-changed';

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  popupEnabled: true,
  rideRequests: true,
  chatMessages: true,
  rideStatus: true,
  sound: true,
  vibration: true,
});

export const CRITICAL_NOTIFICATION_TYPES = Object.freeze([
  'RIDE_CANCELLED',
  'CANCELLATION_REQUESTED',
  'CANCELLATION_RESOLVED',
  'CHAT_ACCESS',
  'RIDER_APPROVAL',
  'PAYMENT_CONFIRMED',
]);

const storageKey = (userId) => `vr_notification_preferences_${userId}`;

export const normalizeNotificationPreferences = (value = {}) =>
  Object.fromEntries(Object.entries(DEFAULT_NOTIFICATION_PREFERENCES).map(
    ([key, fallback]) => [key, typeof value[key] === 'boolean' ? value[key] : fallback]
  ));

export const readNotificationPreferences = (userId, storage = globalThis.localStorage) => {
  if (!userId || !storage) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  try {
    return normalizeNotificationPreferences(JSON.parse(storage.getItem(storageKey(userId)) || '{}'));
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
};

export const writeNotificationPreferences = (userId, preferences, storage = globalThis.localStorage) => {
  const normalized = normalizeNotificationPreferences(preferences);
  try {
    if (userId && storage) storage.setItem(storageKey(userId), JSON.stringify(normalized));
  } catch {
    // Preferences still apply for the current page when storage is unavailable.
  }
  return normalized;
};

export const isCriticalNotification = (type) => CRITICAL_NOTIFICATION_TYPES.includes(type);

export const shouldShowNotificationPopup = (notification, preferences) => {
  const normalized = normalizeNotificationPreferences(preferences);
  if (isCriticalNotification(notification?.type)) return true;
  if (!normalized.popupEnabled) return false;
  if (notification?.type === 'RIDE_REQUEST') return normalized.rideRequests;
  if (notification?.type === 'CHAT_MESSAGE') return normalized.chatMessages;
  if (['RIDE_ACCEPTED', 'RIDE_STATUS'].includes(notification?.type)) return normalized.rideStatus;
  return true;
};

export const playNotificationFeedback = (preferences) => {
  const normalized = normalizeNotificationPreferences(preferences);
  if (normalized.vibration && typeof globalThis.navigator?.vibrate === 'function') {
    globalThis.navigator.vibrate(120);
  }
  if (!normalized.sound) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 680;
    gain.gain.setValueAtTime(0.05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.16);
    oscillator.addEventListener('ended', () => void context.close(), { once: true });
  } catch {
    // Some browsers require a recent user gesture before playing a sound.
  }
};
