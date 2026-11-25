import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Loading from '../components/common/Loading.jsx';

/**
 * ProtectedRoute
 * Protects routes requiring valid authentication.
 * Redirects unauthenticated users to /login preserving the target location.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <Loading fullScreen text="Đang xác minh phiên đăng nhập..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
