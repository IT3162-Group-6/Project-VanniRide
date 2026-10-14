import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/authStore';
import { NAV_BY_ROLE } from '../data/navigation';

const ROLE_LABEL = { customer: 'Customer', rider: 'Rider', admin: 'Admin' };

export default function Sidebar({ open, collapsed, onNavigate }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { user, logout } = useAuth();
  const links = NAV_BY_ROLE[user?.role] || [];
  const selectedRequestType = new URLSearchParams(search).get('type') || 'ride';

  return (
    <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark brand-mark-dark"><Icon name="pin" size={20} /></span>
        <span className="sidebar-brand-text">Vanni <b>Ride</b></span>
      </div>
      <div className="sidebar-role">{ROLE_LABEL[user?.role] || 'Guest'} panel</div>

      <nav className="sidebar-nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={onNavigate}
            className={({ isActive }) => {
              if (l.requestType) {
                return pathname === '/customer/request' && selectedRequestType === l.requestType ? 'active' : '';
              }
              return isActive ? 'active' : '';
            }}
            aria-label={l.label}
            title={collapsed ? l.label : undefined}
          >
            <Icon name={l.icon} /> <span className="sidebar-label">{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        className="sidebar-logout"
        aria-label="Logout"
        title={collapsed ? 'Logout' : undefined}
        onClick={() => { onNavigate?.(); logout(); navigate('/login', { replace: true }); }}
      >
        <Icon name="logout" /> <span className="sidebar-label">Logout</span>
      </button>
    </aside>
  );
}
