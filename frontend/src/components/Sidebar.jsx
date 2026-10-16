import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { HOME_BY_ROLE, useAuth } from '../context/authStore';
import { useAppState } from '../context/appStateStore';
import { NAV_BY_ROLE } from '../data/navigation';

const ROLE_LABEL = { customer: 'Customer', rider: 'Rider', admin: 'Admin' };

export default function Sidebar({ open, collapsed, onNavigate }) {
  const navigate = useNavigate();
  const { showToast } = useAppState();
  const { pathname, search } = useLocation();
  const { user, logout, switchRole } = useAuth();
  const [switching, setSwitching] = useState(false);
  const links = NAV_BY_ROLE[user?.role] || [];
  const selectedRequestType = new URLSearchParams(search).get('type') || 'ride';
  const accountRoles = user?.roles || [user?.role];
  const canSwitchPanels = accountRoles.includes('customer') && accountRoles.includes('rider');
  const otherRole = user?.role === 'customer' ? 'rider' : 'customer';

  const handleRoleSwitch = async () => {
    setSwitching(true);
    try {
      await switchRole(otherRole);
      onNavigate?.();
      navigate(HOME_BY_ROLE[otherRole], { replace: true });
      showToast(`Switched to ${ROLE_LABEL[otherRole]} panel`);
    } catch (error) {
      showToast(error.message);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <Link className="sidebar-brand" to={HOME_BY_ROLE[user?.role] || '/'} onClick={onNavigate} aria-label="Go to dashboard">
        <span className="brand-mark brand-mark-dark"><Icon name="pin" size={20} /></span>
        <span className="sidebar-brand-text">Vanni <b>Ride</b></span>
      </Link>
      <div className="sidebar-role">{ROLE_LABEL[user?.role] || 'Guest'} panel</div>
      {canSwitchPanels && (
        <button type="button" className="sidebar-role-switch" onClick={handleRoleSwitch} disabled={switching}>
          <Icon name="swap" size={18} />
          <span className="sidebar-label">{switching ? 'Switching…' : `Switch to ${ROLE_LABEL[otherRole]}`}</span>
        </button>
      )}

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
