import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import borrowingService from '../services/borrowing.service.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Icon from '../components/common/Icon.jsx';
import Breadcrumb from '../components/common/Breadcrumb.jsx';
import { useToast } from '../contexts/ToastContext.jsx';

export function BorrowingDetailPage() {
  const { id } = useParams();
  const toast = useToast();

  const [borrowing, setBorrowing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Cancel dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBorrowingDetail = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const data = await borrowingService.getBorrowingById(id);
      setBorrowing(data);
    } catch (err) {
      console.error('Error fetching borrowing detail:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải thông tin chi tiết phiếu mượn.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowingDetail();
  }, [id]);

  const handleConfirmCancel = async () => {
    if (!borrowing) return;

    try {
      setIsCancelling(true);
      await borrowingService.cancelBorrowing(borrowing.id, cancelReason);
      setActionSuccess('Hủy phiếu mượn thành công. Đơn đã chuyển sang trạng thái ĐÃ HỦY.');
      setShowCancelDialog(false);
      await fetchBorrowingDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể hủy phiếu mượn.');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Chưa ghi nhận';
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <Loading text="Đang tải chi tiết phiếu mượn..." />;
  }

  if (errorMsg || !borrowing) {
    return (
      <div className="borrowing-detail-page">
        <ErrorMessage message={errorMsg || 'Không tìm thấy phiếu mượn.'} />
        <Link to="/borrower/borrowings" className="btn btn-outline mt-3">
          &laquo; Quay lại lịch sử phiếu mượn
        </Link>
      </div>
    );
  }

  const canCancel = borrowing.status === 'PENDING' || borrowing.status === 'APPROVED';

  return (
    <div className="borrowing-detail-page">
      <Breadcrumb
        items={[
          { label: 'Lịch sử phiếu mượn', to: '/borrower/borrowings' },
          { label: borrowing.borrowing_code || `Phiếu #${borrowing.id}` },
        ]}
      />
      <div className="detail-navigation flex-between">
        <Link to="/borrower/borrowings" className="btn btn-outline-sm">
          &laquo; Về lịch sử phiếu mượn
        </Link>
        {canCancel && (
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => setShowCancelDialog(true)}
          >
            Hủy phiếu mượn này
          </button>
        )}
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

      {/* Main Header Card */}
      <div className="card borrowing-header-card">
        <div className="card-header flex-between">
          <div>
            <span className="code-label">PHIẾU MƯỢN THIẾT BỊ</span>
            <h2 className="borrowing-code-title">{borrowing.borrowing_code}</h2>
          </div>
          <StatusBadge status={borrowing.status} type="borrowing" />
        </div>

        <div className="card-body">
          <div className="timeline-grid">
            <div className="timeline-item">
              <span className="timeline-label">Ngày tạo yêu cầu:</span>
              <span className="timeline-value">{formatDate(borrowing.created_at)}</span>
            </div>

            <div className="timeline-item">
              <span className="timeline-label">Ngày phê duyệt:</span>
              <span className="timeline-value">{formatDate(borrowing.approved_at)}</span>
            </div>

            <div className="timeline-item">
              <span className="timeline-label">Hạn nhận thiết bị:</span>
              <span className="timeline-value font-bold text-amber">
                {formatDate(borrowing.pickup_deadline)}
              </span>
            </div>

            <div className="timeline-item">
              <span className="timeline-label">Ngày bàn giao thực tế:</span>
              <span className="timeline-value">{formatDate(borrowing.borrowed_at)}</span>
            </div>

            <div className="timeline-item">
              <span className="timeline-label">Hạn hoàn trả:</span>
              <span className="timeline-value font-bold text-danger">
                {formatDate(borrowing.due_date)}
              </span>
            </div>

            <div className="timeline-item">
              <span className="timeline-label">Ngày trả hoàn tất:</span>
              <span className="timeline-value text-success">
                {formatDate(borrowing.returned_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Purpose & Notes */}
      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">Mục đích & Ghi chú</h3>
        </div>
        <div className="card-body">
          <div className="info-row">
            <span className="info-label">Mục đích sử dụng:</span>
            <span className="info-value font-bold">{borrowing.purpose}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Ghi chú phiếu:</span>
            <span className="info-value text-muted">{borrowing.notes || 'Không có ghi chú.'}</span>
          </div>
        </div>
      </div>

      {/* Borrowed Items Table */}
      <div className="card mt-4">
        <div className="card-header">
          <h3 className="card-title">Danh sách thiết bị trong phiếu ({borrowing.items?.length || 0} món)</h3>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã Thiết Bị</th>
                  <th>Tên Thiết Bị</th>
                  <th className="text-center">Số Lượng Mượn</th>
                  <th className="text-center">Đã Hoàn Trả</th>
                  <th className="text-center">Còn Lại Cần Trả</th>
                  <th>Ghi Chú Món</th>
                </tr>
              </thead>
              <tbody>
                {borrowing.items && borrowing.items.map((item, idx) => {
                  const unreturned = item.quantity - (item.returned_quantity || 0);
                  return (
                    <tr key={idx}>
                      <td>
                        <span className="code-tag">{item.equipment_code}</span>
                      </td>
                      <td>
                        <strong className="table-title">{item.equipment_name}</strong>
                      </td>
                      <td className="text-center font-bold">
                        {item.quantity}
                      </td>
                      <td className="text-center text-success font-bold">
                        {item.returned_quantity || 0}
                      </td>
                      <td className="text-center">
                        <span className={`stock-badge ${unreturned === 0 ? 'available' : 'unavailable'}`}>
                          {unreturned}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted font-sm">{item.item_notes || '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        title="Xác nhận hủy phiếu mượn"
        message={`Bạn có chắc chắn muốn hủy phiếu mượn "${borrowing.borrowing_code}" không? Thao tác này sẽ tự động giải phóng thiết bị đã giữ chỗ.`}
        confirmText="Xác nhận hủy đơn"
        confirmVariant="danger"
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelDialog(false)}
      />
    </div>
  );
}

export default BorrowingDetailPage;
