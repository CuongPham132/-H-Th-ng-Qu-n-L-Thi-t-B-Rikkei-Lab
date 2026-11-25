import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge.jsx';

/**
 * BorrowingTable Component
 * Displays borrowings in a standardized table
 * @param {Object} props
 * @param {Array} props.borrowings - List of borrowing items
 * @param {Function} [props.onCancel] - Callback when user clicks Cancel button
 */
export function BorrowingTable({ borrowings = [], onCancel }) {
  if (!borrowings || borrowings.length === 0) {
    return null;
  }

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Mã Phiếu</th>
            <th>Mục Đích</th>
            <th className="text-center">Số Thiết Bị</th>
            <th>Trạng Thái</th>
            <th>Ngày Tạo</th>
            <th>Hạn Trả / Hạn Nhận</th>
            <th className="text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {borrowings.map((b) => {
            const canCancel = b.status === 'PENDING' || b.status === 'APPROVED';
            return (
              <tr key={b.id}>
                <td>
                  <Link
                    to={`/borrower/borrowings/${b.id}`}
                    className="code-tag font-bold link-code"
                  >
                    {b.borrowing_code}
                  </Link>
                </td>
                <td>
                  <span className="purpose-text" title={b.purpose}>
                    {b.purpose}
                  </span>
                </td>
                <td className="text-center font-bold">
                  {b.total_items || (b.items ? b.items.length : 1)} món
                </td>
                <td>
                  <StatusBadge status={b.status} type="borrowing" />
                </td>
                <td>
                  <span className="date-text">{formatDate(b.created_at)}</span>
                </td>
                <td>
                  {b.status === 'APPROVED' && b.pickup_deadline && (
                    <span className="deadline-badge" title="Hạn nhận thiết bị">
                      Nhận trước: {formatDate(b.pickup_deadline)}
                    </span>
                  )}
                  {b.status === 'BORROWED' && b.due_date && (
                    <span className="due-badge" title="Hạn trả thiết bị">
                      Hạn trả: {formatDate(b.due_date)}
                    </span>
                  )}
                  {(!b.pickup_deadline && !b.due_date) && (
                    <span className="date-text">—</span>
                  )}
                </td>
                <td className="text-right">
                  <div className="table-actions">
                    <Link
                      to={`/borrower/borrowings/${b.id}`}
                      className="btn btn-outline-sm"
                    >
                      Chi tiết
                    </Link>
                    {canCancel && onCancel && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => onCancel(b)}
                        title="Hủy yêu cầu mượn này"
                      >
                        Hủy đơn
                      </button>
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

export default BorrowingTable;
