import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export const HOME_BY_ROLE = {
  customer: '/customer/dashboard',
  rider: '/rider/dashboard',
  admin: '/admin/dashboard',
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
