import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import UnauthorizedPage from '../pages/auth/UnauthorizedPage.jsx';

// Common Pages
import HomePage from '../pages/HomePage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

// Borrower Pages
import BorrowerDashboardPage from '../pages/BorrowerDashboardPage.jsx';
import EquipmentListPage from '../pages/EquipmentListPage.jsx';
import EquipmentDetailPage from '../pages/EquipmentDetailPage.jsx';
import CreateBorrowingPage from '../pages/CreateBorrowingPage.jsx';
import BorrowingListPage from '../pages/BorrowingListPage.jsx';
import BorrowingDetailPage from '../pages/BorrowingDetailPage.jsx';

// Staff Pages
import StaffDashboardPage from '../pages/StaffDashboardPage.jsx';
import StaffBorrowingListPage from '../pages/StaffBorrowingListPage.jsx';
import StaffBorrowingDetailPage from '../pages/StaffBorrowingDetailPage.jsx';

// Admin Pages
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx';
import AdminEquipmentListPage from '../pages/AdminEquipmentListPage.jsx';
import AdminEquipmentFormPage from '../pages/AdminEquipmentFormPage.jsx';
import AdminUserListPage from '../pages/AdminUserListPage.jsx';

// Constants
import { ROLES } from '../utils/constants.js';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes (Wrapped in MainLayout) */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Home Overview: accessible by all authenticated roles */}
        <Route path="/" element={<HomePage />} />

        {/* Borrower Module Routes */}
        <Route
          path="/borrower"
          element={
            <RoleRoute allowedRoles={[ROLES.BORROWER]}>
              <BorrowerDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/borrower/equipments"
          element={
            <RoleRoute allowedRoles={[ROLES.BORROWER]}>
              <EquipmentListPage />
            </RoleRoute>
          }
        />
        <Route
          path="/borrower/equipments/:id"
          element={
            <RoleRoute allowedRoles={[ROLES.BORROWER]}>
              <EquipmentDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="/borrower/borrowings"
          element={
            <RoleRoute allowedRoles={[ROLES.BORROWER]}>
              <BorrowingListPage />
            </RoleRoute>
          }
        />
        <Route
          path="/borrower/borrowings/create"
          element={
            <RoleRoute allowedRoles={[ROLES.BORROWER]}>
              <CreateBorrowingPage />
            </RoleRoute>
          }
        />
        <Route
          path="/borrower/borrowings/:id"
          element={
            <RoleRoute allowedRoles={[ROLES.BORROWER]}>
              <BorrowingDetailPage />
            </RoleRoute>
          }
        />

        {/* Staff Module Routes */}
        <Route
          path="/staff"
          element={
            <RoleRoute allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
              <StaffDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/staff/borrowings"
          element={
            <RoleRoute allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
              <StaffBorrowingListPage />
            </RoleRoute>
          }
        />
        <Route
          path="/staff/borrowings/:id"
          element={
            <RoleRoute allowedRoles={[ROLES.STAFF, ROLES.ADMIN]}>
              <StaffBorrowingDetailPage />
            </RoleRoute>
          }
        />

        {/* Admin Module Routes */}
        <Route
          path="/admin"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/equipments"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminEquipmentListPage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/equipments/new"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminEquipmentFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/equipments/:id/edit"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminEquipmentFormPage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminUserListPage />
            </RoleRoute>
          }
        />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
