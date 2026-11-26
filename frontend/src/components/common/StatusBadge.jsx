import React from 'react';

/**
 * StatusBadge Component
 * Maps equipment, borrowing, user status, and role to styled badges with standardized Vietnamese labels
 * @param {Object} props
 * @param {string} props.status - The status or role code
 * @param {string} [props.type='borrowing'] - 'borrowing' | 'equipment' | 'user' | 'role'
 */
export function StatusBadge({ status, type = 'borrowing' }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  // Standardized Vietnamese status dictionary
  const config = {
    // Borrowing statuses
    PENDING: { label: 'Chờ duyệt', className: 'badge-status-pending' },
    APPROVED: { label: 'Đã duyệt', className: 'badge-status-approved' },
    BORROWED: { label: 'Đang mượn', className: 'badge-status-borrowed' },
    RETURNED: { label: 'Đã trả', className: 'badge-status-returned' },
    CANCELLED: { label: 'Đã hủy', className: 'badge-status-cancelled' },
    REJECTED: { label: 'Bị từ chối', className: 'badge-status-rejected' },
    EXPIRED: { label: 'Quá hạn nhận', className: 'badge-status-expired' },

    // Equipment statuses
    AVAILABLE: { label: 'Có sẵn', className: 'badge-status-available' },
    MAINTENANCE: { label: 'Đang bảo trì', className: 'badge-status-maintenance' },
    DISCONTINUED: { label: 'Ngừng sử dụng', className: 'badge-status-rejected' },
    BROKEN: { label: 'Hỏng hóc', className: 'badge-status-broken' },
    LOST: { label: 'Thất lạc', className: 'badge-status-lost' },

    // User account statuses
    ACTIVE: { label: 'Hoạt động', className: 'badge-status-available' },
    INACTIVE: { label: 'Vô hiệu hóa', className: 'badge-status-rejected' },

    // System roles (clean Vietnamese without parenthetical raw codes)
    ADMIN: { label: 'Quản trị viên', className: 'badge-status-approved' },
    STAFF: { label: 'Nhân viên Lab', className: 'badge-status-borrowed' },
    BORROWER: { label: 'Người mượn', className: 'badge-status-pending' },
  };

  const item = config[normalized] || { label: normalized, className: 'badge-status-cancelled' };

  return (
    <span className={`status-badge ${item.className}`}>
      <span className="status-badge-dot"></span>
      {item.label}
    </span>
  );
}

export default StatusBadge;
