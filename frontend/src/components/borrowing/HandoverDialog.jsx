import React, { useState } from 'react';
import Icon from '../common/Icon.jsx';

/**
 * HandoverDialog Component
 * Modal for confirming handover of equipment for an APPROVED borrowing (UC11)
 */
export function HandoverDialog({
  isOpen,
  borrowing,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const [borrowingDays, setBorrowingDays] = useState(14);
  const [validationError, setValidationError] = useState('');

  if (!isOpen || !borrowing) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const days = Number(borrowingDays);
    if (!Number.isInteger(days) || days < 1 || days > 14) {
      setValidationError('Thời hạn mượn phải là số nguyên từ 1 đến 14 ngày.');
      return;
    }
    setValidationError('');
    onConfirm(days);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="handover-dialog-title">
      <div className="modal-card modal-card-md">
        <div className="modal-header">
          <h3 id="handover-dialog-title" className="modal-title">
            Bàn giao thiết bị cho người mượn
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Đóng"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-message mb-3">
              Xác nhận bàn giao thiết bị thực tế cho người mượn <strong>{borrowing.borrower_name}</strong> (Mã đơn:{' '}
              <strong>{borrowing.borrowing_code}</strong>).
            </p>

            <div className="audit-card mb-3">
              <div className="audit-card-title">
                <Icon name="box" size={14} /> Danh sách thiết bị bàn giao
              </div>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {borrowing.items?.map((item) => (
                  <li key={item.id} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                    <strong>{item.equipment_name}</strong> ({item.equipment_code}) — Số lượng:{' '}
                    <strong>{item.quantity}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="form-group mb-3">
              <label htmlFor="borrowingDays" className="form-label" style={{ fontWeight: 600 }}>
                Thời hạn mượn thực tế (ngày) <span className="text-danger">*</span>
              </label>
              <input
                id="borrowingDays"
                type="number"
                className="form-control"
                min={1}
                max={14}
                value={borrowingDays}
                onChange={(e) => {
                  setBorrowingDays(e.target.value);
                  if (validationError) setValidationError('');
                }}
                disabled={isLoading}
              />
              <span className="form-hint">Tối đa 14 ngày theo quy định phòng Lab.</span>
              {validationError && (
                <span className="text-danger" style={{ fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                  {validationError}
                </span>
              )}
            </div>

            <div className="notice-banner" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="info" size={16} color="#2563eb" />
              <span>Thao tác này sẽ chuyển trạng thái đơn sang <strong>Đang mượn</strong>, cập nhật ngày bàn giao, hạn trả và dịch chuyển tồn kho từ Giữ chỗ sang Đang mượn.</span>
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
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Đang bàn giao...' : 'Xác nhận bàn giao'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HandoverDialog;
