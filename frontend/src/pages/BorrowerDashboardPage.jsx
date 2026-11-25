import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import borrowingService from '../services/borrowing.service.js';
import equipmentService from '../services/equipment.service.js';
import BorrowingTable from '../components/borrowing/BorrowingTable.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';

export function BorrowerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    borrowed: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      // Fetch user's borrowings (Backend automatically filters by borrower_id = user.id)
      const res = await borrowingService.getBorrowings({ limit: 50 });
      const list = res.borrowings || [];

      // Calculate statistics
      let pendingCount = 0;
      let approvedCount = 0;
      let borrowedCount = 0;

      list.forEach((b) => {
        if (b.status === 'PENDING') pendingCount++;
        else if (b.status === 'APPROVED') approvedCount++;
        else if (b.status === 'BORROWED') borrowedCount++;
      });

      setStats({
        total: res.pagination?.total || list.length,
        pending: pendingCount,
        approved: approvedCount,
        borrowed: borrowedCount,
      });

      // Show 5 most recent requests
      setRecentBorrowings(list.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải dữ liệu bảng điều khiển.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleOpenCancel = (borrowing) => {
    setCancelTarget(borrowing);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    try {
      setIsCancelling(true);
      await borrowingService.cancelBorrowing(cancelTarget.id, cancelReason);
      setActionSuccess(`Hủy phiếu mượn ${cancelTarget.borrowing_code} thành công.`);
      setCancelTarget(null);
      await loadDashboardData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể hủy phiếu mượn.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <Loading text="Đang tải dữ liệu người mượn..." />;
  }

  return (
    <div className="borrower-dashboard">
      <div className="dashboard-header-banner">
        <div>
          <h2 className="dashboard-page-title">Bảng Điều Khiển Người Mượn</h2>
          <p className="text-muted">
            Xin chào <strong>{user?.full_name}</strong>. Dưới đây là thông tin tổng quan các yêu cầu mượn thiết bị của bạn.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/borrower/equipments" className="btn btn-outline">
            🔍 Xem Thiết Bị
          </Link>
          <Link to="/borrower/borrowings/create" className="btn btn-primary">
            + Tạo Yêu Cầu Mới
          </Link>
        </div>
      </div>

      <ErrorMessage message={errorMsg} />

      {actionSuccess && (
        <div className="success-banner" role="status">
          <span className="success-icon">✅</span>
          <p className="success-text">{actionSuccess}</p>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-blue">📋</div>
          <div className="kpi-content">
            <span className="kpi-label">Tổng số phiếu mượn</span>
            <span className="kpi-value">{stats.total}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-amber">⏳</div>
          <div className="kpi-content">
            <span className="kpi-label">Đang chờ duyệt</span>
            <span className="kpi-value text-amber">{stats.pending}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-green">✅</div>
          <div className="kpi-content">
            <span className="kpi-label">Đã được duyệt</span>
            <span className="kpi-value text-green">{stats.approved}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-purple">📦</div>
          <div className="kpi-content">
            <span className="kpi-label">Đang mượn thực tế</span>
            <span className="kpi-value text-purple">{stats.borrowed}</span>
          </div>
        </div>
      </div>

      {/* Recent Borrowings Section */}
      <div className="card mt-4">
        <div className="card-header flex-between">
          <h3 className="card-title">📝 Phiếu Mượn Gần Đây</h3>
          <Link to="/borrower/borrowings" className="btn btn-outline-sm">
            Xem tất cả lịch sử &raquo;
          </Link>
        </div>
        <div className="card-body p-0">
          {recentBorrowings.length > 0 ? (
            <BorrowingTable
              borrowings={recentBorrowings}
              onCancel={handleOpenCancel}
            />
          ) : (
            <div className="p-4">
              <EmptyState
                icon="📝"
                title="Chưa có phiếu mượn nào"
                description="Bạn chưa tạo phiếu mượn thiết bị nào trong hệ thống."
                action={
                  <Link to="/borrower/borrowings/create" className="btn btn-primary">
                    Tạo yêu cầu mượn ngay
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        title="Xác nhận hủy phiếu mượn"
        message={`Bạn có chắc chắn muốn hủy phiếu mượn "${cancelTarget?.borrowing_code}" không? Thao tác này không thể hoàn tác.`}
        confirmText="Xác nhận hủy"
        confirmVariant="danger"
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

export default BorrowerDashboardPage;
