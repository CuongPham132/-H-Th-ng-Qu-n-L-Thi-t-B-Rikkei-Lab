import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import equipmentService from '../services/equipment.service.js';
import EquipmentCard from '../components/equipment/EquipmentCard.jsx';
import EquipmentTable from '../components/equipment/EquipmentTable.jsx';
import Pagination from '../components/common/Pagination.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Icon from '../components/common/Icon.jsx';

export function EquipmentListPage() {
  const [equipments, setEquipments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const fetchEquipments = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const params = {
        page,
        limit: 8,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (categoryFilter.trim()) params.category = categoryFilter.trim();

      const res = await equipmentService.getEquipments(params);
      setEquipments(res.equipments);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Error fetching equipments:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể tải danh sách thiết bị.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    fetchEquipments(1);
  }, [fetchEquipments]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEquipments(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
  };

  const displayedEquipments = [...equipments].sort((a, b) => {
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'vi');
    if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'vi');
    if (sortBy === 'avail_desc') return (b.available_quantity || 0) - (a.available_quantity || 0);
    return 0;
  });

  return (
    <div className="equipment-list-page">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Danh Mục Thiết Bị Khả Dụng</h2>
          <p className="text-muted">
            Duyệt và tìm kiếm các thiết bị đang sẵn sàng để tạo yêu cầu mượn nghiên cứu.
          </p>
        </div>
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('grid')}
            title="Xem dạng lưới"
          >
            <Icon name="grid" size={14} /> Dạng lưới
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('table')}
            title="Xem dạng bảng"
          >
            <Icon name="list" size={14} /> Dạng bảng
          </button>
        </div>
      </div>

      <ErrorMessage message={errorMsg} />

      {/* Filter and Search Bar */}
      <div className="card filter-card">
        <form onSubmit={handleSearchSubmit} className="filter-form">
          <div className="search-input-group">
            <span className="search-icon">
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              className="form-control search-input"
              placeholder="Tìm theo tên hoặc mã thiết bị..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-select-group">
            <select
              className="form-control select-control"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">-- Tất cả danh mục --</option>
              <option value="LAPTOP">Laptop</option>
              <option value="PROJECTOR">Máy chiếu (Projector)</option>
              <option value="MONITOR">Màn hình (Monitor)</option>
              <option value="LAB_TOOL">Dụng cụ thí nghiệm (Lab Tool)</option>
              <option value="NETWORK">Thiết bị mạng (Network)</option>
              <option value="ACCESSORY">Phụ kiện (Accessory)</option>
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control select-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sắp xếp"
            >
              <option value="default">Sắp xếp: Mặc định</option>
              <option value="name_asc">Tên (A &rarr; Z)</option>
              <option value="name_desc">Tên (Z &rarr; A)</option>
              <option value="avail_desc">Khả dụng (&darr;)</option>
            </select>
          </div>

          <div className="filter-actions">
            <button type="submit" className="btn btn-primary">
              <Icon name="search" size={14} /> Tìm kiếm
            </button>
            {(searchTerm || categoryFilter) && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleResetFilters}
              >
                Đặt lại
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Content Rendering */}
      {isLoading ? (
        <Loading text="Đang tải danh sách thiết bị..." />
      ) : equipments.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="equipment-grid">
              {displayedEquipments.map((eq) => (
                <EquipmentCard key={eq.id} equipment={eq} />
              ))}
            </div>
          ) : (
            <div className="card p-0">
              <EquipmentTable equipments={displayedEquipments} />
            </div>
          )}

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={(newPage) => fetchEquipments(newPage)}
          />
        </>
      ) : (
        <EmptyState
          icon="search"
          title="Không tìm thấy thiết bị phù hợp"
          description="Không có thiết bị khả dụng nào khớp với tiêu chí tìm kiếm của bạn."
          action={
            (searchTerm || categoryFilter) ? (
              <button type="button" className="btn btn-outline" onClick={handleResetFilters}>
                Xóa bộ lọc tìm kiếm
              </button>
            ) : null
          }
        />
      )}
    </div>
  );
}

export default EquipmentListPage;
