import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppStateProvider } from './context/AppState';

import MarketingLayout from './components/MarketingLayout';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Toast from './components/Toast';
import InstallPrompt from './components/InstallPrompt';

// public
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// customer
import CustomerDashboard from './pages/customer/CustomerDashboard';
import RequestRide from './pages/customer/RequestRide';
import CustomerActiveRide from './pages/customer/ActiveRide';
import CustomerChat from './pages/customer/Chat';
import CustomerHistory from './pages/customer/RideHistory';
import CustomerProfile from './pages/customer/Profile';

// rider
import RiderDashboard from './pages/rider/RiderDashboard';
import AvailableRequests from './pages/rider/AvailableRequests';
import RequestDetails from './pages/rider/RequestDetails';
import RiderActiveRide from './pages/rider/ActiveRide';
import RiderChat from './pages/rider/Chat';
import RiderHistory from './pages/rider/RideHistory';
import RiderProfile from './pages/rider/Profile';

// admin
import AdminDashboard from './pages/admin/AdminDashboard';
import Users from './pages/admin/Users';
import Customers from './pages/admin/Customers';
import Riders from './pages/admin/Riders';
import Rides from './pages/admin/Rides';
import RideDetails from './pages/admin/RideDetails';
import AdminProfile from './pages/admin/Profile';

export default function App() {
  return (
    <AppStateProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ---------- public ---------- */}
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* ---------- customer ---------- */}
            <Route
              path="/customer"
              element={<ProtectedRoute roles={['customer']}><AppLayout /></ProtectedRoute>}
            >
              <Route index element={<Navigate to="/customer/dashboard" replace />} />
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="request" element={<RequestRide />} />
              <Route path="active" element={<CustomerActiveRide />} />
              <Route path="chat" element={<CustomerChat />} />
              <Route path="history" element={<CustomerHistory />} />
              <Route path="profile" element={<CustomerProfile />} />
            </Route>

            {/* ---------- rider ---------- */}
            <Route
              path="/rider"
              element={<ProtectedRoute roles={['rider']}><AppLayout /></ProtectedRoute>}
            >
              <Route index element={<Navigate to="/rider/dashboard" replace />} />
              <Route path="dashboard" element={<RiderDashboard />} />
              <Route path="requests" element={<AvailableRequests />} />
              <Route path="requests/:id" element={<RequestDetails />} />
              <Route path="active" element={<RiderActiveRide />} />
              <Route path="chat" element={<RiderChat />} />
              <Route path="history" element={<RiderHistory />} />
              <Route path="profile" element={<RiderProfile />} />
            </Route>

            {/* ---------- admin ---------- */}
            <Route
              path="/admin"
              element={<ProtectedRoute roles={['admin']}><AppLayout /></ProtectedRoute>}
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="customers" element={<Customers />} />
              <Route path="riders" element={<Riders />} />
              <Route path="rides" element={<Rides />} />
              <Route path="rides/:id" element={<RideDetails />} />
              <Route path="profile" element={<AdminProfile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toast />
      <InstallPrompt />
    </AppStateProvider>
  );
}
