import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const TITLES = {
  '/customer/dashboard': 'Dashboard',
  '/customer/request': 'Request a Ride',
  '/customer/active': 'Track Request',
  '/customer/chat': 'Messages',
  '/customer/history': 'Request History',
  '/customer/profile': 'Profile',
  '/customer/notifications': 'Notifications',
  '/customer/settings': 'Settings',
  '/rider/dashboard': 'Rider Dashboard',
  '/rider/requests': 'Available Requests',
  '/rider/active': 'Active Request',
  '/rider/chat': 'Messages',
  '/rider/history': 'Request History',
  '/rider/profile': 'Profile',
  '/rider/notifications': 'Notifications',
  '/rider/settings': 'Settings',
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/users': 'All Users',
  '/admin/customers': 'Customers',
  '/admin/riders': 'Riders',
  '/admin/rides': 'Rides',
  '/admin/profile': 'Profile',
  '/admin/notifications': 'Notifications',
  '/admin/settings': 'Settings',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname, search } = useLocation();
  const requestTitle =
    pathname === '/customer/request' && new URLSearchParams(search).get('type') === 'delivery'
      ? 'Request a Delivery'
      : null;
  const title = requestTitle || TITLES[pathname] || (pathname.startsWith('/rider/requests/') ? 'Request Details'
    : pathname.startsWith('/admin/rides/') ? 'Ride Details' : 'Vanni Ride');

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 640px)').matches) {
      setSidebarOpen((current) => !current);
      return;
    }
    setSidebarCollapsed((current) => !current);
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onNavigate={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
      <div className="app-main">
        <Navbar variant="app" title={title} onMenu={toggleSidebar} />
        <section className="app-content">
          <div className="app-content-inner">
            <Outlet />
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
