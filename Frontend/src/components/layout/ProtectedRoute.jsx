import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

export default function ProtectedRoute({ allowedRoles, isStaffRequired }) {
  const { isAuthenticated, currentUser } = useStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isStaffOrAdmin = currentUser?.is_staff || currentUser?.role === 'admin';

  if (isStaffRequired && !isStaffOrAdmin) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser?.role)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  if (currentUser?.needsOnboarding && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}
