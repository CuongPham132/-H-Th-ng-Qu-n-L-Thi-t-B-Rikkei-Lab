import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth.js';
import userService from '../services/user.service.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Pagination from '../components/common/Pagination.jsx';
import UserFormDialog from '../components/admin/UserFormDialog.jsx';
import UserRoleDialog from '../components/admin/UserRoleDialog.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { ROLE_LIST } from '../utils/constants.js';

export function AdminUserListPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async (page = 1, search = '', role = '', is_active = '') => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const params = {
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (role) params.role = role;
      if (is_active !== '') params.is_active = is_active;

      const data = await userService.getUsers(params);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching admin users:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, searchInput, roleFilter, activeFilter);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1, searchInput, roleFilter, activeFilter);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setRoleFilter('');
    setActiveFilter('');
    fetchUsers(1, '', '', '');
  };

  const handlePageChange = (newPage) => {
    fetchUsers(newPage, searchInput, roleFilter, activeFilter);
  };

  // Create User
  const handleCreateUser = async (userData) => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setActionSuccess('');

      const created = await userService.createUser(userData);
      setActionSuccess(`Tạo tài khoản "${created.email}" thành công với vai trò ${created.role}.`);
      setShowCreateModal(false);
      await fetchUsers(pagination.page, searchInput, roleFilter, activeFilter);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể tạo tài khoản người dùng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change Role
  const handleOpenRoleModal = (u) => {
    setSelectedUser(u);
    setShowRoleModal(true);
  };

  const handleConfirmRoleChange = async (newRole) => {
    if (!selectedUser) return;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setActionSuccess('');

      await userService.updateUserRole(selectedUser.id, newRole);
      setActionSuccess(`Cập nhật vai trò tài khoản "${selectedUser.email}" thành ${newRole} thành công.`);
      setShowRoleModal(false);
      await fetchUsers(pagination.page, searchInput, roleFilter, activeFilter);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể thay đổi vai trò người dùng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status (Activate / Deactivate)
  const handleOpenStatusModal = (u) => {
    setSelectedUser(u);
    setShowStatusModal(true);
  };

  const handleConfirmStatusToggle = async () => {
    if (!selectedUser) return;
    const nextStatus = Number(selectedUser.is_active) === 1 ? 0 : 1;
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setActionSuccess('');

      await userService.updateUserStatus(selectedUser.id, nextStatus);
      setActionSuccess(
        nextStatus === 1
          ? `Kích hoạt tài khoản "${selectedUser.email}" thành công.`
          : `Vô hiệu hóa tài khoản "${selectedUser.email}" thành công.`
      );
      setShowStatusModal(false);
      await fetchUsers(pagination.page, searchInput, roleFilter, activeFilter);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="admin-user-list-page">
      <div className="page-header-box">
        <div>
          <h1 className="page-title">👥 Quản lý Người dùng Hệ thống</h1>
          <p className="text-muted">
            Phân quyền tài khoản (ADMIN, STAFF, BORROWER), tạo tài khoản và kiểm soát kích hoạt/vô hiệu hóa.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Tạo tài khoản mới
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="notice-banner mb-3" style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#166534' }}>
          ✅ {actionSuccess}
        </div>
      )}
      {errorMsg && <ErrorMessage message={errorMsg} />}

      {/* Filter and Search Bar */}
      <div className="filter-bar card p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="filter-form" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 220px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Tìm theo tên, email, SĐT..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => {
                const val = e.target.value;
                setRoleFilter(val);
                fetchUsers(1, searchInput, val, activeFilter);
              }}
            >
              <option value="">Tất cả vai trò</option>
              {ROLE_LIST.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-select"
              value={activeFilter}
              onChange={(e) => {
                const val = e.target.value;
                setActiveFilter(val);
                fetchUsers(1, searchInput, roleFilter, val);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="1">Đang hoạt động (1)</option>
              <option value="0">Đã vô hiệu hóa (0)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            Tìm kiếm
          </button>

          {(searchInput || roleFilter || activeFilter !== '') && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleResetFilters}
            >
              Đặt lại
            </button>
          )}
        </form>
      </div>

      {/* User Table */}
      {isLoading ? (
        <Loading text="Đang tải danh sách người dùng..." />
      ) : users.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Không tìm thấy người dùng"
          description="Không có tài khoản người dùng nào khớp với bộ lọc."
          actionText="Tạo tài khoản mới"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ và tên</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th style={{ textAlign: 'center' }}>Vai trò</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isActive = Number(u.is_active) === 1;

                    return (
                      <tr key={u.id} style={{ background: isSelf ? '#f0fdf4' : 'inherit' }}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          #{u.id}
                        </td>
                        <td>
                          <strong>{u.full_name}</strong>
                          {isSelf && (
                            <span className="badge badge-primary" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
                              Bạn
                            </span>
                          )}
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <StatusBadge status={u.role} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isActive ? (
                            <span className="status-badge badge-status-available">
                              <span className="status-badge-dot"></span> Hoạt động
                            </span>
                          ) : (
                            <span className="status-badge badge-status-rejected">
                              <span className="status-badge-dot"></span> Vô hiệu hóa
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{formatDate(u.created_at)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleOpenRoleModal(u)}
                              disabled={isSelf}
                              title={isSelf ? 'Không thể tự đổi vai trò của chính mình' : 'Thay đổi vai trò'}
                            >
                              Đổi vai trò
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${isActive ? 'btn-outline-danger' : 'btn-outline'}`}
                              onClick={() => handleOpenStatusModal(u)}
                              disabled={isSelf}
                              title={isSelf ? 'Không thể tự vô hiệu hóa tài khoản của chính mình' : isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {isActive ? 'Khóa' : 'Kích hoạt'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card-footer p-3">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              limit={pagination.limit}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <UserFormDialog
        isOpen={showCreateModal}
        isLoading={isSubmitting}
        onConfirm={handleCreateUser}
        onCancel={() => setShowCreateModal(false)}
      />

      {/* Role Modal */}
      <UserRoleDialog
        isOpen={showRoleModal}
        user={selectedUser}
        currentAdminId={currentUser?.id}
        isLoading={isSubmitting}
        onConfirm={handleConfirmRoleChange}
        onCancel={() => setShowRoleModal(false)}
      />

      {/* Status Toggle Modal */}
      <ConfirmDialog
        isOpen={showStatusModal}
        title={Number(selectedUser?.is_active) === 1 ? 'Khóa tài khoản người dùng' : 'Kích hoạt tài khoản người dùng'}
        message={
          Number(selectedUser?.is_active) === 1
            ? `Bạn có chắc chắn muốn vô hiệu hóa tài khoản "${selectedUser?.email}"? Người dùng này sẽ không thể đăng nhập vào hệ thống.`
            : `Bạn có muốn kích hoạt lại tài khoản "${selectedUser?.email}"? Người dùng sẽ có thể đăng nhập bình thường.`
        }
        confirmText={Number(selectedUser?.is_active) === 1 ? 'Xác nhận khóa' : 'Kích hoạt'}
        confirmVariant={Number(selectedUser?.is_active) === 1 ? 'danger' : 'primary'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmStatusToggle}
        onCancel={() => setShowStatusModal(false)}
      />
    </div>
  );
}

export default AdminUserListPage;
