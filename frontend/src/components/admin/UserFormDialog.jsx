import React, { useState } from 'react';
import { ROLE_LIST } from '../../utils/constants.js';

/**
 * UserFormDialog Component
 * Modal for creating a new user account (STAFF, BORROWER, ADMIN)
 */
export function UserFormDialog({
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'BORROWER',
    phone: '',
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email là trường bắt buộc.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Email không đúng định dạng.';
    }

    if (!formData.password) {
      newErrors.password = 'Mật khẩu là trường bắt buộc.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Họ và tên là trường bắt buộc.';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Họ và tên phải có ít nhất 2 ký tự.';
    }

    if (!formData.role) {
      newErrors.role = 'Vai trò là trường bắt buộc.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onConfirm({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      full_name: formData.full_name.trim(),
      role: formData.role,
      phone: formData.phone.trim() || null,
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
      <div className="modal-card modal-card-md">
        <div className="modal-header">
          <h3 id="create-user-title" className="modal-title">
            👤 Tạo tài khoản người dùng mới
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
            <div className="form-group mb-2">
              <label htmlFor="createEmail" className="form-label" style={{ fontWeight: 600 }}>
                Địa chỉ Email <span className="text-danger">*</span>
              </label>
              <input
                id="createEmail"
                name="email"
                type="email"
                className={`form-input ${errors.email ? 'border-danger' : ''}`}
                placeholder="example@rikkeilab.vn"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
              {errors.email && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{errors.email}</span>}
            </div>

            <div className="form-group mb-2">
              <label htmlFor="createPassword" className="form-label" style={{ fontWeight: 600 }}>
                Mật khẩu ban đầu <span className="text-danger">*</span>
              </label>
              <input
                id="createPassword"
                name="password"
                type="password"
                className={`form-input ${errors.password ? 'border-danger' : ''}`}
                placeholder="Tối thiểu 8 ký tự..."
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
              {errors.password && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{errors.password}</span>}
            </div>

            <div className="form-group mb-2">
              <label htmlFor="createFullName" className="form-label" style={{ fontWeight: 600 }}>
                Họ và tên <span className="text-danger">*</span>
              </label>
              <input
                id="createFullName"
                name="full_name"
                type="text"
                className={`form-input ${errors.full_name ? 'border-danger' : ''}`}
                placeholder="Nguyễn Văn A"
                value={formData.full_name}
                onChange={handleChange}
                disabled={isLoading}
              />
              {errors.full_name && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{errors.full_name}</span>}
            </div>

            <div className="form-group mb-2">
              <label htmlFor="createRole" className="form-label" style={{ fontWeight: 600 }}>
                Vai trò (Role) <span className="text-danger">*</span>
              </label>
              <select
                id="createRole"
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
                disabled={isLoading}
              >
                {ROLE_LIST.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group mb-2">
              <label htmlFor="createPhone" className="form-label" style={{ fontWeight: 600 }}>
                Số điện thoại (tùy chọn)
              </label>
              <input
                id="createPhone"
                name="phone"
                type="text"
                className="form-input"
                placeholder="0912345678"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
              />
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
              {isLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormDialog;
