import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'initialising') {
    return <LoadingState label="Restoring session..." />;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
