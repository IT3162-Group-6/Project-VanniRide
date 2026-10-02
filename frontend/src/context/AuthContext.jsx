import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const HOME_BY_ROLE = {
  customer: '/customer/dashboard',
  rider: '/rider/dashboard',
  admin: '/admin/dashboard',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let alive = true;
    authApi.me()
      .then((u) => alive && setUser(u))
      .catch((error) => alive && setAuthError(error.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
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

  const value = {
    user,
    loading,
    authError,
    login,
    register,
    logout,
    updateUser,
    refresh,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
