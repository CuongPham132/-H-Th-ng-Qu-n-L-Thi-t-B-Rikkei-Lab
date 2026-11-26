import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import ErrorMessage from '../../components/common/ErrorMessage.jsx';
import Loading from '../../components/common/Loading.jsx';
import Icon from '../../components/common/Icon.jsx';
import { isRouteAllowedForRole } from '../../utils/constants.js';

const QUICK_ACCOUNTS = [
  {
    role: 'ADMIN',
    roleLabel: 'Quản trị viên (ADMIN)',
    email: 'admin@rikkeilab.vn',
    password: 'Password@123',
    badgeClass: 'admin',
    desc: 'Quản lý toàn diện hệ thống, thiết bị và tài khoản',
  },
  {
    role: 'STAFF',
    roleLabel: 'Thủ kho / Kỹ thuật (STAFF)',
    email: 'staff@rikkeilab.vn',
    password: 'Password@123',
    badgeClass: 'staff',
    desc: 'Duyệt phiếu, bàn giao và tiếp nhận hoàn trả',
  },
  {
    role: 'BORROWER',
    roleLabel: 'Người mượn Lab (BORROWER)',
    email: 'borrower@rikkeilab.vn',
    password: 'Password@123',
    badgeClass: 'borrower',
    desc: 'Tra cứu danh mục thiết bị & tạo yêu cầu mượn',
  },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If initializing session, show loading to prevent flash of login UI
  if (isInitializing) {
    return <Loading fullScreen text="Đang kiểm tra phiên đăng nhập..." />;
  }

  // If already authenticated, redirect immediately
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleInputChange = (setter, field) => (e) => {
    setter(e.target.value);
    if (errorMsg) {
      setErrorMsg('');
      setErrorDetails(null);
    }
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    setErrorDetails(null);
    setFieldErrors({ email: '', password: '' });

    const errors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Vui lòng nhập địa chỉ email.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Địa chỉ email không đúng định dạng.';
      }
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Vui lòng kiểm tra lại thông tin đăng nhập.');
      return;
    }

    try {
      setIsSubmitting(true);
      const loggedInUser = await login({ email: trimmedEmail, password });

      const intendedPath = location.state?.from?.pathname || '/';
      const destination = isRouteAllowedForRole(intendedPath, loggedInUser.role) ? intendedPath : '/';

      navigate(destination, { replace: true });
    } catch (err) {
      const responseData = err.response?.data;
      setErrorMsg(responseData?.message || err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      setErrorDetails(responseData?.errors || null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setErrorMsg('');
    setErrorDetails(null);
    setFieldErrors({ email: '', password: '' });
  };

  const handleQuickLogin = async (e, acc) => {
    e.stopPropagation();
    if (isSubmitting) return;
    setEmail(acc.email);
    setPassword(acc.password);
    setErrorMsg('');
    setErrorDetails(null);
    setFieldErrors({ email: '', password: '' });

    try {
      setIsSubmitting(true);
      const loggedInUser = await login({ email: acc.email, password: acc.password });
      const intendedPath = location.state?.from?.pathname || '/';
      const destination = isRouteAllowedForRole(intendedPath, loggedInUser.role) ? intendedPath : '/';
      navigate(destination, { replace: true });
    } catch (err) {
      const responseData = err.response?.data;
      setErrorMsg(responseData?.message || err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
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
          <h2 className="auth-title">Đăng Nhập Rikkei Lab</h2>
          <p className="auth-subtitle">Hệ thống Quản lý Mượn/Trả Thiết bị Phòng Lab</p>
        </div>

        <ErrorMessage message={errorMsg} details={errorDetails} />

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Địa chỉ Email <span className="required">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              className={`form-control ${fieldErrors.email ? 'input-has-error' : ''}`}
              placeholder="ten.nguoidung@rikkeilab.vn"
              value={email}
              onChange={handleInputChange(setEmail, 'email')}
              disabled={isSubmitting}
              autoComplete="email"
              autoFocus
              required
            />
            {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Mật khẩu <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-control ${fieldErrors.password ? 'input-has-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={handleInputChange(setPassword, 'password')}
                disabled={isSubmitting}
                autoComplete="current-password"
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

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        {/* Quick Demo Accounts */}
        <div className="quick-login-section">
          <div className="quick-login-header">
            <span className="quick-login-title">Tài khoản điền sẵn (Thử nghiệm)</span>
            <span className="quick-login-hint">1 chạm để điền</span>
          </div>
          <div className="quick-login-list">
            {QUICK_ACCOUNTS.map((acc) => {
              const isSelected = email === acc.email;
              return (
                <div
                  key={acc.role}
                  className={`quick-account-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => handleQuickFill(acc)}
                  role="button"
                  tabIndex="0"
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickFill(acc)}
                  title={`Bấm để điền thông tin tài khoản ${acc.roleLabel}`}
                >
                  <div className="quick-account-info">
                    <span className={`quick-account-badge ${acc.badgeClass}`}>
                      {acc.role}
                    </span>
                    <div className="quick-account-meta">
                      <span className="quick-account-role">{acc.roleLabel}</span>
                      <span className="quick-account-creds">
                        {acc.email} • {acc.password}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                    onClick={(e) => handleQuickLogin(e, acc)}
                    disabled={isSubmitting}
                    title={`Đăng nhập trực tiếp với vai trò ${acc.role}`}
                  >
                    Vào ngay &rarr;
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Chưa có tài khoản?{' '}
            <Link to="/register" className="auth-link">
              Đăng ký tài khoản người mượn
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
