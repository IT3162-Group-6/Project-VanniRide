export const NAV_BY_ROLE = {
  customer: [
    { to: '/customer/dashboard', icon: 'grid', label: 'Dashboard' },
    { to: '/customer/request?type=ride', icon: 'plus', label: 'Request a Ride', requestType: 'ride' },
    { to: '/customer/request?type=delivery', icon: 'package', label: 'Request a Delivery', requestType: 'delivery' },
    { to: '/customer/active', icon: 'route', label: 'Active Request' },
    { to: '/customer/chat', icon: 'chat', label: 'Messages' },
    { to: '/customer/history', icon: 'list', label: 'Request History' },
    { to: '/customer/profile', icon: 'user', label: 'Profile' },
  ],
  rider: [
    { to: '/rider/dashboard', icon: 'grid', label: 'Dashboard' },
    { to: '/rider/requests', icon: 'list', label: 'Available Requests' },
    { to: '/rider/active', icon: 'route', label: 'Active Request' },
    { to: '/rider/chat', icon: 'chat', label: 'Messages' },
    { to: '/rider/history', icon: 'clock', label: 'Request History' },
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
