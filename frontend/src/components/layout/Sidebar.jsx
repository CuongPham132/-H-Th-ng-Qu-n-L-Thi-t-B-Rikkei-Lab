import React from 'react';
import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import { ROLES } from '../../utils/constants.js';
import Icon from '../common/Icon.jsx';

export function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">RL</div>
        <div className="logo-text">
          <span className="logo-title">RIKKEI LAB</span>
          <span className="logo-subtitle">Equipment System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          <span className="nav-group-title">Điều hướng chung</span>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon"><Icon name="home" size={18} /></span>
            <span className="nav-label">Trang chủ</span>
          </NavLink>
        </div>

        {/* Phân hệ dành riêng cho Borrower */}
        {role === ROLES.BORROWER && (
          <div className="nav-group">
            <span className="nav-group-title">Phân hệ Người mượn</span>
            <NavLink
              to="/borrower"
              end
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name="dashboard" size={18} /></span>
              <span className="nav-label">Bảng điều khiển</span>
            </NavLink>
            <NavLink
              to="/borrower/equipments"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name="equipment" size={18} /></span>
              <span className="nav-label">Danh mục thiết bị</span>
            </NavLink>
            <NavLink
              to="/borrower/borrowings/create"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name="plus" size={18} /></span>
              <span className="nav-label">Tạo yêu cầu mượn</span>
            </NavLink>
            <NavLink
              to="/borrower/borrowings"
              end
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name="clipboard" size={18} /></span>
              <span className="nav-label">Lịch sử phiếu mượn</span>
            </NavLink>
          </div>
        )}

        {/* Phân hệ dành cho Staff & Admin */}
        {(role === ROLES.STAFF || role === ROLES.ADMIN) && (
          <div className="nav-group">
            <span className="nav-group-title">Quản lý Kho & Mượn trả</span>
            <NavLink
              to="/staff"
              end
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name="dashboard" size={18} /></span>
              <span className="nav-label">Bảng điều khiển Staff</span>
            </NavLink>
            <NavLink
              to="/staff/borrowings"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name="clipboard" size={18} /></span>
              <span className="nav-label">Quản lý mượn trả</span>
            </NavLink>
          </div>
        )}

        {/* Phân hệ dành riêng cho Admin */}
        {role === ROLES.ADMIN && (
          <div className="nav-group">
            <span className="nav-group-title">Quản trị hệ thống</span>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name="shield" size={18} /></span>
              <span className="nav-label">Bảng điều khiển Admin</span>
            </NavLink>
            <NavLink
              to="/admin/equipments"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name="equipment" size={18} /></span>
              <span className="nav-label">Quản lý thiết bị</span>
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><Icon name="users" size={18} /></span>
              <span className="nav-label">Quản lý người dùng</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <span className="version-label">Rikkei Lab v1.0.0</span>
        <span className="status-indicator">
          <span className="status-dot"></span> Đã kết nối Backend
        </span>
      </div>
    </aside>
  );
}

export default Sidebar;
