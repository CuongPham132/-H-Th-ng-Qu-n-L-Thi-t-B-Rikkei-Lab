import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Loading from '../components/common/Loading.jsx';

/**
 * RoleRoute
 * Restricts access to routes based on user role (BORROWER, STAFF, ADMIN).
 * - If not logged in -> redirect /login
 * - If logged in but role not allowed -> redirect /unauthorized
 */
export function RoleRoute({ allowedRoles = [], children }) {
  const { user, isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <Loading fullScreen text="Đang kiểm tra quyền truy cập..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
}

export default RoleRoute;
