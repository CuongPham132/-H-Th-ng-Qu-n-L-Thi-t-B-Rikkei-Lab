import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'badge badge-admin';
      case 'STAFF':
        return 'badge badge-staff';
      case 'BORROWER':
      default:
        return 'badge badge-borrower';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên (ADMIN)';
      case 'STAFF':
        return 'Nhân viên Lab (STAFF)';
      case 'BORROWER':
      default:
        return 'Người mượn (BORROWER)';
    }
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-dot"></span>
        <h1 className="header-title">Hệ Thống Quản Lý Thiết Bị Rikkei Lab</h1>
      </div>

      <div className="header-actions">
        {user && (
          <div className="user-profile-menu">
            <div className="user-info">
              <span className="user-name">{user.full_name}</span>
              <span className={getRoleBadgeClass(user.role)}>
                {getRoleLabel(user.role)}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline-sm btn-logout"
              onClick={handleLogout}
              title="Đăng xuất khỏi hệ thống"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
