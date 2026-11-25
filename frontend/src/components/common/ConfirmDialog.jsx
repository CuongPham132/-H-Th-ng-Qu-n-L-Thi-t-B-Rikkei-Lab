import React from 'react';

/**
 * ConfirmDialog Component
 * Modal dialog for confirming actions (e.g. Cancel borrowing request)
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is visible
 * @param {string} props.title - Title of the modal
 * @param {string} props.message - Descriptive message
 * @param {string} [props.confirmText='Xác nhận'] - Confirm button text
 * @param {string} [props.cancelText='Đóng'] - Cancel button text
 * @param {string} [props.confirmVariant='danger'] - 'danger' | 'primary'
 * @param {boolean} [props.isLoading=false] - Loading state for confirm button
 * @param {Function} props.onConfirm - Confirm handler
 * @param {Function} props.onCancel - Cancel/Close handler
 */
export function ConfirmDialog({
  isOpen,
  title = 'Xác nhận thao tác',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  confirmVariant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="modal-card">
        <div className="modal-header">
          <h3 id="dialog-title" className="modal-title">
            {title}
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

        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${confirmVariant === 'danger' ? 'btn-outline-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
