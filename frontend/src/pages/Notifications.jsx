import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAppState } from '../context/appStateStore';
import { useAuth } from '../context/authStore';
import {
  NOTIFICATIONS_CHANGED_EVENT,
  notificationsApi,
} from '../services/api';

const ICON_BY_TYPE = {
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
};

const relativeTime = (value) => {
  const milliseconds = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useAppState();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState({
    title: '',
    message: '',
    audience: 'CUSTOMER,RIDER',
  });

  const load = async () => {
    setError('');
    try {
      const result = await notificationsApi.list();
      setItems(result.notifications);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const receiveNotification = (event) => {
      const notification = event.detail;
      if (!notification?.id) return;
      setItems((current) => current.some((item) => item.id === notification.id)
        ? current
        : [notification, ...current]);
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, receiveNotification);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, receiveNotification);
    };
  }, []);

  const visibleItems = useMemo(
    () => filter === 'unread' ? items.filter((item) => !item.isRead) : items,
    [filter, items]
  );
  const unreadCount = items.filter((item) => !item.isRead).length;

  const announceChange = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));

  const openNotification = async (notification) => {
    if (!notification.isRead) {
      try {
        const updated = await notificationsApi.markRead(notification.id);
        setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
        announceChange();
      } catch (requestError) {
        setError(requestError.message);
        return;
      }
    }
    if (notification.link) navigate(notification.link);
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || readAt })));
      announceChange();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const sendAnnouncement = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const result = await notificationsApi.broadcast({
        title: announcement.title,
        message: announcement.message,
        roles: announcement.audience.split(','),
      });
      setAnnouncement((current) => ({ ...current, title: '', message: '' }));
      showToast(`Announcement sent to ${result.recipientCount} users.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="notifications-page">
      {user.role === 'admin' && (
        <form className="card notification-broadcast" onSubmit={sendAnnouncement}>
          <div className="card-head"><h3>Send app update</h3></div>
          <div className="field">
            <label>Audience</label>
            <select value={announcement.audience} onChange={(event) => setAnnouncement((current) => ({ ...current, audience: event.target.value }))}>
              <option value="CUSTOMER,RIDER">Customers and riders</option>
              <option value="CUSTOMER">Customers only</option>
              <option value="RIDER">Riders only</option>
              <option value="CUSTOMER,RIDER,ADMIN">Everyone</option>
            </select>
          </div>
          <div className="field"><label>Title</label><input maxLength={120} required value={announcement.title} onChange={(event) => setAnnouncement((current) => ({ ...current, title: event.target.value }))} /></div>
          <div className="field"><label>Message</label><textarea maxLength={500} required value={announcement.message} onChange={(event) => setAnnouncement((current) => ({ ...current, message: event.target.value }))} /></div>
          <button className="btn btn-primary" type="submit">Send notification</button>
        </form>
      )}

      <div className="card notification-card">
        <div className="notification-toolbar">
          <div className="notification-filters" role="tablist" aria-label="Notification filter">
            <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Unread {unreadCount > 0 && `(${unreadCount})`}</button>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead} disabled={unreadCount === 0}>Mark all as read</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {busy && <p className="muted">Loading notifications…</p>}
        {!busy && visibleItems.length === 0 && (
          <div className="empty notification-empty">
            <div className="fi"><Icon name="bell" /></div>
            <b>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</b>
            <p>Ride, delivery, chat and app updates will appear here.</p>
          </div>
        )}
        <div className="notification-list">
          {visibleItems.map((notification) => (
            <button
              type="button"
              key={notification.id}
              className={`notification-item ${notification.isRead ? '' : 'unread'}`}
              onClick={() => void openNotification(notification)}
            >
              <span className="notification-icon"><Icon name={ICON_BY_TYPE[notification.type] || 'bell'} /></span>
              <span className="notification-copy">
                <b>{notification.title}</b>
                <span>{notification.message}</span>
                <small>{relativeTime(notification.createdAt)}</small>
              </span>
              {!notification.isRead && <span className="notification-dot" aria-label="Unread" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
