import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { notificationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const POLL_MS = 30000;

function timeAgo(date) {
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(date).toLocaleDateString();
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const wrapRef = useRef(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await notificationsApi.list({ limit: 20 });
      setItems(data.notifications);
      setUnread(data.unreadCount);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not load notifications');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // initial load + polling (paused while the tab is hidden)
  useEffect(() => {
    if (!user) return undefined;
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [user, load]);

  // refresh whenever the dropdown opens
  useEffect(() => {
    if (open) load(true);
  }, [open, load]);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = async (n) => {
    if (!n.isRead) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      notificationsApi.markRead(n.id).catch(() => load());
    }
    if (n.relatedRide && user?.role === 'admin') {
      setOpen(false);
      navigate(`/admin/rides/${n.relatedRide}`);
    }
  };

  const markAll = async () => {
    setItems((list) => list.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      load();
    }
  };

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        className="icon-btn"
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" />
        {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            <button className="notif-link" onClick={markAll} disabled={unread === 0}>
              Mark all as read
            </button>
          </div>
          <div className="notif-list">
            {loading && items.length === 0 && <p className="notif-empty">Loading…</p>}
            {!loading && error && <p className="notif-empty">{error}</p>}
            {!loading && !error && items.length === 0 && (
              <p className="notif-empty">You're all caught up. No notifications yet.</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                className={`notif-item ${n.isRead ? '' : 'unread'}`}
                onClick={() => openItem(n)}
              >
                <span className="notif-dot" aria-hidden="true" />
                <span className="notif-body">
                  <span className="notif-title">{n.title}</span>
                  {n.message && <span className="notif-msg">{n.message}</span>}
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
