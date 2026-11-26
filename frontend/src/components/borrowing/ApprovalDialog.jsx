import React from 'react';
import Icon from '../common/Icon.jsx';

/**
 * ApprovalDialog Component
 * Modal for confirming approval of a PENDING borrowing request (UC10)
 */
export function ApprovalDialog({
  isOpen,
  borrowing,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen || !borrowing) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="approval-dialog-title">
      <div className="modal-card modal-card-md">
        <div className="modal-header">
          <h3 id="approval-dialog-title" className="modal-title">
            Duyệt yêu cầu mượn thiết bị
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

        <div className="modal-body">
          <p className="modal-message mb-3">
            Bạn có chắc chắn muốn duyệt yêu cầu mượn thiết bị <strong>{borrowing.borrowing_code}</strong> của người mượn{' '}
            <strong>{borrowing.borrower_name}</strong>?
          </p>

          <div className="audit-card mb-3">
            <div className="audit-card-title">
              <Icon name="box" size={14} /> Danh sách thiết bị cần giữ kho
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {borrowing.items?.map((item) => (
                <li key={item.id} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                  <strong>{item.equipment_name}</strong> ({item.equipment_code}) — Số lượng: <strong>{item.quantity}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="notice-banner" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="info" size={16} color="#2563eb" />
            <span>Sau khi duyệt, hệ thống sẽ tự động giữ kho cho các thiết bị trên và tạo thời hạn nhận thiết bị là <strong>48 giờ</strong>.</span>
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
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Đang duyệt...' : 'Xác nhận duyệt'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApprovalDialog;
