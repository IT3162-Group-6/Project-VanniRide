import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authStore';
import {
  NOTIFICATIONS_CHANGED_EVENT,
  notificationsApi,
} from '../services/api';
import {
  ICON_BY_NOTIFICATION_TYPE,
  notificationPopupPath,
} from '../utils/notifications';
import {
  playNotificationFeedback,
  readNotificationPreferences,
  shouldShowNotificationPopup,
} from '../utils/notificationPreferences';
import Icon from './Icon';

const DISPLAY_DURATION_MS = 7000;

export default function NotificationPopups() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const timers = useRef(new Map());

  const dismiss = (notificationId) => {
    window.clearTimeout(timers.current.get(notificationId));
    timers.current.delete(notificationId);
    setItems((current) => current.filter((item) => item.id !== notificationId));
  };

  useEffect(() => {
    const activeTimers = timers.current;
    const receiveNotification = (event) => {
      const notification = event.detail;
      if (!notification?.id) return;
      const preferences = readNotificationPreferences(user?.id);
      if (!shouldShowNotificationPopup(notification, preferences)) return;

      setItems((current) => [
        notification,
        ...current.filter((item) => item.id !== notification.id),
      ].slice(0, 3));
      window.clearTimeout(activeTimers.get(notification.id));
      activeTimers.set(notification.id, window.setTimeout(
        () => dismiss(notification.id),
        DISPLAY_DURATION_MS
      ));
      playNotificationFeedback(preferences);
    };

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, receiveNotification);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, receiveNotification);
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, [user?.id]);

  if (!user || items.length === 0) return null;

  const openNotification = (notification) => {
    dismiss(notification.id);
    if (!notification.isRead) {
      void notificationsApi.markRead(notification.id)
        .then(() => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT)))
        .catch(() => {});
    }
    navigate(notificationPopupPath(notification, user.role));
  };

  return (
    <section className="notification-popup-stack" aria-label="New notifications" aria-live="polite">
      {items.map((notification) => (
        <article className="notification-popup" key={notification.id}>
          <button className="notification-popup-main" onClick={() => openNotification(notification)}>
            <span className="notification-popup-icon">
              <Icon name={ICON_BY_NOTIFICATION_TYPE[notification.type] || 'bell'} size={19} />
            </span>
            <span className="notification-popup-copy">
              <b>{notification.title}</b>
              <span>{notification.message}</span>
            </span>
          </button>
          <button
            className="notification-popup-close"
            aria-label="Dismiss notification"
            onClick={() => dismiss(notification.id)}
          >
            <Icon name="close" size={15} />
          </button>
        </article>
      ))}
    </section>
  );
}
