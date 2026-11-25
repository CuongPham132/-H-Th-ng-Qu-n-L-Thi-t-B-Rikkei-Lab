/**
 * Application Constants
 */
export const ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  BORROWER: 'BORROWER',
};

export const TOKEN_STORAGE_KEY = 'rikkei_lab_token';
export const USER_STORAGE_KEY = 'rikkei_lab_user';

export const BORROWING_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  BORROWED: 'BORROWED',
  RETURNED: 'RETURNED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
};

export const BORROWING_STATUS_LIST = [
  { value: 'PENDING', label: 'Chờ duyệt (PENDING)' },
  { value: 'APPROVED', label: 'Đã duyệt (APPROVED)' },
  { value: 'BORROWED', label: 'Đang mượn (BORROWED)' },
  { value: 'RETURNED', label: 'Đã hoàn trả (RETURNED)' },
  { value: 'REJECTED', label: 'Bị từ chối (REJECTED)' },
  { value: 'CANCELLED', label: 'Đã hủy (CANCELLED)' },
  { value: 'EXPIRED', label: 'Hết hạn (EXPIRED)' },
];

export const EQUIPMENT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  MAINTENANCE: 'MAINTENANCE',
  DISCONTINUED: 'DISCONTINUED',
};

export const EQUIPMENT_STATUS_LIST = [
  { value: 'AVAILABLE', label: 'Sẵn sàng cho mượn (AVAILABLE)' },
  { value: 'MAINTENANCE', label: 'Đang bảo trì (MAINTENANCE)' },
  { value: 'DISCONTINUED', label: 'Ngừng sử dụng (DISCONTINUED)' },
];

export const ROLE_LIST = [
  { value: 'BORROWER', label: 'Người mượn (BORROWER)' },
  { value: 'STAFF', label: 'Nhân viên Lab (STAFF)' },
  { value: 'ADMIN', label: 'Quản trị viên (ADMIN)' },
];

/**
 * Checks whether a user with a given role is allowed to access a specific route pathname
 * @param {string} pathname
 * @param {string} role - 'ADMIN' | 'STAFF' | 'BORROWER'
 * @returns {boolean}
 */
export function isRouteAllowedForRole(pathname, role) {
  if (!pathname || pathname === '/' || pathname === '/login' || pathname === '/register') {
    return true;
  }
  // Admin-only routes
  if (pathname.startsWith('/admin')) {
    return role === ROLES.ADMIN;
  }
  // Staff & Admin routes
  if (pathname.startsWith('/staff') || pathname.startsWith('/manage')) {
    return role === ROLES.STAFF || role === ROLES.ADMIN;
  }
  // Borrower routes
  if (pathname.startsWith('/borrower')) {
    return role === ROLES.BORROWER;
  }
  return true;
}
