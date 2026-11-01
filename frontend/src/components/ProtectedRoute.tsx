import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

const ROLE_HIERARCHY: Record<string, number> = {
  student: 0,
  trainer: 1, // Tutor
  po: 2,      // Placement & Training Officer
  admin: 3
};

interface Props {
  allowedRoles?: Role[];
}

/**
 * Route protection wrapper.
 * Challenge 264: Role-aware routing prevents unauthorized access.
 * Challenge 265: Direct URL access without auth redirects to login with return path state.
 */
export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} role="status">
        <p>Loading...</p>
      </div>
    );
  }

  // Challenge 265: Prevent access via direct URL if unauthenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Challenge 264: Role-aware routing with hierarchical access
  if (allowedRoles) {
    const userRole = (user.role || '').toLowerCase();
    const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
    const canAccess = allowedRoles.some(role => userLevel >= (ROLE_HIERARCHY[role.toLowerCase()] ?? 99));

    if (!canAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}