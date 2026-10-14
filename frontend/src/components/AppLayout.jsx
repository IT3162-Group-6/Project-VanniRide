import { useState, useCallback, useEffect } from 'react';
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

const STORAGE_KEY = 'vanniride_sidebar_collapsed';

/** Read the collapsed preference from localStorage safely. */
function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Persist the collapsed preference to localStorage safely. */
function writeCollapsed(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — silently ignore
  }
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { pathname } = useLocation();
  const title = TITLES[pathname] || (pathname.startsWith('/rider/requests/') ? 'Request Details'
    : pathname.startsWith('/admin/rides/') ? 'Ride Details' : 'Vanni Ride');

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  }, []);

  // Desktop: the menu button collapses/expands the sidebar.
  // Mobile (<=640px): it opens/closes the slide-in drawer.
  const handleMenu = useCallback(() => {
    if (window.matchMedia('(max-width: 640px)').matches) {
      setSidebarOpen((v) => !v);
    } else {
      handleToggleCollapse();
    }
  }, [handleToggleCollapse]);

  // close the mobile drawer when the route changes or Escape is pressed
  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setSidebarOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}
      <div className="app-main">
        <Navbar variant="app" title={title} onMenu={handleMenu} />
        <section className="app-content">
          <Outlet />
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
