import React, { useState, useEffect } from 'react';
import { EQUIPMENT_STATUS_LIST } from '../../utils/constants.js';

/**
 * EquipmentStatusDialog Component
 * Modal for changing equipment status and active state
 */
export function EquipmentStatusDialog({
  isOpen,
  equipment,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const [status, setStatus] = useState('AVAILABLE');
  const [isActive, setIsActive] = useState(1);

  useEffect(() => {
    if (equipment) {
      setStatus(equipment.status || 'AVAILABLE');
      setIsActive(Number(equipment.is_active) === 1 ? 1 : 0);
    }
  }, [equipment, isOpen]);

  if (!isOpen || !equipment) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      status,
      is_active: isActive,
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="eq-status-title">
      <div className="modal-card modal-card-md">
        <div className="modal-header">
          <h3 id="eq-status-title" className="modal-title">
            ⚙️ Cập nhật trạng thái thiết bị
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
            <p className="modal-message mb-3">
              Cập nhật trạng thái vận hành cho <strong>{equipment.name}</strong> ({equipment.code}).
            </p>

            <div className="form-group mb-3">
              <label htmlFor="equipmentStatus" className="form-label" style={{ fontWeight: 600 }}>
                Trạng thái sử dụng <span className="text-danger">*</span>
              </label>
              <select
                id="equipmentStatus"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isLoading}
              >
                {EQUIPMENT_STATUS_LIST.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group mb-3">
              <label htmlFor="equipmentActive" className="form-label" style={{ fontWeight: 600 }}>
                Tình trạng hoạt động hệ thống <span className="text-danger">*</span>
              </label>
              <select
                id="equipmentActive"
                className="form-select"
                value={isActive}
                onChange={(e) => setIsActive(Number(e.target.value))}
                disabled={isLoading}
              >
                <option value={1}>Hoạt động (Hiển thị trong hệ thống)</option>
                <option value={0}>Ngừng hoạt động / Tạm khóa (Ẩn khỏi Borrower)</option>
              </select>
            </div>

            <div className="notice-banner" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
              ℹ️ Thiết bị chỉ có thể được mượn khi ở trạng thái <strong>AVAILABLE</strong> và kích hoạt <strong>Hoạt động</strong>.
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
              {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EquipmentStatusDialog;
