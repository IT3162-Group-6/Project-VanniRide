import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, HOME_BY_ROLE } from '../context/AuthContext';

/**
 * Guards a route subtree.
 *   <ProtectedRoute roles={['admin']}> ... </ProtectedRoute>
 * - not logged in  -> /login (remembers where they wanted to go)
 * - wrong role     -> their own dashboard
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="route-loading">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={HOME_BY_ROLE[user.role] || '/'} replace />;
  }
  return children;
}
