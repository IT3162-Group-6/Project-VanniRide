import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';

const LINKS = {
  customer: [
    { to: '/customer/dashboard', icon: 'home', label: 'Home' },
    { to: '/customer/request', icon: 'plus', label: 'Request' },
    { to: '/customer/chat', icon: 'chat', label: 'Chat' },
    { to: '/customer/profile', icon: 'user', label: 'Profile' },
  ],
  rider: [
    { to: '/rider/dashboard', icon: 'home', label: 'Home' },
    { to: '/rider/requests', icon: 'list', label: 'Requests' },
    { to: '/rider/chat', icon: 'chat', label: 'Chat' },
    { to: '/rider/profile', icon: 'user', label: 'Profile' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: 'home', label: 'Home' },
    { to: '/admin/rides', icon: 'car', label: 'Rides' },
    { to: '/admin/users', icon: 'user', label: 'Users' },
    { to: '/admin/profile', icon: 'settings', label: 'Profile' },
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
