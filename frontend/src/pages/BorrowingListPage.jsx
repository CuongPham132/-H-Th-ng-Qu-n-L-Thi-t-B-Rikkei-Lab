import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import borrowingService from '../services/borrowing.service.js';
import BorrowingTable from '../components/borrowing/BorrowingTable.jsx';
import Pagination from '../components/common/Pagination.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Icon from '../components/common/Icon.jsx';
import { useToast } from '../contexts/ToastContext.jsx';

export function BorrowingListPage() {
  const location = useLocation();
  const toast = useToast();
  const [borrowings, setBorrowings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState(location.state?.message || '');

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default');

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBorrowings = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const params = {
        page,
        limit: 10,
      };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await borrowingService.getBorrowings(params);
      setBorrowings(res.borrowings || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching borrowings list:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách phiếu mượn.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchBorrowings(1);
  }, [fetchBorrowings]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBorrowings(1);
  };

  const handleOpenCancel = (borrowing) => {
    setCancelTarget(borrowing);
    setCancelReason('');
    setSuccessBanner('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    try {
      setIsCancelling(true);
      await borrowingService.cancelBorrowing(cancelTarget.id, cancelReason);
      const msg = `Hủy phiếu mượn ${cancelTarget.borrowing_code} thành công.`;
      setSuccessBanner(msg);
      toast.success(msg);
      setCancelTarget(null);
      await fetchBorrowings(pagination.page);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể hủy phiếu mượn.');
    } finally {
      setIsCancelling(false);
    }
  };

  const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'PENDING', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'BORROWED', label: 'Đang mượn' },
    { value: 'RETURNED', label: 'Đã trả' },
    { value: 'CANCELLED', label: 'Đã hủy' },
    { value: 'REJECTED', label: 'Bị từ chối' },
    { value: 'EXPIRED', label: 'Quá hạn nhận' },
  ];

  const displayedBorrowings = [...borrowings].sort((a, b) => {
    if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'code_asc') return (a.borrowing_code || '').localeCompare(b.borrowing_code || '');
    return 0;
  });

  return (
    <div className="borrowing-list-page">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Lịch Sử Phiếu Mượn Của Tôi</h2>
          <p className="text-muted">
            Theo dõi tiến trình xét duyệt, thời hạn nhận và hoàn trả các thiết bị đã đăng ký mượn.
          </p>
        </div>
        <Link to="/borrower/borrowings/create" className="btn btn-primary">
          <Icon name="plus" size={15} /> Tạo yêu cầu mượn mới
        </Link>
      </div>

      <ErrorMessage message={errorMsg} />

      {successBanner && (
        <div className="success-banner" role="status">
          <span className="success-icon">
            <Icon name="check-circle" size={18} color="var(--color-success)" />
          </span>
          <p className="success-text">{successBanner}</p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card filter-card">
        <form onSubmit={handleSearchSubmit} className="filter-form">
          <div className="search-input-group">
            <span className="search-icon">
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              className="form-control search-input"
              placeholder="Tìm theo mã phiếu (BRW-...) hoặc mục đích mượn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <select
              className="form-control select-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control select-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sắp xếp"
            >
              <option value="default">Sắp xếp: Mới nhất</option>
              <option value="date_asc">Ngày tạo (Cũ nhất)</option>
              <option value="code_asc">Mã phiếu (A &rarr; Z)</option>
            </select>
          </div>

          <div className="filter-actions">
            <button type="submit" className="btn btn-primary">
              <Icon name="search" size={14} /> Lọc phiếu
            </button>
            {(statusFilter || searchTerm) && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setStatusFilter('');
                  setSearchTerm('');
                }}
              >
                Đặt lại
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Borrowings List Content */}
      {isLoading ? (
        <Loading text="Đang tải danh sách phiếu mượn..." />
      ) : borrowings.length > 0 ? (
        <div className="card p-0">
          <BorrowingTable
            borrowings={displayedBorrowings}
            onCancel={handleOpenCancel}
          />
          <div className="p-3">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={(p) => fetchBorrowings(p)}
            />
          </div>
        </div>
      ) : (
        <EmptyState
          icon="clipboard"
          title="Không tìm thấy phiếu mượn nào"
          description={
            statusFilter || searchTerm
              ? 'Không có phiếu mượn nào khớp với tiêu chí tìm kiếm hoặc lọc.'
              : 'Bạn chưa tạo phiếu mượn thiết bị nào.'
          }
          action={
            <Link to="/borrower/borrowings/create" className="btn btn-primary">
              <Icon name="plus" size={15} /> Tạo yêu cầu mượn ngay
            </Link>
          }
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        title="Xác nhận hủy phiếu mượn"
        message={`Bạn có chắc chắn muốn hủy phiếu mượn "${cancelTarget?.borrowing_code}" không? Sau khi hủy, thiết bị được giữ chỗ (nếu có) sẽ được giải phóng.`}
        confirmText="Xác nhận hủy đơn"
        confirmVariant="danger"
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

export default BorrowingListPage;
