import React from 'react';
import useAuth from '../hooks/useAuth.js';
import { ROLES } from '../utils/constants.js';

export function HomePage() {
  const { user } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return <span className="badge badge-admin">Quản Trị Viên (ADMIN)</span>;
      case ROLES.STAFF:
        return <span className="badge badge-staff">Nhân Viên Lab (STAFF)</span>;
      case ROLES.BORROWER:
      default:
        return <span className="badge badge-borrower">Người Mượn (BORROWER)</span>;
    }
  };

  return (
    <div className="home-page">
      <div className="welcome-banner">
        <div className="welcome-text">
          <h2 className="welcome-title">Xin chào, {user?.full_name}!</h2>
          <p className="welcome-subtitle">
            Hệ thống Quản lý Mượn/Trả Thiết bị Rikkei Lab – Nền tảng Frontend Phase FE1
          </p>
        </div>
        <div className="welcome-badge">
          {getRoleBadge(user?.role)}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Card: Thông tin tài khoản xác thực */}
        <div className="card profile-card">
          <div className="card-header">
            <h3 className="card-title">👤 Thông Tin Tài Khoản Phiên Làm Việc</h3>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="info-label">ID Người dùng:</span>
              <span className="info-value font-mono">#{user?.id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Họ và tên:</span>
              <span className="info-value font-bold">{user?.full_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value font-mono">{user?.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Số điện thoại:</span>
              <span className="info-value">{user?.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Vai trò hệ thống:</span>
              <span className="info-value">{getRoleBadge(user?.role)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Trạng thái tài khoản:</span>
              <span className="info-value text-success">
                <span className="status-dot"></span> Đang hoạt động (Active)
              </span>
            </div>
          </div>
        </div>

        {/* Card: Tình trạng kết nối hệ thống */}
        <div className="card status-card">
          <div className="card-header">
            <h3 className="card-title">⚡ Trạng Thái Kiến Trúc Frontend FE1</h3>
          </div>
          <div className="card-body">
            <ul className="feature-checklist">
              <li className="check-item passed">
                <span className="check-icon">✓</span>
                <div className="check-content">
                  <strong>Axios Instance (api.js):</strong> Tự động đính kèm JWT qua Request Interceptor, xử lý 401 không gây logout khi 403.
                </div>
              </li>
              <li className="check-item passed">
                <span className="check-icon">✓</span>
                <div className="check-content">
                  <strong>AuthContext & useAuth:</strong> Quản lý phiên làm việc thực tế qua <code>GET /api/auth/me</code>, không tự gán role.
                </div>
              </li>
              <li className="check-item passed">
                <span className="check-icon">✓</span>
                <div className="check-content">
                  <strong>Route Guards (ProtectedRoute & RoleRoute):</strong> Bảo vệ truy cập theo 3 vai trò ADMIN, STAFF, BORROWER.
                </div>
              </li>
              <li className="check-item passed">
                <span className="check-icon">✓</span>
                <div className="check-content">
                  <strong>Khung Layout & CSS Thuần:</strong> Header, Sidebar, responsive desktop/tablet, giao diện xanh navy chuyên nghiệp.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Lộ trình tiếp theo */}
      <div className="card roadmap-card">
        <div className="card-header">
          <h3 className="card-title">📌 Kế hoạch Giai đoạn tiếp theo (Phase FE2)</h3>
        </div>
        <div className="card-body">
          <p className="text-muted">
            Nền tảng FE1 đã hoàn thành đầy đủ cơ chế xác thực, phân quyền và layout. Các màn hình nghiệp vụ chi tiết (danh mục thiết bị, tạo phiếu mượn, duyệt đơn, bàn giao, trả thiết bị) sẽ được triển khai ở Phase FE2 theo đúng phạm vi.
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
