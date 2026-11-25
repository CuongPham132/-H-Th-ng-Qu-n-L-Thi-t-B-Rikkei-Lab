import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge.jsx';

/**
 * EquipmentCard Component
 * Displays equipment item in grid view
 */
export function EquipmentCard({ equipment }) {
  if (!equipment) return null;

  const isAvailable = equipment.available_quantity > 0 && equipment.status === 'AVAILABLE';

  return (
    <div className="equipment-card">
      <div className="equipment-card-header">
        <span className="equipment-code">{equipment.code}</span>
        <StatusBadge status={equipment.status} type="equipment" />
      </div>

      <div className="equipment-card-body">
        <h4 className="equipment-name" title={equipment.name}>
          {equipment.name}
        </h4>
        <span className="equipment-category">
          📂 {equipment.category}
        </span>
        <p className="equipment-desc">
          {equipment.description || 'Không có mô tả chi tiết.'}
        </p>

        <div className="equipment-stock-info">
          <div className="stock-pill">
            <span className="stock-label">Khả dụng:</span>
            <span className={`stock-number ${isAvailable ? 'text-success' : 'text-danger'}`}>
              {equipment.available_quantity} / {equipment.total_quantity}
            </span>
          </div>
        </div>
      </div>

      <div className="equipment-card-footer">
        <Link
          to={`/borrower/equipments/${equipment.id}`}
          className="btn btn-outline-sm btn-block"
        >
          Xem chi tiết
        </Link>
        {isAvailable && (
          <Link
            to={`/borrower/borrowings/create?equipment_id=${equipment.id}`}
            className="btn btn-primary btn-sm btn-block"
          >
            Mượn ngay
          </Link>
        )}
      </div>
    </div>
  );
}

export default EquipmentCard;
