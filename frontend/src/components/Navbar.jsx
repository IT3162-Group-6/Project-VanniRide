import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { useAuth, HOME_BY_ROLE } from '../context/authStore';
import { NOTIFICATIONS_CHANGED_EVENT, notificationsApi } from '../services/api';

/**
 * variant="public" — marketing header (Home / Login / Register)
 * variant="app"    — in-app topbar (menu button, page title, avatar)
 */
export default function Navbar({ variant = 'public', title = 'Vanni Ride', onMenu }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (variant !== 'app' || !user) return undefined;
    let alive = true;
    const refreshCount = () => {
      notificationsApi.list(1)
        .then((result) => alive && setUnreadCount(result.unreadCount))
        .catch(() => {});
    };
    refreshCount();
    const timer = window.setInterval(refreshCount, 20_000);
    window.addEventListener('focus', refreshCount);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshCount);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshCount);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshCount);
    };
  }, [user, variant]);

  if (variant === 'app') {
    return (
      <header className="app-topbar">
        <button className="icon-btn" aria-label="Toggle navigation sidebar" title="Toggle navigation sidebar" onClick={onMenu}>
          <Icon name="menu" />
        </button>
        <h1>{title}</h1>
        <div className="app-topbar-actions">
          <Link to={`/${user?.role}/notifications`} className="icon-btn" aria-label="Notifications">
            <Icon name="bell" />
            {unreadCount > 0 && <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </Link>
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
