import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import borrowingService from '../services/borrowing.service.js';
import BorrowingTable from '../components/borrowing/BorrowingTable.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Icon from '../components/common/Icon.jsx';
import Breadcrumb from '../components/common/Breadcrumb.jsx';
import { useToast } from '../contexts/ToastContext.jsx';

export function BorrowerDashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
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

      // Fetch user's borrowings
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
      const msg = `Hủy phiếu mượn ${cancelTarget.borrowing_code} thành công.`;
      setActionSuccess(msg);
      toast.success(msg);
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
      <Breadcrumb items={[{ label: 'Bảng điều khiển người mượn' }]} />
      <div className="dashboard-header-banner">
        <div>
          <h2 className="dashboard-page-title">Bảng Điều Khiển Người Mượn</h2>
          <p className="text-muted">
            Xin chào <strong>{user?.full_name}</strong>. Dưới đây là thông tin tổng quan các yêu cầu mượn thiết bị của bạn.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/borrower/equipments" className="btn btn-outline">
            <Icon name="search" size={15} /> Tra cứu thiết bị
          </Link>
          <Link to="/borrower/borrowings/create" className="btn btn-primary">
            <Icon name="plus" size={15} /> Tạo yêu cầu mượn
          </Link>
        </div>
      </div>

      <ErrorMessage message={errorMsg} />

      {actionSuccess && (
        <div className="success-banner" role="status">
          <span className="success-icon">
            <Icon name="check-circle" size={18} color="var(--color-success)" />
          </span>
          <p className="success-text">{actionSuccess}</p>
        </div>
      )}

      {/* KPI Stats Cards (Compact layout, no wasted whitespace) */}
      <div className="kpi-compact-grid">
        <div className="kpi-compact-box">
          <div className="kpi-compact-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Icon name="clipboard" size={20} />
          </div>
          <div className="kpi-compact-data">
            <span className="kpi-compact-title">Tổng số phiếu</span>
            <span className="kpi-compact-number">{stats.total}</span>
          </div>
        </div>

        <div className="kpi-compact-box">
          <div className="kpi-compact-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <Icon name="clock" size={20} />
          </div>
          <div className="kpi-compact-data">
            <span className="kpi-compact-title">Đang chờ duyệt</span>
            <span className="kpi-compact-number text-amber">{stats.pending}</span>
          </div>
        </div>

        <div className="kpi-compact-box">
          <div className="kpi-compact-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <Icon name="check-circle" size={20} />
          </div>
          <div className="kpi-compact-data">
            <span className="kpi-compact-title">Đã được duyệt</span>
            <span className="kpi-compact-number text-green">{stats.approved}</span>
          </div>
        </div>

        <div className="kpi-compact-box">
          <div className="kpi-compact-icon" style={{ backgroundColor: '#faf5ff', color: '#7c3aed' }}>
            <Icon name="box" size={20} />
          </div>
          <div className="kpi-compact-data">
            <span className="kpi-compact-title">Đang mượn thực tế</span>
            <span className="kpi-compact-number text-purple">{stats.borrowed}</span>
          </div>
        </div>
      </div>

      {/* Recent Borrowings Section */}
      <div className="card mt-4">
        <div className="card-header flex-between">
          <h3 className="card-title">Phiếu mượn gần đây</h3>
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
                icon="clipboard"
                title="Chưa có phiếu mượn nào"
                description="Bạn chưa tạo phiếu mượn thiết bị nào trong hệ thống."
                action={
                  <Link to="/borrower/borrowings/create" className="btn btn-primary">
                    <Icon name="plus" size={15} /> Tạo yêu cầu mượn ngay
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
