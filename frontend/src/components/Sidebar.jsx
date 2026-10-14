import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';

export const NAV_BY_ROLE = {
  customer: [
    { to: '/customer/dashboard', icon: 'grid', label: 'Dashboard' },
    { to: '/customer/request', icon: 'plus', label: 'Request a Ride' },
    { to: '/customer/active', icon: 'route', label: 'Active Ride' },
    { to: '/customer/chat', icon: 'chat', label: 'Messages' },
    { to: '/customer/history', icon: 'list', label: 'Ride History' },
    { to: '/customer/profile', icon: 'user', label: 'Profile' },
  ],
  rider: [
    { to: '/rider/dashboard', icon: 'grid', label: 'Dashboard' },
    { to: '/rider/requests', icon: 'list', label: 'Available Requests' },
    { to: '/rider/active', icon: 'route', label: 'Active Ride' },
    { to: '/rider/chat', icon: 'chat', label: 'Messages' },
    { to: '/rider/history', icon: 'clock', label: 'Ride History' },
    { to: '/rider/profile', icon: 'user', label: 'Profile' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: 'grid', label: 'Dashboard' },
    { to: '/admin/users', icon: 'user', label: 'All Users' },
    { to: '/admin/customers', icon: 'user', label: 'Customers' },
    { to: '/admin/riders', icon: 'bike', label: 'Riders' },
    { to: '/admin/rides', icon: 'car', label: 'Rides' },
    { to: '/admin/profile', icon: 'settings', label: 'Profile' },
  ],
};

const ROLE_LABEL = { customer: 'Customer', rider: 'Rider', admin: 'Admin' };

export default function Sidebar({ open, onNavigate, collapsed, onToggleCollapse }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const links = NAV_BY_ROLE[user?.role] || [];

  return (
    <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="brand-mark brand-mark-dark"><Icon name="pin" size={20} /></span>
          <span className="sidebar-brand-text"> Vanni <b>Ride</b></span>
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} />
        </button>
      </div>
      <div className="sidebar-role">{ROLE_LABEL[user?.role] || 'Guest'} panel</div>

      <nav className="sidebar-nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={onNavigate}
            className={({ isActive }) => (isActive ? 'active' : '')}
            title={collapsed ? l.label : undefined}
            aria-label={l.label}
          >
            <Icon name={l.icon} />
            <span className="sidebar-link-text">{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        className="sidebar-logout"
        onClick={() => { onNavigate?.(); logout(); navigate('/login', { replace: true }); }}
        title={collapsed ? 'Logout' : undefined}
        aria-label="Logout"
      >
        <Icon name="logout" />
        <span className="sidebar-link-text">Logout</span>
      </button>
    </aside>
  );
}
