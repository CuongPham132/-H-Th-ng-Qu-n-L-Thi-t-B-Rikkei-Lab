import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import borrowingService from '../services/borrowing.service.js';
import { ROLES } from '../utils/constants.js';
import Icon from '../components/common/Icon.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Loading from '../components/common/Loading.jsx';

export function HomePage() {
  const { user } = useAuth();
  const role = user?.role;

  // Borrower dashboard data
  const [borrowerStats, setBorrowerStats] = useState({
    total: 0,
    pending: 0,
    borrowed: 0,
    returned: 0,
  });
  const [recentBorrowings, setRecentBorrowings] = useState([]);
  const [isLoadingBorrowerData, setIsLoadingBorrowerData] = useState(role === ROLES.BORROWER);

  useEffect(() => {
    if (role === ROLES.BORROWER) {
      let isMounted = true;
      async function fetchBorrowerData() {
        try {
          setIsLoadingBorrowerData(true);
          const res = await borrowingService.getBorrowings({ limit: 50 });
          const list = res.borrowings || [];

          let pendingCount = 0;
          let borrowedCount = 0;
          let returnedCount = 0;

          list.forEach((b) => {
            if (b.status === 'PENDING') pendingCount++;
            else if (b.status === 'BORROWED') borrowedCount++;
            else if (b.status === 'RETURNED') returnedCount++;
          });

          if (isMounted) {
            setBorrowerStats({
              total: res.pagination?.total || list.length,
              pending: pendingCount,
              borrowed: borrowedCount,
              returned: returnedCount,
            });
            setRecentBorrowings(list.slice(0, 5));
          }
        } catch (err) {
          console.error('Error fetching borrower dashboard data:', err);
        } finally {
          if (isMounted) {
            setIsLoadingBorrowerData(false);
          }
        }
      }
      fetchBorrowerData();
      return () => {
        isMounted = false;
      };
    }
  }, [role]);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const userInitial = user?.full_name ? user.full_name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <div className="home-page borrower-home-container">
      {/* ==================================================================== */}
      {/* 1. COMPACT PROFILE BAR (Loại bỏ khoảng trống thừa, phân cấp rõ ràng) */}
      {/* ==================================================================== */}
      <div className="borrower-profile-bar">
        <div className="profile-main-group">
          <div className="profile-avatar-circle" aria-hidden="true">
            {userInitial}
          </div>
          <div className="profile-text-group">
            <div className="profile-header-line">
              <h2 className="profile-user-fullname">{user?.full_name}</h2>
              <span className="profile-id-badge">ID #{user?.id}</span>
              <StatusBadge status={user?.role} />
              <span className="badge" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span className="status-dot" style={{ width: '6px', height: '6px' }}></span> Đang hoạt động
              </span>
            </div>
            <div className="profile-details-line">
              <span className="profile-meta-entry">
                <Icon name="mail" size={14} />
                <span>{user?.email}</span>
              </span>
              <span className="profile-meta-entry">
                <Icon name="phone" size={14} />
                <span>{user?.phone || 'Chưa cập nhật SĐT'}</span>
              </span>
              <span className="profile-meta-entry">
                <Icon name="box" size={14} />
                <span>Rikkei Lab • Quản lý thiết bị</span>
              </span>
            </div>
          </div>
        </div>

        <div className="profile-right-actions">
          {role === ROLES.BORROWER ? (
            <Link to="/borrower/borrowings/create" className="btn btn-primary btn-sm">
              <Icon name="plus" size={14} /> Tạo phiếu mượn mới
            </Link>
          ) : (
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
              Phiên đăng nhập an toàn
            </span>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. KHU VỰC DÀNH CHO BORROWER                                         */}
      {/* ==================================================================== */}
      {role === ROLES.BORROWER && (
        <>
          {/* 2.1. Thống kê tổng quan phiếu mượn (4 KPI compact cards) */}
          <div>
            <div className="home-section-header">
              <h3 className="home-section-title">
                <Icon name="clipboard" size={16} /> Tổng quan phiếu mượn
              </h3>
              <Link to="/borrower/borrowings" style={{ fontSize: '0.84rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                Chi tiết lịch sử &raquo;
              </Link>
            </div>

            {isLoadingBorrowerData ? (
              <Loading text="Đang đồng bộ thống kê phiếu mượn..." />
            ) : (
              <div className="kpi-compact-grid">
                <div className="kpi-compact-box">
                  <div className="kpi-compact-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                    <Icon name="clipboard" size={20} />
                  </div>
                  <div className="kpi-compact-data">
                    <span className="kpi-compact-title">Tổng số phiếu</span>
                    <span className="kpi-compact-number">{borrowerStats.total}</span>
                  </div>
                </div>

                <div className="kpi-compact-box">
                  <div className="kpi-compact-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                    <Icon name="clock" size={20} />
                  </div>
                  <div className="kpi-compact-data">
                    <span className="kpi-compact-title">Đang chờ duyệt</span>
                    <span className="kpi-compact-number text-amber">{borrowerStats.pending}</span>
                  </div>
                </div>

                <div className="kpi-compact-box">
                  <div className="kpi-compact-icon" style={{ backgroundColor: '#faf5ff', color: '#7c3aed' }}>
                    <Icon name="box" size={20} />
                  </div>
                  <div className="kpi-compact-data">
                    <span className="kpi-compact-title">Đang mượn</span>
                    <span className="kpi-compact-number text-purple">{borrowerStats.borrowed}</span>
                  </div>
                </div>

                <div className="kpi-compact-box">
                  <div className="kpi-compact-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                    <Icon name="check-circle" size={20} />
                  </div>
                  <div className="kpi-compact-data">
                    <span className="kpi-compact-title">Đã hoàn tất</span>
                    <span className="kpi-compact-number text-green">{borrowerStats.returned}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2.2. Quick Action Cards (Dạng lưới 2 cột) */}
          <div>
            <div className="home-section-header">
              <h3 className="home-section-title">
                <Icon name="dashboard" size={16} /> Truy cập nhanh chức năng
              </h3>
            </div>

            <div className="quick-action-grid-2col">
              <Link to="/borrower/equipments" className="quick-action-card-item">
                <div className="quick-action-icon-box qa-blue">
                  <Icon name="equipment" size={22} />
                </div>
                <div className="quick-action-body">
                  <h4 className="quick-action-heading">
                    Tra cứu danh mục thiết bị
                    <span className="quick-action-arrow">&rarr;</span>
                  </h4>
                  <p className="quick-action-description">
                    Xem toàn bộ laptop, màn hình, máy chiếu, switch mạng và dụng cụ thí nghiệm có sẵn trong kho.
                  </p>
                </div>
              </Link>

              <Link to="/borrower/borrowings/create" className="quick-action-card-item">
                <div className="quick-action-icon-box qa-green">
                  <Icon name="plus" size={22} />
                </div>
                <div className="quick-action-body">
                  <h4 className="quick-action-heading">
                    Tạo yêu cầu mượn thiết bị
                    <span className="quick-action-arrow">&rarr;</span>
                  </h4>
                  <p className="quick-action-description">
                    Đăng ký mượn một hoặc nhiều thiết bị cùng lúc với số ngày dự kiến (1–14 ngày) kèm mục đích sử dụng.
                  </p>
                </div>
              </Link>

              <Link to="/borrower/borrowings" className="quick-action-card-item">
                <div className="quick-action-icon-box qa-purple">
                  <Icon name="clipboard" size={22} />
                </div>
                <div className="quick-action-body">
                  <h4 className="quick-action-heading">
                    Lịch sử phiếu mượn của tôi
                    <span className="quick-action-arrow">&rarr;</span>
                  </h4>
                  <p className="quick-action-description">
                    Theo dõi trạng thái xét duyệt, thời hạn nhận máy tại Lab và quản lý hoàn trả thiết bị đúng hạn.
                  </p>
                </div>
              </Link>

              <Link to="/borrower" className="quick-action-card-item">
                <div className="quick-action-icon-box qa-amber">
                  <Icon name="dashboard" size={22} />
                </div>
                <div className="quick-action-body">
                  <h4 className="quick-action-heading">
                    Bảng điều khiển chi tiết
                    <span className="quick-action-arrow">&rarr;</span>
                  </h4>
                  <p className="quick-action-description">
                    Quản lý chuyên sâu các yêu cầu đang chờ phê duyệt, hủy yêu cầu mượn và xem chi tiết tồn kho liên quan.
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* 2.3. Danh sách phiếu mượn gần đây */}
          <div className="card mt-2">
            <div className="card-header flex-between">
              <h3 className="card-title">
                <Icon name="clock" size={16} style={{ marginRight: 6 }} />
                Phiếu mượn gần đây của bạn
              </h3>
              <Link to="/borrower/borrowings" className="btn btn-outline-sm">
                Xem toàn bộ &raquo;
              </Link>
            </div>

            <div className="card-body p-0">
              {isLoadingBorrowerData ? (
                <div className="p-4">
                  <Loading text="Đang tải danh sách phiếu gần đây..." />
                </div>
              ) : recentBorrowings.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mã phiếu</th>
                        <th>Mục đích mượn</th>
                        <th style={{ textAlign: 'center' }}>Số thiết bị</th>
                        <th style={{ textAlign: 'center' }}>Trạng thái</th>
                        <th>Ngày tạo</th>
                        <th style={{ textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBorrowings.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <Link
                              to={`/borrower/borrowings/${b.id}`}
                              style={{
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--color-primary)',
                              }}
                            >
                              {b.borrowing_code}
                            </Link>
                          </td>
                          <td style={{ maxWidth: '320px' }}>
                            <div className="truncate-text" title={b.purpose}>
                              {b.purpose}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {b.total_items || 1}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <StatusBadge status={b.status} />
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            {formatDate(b.created_at)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Link
                              to={`/borrower/borrowings/${b.id}`}
                              className="btn btn-outline-sm"
                            >
                              Chi tiết
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <EmptyState
                    icon="clipboard"
                    title="Chưa có yêu cầu mượn nào"
                    description="Bạn chưa tạo phiếu mượn thiết bị nào trong hệ thống Rikkei Lab."
                    action={
                      <Link to="/borrower/borrowings/create" className="btn btn-primary">
                        <Icon name="plus" size={15} /> Tạo yêu cầu mượn ngay
                      </Link>
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* 3. KHU VỰC DÀNH CHO STAFF & ADMIN TRÊN HOME PAGE                     */}
      {/* ==================================================================== */}
      {(role === ROLES.STAFF || role === ROLES.ADMIN) && (
        <div className="quick-action-grid-2col mt-2">
          <Link to="/staff" className="quick-action-card-item">
            <div className="quick-action-icon-box qa-blue">
              <Icon name="dashboard" size={22} />
            </div>
            <div className="quick-action-body">
              <h4 className="quick-action-heading">
                Bảng điều khiển Quản lý Lab
                <span className="quick-action-arrow">&rarr;</span>
              </h4>
              <p className="quick-action-description">
                Theo dõi các chỉ số KPI hoạt động phòng Lab, phiếu chờ duyệt, bàn giao và tiếp nhận hoàn trả.
              </p>
            </div>
          </Link>

          <Link to="/staff/borrowings" className="quick-action-card-item">
            <div className="quick-action-icon-box qa-green">
              <Icon name="clipboard" size={22} />
            </div>
            <div className="quick-action-body">
              <h4 className="quick-action-heading">
                Quản lý danh sách Mượn - Trả
                <span className="quick-action-arrow">&rarr;</span>
              </h4>
              <p className="quick-action-description">
                Xử lý duyệt đơn, từ chối, bàn giao thiết bị thực tế và tiếp nhận hoàn trả từ người mượn.
              </p>
            </div>
          </Link>

          {role === ROLES.ADMIN && (
            <>
              <Link to="/admin/equipments" className="quick-action-card-item">
                <div className="quick-action-icon-box qa-purple">
                  <Icon name="equipment" size={22} />
                </div>
                <div className="quick-action-body">
                  <h4 className="quick-action-heading">
                    Quản lý kho thiết bị
                    <span className="quick-action-arrow">&rarr;</span>
                  </h4>
                  <p className="quick-action-description">
                    Thêm mới thiết bị, chỉnh sửa cấu hình, điều chỉnh tổng số lượng và cập nhật trạng thái bảo trì.
                  </p>
                </div>
              </Link>

              <Link to="/admin/users" className="quick-action-card-item">
                <div className="quick-action-icon-box qa-amber">
                  <Icon name="users" size={22} />
                </div>
                <div className="quick-action-body">
                  <h4 className="quick-action-heading">
                    Phân quyền người dùng
                    <span className="quick-action-arrow">&rarr;</span>
                  </h4>
                  <p className="quick-action-description">
                    Tạo tài khoản cán bộ Lab, gán vai trò quyền hạn và quản lý kích hoạt tài khoản.
                  </p>
                </div>
              </Link>
            </>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. LAB BORROWING PROCESS GUIDE (Quy trình 4 bước tiêu chuẩn)         */}
      {/* ==================================================================== */}
      <div className="card roadmap-card mt-2">
        <div className="card-header">
          <h3 className="card-title">
            <Icon name="clipboard" size={16} style={{ marginRight: 8 }} />
            Quy trình Mượn & Trả Thiết bị Phòng Lab
          </h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>1</span>
                <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>Gửi yêu cầu mượn</strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Tra cứu thiết bị khả dụng trong kho và gửi phiếu mượn kèm mục đích sử dụng.
              </p>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#d97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>2</span>
                <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>Xét duyệt phiếu</strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Nhân viên Lab rà soát số lượng tồn kho và thông qua yêu cầu hợp lệ.
              </p>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>3</span>
                <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>Bàn giao thiết bị</strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Người mượn nhận thiết bị trực tiếp tại Lab trong vòng 48h và bắt đầu thời gian mượn.
              </p>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>4</span>
                <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>Nghiệm thu hoàn trả</strong>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                Kiểm tra tình trạng thiết bị khi hoàn trả và cập nhật lại kho khả dụng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
