import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import borrowingService from '../services/borrowing.service.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Pagination from '../components/common/Pagination.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { BORROWING_STATUS_LIST } from '../utils/constants.js';

export function StaffBorrowingListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query params
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialStatus = searchParams.get('status') || '';
  const initialSearch = searchParams.get('search') || '';

  const [borrowings, setBorrowings] = useState([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBorrowings = async (page = 1, status = '', search = '') => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const params = {
        page,
        limit: 10,
      };
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();

      const data = await borrowingService.getBorrowings(params);
      setBorrowings(data.borrowings);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching staff borrowings:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách phiếu mượn.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    setStatusFilter(status);
    setSearchInput(search);
    fetchBorrowings(page, status, search);
  }, [searchParams]);

  const updateFilters = (newPage, newStatus, newSearch) => {
    const nextParams = {};
    if (newPage > 1) nextParams.page = String(newPage);
    if (newStatus) nextParams.status = newStatus;
    if (newSearch) nextParams.search = newSearch;
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters(1, statusFilter, searchInput.trim());
  };

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setStatusFilter(val);
    updateFilters(1, val, searchInput.trim());
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setSearchInput('');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    updateFilters(newPage, statusFilter, searchInput.trim());
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

  return (
    <div className="staff-borrowing-list-page">
      <div className="page-header-box">
        <div>
          <h1 className="page-title">📋 Quản lý Phiếu mượn - Trả thiết bị</h1>
          <p className="text-muted">
            Xem toàn bộ yêu cầu trong hệ thống, thực hiện duyệt, bàn giao và tiếp nhận hoàn trả.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar card p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="filter-form" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Tìm theo mã phiếu, ghi chú..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="">Tất cả trạng thái</option>
              {BORROWING_STATUS_LIST.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            Tìm kiếm
          </button>

          {(statusFilter || searchInput) && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleResetFilters}
            >
              Đặt lại
            </button>
          )}
        </form>
      </div>

      {errorMsg && <ErrorMessage message={errorMsg} />}

      {/* Borrowing Table */}
      {isLoading ? (
        <Loading text="Đang tải danh sách phiếu mượn..." />
      ) : borrowings.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Không tìm thấy phiếu mượn phù hợp"
          description={
            statusFilter || searchInput
              ? 'Không có phiếu mượn nào khớp với điều kiện lọc hiện tại.'
              : 'Hệ thống chưa ghi nhận phiếu mượn nào.'
          }
          actionText={statusFilter || searchInput ? 'Xóa bộ lọc' : undefined}
          onAction={statusFilter || searchInput ? handleResetFilters : undefined}
        />
      ) : (
        <div className="card">
          <div className="card-body p-0">
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
                  {borrowings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link
                          to={`/staff/borrowings/${b.id}`}
                          style={{
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-primary)',
                          }}
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
                        <span className="badge badge-light" style={{ fontWeight: 600 }}>
                          {b.total_items || 1}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={b.status} />
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(b.created_at)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <Link
                          to={`/staff/borrowings/${b.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          Chi tiết &amp; Xử lý
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card-footer p-3">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              limit={pagination.limit}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffBorrowingListPage;
