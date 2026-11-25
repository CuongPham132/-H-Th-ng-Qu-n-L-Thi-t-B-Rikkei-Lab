import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge.jsx';

/**
 * EquipmentTable Component
 * Displays equipment list in table view
 */
export function EquipmentTable({ equipments = [] }) {
  if (!equipments || equipments.length === 0) {
    return null;
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Mã Thiết Bị</th>
            <th>Tên Thiết Bị</th>
            <th>Danh Mục</th>
            <th className="text-center">Số Lượng Khả Dụng</th>
            <th>Trạng Thái</th>
            <th className="text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {equipments.map((eq) => {
            const isAvailable = eq.available_quantity > 0 && eq.status === 'AVAILABLE';
            return (
              <tr key={eq.id}>
                <td>
                  <span className="code-tag">{eq.code}</span>
                </td>
                <td>
                  <Link
                    to={`/borrower/equipments/${eq.id}`}
                    className="table-link-title"
                  >
                    {eq.name}
                  </Link>
                  {eq.description && (
                    <span className="table-subtext">{eq.description}</span>
                  )}
                </td>
                <td>
                  <span className="category-pill">{eq.category}</span>
                </td>
                <td className="text-center">
                  <span className={`stock-badge ${isAvailable ? 'available' : 'unavailable'}`}>
                    {eq.available_quantity} / {eq.total_quantity}
                  </span>
                </td>
                <td>
                  <StatusBadge status={eq.status} type="equipment" />
                </td>
                <td className="text-right">
                  <div className="table-actions">
                    <Link
                      to={`/borrower/equipments/${eq.id}`}
                      className="btn btn-outline-sm"
                    >
                      Chi tiết
                    </Link>
                    {isAvailable && (
                      <Link
                        to={`/borrower/borrowings/create?equipment_id=${eq.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        Mượn
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default EquipmentTable;
