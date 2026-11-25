import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import borrowingService from '../services/borrowing.service.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import ApprovalDialog from '../components/borrowing/ApprovalDialog.jsx';
import RejectDialog from '../components/borrowing/RejectDialog.jsx';
import HandoverDialog from '../components/borrowing/HandoverDialog.jsx';
import ReturnDialog from '../components/borrowing/ReturnDialog.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';

export function StaffBorrowingDetailPage() {
  const { id } = useParams();

  const [borrowing, setBorrowing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Dialog states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBorrowingDetail = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const data = await borrowingService.getBorrowingById(id);
      setBorrowing(data);
    } catch (err) {
      console.error('Error fetching borrowing detail for staff:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải chi tiết phiếu mượn.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowingDetail();
  }, [id]);

  // UC10: Approve borrowing
  const handleApprove = async () => {
    if (!borrowing) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await borrowingService.approveBorrowing(borrowing.id);
      setActionSuccess('Duyệt phiếu mượn thành công! Đã giữ kho và chuyển trạng thái sang ĐÃ DUYỆT (APPROVED).');
      setShowApproveModal(false);
      await fetchBorrowingDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể duyệt phiếu mượn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UC10: Reject borrowing
  const handleReject = async (rejectionReason) => {
    if (!borrowing) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await borrowingService.rejectBorrowing(borrowing.id, rejectionReason);
      setActionSuccess('Đã từ chối phiếu mượn thành công. Đơn chuyển sang trạng thái TỪ CHỐI (REJECTED).');
      setShowRejectModal(false);
      await fetchBorrowingDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể từ chối phiếu mượn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UC11: Handover equipment
  const handleHandover = async (borrowingDays) => {
    if (!borrowing) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await borrowingService.handoverBorrowing(borrowing.id, borrowingDays);
      setActionSuccess('Bàn giao thiết bị thành công! Đơn chuyển sang trạng thái ĐANG MƯỢN (BORROWED).');
      setShowHandoverModal(false);
      await fetchBorrowingDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể bàn giao thiết bị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UC12: Return equipment
  const handleReturn = async (items) => {
    if (!borrowing) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const updated = await borrowingService.returnBorrowing(borrowing.id, items);
      if (updated.status === 'RETURNED') {
        setActionSuccess('Hoàn tất nhận trả toàn bộ thiết bị! Phiếu mượn đã chuyển sang trạng thái ĐÃ HOÀN TRẢ (RETURNED).');
      } else {
        setActionSuccess('Tiếp nhận hoàn trả một phần thành công! Phiếu mượn tiếp tục ở trạng thái ĐANG MƯỢN (BORROWED).');
      }
      setShowReturnModal(false);
      await fetchBorrowingDetail();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể tiếp nhận hoàn trả thiết bị.');
    } finally {
      setIsSubmitting(false);
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
    return <Loading text="Đang tải thông tin chi tiết phiếu mượn..." />;
  }

  if (errorMsg && !borrowing) {
    return (
      <div className="staff-borrowing-detail-page">
        <ErrorMessage message={errorMsg || 'Không tìm thấy phiếu mượn.'} />
        <Link to="/staff/borrowings" className="btn btn-outline mt-3">
          &laquo; Quay lại danh sách quản lý
        </Link>
      </div>
    );
  }

  const isPending = borrowing.status === 'PENDING';
  const isApproved = borrowing.status === 'APPROVED';
  const isBorrowed = borrowing.status === 'BORROWED';

  return (
    <div className="staff-borrowing-detail-page">
      {/* Top Action Bar */}
      <div className="action-bar-top">
        <Link to="/staff/borrowings" className="btn btn-outline-sm">
          &laquo; Về danh sách phiếu mượn
        </Link>

        {/* Staff Operation Buttons */}
        <div className="staff-action-buttons">
          {isPending && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowApproveModal(true)}
              >
                ✅ Duyệt yêu cầu
              </button>
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => setShowRejectModal(true)}
              >
                ❌ Từ chối
              </button>
            </>
          )}

          {isApproved && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowHandoverModal(true)}
              >
                🤝 Bàn giao thiết bị
              </button>
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() => setShowRejectModal(true)}
              >
                ❌ Từ chối / Hủy duyệt
              </button>
            </>
          )}

          {isBorrowed && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowReturnModal(true)}
            >
              📥 Tiếp nhận hoàn trả
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && <ErrorMessage message={errorMsg} />}
      {actionSuccess && (
        <div className="notice-banner mb-3" style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#166534' }}>
          ✅ {actionSuccess}
        </div>
      )}

      {/* Header Card */}
      <div className="card mb-4">
        <div className="card-header flex-between">
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Mã phiếu mượn
            </span>
            <div className="borrowing-code-title">{borrowing.borrowing_code}</div>
          </div>
          <div>
            <StatusBadge status={borrowing.status} />
          </div>
        </div>

        <div className="card-body">
          {/* Audit Info Grid */}
          <div className="audit-info-grid">
            {/* Borrower Card */}
            <div className="audit-card">
              <div className="audit-card-title">👤 Thông tin người mượn</div>
              <div className="audit-item">
                <span className="audit-label">Họ và tên:</span>
                <strong>{borrowing.borrower_name}</strong>
              </div>
              <div className="audit-item">
                <span className="audit-label">Email:</span>
                {borrowing.borrower_email}
              </div>
              <div className="audit-item">
                <span className="audit-label">Số điện thoại:</span>
                {borrowing.borrower_phone || 'Chưa cung cấp'}
              </div>
              <div className="audit-item">
                <span className="audit-label">ID Người dùng:</span>
                #{borrowing.borrower_id}
              </div>
            </div>

            {/* Approval Info */}
            <div className="audit-card">
              <div className="audit-card-title">✅ Kiểm duyệt &amp; Nhận thiết bị</div>
              <div className="audit-item">
                <span className="audit-label">Người duyệt:</span>
                {borrowing.approver_name || (borrowing.approved_by ? `Staff #${borrowing.approved_by}` : 'Chưa duyệt')}
              </div>
              <div className="audit-item">
                <span className="audit-label">Thời điểm duyệt:</span>
                {formatDate(borrowing.approved_at)}
              </div>
              <div className="audit-item">
                <span className="audit-label">Hạn chót nhận thiết bị:</span>
                <span style={{ color: borrowing.pickup_deadline ? '#d97706' : 'inherit', fontWeight: 600 }}>
                  {formatDate(borrowing.pickup_deadline)}
                </span>
              </div>
            </div>

            {/* Handover & Return Info */}
            <div className="audit-card">
              <div className="audit-card-title">📦 Bàn giao &amp; Thu hồi</div>
              <div className="audit-item">
                <span className="audit-label">Ngày bàn giao thực tế:</span>
                {formatDate(borrowing.borrowed_at)}
              </div>
              <div className="audit-item">
                <span className="audit-label">Hạn chót hoàn trả:</span>
                <span style={{ color: borrowing.due_date ? '#2563eb' : 'inherit', fontWeight: 600 }}>
                  {formatDate(borrowing.due_date)}
                </span>
              </div>
              <div className="audit-item">
                <span className="audit-label">Ngày hoàn trả thực tế:</span>
                <span style={{ color: borrowing.returned_at ? '#16a34a' : 'inherit', fontWeight: 600 }}>
                  {formatDate(borrowing.returned_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Rejection / Cancellation Details if applicable */}
          {(borrowing.rejection_reason || borrowing.rejected_at) && (
            <div className="notice-banner mb-3" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b' }}>
              <strong>Lý do từ chối:</strong> {borrowing.rejection_reason || 'Không có lý do chi tiết'}
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Thời điểm từ chối: {formatDate(borrowing.rejected_at)}
              </div>
            </div>
          )}

          {/* Purpose & Notes */}
          <div className="mt-3">
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '4px' }}>
              Mục đích mượn thiết bị:
            </h4>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--color-text-main)', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px' }}>
              {borrowing.purpose}
            </p>
          </div>

          {borrowing.notes && (
            <div className="mt-3">
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '4px' }}>
                Ghi chú &amp; Nhật ký hệ thống:
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', background: '#fafbfc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                {borrowing.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Equipment List Table */}
      <div className="card">
        <div className="card-header flex-between">
          <h3 className="card-title">📦 Danh mục thiết bị trong phiếu mượn</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Tổng số: <strong>{borrowing.items?.length || 0}</strong> loại thiết bị
          </span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã thiết bị</th>
                  <th>Tên thiết bị</th>
                  <th>Danh mục</th>
                  <th style={{ textAlign: 'center' }}>Số lượng yêu cầu</th>
                  <th style={{ textAlign: 'center' }}>Đã hoàn trả</th>
                  <th style={{ textAlign: 'center' }}>Còn nợ</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {borrowing.items?.map((item) => {
                  const unreturned = Math.max(0, item.quantity - (item.returned_quantity || 0));
                  return (
                    <tr key={item.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {item.equipment_code}
                      </td>
                      <td>
                        <strong>{item.equipment_name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-light">{item.category}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                        {item.returned_quantity || 0}
                      </td>
                      <td style={{ textAlign: 'center', color: unreturned > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                        {unreturned}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        {item.item_notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dialog Modals */}
      <ApprovalDialog
        isOpen={showApproveModal}
        borrowing={borrowing}
        isLoading={isSubmitting}
        onConfirm={handleApprove}
        onCancel={() => setShowApproveModal(false)}
      />

      <RejectDialog
        isOpen={showRejectModal}
        borrowing={borrowing}
        isLoading={isSubmitting}
        onConfirm={handleReject}
        onCancel={() => setShowRejectModal(false)}
      />

      <HandoverDialog
        isOpen={showHandoverModal}
        borrowing={borrowing}
        isLoading={isSubmitting}
        onConfirm={handleHandover}
        onCancel={() => setShowHandoverModal(false)}
      />

      <ReturnDialog
        isOpen={showReturnModal}
        borrowing={borrowing}
        isLoading={isSubmitting}
        onConfirm={handleReturn}
        onCancel={() => setShowReturnModal(false)}
      />
    </div>
  );
}

export default StaffBorrowingDetailPage;
