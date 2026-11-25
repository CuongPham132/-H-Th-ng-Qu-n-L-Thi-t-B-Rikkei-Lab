import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import equipmentService from '../services/equipment.service.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Pagination from '../components/common/Pagination.jsx';
import EquipmentStatusDialog from '../components/admin/EquipmentStatusDialog.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { EQUIPMENT_STATUS_LIST } from '../utils/constants.js';

export function AdminEquipmentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialActive = searchParams.get('is_active') || '';

  const [equipments, setEquipments] = useState([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [activeFilter, setActiveFilter] = useState(initialActive);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Status modal state
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchEquipments = async (page = 1, search = '', category = '', status = '', is_active = '') => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const params = {
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (category.trim()) params.category = category.trim();
      if (status) params.status = status;
      if (is_active !== '') params.is_active = is_active;

      const data = await equipmentService.getEquipments(params);
      setEquipments(data.equipments);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching admin equipments:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách thiết bị.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const is_active = searchParams.get('is_active') || '';

    setSearchInput(search);
    setCategoryFilter(category);
    setStatusFilter(status);
    setActiveFilter(is_active);

    fetchEquipments(page, search, category, status, is_active);
  }, [searchParams]);

  const updateFilters = (newPage, newSearch, newCategory, newStatus, newActive) => {
    const nextParams = {};
    if (newPage > 1) nextParams.page = String(newPage);
    if (newSearch) nextParams.search = newSearch;
    if (newCategory) nextParams.category = newCategory;
    if (newStatus) nextParams.status = newStatus;
    if (newActive !== '') nextParams.is_active = newActive;
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters(1, searchInput.trim(), categoryFilter.trim(), statusFilter, activeFilter);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setCategoryFilter('');
    setStatusFilter('');
    setActiveFilter('');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    updateFilters(newPage, searchInput.trim(), categoryFilter.trim(), statusFilter, activeFilter);
  };

  const handleOpenStatusModal = (equipment) => {
    setSelectedEquipment(equipment);
    setShowStatusModal(true);
  };

  const handleConfirmStatusChange = async ({ status, is_active }) => {
    if (!selectedEquipment) return;
    try {
      setIsUpdatingStatus(true);
      setErrorMsg('');
      setActionSuccess('');

      await equipmentService.updateEquipmentStatus(selectedEquipment.id, { status, is_active });
      setActionSuccess(`Cập nhật trạng thái thiết bị "${selectedEquipment.code}" thành công.`);
      setShowStatusModal(false);
      await fetchEquipments(pagination.page, searchInput.trim(), categoryFilter.trim(), statusFilter, activeFilter);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Không thể cập nhật trạng thái thiết bị.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="admin-equipment-list-page">
      <div className="page-header-box">
        <div>
          <h1 className="page-title">📦 Quản lý Thiết bị Phòng Lab</h1>
          <p className="text-muted">
            Quản lý danh mục, tổng số lượng, trạng thái hoạt động và theo dõi tồn kho theo thời gian thực.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/admin/equipments/new" className="btn btn-primary btn-sm">
            ➕ Thêm thiết bị mới
          </Link>
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
          <div style={{ flex: '1 1 200px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Tìm theo mã hoặc tên..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Danh mục (vd: LAPTOP)..."
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val);
                updateFilters(1, searchInput.trim(), categoryFilter.trim(), val, activeFilter);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {EQUIPMENT_STATUS_LIST.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
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
                updateFilters(1, searchInput.trim(), categoryFilter.trim(), statusFilter, val);
              }}
            >
              <option value="">Tất cả hoạt động</option>
              <option value="1">Đang hoạt động (1)</option>
              <option value="0">Ngừng hoạt động (0)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-sm">
            Tìm kiếm
          </button>

          {(searchInput || categoryFilter || statusFilter || activeFilter !== '') && (
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

      {/* Equipment Table */}
      {isLoading ? (
        <Loading text="Đang tải danh sách thiết bị..." />
      ) : equipments.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Không tìm thấy thiết bị"
          description="Không có thiết bị nào khớp với điều kiện lọc hiện tại."
          actionText="Thêm thiết bị mới"
          onAction={() => window.location.assign('/admin/equipments/new')}
        />
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã thiết bị</th>
                    <th>Tên thiết bị</th>
                    <th>Danh mục</th>
                    <th style={{ textAlign: 'center' }}>Tổng số</th>
                    <th style={{ textAlign: 'center', color: '#16a34a' }}>Khả dụng</th>
                    <th style={{ textAlign: 'center', color: '#d97706' }}>Giữ chỗ</th>
                    <th style={{ textAlign: 'center', color: '#7c3aed' }}>Đang mượn</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Kích hoạt</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {equipments.map((eq) => (
                    <tr key={eq.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {eq.code}
                      </td>
                      <td>
                        <strong>{eq.name}</strong>
                      </td>
                      <td>
                        <span className="badge badge-light">{eq.category}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {eq.total_quantity}
                      </td>
                      <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
                        {eq.available_quantity}
                      </td>
                      <td style={{ textAlign: 'center', color: '#d97706', fontWeight: 600 }}>
                        {eq.reserved_quantity || 0}
                      </td>
                      <td style={{ textAlign: 'center', color: '#7c3aed', fontWeight: 600 }}>
                        {eq.borrowed_quantity || 0}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={eq.status} type="equipment" />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {Number(eq.is_active) === 1 ? (
                          <span className="status-badge badge-status-available">
                            <span className="status-badge-dot"></span> Active
                          </span>
                        ) : (
                          <span className="status-badge badge-status-rejected">
                            <span className="status-badge-dot"></span> Inactive
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <Link
                            to={`/admin/equipments/${eq.id}/edit`}
                            className="btn btn-outline btn-sm"
                          >
                            Sửa
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenStatusModal(eq)}
                          >
                            Đổi trạng thái
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Equipment Status Modal */}
      <EquipmentStatusDialog
        isOpen={showStatusModal}
        equipment={selectedEquipment}
        isLoading={isUpdatingStatus}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setShowStatusModal(false)}
      />
    </div>
  );
}

export default AdminEquipmentListPage;
