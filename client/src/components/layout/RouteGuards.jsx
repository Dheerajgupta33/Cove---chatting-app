import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Splash from '../common/Splash';

// Requires a session. Unauthenticated visitors are sent to /login and returned afterwards.
export function ProtectedRoute() {
  const status = useSelector((s) => s.auth.status);
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Login / register pages: signed-in users skip straight to the app.
export function GuestRoute() {
  const status = useSelector((s) => s.auth.status);
  if (status === 'loading') return <Splash />;
  if (status === 'authenticated') return <Navigate to="/app/chat" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const role = useSelector((s) => s.auth.user?.role);
  return role === 'admin' ? <Outlet /> : <Navigate to="/app/chat" replace />;
}
