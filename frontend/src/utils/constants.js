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
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'BORROWED', label: 'Đang mượn' },
  { value: 'RETURNED', label: 'Đã trả' },
  { value: 'REJECTED', label: 'Bị từ chối' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'EXPIRED', label: 'Quá hạn nhận' },
];

export const EQUIPMENT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  MAINTENANCE: 'MAINTENANCE',
  DISCONTINUED: 'DISCONTINUED',
};

export const EQUIPMENT_STATUS_LIST = [
  { value: 'AVAILABLE', label: 'Có sẵn' },
  { value: 'MAINTENANCE', label: 'Đang bảo trì' },
  { value: 'DISCONTINUED', label: 'Ngừng sử dụng' },
];

export const ROLE_LIST = [
  { value: 'BORROWER', label: 'Người mượn' },
  { value: 'STAFF', label: 'Nhân viên Lab' },
  { value: 'ADMIN', label: 'Quản trị viên' },
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
