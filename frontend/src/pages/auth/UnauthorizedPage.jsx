import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';

export function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card">
        <div className="unauthorized-icon">🚫</div>
        <h2 className="unauthorized-title">403 - Quyền Truy Cập Bị Giới Hạn</h2>
        <p className="unauthorized-desc">
          Tài khoản <strong>{user?.email || 'người dùng'}</strong> với vai trò{' '}
          <span className="role-highlight">{user?.role || 'Chưa xác định'}</span> không có thẩm quyền truy cập vào đường dẫn hoặc tài nguyên được yêu cầu.
        </p>
        <p className="unauthorized-sub">
          Nếu bạn cần quyền hạn cao hơn (như Nhân viên Lab hoặc Quản trị viên), vui lòng liên hệ Quản trị viên hệ thống Rikkei Lab để được nâng cấp vai trò.
        </p>

        <div className="unauthorized-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/')}
          >
            Quay Về Trang Chủ
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleLogout}
          >
            Đăng Xuất Tài Khoản
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
