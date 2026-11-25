import React from 'react';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <div className="notfound-code">404</div>
        <h2 className="notfound-title">Trang Không Tồn Tại</h2>
        <p className="notfound-desc">
          Đường dẫn bạn yêu cầu không tồn tại trong hệ thống Rikkei Lab hoặc đã bị di chuyển.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/')}
        >
          Về Trang Chủ
        </button>
      </div>
    </div>
  );
}

export default NotFoundPage;
