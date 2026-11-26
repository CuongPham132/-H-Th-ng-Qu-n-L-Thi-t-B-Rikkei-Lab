import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import ErrorMessage from '../../components/common/ErrorMessage.jsx';
import Loading from '../../components/common/Loading.jsx';
import Icon from '../../components/common/Icon.jsx';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();

  if (isInitializing) {
    return <Loading fullScreen text="Đang kiểm tra phiên đăng nhập..." />;
  }

  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) {
      setErrorMsg('');
      setErrorDetails(null);
    }
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    setErrorDetails(null);
    setFieldErrors({});
    setSuccessMsg('');

    const fullNameTrimmed = formData.full_name.trim();
    const emailTrimmed = formData.email.trim();
    const phoneTrimmed = formData.phone.trim();

    const errors = {};

    // Client-side validations
    if (!fullNameTrimmed) {
      errors.full_name = 'Vui lòng nhập họ và tên.';
    } else if (fullNameTrimmed.length < 2 || fullNameTrimmed.length > 100) {
      errors.full_name = 'Họ và tên phải có độ dài từ 2 đến 100 ký tự.';
    }

    if (!emailTrimmed) {
      errors.email = 'Vui lòng nhập địa chỉ email.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        errors.email = 'Địa chỉ email không đúng định dạng.';
      }
    }

    if (!formData.password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    } else if (formData.password.length < 8) {
      errors.password = 'Mật khẩu bắt buộc và phải có ít nhất 8 ký tự.';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp với mật khẩu đã nhập.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Vui lòng kiểm tra và sửa các thông tin bên dưới.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Business Rule: Role cannot be selected by user. Backend automatically enforces BORROWER.
      await register({
        full_name: fullNameTrimmed,
        email: emailTrimmed,
        phone: phoneTrimmed || undefined,
        password: formData.password,
      });

      setSuccessMsg('Đăng ký tài khoản thành công! Vui lòng đăng nhập với tài khoản vừa tạo.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      const responseData = err.response?.data;
      setErrorMsg(responseData?.message || err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
      setErrorDetails(responseData?.errors || null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">RL</div>
          <h2 className="auth-title">Đăng Ký Tài Khoản</h2>
          <p className="auth-subtitle">Tài khoản đăng ký mặc định có vai trò Người mượn</p>
        </div>

        <ErrorMessage message={errorMsg} details={errorDetails} />

        {successMsg && (
          <div className="success-banner" role="status">
            <span className="success-icon">
              <Icon name="check-circle" size={18} color="var(--color-success)" />
            </span>
            <div className="success-content">
              <p className="success-text">{successMsg}</p>
              <Link to="/login" className="btn btn-sm btn-primary mt-2">
                Đến trang Đăng Nhập
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">
              Họ và tên <span className="required">*</span>
            </label>
            <input
              id="reg-name"
              type="text"
              name="full_name"
              className={`form-control ${fieldErrors.full_name ? 'input-has-error' : ''}`}
              placeholder="Nguyễn Văn A"
              value={formData.full_name}
              onChange={handleChange}
              disabled={isSubmitting}
              autoFocus
              required
            />
            {fieldErrors.full_name && <span className="field-error-text">{fieldErrors.full_name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Địa chỉ Email <span className="required">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              name="email"
              className={`form-control ${fieldErrors.email ? 'input-has-error' : ''}`}
              placeholder="ten.nguoidung@rikkeilab.vn"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />
            {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reg-phone" className="form-label">
              Số điện thoại
            </label>
            <input
              id="reg-phone"
              type="tel"
              name="phone"
              className="form-control"
              placeholder="0912345678"
              value={formData.phone}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group form-col">
              <label htmlFor="reg-password" className="form-label">
                Mật khẩu <span className="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={`form-control ${fieldErrors.password ? 'input-has-error' : ''}`}
                  placeholder="Tối thiểu 8 ký tự"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  tabIndex="-1"
                >
                  <Icon name="eye" size={16} />
                </button>
              </div>
              {fieldErrors.password && <span className="field-error-text">{fieldErrors.password}</span>}
            </div>

            <div className="form-group form-col">
              <label htmlFor="reg-confirm-password" className="form-label">
                Xác nhận mật khẩu <span className="required">*</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className={`form-control ${fieldErrors.confirmPassword ? 'input-has-error' : ''}`}
                  placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  tabIndex="-1"
                >
                  <Icon name="eye" size={16} />
                </button>
              </div>
              {fieldErrors.confirmPassword && <span className="field-error-text">{fieldErrors.confirmPassword}</span>}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Đã có tài khoản?{' '}
            <Link to="/login" className="auth-link">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
