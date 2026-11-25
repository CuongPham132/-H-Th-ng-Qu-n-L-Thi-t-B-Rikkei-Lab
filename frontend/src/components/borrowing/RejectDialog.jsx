import React, { useState } from 'react';

/**
 * RejectDialog Component
 * Modal for rejecting a PENDING or APPROVED borrowing request with reason (UC10)
 */
export function RejectDialog({
  isOpen,
  borrowing,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen || !borrowing) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError('Vui lòng nhập lý do từ chối (bắt buộc).');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 255) {
      setValidationError('Lý do từ chối phải có độ dài từ 2 đến 255 ký tự.');
      return;
    }
    setValidationError('');
    onConfirm(trimmed);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reject-dialog-title">
      <div className="modal-card modal-card-md">
        <div className="modal-header">
          <h3 id="reject-dialog-title" className="modal-title">
            ❌ Từ chối yêu cầu mượn thiết bị
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-message mb-3">
              Bạn đang thực hiện từ chối yêu cầu mượn <strong>{borrowing.borrowing_code}</strong> của{' '}
              <strong>{borrowing.borrower_name}</strong>.
            </p>

            {borrowing.status === 'APPROVED' && (
              <div className="notice-banner mb-3" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}>
                ⚠️ Phiếu mượn này đã được duyệt trước đó. Khi từ chối, hệ thống sẽ tự động hoàn trả số lượng đã giữ kho (reserved stock) về kho khả dụng.
              </div>
            )}

            <div className="form-group mb-2">
              <label htmlFor="rejectionReason" className="form-label" style={{ fontWeight: 600 }}>
                Lý do từ chối <span className="text-danger">*</span>
              </label>
              <textarea
                id="rejectionReason"
                className={`form-textarea ${validationError ? 'border-danger' : ''}`}
                rows={4}
                placeholder="Nhập lý do từ chối cụ thể (từ 2 đến 255 ký tự)..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (validationError) setValidationError('');
                }}
                disabled={isLoading}
              />
              {validationError && (
                <span className="text-danger" style={{ fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                  {validationError}
                </span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-outline-danger"
              disabled={isLoading}
            >
              {isLoading ? 'Đang từ chối...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RejectDialog;
