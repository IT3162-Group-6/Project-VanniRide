import { useEffect, useState, useCallback } from 'react';
import { AUTH_EXPIRED_EVENT, authApi, riderApi } from '../services/api';
import { AuthContext } from './authStore';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let alive = true;
    const handleExpiredSession = () => {
      if (!alive) return;
      setUser(null);
      setAuthError('Your session has ended. Please sign in again.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
    authApi.me()
      .then((u) => alive && setUser(u))
      .catch((error) => alive && setAuthError(error.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: u } = await authApi.login(credentials);
    setAuthError(null);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const { user: u } = await authApi.register(payload);
    setAuthError(null);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthError(null);
    void authApi.logout();
  }, []);

  const updateUser = useCallback(async (patch) => {
    const u = await authApi.updateProfile(user.id, patch);
    const updated = { ...user, ...u, riderProfile: user.riderProfile };
    setUser(updated);
    return updated;
  }, [user]);

  const refresh = useCallback(async () => {
    const refreshed = await authApi.me();
    setUser(refreshed);
    return refreshed;
  }, []);

  const setRiderAvailability = useCallback(async (available) => {
    const riderProfile = await riderApi.setAvailability(available);
    const updated = { ...user, riderProfile, online: riderProfile.availabilityStatus === 'available' };
    setUser(updated);
    return updated;
  }, [user]);

  const updateRiderVehicle = useCallback(async (vehicle) => {
    const result = await riderApi.updateVehicle(vehicle);
    const updated = {
      ...user,
      riderProfile: result.riderProfile,
      vehicle: `${result.riderProfile.vehicle.model} · ${result.riderProfile.vehicle.registrationNumber}`,
      online: false,
    };
    setUser(updated);
    return { ...result, user: updated };
  }, [user]);

  const switchRole = useCallback(async (role) => {
    const switched = await authApi.switchRole(role);
    setUser(switched);
    return switched;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const message = await authApi.changePassword(currentPassword, newPassword);
    setUser(null);
    setAuthError(null);
    return message;
  }, []);

  const updateRecoverySettings = useCallback(async (payload) => {
    const updated = await authApi.updateRecoverySettings(payload);
    setUser((current) => ({ ...current, ...updated, riderProfile: current.riderProfile }));
    return updated;
  }, []);

  const addRole = useCallback(async (role, vehicle) => {
    const result = await authApi.addRole(role, vehicle);
    setUser((current) => ({
      ...current,
      ...result.user,
      riderProfile: result.riderProfile || current.riderProfile,
    }));
    return result;
  }, []);

  const value = {
    user,
    loading,
    authError,
    login,
    register,
    logout,
    updateUser,
    setRiderAvailability,
    updateRiderVehicle,
    switchRole,
    changePassword,
    updateRecoverySettings,
    addRole,
    refresh,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
