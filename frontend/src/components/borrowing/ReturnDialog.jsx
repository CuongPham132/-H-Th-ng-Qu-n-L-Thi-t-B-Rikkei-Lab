import React, { useState, useEffect } from 'react';

/**
 * ReturnDialog Component
 * Modal for receiving returned equipment (Full or Partial return) (UC12)
 */
export function ReturnDialog({
  isOpen,
  borrowing,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const [returnItems, setReturnItems] = useState({});
  const [returnAll, setReturnAll] = useState(true);
  const [validationError, setValidationError] = useState('');

  // Initialize return quantities when modal opens
  useEffect(() => {
    if (borrowing && borrowing.items) {
      const initialMap = {};
      borrowing.items.forEach((item) => {
        const unreturned = Math.max(0, item.quantity - (item.returned_quantity || 0));
        initialMap[item.equipment_id] = unreturned;
      });
      setReturnItems(initialMap);
      setReturnAll(true);
      setValidationError('');
    }
  }, [borrowing, isOpen]);

  if (!isOpen || !borrowing) return null;

  const handleQtyChange = (equipmentId, val, maxVal) => {
    const num = val === '' ? 0 : parseInt(val, 10);
    if (isNaN(num)) return;
    setReturnItems((prev) => ({
      ...prev,
      [equipmentId]: Math.min(Math.max(0, num), maxVal),
    }));
    if (validationError) setValidationError('');
  };

  const fillAllRemaining = () => {
    const fullMap = {};
    borrowing.items?.forEach((item) => {
      const unreturned = Math.max(0, item.quantity - (item.returned_quantity || 0));
      fullMap[item.equipment_id] = unreturned;
    });
    setReturnItems(fullMap);
    setReturnAll(true);
    setValidationError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (returnAll) {
      // Return ALL remaining items (null payload sends empty items which backend interprets as full return)
      onConfirm(null);
      return;
    }

    // Specific/Partial return
    const itemsPayload = [];
    let totalReturnQty = 0;

    for (const item of borrowing.items || []) {
      const unreturned = Math.max(0, item.quantity - (item.returned_quantity || 0));
      const qty = returnItems[item.equipment_id] || 0;

      if (qty > unreturned) {
        setValidationError(`Số lượng trả của "${item.equipment_name}" (${qty}) vượt quá số lượng chưa trả (${unreturned}).`);
        return;
      }

      if (qty > 0) {
        itemsPayload.push({
          equipment_id: item.equipment_id,
          return_quantity: qty,
        });
        totalReturnQty += qty;
      }
    }

    if (totalReturnQty === 0) {
      setValidationError('Vui lòng chọn hoặc nhập số lượng ít nhất 1 thiết bị cần hoàn trả.');
      return;
    }

    setValidationError('');
    onConfirm(itemsPayload);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="return-dialog-title">
      <div className="modal-card modal-card-lg">
        <div className="modal-header">
          <h3 id="return-dialog-title" className="modal-title">
            📥 Tiếp nhận hoàn trả thiết bị
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
              Tiếp nhận thiết bị hoàn trả từ người mượn <strong>{borrowing.borrower_name}</strong> (Mã đơn:{' '}
              <strong>{borrowing.borrowing_code}</strong>).
            </p>

            <div className="flex-between mb-3" style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="returnMode"
                    checked={returnAll}
                    onChange={() => {
                      setReturnAll(true);
                      fillAllRemaining();
                    }}
                    disabled={isLoading}
                  />
                  Trả toàn bộ thiết bị còn lại
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="radio"
                    name="returnMode"
                    checked={!returnAll}
                    onChange={() => setReturnAll(false)}
                    disabled={isLoading}
                  />
                  Trả một phần / Tùy chỉnh số lượng
                </label>
              </div>
              {!returnAll && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={fillAllRemaining}
                  disabled={isLoading}
                >
                  Điền tối đa
                </button>
              )}
            </div>

            <div className="table-responsive mb-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Thiết bị</th>
                    <th style={{ textAlign: 'center' }}>Đã mượn</th>
                    <th style={{ textAlign: 'center' }}>Đã trả</th>
                    <th style={{ textAlign: 'center' }}>Còn nợ</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Số lượng trả lần này</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowing.items?.map((item) => {
                    const unreturned = Math.max(0, item.quantity - (item.returned_quantity || 0));
                    const isFullyReturned = unreturned === 0;

                    return (
                      <tr key={item.id} style={{ opacity: isFullyReturned ? 0.6 : 1 }}>
                        <td>
                          <strong>{item.equipment_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {item.equipment_code}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                          {item.returned_quantity || 0}
                        </td>
                        <td style={{ textAlign: 'center', color: isFullyReturned ? 'inherit' : '#dc2626', fontWeight: 700 }}>
                          {unreturned}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isFullyReturned ? (
                            <span style={{ fontSize: '0.8rem', color: '#16a34a' }}>Đã trả đủ</span>
                          ) : (
                            <input
                              type="number"
                              className="return-qty-input"
                              min={0}
                              max={unreturned}
                              value={returnItems[item.equipment_id] !== undefined ? returnItems[item.equipment_id] : unreturned}
                              onChange={(e) => handleQtyChange(item.equipment_id, e.target.value, unreturned)}
                              disabled={isLoading || returnAll}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {validationError && (
              <div className="text-danger mb-3" style={{ fontSize: '0.85rem' }}>
                ⚠️ {validationError}
              </div>
            )}

            <div className="notice-banner" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
              ℹ️ Nếu tất cả thiết bị được trả đủ, hệ thống sẽ tự động cập nhật trạng thái đơn thành <strong>ĐÃ HOÀN TRẢ (RETURNED)</strong>. Nếu trả một phần, đơn vẫn giữ trạng thái <strong>ĐANG MƯỢN (BORROWED)</strong> để tiếp tục theo dõi.
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
              {isLoading ? 'Đang tiếp nhận...' : 'Xác nhận hoàn trả'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReturnDialog;
