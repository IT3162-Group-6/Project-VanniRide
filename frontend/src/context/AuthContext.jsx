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

  useEffect(() => {
    let alive = true;
    authApi.me()
      .then((u) => alive && setUser(u))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: u } = await authApi.login(credentials);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const { user: u } = await authApi.register(payload);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback(async (patch) => {
    const u = await authApi.updateProfile(user.id, patch);
    setUser(u);
    return u;
  }, [user]);

  const value = { user, loading, login, register, logout, updateUser, refresh: () => authApi.me().then(setUser) };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
