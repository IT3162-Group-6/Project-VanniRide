import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppStateProvider } from './context/AppState';
import { RealtimeProvider } from './context/RealtimeContext';

import MarketingLayout from './components/MarketingLayout';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Toast from './components/Toast';
import NetworkStatus from './components/NetworkStatus';
import NotificationPopups from './components/NotificationPopups';
import RatingPrompt from './components/RatingPrompt';
const Notifications = lazy(() => import('./pages/Notifications'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Settings = lazy(() => import('./pages/Settings'));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const RequestRide = lazy(() => import('./pages/customer/RequestRide'));
const CustomerActiveRide = lazy(() => import('./pages/customer/ActiveRide'));
const CustomerChat = lazy(() => import('./pages/customer/Chat'));
const CustomerHistory = lazy(() => import('./pages/customer/RideHistory'));
const CustomerProfile = lazy(() => import('./pages/customer/Profile'));
const RiderDashboard = lazy(() => import('./pages/rider/RiderDashboard'));
const AvailableRequests = lazy(() => import('./pages/rider/AvailableRequests'));
const RequestDetails = lazy(() => import('./pages/rider/RequestDetails'));
const RiderActiveRide = lazy(() => import('./pages/rider/ActiveRide'));
const RiderChat = lazy(() => import('./pages/rider/Chat'));
const RiderHistory = lazy(() => import('./pages/rider/RideHistory'));
const RiderProfile = lazy(() => import('./pages/rider/Profile'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Users = lazy(() => import('./pages/admin/Users'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const Riders = lazy(() => import('./pages/admin/Riders'));
const Rides = lazy(() => import('./pages/admin/Rides'));
const RideDetails = lazy(() => import('./pages/admin/RideDetails'));
const AdminProfile = lazy(() => import('./pages/admin/Profile'));

export default function App() {
  return (
    <AppStateProvider>
      <AuthProvider>
        <RealtimeProvider>
          <BrowserRouter>
            <NetworkStatus />
            <NotificationPopups />
            <RatingPrompt />
            <Suspense fallback={<p className="muted page-loading">Loading page…</p>}>
            <Routes>
            {/* ---------- public ---------- */}
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
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
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
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
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </RealtimeProvider>
      </AuthProvider>
      <Toast />
    </AppStateProvider>
  );
}
