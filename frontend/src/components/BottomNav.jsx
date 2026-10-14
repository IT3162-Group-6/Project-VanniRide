import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/authStore';

const LINKS = {
  customer: [
    { to: '/customer/dashboard', icon: 'home', label: 'Home' },
    { to: '/customer/request', icon: 'plus', label: 'Request' },
    { to: '/customer/chat', icon: 'chat', label: 'Chat' },
    { to: '/customer/settings', icon: 'settings', label: 'Settings' },
  ],
  rider: [
    { to: '/rider/dashboard', icon: 'home', label: 'Home' },
    { to: '/rider/requests', icon: 'list', label: 'Requests' },
    { to: '/rider/chat', icon: 'chat', label: 'Chat' },
    { to: '/rider/settings', icon: 'settings', label: 'Settings' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: 'home', label: 'Home' },
    { to: '/admin/rides', icon: 'car', label: 'Rides' },
    { to: '/admin/users', icon: 'user', label: 'Users' },
    { to: '/admin/settings', icon: 'settings', label: 'Settings' },
  ],
};

export default function BottomNav() {
  const { user } = useAuth();
  const links = LINKS[user?.role] || [];
  return (
    <nav className="bottom-nav">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={l.icon} />
          <span>{l.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
