import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

const TITLES = {
  '/customer/dashboard': 'Dashboard',
  '/customer/request': 'Request a Ride',
  '/customer/active': 'Active Ride',
  '/customer/chat': 'Messages',
  '/customer/history': 'Ride History',
  '/customer/profile': 'Profile',
  '/rider/dashboard': 'Rider Dashboard',
  '/rider/requests': 'Available Requests',
  '/rider/active': 'Active Ride',
  '/rider/chat': 'Messages',
  '/rider/history': 'Ride History',
  '/rider/profile': 'Profile',
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/users': 'All Users',
  '/admin/customers': 'Customers',
  '/admin/riders': 'Riders',
  '/admin/rides': 'Rides',
  '/admin/profile': 'Profile',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const title = TITLES[pathname] || (pathname.startsWith('/rider/requests/') ? 'Request Details'
    : pathname.startsWith('/admin/rides/') ? 'Ride Details' : 'Vanni Ride');

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
      <div className="app-main">
        <Navbar variant="app" title={title} onMenu={() => setSidebarOpen((v) => !v)} />
        <section className="app-content">
          <Outlet />
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
