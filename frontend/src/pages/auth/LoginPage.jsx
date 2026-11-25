import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import ErrorMessage from '../../components/common/ErrorMessage.jsx';
import Loading from '../../components/common/Loading.jsx';
import { isRouteAllowedForRole } from '../../utils/constants.js';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
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

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (errorMsg) {
      setErrorMsg('');
      setErrorDetails(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    setErrorDetails(null);

    // Client-side quick checks
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Địa chỉ email không đúng định dạng.');
      return;
    }

    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      setIsSubmitting(true);
      const loggedInUser = await login({ email: trimmedEmail, password });

      // Determine destination route
      const intendedPath = location.state?.from?.pathname || '/';
      // Only redirect to intendedPath if user's role is permitted
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
          <p className="auth-subtitle">Hệ thống Quản lý Mượn/Trả Thiết bị Nghiên cứu</p>
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
              className="form-control"
              placeholder="ten.nguoidung@rikkeilab.vn"
              value={email}
              onChange={handleInputChange(setEmail)}
              disabled={isSubmitting}
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Mật khẩu <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={handleInputChange(setPassword)}
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
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Chưa có tài khoản?{' '}
            <Link to="/register" className="auth-link">
              Đăng ký tài khoản Borrower
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
