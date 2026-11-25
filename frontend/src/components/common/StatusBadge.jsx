import React from 'react';

/**
 * StatusBadge Component
 * Maps equipment and borrowing status to styled badges with Vietnamese labels
 * @param {Object} props
 * @param {string} props.status - The status code
 * @param {string} [props.type='borrowing'] - 'borrowing' | 'equipment'
 */
export function StatusBadge({ status, type = 'borrowing' }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  // Status dictionary mapping
  const config = {
    // Borrowing statuses
    PENDING: { label: 'Chờ duyệt', className: 'badge-status-pending' },
    APPROVED: { label: 'Đã duyệt', className: 'badge-status-approved' },
    BORROWED: { label: 'Đang mượn', className: 'badge-status-borrowed' },
    RETURNED: { label: 'Đã trả đủ', className: 'badge-status-returned' },
    CANCELLED: { label: 'Đã hủy', className: 'badge-status-cancelled' },
    REJECTED: { label: 'Bị từ chối', className: 'badge-status-rejected' },
    EXPIRED: { label: 'Hết hạn nhận', className: 'badge-status-expired' },

    // Equipment statuses
    AVAILABLE: { label: 'Sẵn sàng mượn', className: 'badge-status-available' },
    MAINTENANCE: { label: 'Đang bảo trì', className: 'badge-status-maintenance' },
    DISCONTINUED: { label: 'Ngừng sử dụng', className: 'badge-status-rejected' },
    BROKEN: { label: 'Hỏng hóc', className: 'badge-status-broken' },
    LOST: { label: 'Thất lạc', className: 'badge-status-lost' },

    // User statuses
    ACTIVE: { label: 'Hoạt động', className: 'badge-status-available' },
    INACTIVE: { label: 'Vô hiệu hóa', className: 'badge-status-rejected' },

    // Roles
    ADMIN: { label: 'ADMIN', className: 'badge-status-approved' },
    STAFF: { label: 'STAFF', className: 'badge-status-borrowed' },
    BORROWER: { label: 'BORROWER', className: 'badge-status-default' },
  };

  const item = config[normalized] || { label: normalized, className: 'badge-status-default' };

  return (
    <span className={`status-badge ${item.className}`}>
      <span className="status-badge-dot"></span>
      {item.label}
    </span>
  );
}

export default StatusBadge;
