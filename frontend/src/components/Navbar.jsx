import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth, HOME_BY_ROLE } from '../context/authStore';
import {
  NOTIFICATIONS_CHANGED_EVENT,
  NOTIFICATION_UPDATED_EVENT,
  notificationsApi,
} from '../services/api';
import {
  ICON_BY_NOTIFICATION_TYPE,
  notificationListPath,
  relativeNotificationTime,
} from '../utils/notifications';

/**
 * variant="public" — marketing header (Home / Login / Register)
 * variant="app"    — in-app topbar (menu button, page title, avatar)
 */
export default function Navbar({ variant = 'public', title = 'Vanni Ride', onMenu }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const notificationMenu = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (variant !== 'app' || !user) return undefined;
    let alive = true;
    const refreshCount = () => {
      notificationsApi.list(5)
        .then((result) => {
          if (!alive) return;
          setUnreadCount(result.unreadCount);
          setRecentNotifications(result.notifications);
        })
        .catch(() => {});
    };
    refreshCount();
    const timer = window.setInterval(refreshCount, 20_000);
    window.addEventListener('focus', refreshCount);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshCount);
    window.addEventListener(NOTIFICATION_UPDATED_EVENT, refreshCount);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshCount);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshCount);
      window.removeEventListener(NOTIFICATION_UPDATED_EVENT, refreshCount);
    };
  }, [user, variant]);

  useEffect(() => {
    if (!notificationOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationMenu.current?.contains(event.target)) setNotificationOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setNotificationOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [notificationOpen]);

  const toggleNotifications = () => {
    setNotificationOpen((current) => !current);
    void notificationsApi.list(5).then((result) => {
      setUnreadCount(result.unreadCount);
      setRecentNotifications(result.notifications);
    }).catch(() => {});
  };

  const openRecentNotification = async (notification) => {
    if (!notification.isRead) {
      try {
        const updated = await notificationsApi.markRead(notification.id);
        setRecentNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        // Navigation remains available if marking the notification fails.
      }
    }
    setNotificationOpen(false);
    navigate(notification.link || notificationListPath(user.role));
  };

  if (variant === 'app') {
    return (
      <header className="app-topbar">
        <button className="icon-btn" aria-label="Toggle navigation sidebar" title="Toggle navigation sidebar" onClick={onMenu}>
          <Icon name="menu" />
        </button>
        <h1>{title}</h1>
        <div className="app-topbar-actions">
          <div className="notification-menu" ref={notificationMenu}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Notifications"
              aria-haspopup="dialog"
              aria-expanded={notificationOpen}
              onClick={toggleNotifications}
            >
              <Icon name="bell" />
              {unreadCount > 0 && <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            {notificationOpen && (
              <section className="notification-dropdown" aria-label="Recent notifications">
                <div className="notification-dropdown-head">
                  <b>Notifications</b>
                  {unreadCount > 0 && <span>{unreadCount} unread</span>}
                </div>
                <div className="notification-dropdown-list">
                  {recentNotifications.length === 0 ? (
                    <p className="notification-dropdown-empty">No notifications yet.</p>
                  ) : recentNotifications.map((notification) => (
                    <button
                      type="button"
                      className={`notification-dropdown-item ${notification.isRead ? '' : 'unread'}`}
                      key={notification.id}
                      onClick={() => void openRecentNotification(notification)}
                    >
                      <span className="notification-dropdown-icon">
                        <Icon name={ICON_BY_NOTIFICATION_TYPE[notification.type] || 'bell'} size={17} />
                      </span>
                      <span>
                        <b>{notification.title}</b>
                        <small>{notification.message}</small>
                        <em>{relativeNotificationTime(notification.createdAt)}</em>
                      </span>
                    </button>
                  ))}
                </div>
                <Link
                  className="notification-dropdown-all"
                  to={notificationListPath(user.role)}
                  onClick={() => setNotificationOpen(false)}
                >
                  See all notifications
                </Link>
              </section>
            )}
          </div>
          <Link to={`/${user?.role}/profile`} className="avatar">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark"><Icon name="pin" size={20} /></span> Vanni <b>Ride</b>
        </Link>
        <nav className="topnav">
          <Link to="/">Home</Link>
          <a href="#how">How It Works</a>
          <a href="#services">Services</a>
          <a href="#safety">Safety</a>
          <a href="#about">About Us</a>
        </nav>
        <div className="topbar-actions">
          {user ? (
            <Link to={HOME_BY_ROLE[user.role]} className="btn btn-primary">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline-soft">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
        <button className="hamburger" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          <span></span><span></span><span></span>
        </button>
      </div>
      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        <Link className="mm-link" to="/" onClick={() => setOpen(false)}>Home</Link>
        <a className="mm-link" href="#how" onClick={() => setOpen(false)}>How It Works</a>
        <a className="mm-link" href="#services" onClick={() => setOpen(false)}>Services</a>
        <a className="mm-link" href="#safety" onClick={() => setOpen(false)}>Safety</a>
        <a className="mm-link" href="#about" onClick={() => setOpen(false)}>About Us</a>
        {user ? (
          <Link to={HOME_BY_ROLE[user.role]} className="btn btn-primary btn-block" onClick={() => setOpen(false)}>Dashboard</Link>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-block" onClick={() => setOpen(false)}>Log in</Link>
            <Link to="/register" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}
