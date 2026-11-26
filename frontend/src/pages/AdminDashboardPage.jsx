import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import userService from '../services/user.service.js';
import equipmentService from '../services/equipment.service.js';
import borrowingService from '../services/borrowing.service.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Icon from '../components/common/Icon.jsx';

export function AdminDashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    staffUsers: 0,
    borrowerUsers: 0,
    totalEquipments: 0,
    totalBorrowings: 0,
    pendingBorrowings: 0,
    approvedBorrowings: 0,
    borrowedBorrowings: 0,
    returnedBorrowings: 0,
  });

  const [recentBorrowings, setRecentBorrowings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      // Query real metrics from backend endpoints using pagination limit=1
      const [
        usersAll,
        usersAdmin,
        usersStaff,
        usersBorrower,
        equipmentsAll,
        borrowingsAll,
        borrowingsPending,
        borrowingsApproved,
        borrowingsBorrowed,
        borrowingsReturned,
        recentRes,
      ] = await Promise.all([
        userService.getUsers({ limit: 1 }),
        userService.getUsers({ role: 'ADMIN', limit: 1 }),
        userService.getUsers({ role: 'STAFF', limit: 1 }),
        userService.getUsers({ role: 'BORROWER', limit: 1 }),
        equipmentService.getEquipments({ limit: 1 }),
        borrowingService.getBorrowings({ limit: 1 }),
        borrowingService.getBorrowings({ status: 'PENDING', limit: 1 }),
        borrowingService.getBorrowings({ status: 'APPROVED', limit: 1 }),
        borrowingService.getBorrowings({ status: 'BORROWED', limit: 1 }),
        borrowingService.getBorrowings({ status: 'RETURNED', limit: 1 }),
        borrowingService.getBorrowings({ limit: 5 }),
      ]);

      setStats({
        totalUsers: usersAll.pagination.total || 0,
        adminUsers: usersAdmin.pagination.total || 0,
        staffUsers: usersStaff.pagination.total || 0,
        borrowerUsers: usersBorrower.pagination.total || 0,
        totalEquipments: equipmentsAll.pagination.total || 0,
        totalBorrowings: borrowingsAll.pagination.total || 0,
        pendingBorrowings: borrowingsPending.pagination.total || 0,
        approvedBorrowings: borrowingsApproved.pagination.total || 0,
        borrowedBorrowings: borrowingsBorrowed.pagination.total || 0,
        returnedBorrowings: borrowingsReturned.pagination.total || 0,
      });

      setRecentBorrowings(recentRes.borrowings || []);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải dữ liệu thống kê quản trị.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <Loading text="Đang tải dữ liệu Bảng điều khiển Quản trị viên..." />;
  }

  return (
    <div className="admin-dashboard-page">
      {/* Header */}
      <div className="dashboard-header-banner">
        <div>
          <h1 className="dashboard-page-title">Bảng điều khiển Quản trị Hệ thống</h1>
          <p className="text-muted">
            Xin chào Quản trị viên, <strong>{user?.full_name}</strong>! Giám sát toàn diện người dùng, kho thiết bị và quy trình mượn trả.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/admin/equipments/new" className="btn btn-primary btn-sm">
            <Icon name="plus" size={14} /> Thêm thiết bị mới
          </Link>
          <Link to="/admin/users" className="btn btn-outline btn-sm">
            <Icon name="users" size={14} /> Quản lý người dùng
          </Link>
        </div>
      </div>

      {errorMsg && <ErrorMessage message={errorMsg} />}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <Link to="/admin/users" className="kpi-card" style={{ textDecoration: 'none' }}>
          <div className="kpi-icon kpi-icon-blue">
            <Icon name="users" size={22} color="var(--color-primary)" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Tổng người dùng</span>
            <span className="kpi-value">{stats.totalUsers}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {stats.adminUsers} Quản trị viên • {stats.staffUsers} Nhân viên • {stats.borrowerUsers} Người mượn
            </span>
          </div>
        </Link>

        <Link to="/admin/equipments" className="kpi-card" style={{ textDecoration: 'none' }}>
          <div className="kpi-icon kpi-icon-purple">
            <Icon name="box" size={22} color="#7c3aed" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Loại thiết bị trong Lab</span>
            <span className="kpi-value text-purple">{stats.totalEquipments}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Xem danh mục và tồn kho
            </span>
          </div>
        </Link>

        <Link to="/staff/borrowings" className="kpi-card" style={{ textDecoration: 'none' }}>
          <div className="kpi-icon kpi-icon-amber">
            <Icon name="clipboard" size={22} color="var(--color-warning)" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Tổng phiếu mượn</span>
            <span className="kpi-value text-amber">{stats.totalBorrowings}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {stats.pendingBorrowings} chờ duyệt • {stats.borrowedBorrowings} đang mượn
            </span>
          </div>
        </Link>
      </div>

      {/* Status Breakdown Grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <Link to="/staff/borrowings?status=PENDING" className="kpi-card" style={{ textDecoration: 'none', padding: '12px 16px' }}>
          <div className="kpi-icon kpi-icon-amber" style={{ width: '38px', height: '38px' }}>
            <Icon name="clock" size={18} color="var(--color-warning)" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Chờ duyệt</span>
            <span className="kpi-value text-amber" style={{ fontSize: '1.25rem' }}>{stats.pendingBorrowings}</span>
          </div>
        </Link>

        <Link to="/staff/borrowings?status=APPROVED" className="kpi-card" style={{ textDecoration: 'none', padding: '12px 16px' }}>
          <div className="kpi-icon kpi-icon-blue" style={{ width: '38px', height: '38px' }}>
            <Icon name="check-circle" size={18} color="#2563eb" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Đã duyệt chờ nhận</span>
            <span className="kpi-value" style={{ fontSize: '1.25rem', color: '#2563eb' }}>{stats.approvedBorrowings}</span>
          </div>
        </Link>

        <Link to="/staff/borrowings?status=BORROWED" className="kpi-card" style={{ textDecoration: 'none', padding: '12px 16px' }}>
          <div className="kpi-icon kpi-icon-purple" style={{ width: '38px', height: '38px' }}>
            <Icon name="handshake" size={18} color="#7c3aed" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Đang mượn</span>
            <span className="kpi-value text-purple" style={{ fontSize: '1.25rem' }}>{stats.borrowedBorrowings}</span>
          </div>
        </Link>

        <Link to="/staff/borrowings?status=RETURNED" className="kpi-card" style={{ textDecoration: 'none', padding: '12px 16px' }}>
          <div className="kpi-icon kpi-icon-green" style={{ width: '38px', height: '38px' }}>
            <Icon name="return" size={18} color="var(--color-success)" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Đã trả</span>
            <span className="kpi-value text-green" style={{ fontSize: '1.25rem' }}>{stats.returnedBorrowings}</span>
          </div>
        </Link>
      </div>

      {/* Quick Navigation Strip */}
      <div className="quick-action-strip">
        <div className="quick-action-text">
          <strong>Lối tắt điều hướng quản trị:</strong>
        </div>
        <div className="quick-action-buttons">
          <Link to="/admin/equipments" className="btn btn-outline btn-sm">
            <Icon name="box" size={14} /> Danh mục thiết bị
          </Link>
          <Link to="/admin/equipments/new" className="btn btn-outline btn-sm">
            <Icon name="plus" size={14} /> Thêm thiết bị mới
          </Link>
          <Link to="/admin/users" className="btn btn-outline btn-sm">
            <Icon name="users" size={14} /> Danh sách người dùng
          </Link>
          <Link to="/staff/borrowings" className="btn btn-outline btn-sm">
            <Icon name="clipboard" size={14} /> Quản lý quy trình mượn trả
          </Link>
        </div>
      </div>

      {/* Recent Borrowings Table */}
      <div className="card">
        <div className="card-header flex-between">
          <h2 className="card-title">Phiếu mượn thiết bị mới nhất</h2>
          <Link to="/staff/borrowings" className="btn btn-outline btn-sm">
            Xem tất cả &raquo;
          </Link>
        </div>
        <div className="card-body p-0">
          {recentBorrowings.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="Chưa có phiếu mượn nào"
              description="Hệ thống chưa ghi nhận phiếu mượn thiết bị nào."
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Người mượn</th>
                    <th>Mục đích</th>
                    <th style={{ textAlign: 'center' }}>Số thiết bị</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBorrowings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link
                          to={`/staff/borrowings/${b.id}`}
                          style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}
                        >
                          {b.borrowing_code}
                        </Link>
                      </td>
                      <td>
                        <strong>{b.borrower_name || `Người dùng #${b.borrower_id}`}</strong>
                        {b.borrower_email && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {b.borrower_email}
                          </div>
                        )}
                      </td>
                      <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.purpose}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-borrower font-bold">
                          {b.total_items || 1}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={b.status} />
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(b.created_at)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <Link to={`/staff/borrowings/${b.id}`} className="btn btn-outline btn-sm">
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
