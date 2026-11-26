import React, { useState, useEffect } from 'react';
import { ROLE_LIST } from '../../utils/constants.js';
import Icon from '../common/Icon.jsx';

/**
 * UserRoleDialog Component
 * Modal for changing user role (ADMIN, STAFF, BORROWER) with safeguards
 */
export function UserRoleDialog({
  isOpen,
  user,
  currentAdminId,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const [role, setRole] = useState('BORROWER');

  useEffect(() => {
    if (user) {
      setRole(user.role || 'BORROWER');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentAdminId;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(role);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="user-role-title">
      <div className="modal-card modal-card-md">
        <div className="modal-header">
          <h3 id="user-role-title" className="modal-title">
            Thay đổi vai trò người dùng
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
              Thay đổi vai trò cho tài khoản <strong>{user.full_name}</strong> ({user.email}).
            </p>

            {isSelf && (
              <div className="notice-banner mb-3" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="alert" size={16} color="#dc2626" />
                <span><strong>Cảnh báo:</strong> Bạn đang thao tác trên tài khoản của chính mình. Hệ thống Backend nghiêm cấm quản trị viên tự thay đổi vai trò của mình (SELF_ACTION_FORBIDDEN).</span>
              </div>
            )}

            {user.role === 'ADMIN' && (
              <div className="notice-banner mb-3" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="alert" size={16} color="#d97706" />
                <span><strong>Lưu ý:</strong> Nếu tài khoản này là Quản trị viên duy nhất đang hoạt động, hệ thống sẽ từ chối giáng cấp để tránh mất quyền quản trị hệ thống.</span>
              </div>
            )}

            <div className="form-group mb-3">
              <label htmlFor="userRoleSelect" className="form-label" style={{ fontWeight: 600 }}>
                Chọn vai trò mới <span className="text-danger">*</span>
              </label>
              <select
                id="userRoleSelect"
                className="form-control select-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isLoading || isSelf}
              >
                {ROLE_LIST.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
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
              disabled={isLoading || isSelf || role === user.role}
            >
              {isLoading ? 'Đang cập nhật...' : 'Cập nhật vai trò'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserRoleDialog;
