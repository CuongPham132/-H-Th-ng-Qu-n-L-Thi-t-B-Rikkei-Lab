import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import borrowingService from '../services/borrowing.service.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Icon from '../components/common/Icon.jsx';

export function StaffDashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    borrowed: 0,
    returned: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isProcessingExpired, setIsProcessingExpired] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      // Fetch accurate real-time counts using Backend pagination queries
      const [allRes, pendingRes, approvedRes, borrowedRes, returnedRes, recentRes] = await Promise.all([
        borrowingService.getBorrowings({ limit: 1 }),
        borrowingService.getBorrowings({ status: 'PENDING', limit: 1 }),
        borrowingService.getBorrowings({ status: 'APPROVED', limit: 1 }),
        borrowingService.getBorrowings({ status: 'BORROWED', limit: 1 }),
        borrowingService.getBorrowings({ status: 'RETURNED', limit: 1 }),
        borrowingService.getBorrowings({ limit: 5 }),
      ]);

      setStats({
        total: allRes.pagination.total || 0,
        pending: pendingRes.pagination.total || 0,
        approved: approvedRes.pagination.total || 0,
        borrowed: borrowedRes.pagination.total || 0,
        returned: returnedRes.pagination.total || 0,
      });

      setRecentBorrowings(recentRes.borrowings || []);
    } catch (err) {
      console.error('Error loading staff dashboard data:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải dữ liệu thống kê từ hệ thống.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleProcessExpired = async () => {
    try {
      setIsProcessingExpired(true);
      setActionSuccess('');
      setErrorMsg('');
      const res = await borrowingService.processExpired();
      if (res.processedCount > 0) {
        setActionSuccess(`Đã xử lý tự động hết hạn cho ${res.processedCount} phiếu mượn quá hạn nhận thiết bị.`);
      } else {
        setActionSuccess('Không có phiếu mượn nào bị quá hạn tại thời điểm kiểm tra.');
      }
      await fetchDashboardData();
    } catch (err) {
      console.error('Error processing expired borrowings:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể xử lý quét phiếu quá hạn.');
    } finally {
      setIsProcessingExpired(false);
    }
  };

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
    return <Loading text="Đang tải dữ liệu Bảng điều khiển Staff..." />;
  }

  return (
    <div className="staff-dashboard-page">
      {/* Dashboard Header */}
      <div className="dashboard-header-banner">
        <div>
          <h1 className="dashboard-page-title">Bảng điều khiển Quản lý Lab</h1>
          <p className="text-muted">
            Xin chào, <strong>{user?.full_name}</strong>! Theo dõi trạng thái mượn trả và xử lý yêu cầu thiết bị phòng Lab.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleProcessExpired}
            disabled={isProcessingExpired}
            title="Quét các đơn đã duyệt quá hạn nhận để hoàn trả tồn kho"
          >
            <Icon name="clock" size={14} />
            {isProcessingExpired ? 'Đang quét quá hạn...' : 'Quét đơn quá hạn'}
          </button>
          <Link to="/staff/borrowings" className="btn btn-primary btn-sm">
            <Icon name="clipboard" size={14} />
            Quản lý toàn bộ phiếu
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && <ErrorMessage message={errorMsg} />}
      {actionSuccess && (
        <div className="success-banner" role="status">
          <span className="success-icon">
            <Icon name="check-circle" size={18} color="var(--color-success)" />
          </span>
          <p className="success-text">{actionSuccess}</p>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-blue">
            <Icon name="clipboard" size={22} color="var(--color-primary)" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Tổng số phiếu mượn</span>
            <span className="kpi-value">{stats.total}</span>
          </div>
        </div>

        <Link to="/staff/borrowings?status=PENDING" className="kpi-card" style={{ textDecoration: 'none' }}>
          <div className="kpi-icon kpi-icon-amber">
            <Icon name="clock" size={22} color="var(--color-warning)" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Chờ duyệt</span>
            <span className="kpi-value text-amber">{stats.pending}</span>
          </div>
        </Link>

        <Link to="/staff/borrowings?status=APPROVED" className="kpi-card" style={{ textDecoration: 'none' }}>
          <div className="kpi-icon kpi-icon-blue">
            <Icon name="check-circle" size={22} color="#2563eb" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Đã duyệt / Chờ nhận</span>
            <span className="kpi-value" style={{ color: '#2563eb' }}>{stats.approved}</span>
          </div>
        </Link>

        <Link to="/staff/borrowings?status=BORROWED" className="kpi-card" style={{ textDecoration: 'none' }}>
          <div className="kpi-icon kpi-icon-purple">
            <Icon name="handshake" size={22} color="#7c3aed" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Đang mượn</span>
            <span className="kpi-value text-purple">{stats.borrowed}</span>
          </div>
        </Link>

        <Link to="/staff/borrowings?status=RETURNED" className="kpi-card" style={{ textDecoration: 'none' }}>
          <div className="kpi-icon kpi-icon-green">
            <Icon name="return" size={22} color="var(--color-success)" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Đã trả</span>
            <span className="kpi-value text-green">{stats.returned}</span>
          </div>
        </Link>
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="quick-action-strip">
        <div className="quick-action-text">
          <strong>Lối tắt xử lý nhanh:</strong> Lọc danh sách theo các phiếu đang cần nhân viên can thiệp:
        </div>
        <div className="quick-action-buttons">
          <Link to="/staff/borrowings?status=PENDING" className="btn btn-outline btn-sm">
            <Icon name="clock" size={14} /> Cần duyệt ({stats.pending})
          </Link>
          <Link to="/staff/borrowings?status=APPROVED" className="btn btn-outline btn-sm">
            <Icon name="box" size={14} /> Chờ bàn giao ({stats.approved})
          </Link>
          <Link to="/staff/borrowings?status=BORROWED" className="btn btn-outline btn-sm">
            <Icon name="return" size={14} /> Chờ nhận trả ({stats.borrowed})
          </Link>
        </div>
      </div>

      {/* Recent Borrowings Table */}
      <div className="card">
        <div className="card-header flex-between">
          <h2 className="card-title">Yêu cầu mượn cần xử lý gần đây</h2>
          <Link to="/staff/borrowings" className="btn btn-outline btn-sm">
            Xem tất cả &raquo;
          </Link>
        </div>
        <div className="card-body p-0">
          {recentBorrowings.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="Chưa có phiếu mượn nào"
              description="Hiện chưa có yêu cầu mượn thiết bị nào được ghi nhận trong hệ thống."
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
                      <td style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                          Xử lý
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

export default StaffDashboardPage;
