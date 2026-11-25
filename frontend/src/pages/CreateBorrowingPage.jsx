import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import equipmentService from '../services/equipment.service.js';
import borrowingService from '../services/borrowing.service.js';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';

export function CreateBorrowingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse pre-selected equipment from query params if any
  const queryParams = new URLSearchParams(location.search);
  const preSelectedEqId = queryParams.get('equipment_id') ? Number(queryParams.get('equipment_id')) : null;

  const [availableEquipments, setAvailableEquipments] = useState([]);
  const [isLoadingEquipments, setIsLoadingEquipments] = useState(true);

  // Form state
  const [purpose, setPurpose] = useState('');
  const [borrowingDays, setBorrowingDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    {
      equipment_id: preSelectedEqId || '',
      quantity: 1,
      item_notes: '',
    },
  ]);

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);

  // Load list of available equipments to choose from
  useEffect(() => {
    async function loadEquipments() {
      try {
        setIsLoadingEquipments(true);
        // Borrower automatically only receives active & AVAILABLE equipments
        const res = await equipmentService.getEquipments({ limit: 100 });
        setAvailableEquipments(res.equipments || []);
      } catch (err) {
        console.error('Failed to load equipments for selection:', err);
        setFormError('Không thể tải danh mục thiết bị khả dụng.');
      } finally {
        setIsLoadingEquipments(false);
      }
    }

    loadEquipments();
  }, []);

  // Update item field
  const handleItemChange = (index, field, value) => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      updated[index] = { ...updated[index], [field]: value };

      // If equipment changed, clamp quantity to available_quantity
      if (field === 'equipment_id') {
        const selectedEq = availableEquipments.find((e) => e.id === Number(value));
        if (selectedEq) {
          const maxAvail = selectedEq.available_quantity || 1;
          if (updated[index].quantity > maxAvail) {
            updated[index].quantity = maxAvail;
          }
        }
      }

      return updated;
    });

    if (formError) setFormError('');
  };

  // Add new item row
  const handleAddItemRow = () => {
    // Find first equipment not yet chosen
    const chosenIds = new Set(items.map((i) => Number(i.equipment_id)).filter(Boolean));
    const firstFree = availableEquipments.find((e) => !chosenIds.has(e.id));

    setItems((prev) => [
      ...prev,
      {
        equipment_id: firstFree ? firstFree.id : '',
        quantity: 1,
        item_notes: '',
      },
    ]);
  };

  // Remove item row
  const handleRemoveItemRow = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError('');

    const trimmedPurpose = purpose.trim();
    if (!trimmedPurpose || trimmedPurpose.length < 5) {
      setFormError('Mục đích mượn thiết bị là bắt buộc và phải có ít nhất 5 ký tự.');
      return;
    }

    if (items.length === 0) {
      setFormError('Vui lòng chọn ít nhất một thiết bị cần mượn.');
      return;
    }

    // Validate items
    const seenIds = new Set();
    const sanitizedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const eqId = Number(item.equipment_id);
      if (!eqId) {
        setFormError(`Mục thiết bị #${i + 1}: Vui lòng chọn thiết bị.`);
        return;
      }

      if (seenIds.has(eqId)) {
        setFormError(`Thiết bị bị trùng lặp ở dòng #${i + 1}. Mỗi thiết bị chỉ được chọn một lần.`);
        return;
      }
      seenIds.add(eqId);

      const eq = availableEquipments.find((e) => e.id === eqId);
      if (!eq) {
        setFormError(`Thiết bị được chọn không tồn tại hoặc không khả dụng.`);
        return;
      }

      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        setFormError(`Số lượng mượn của thiết bị "${eq.name}" phải là số nguyên dương (> 0).`);
        return;
      }

      if (qty > eq.available_quantity) {
        setFormError(`Số lượng mượn thiết bị "${eq.name}" (${qty}) vượt quá số lượng khả dụng hiện có (${eq.available_quantity}).`);
        return;
      }

      sanitizedItems.push({
        equipment_id: eqId,
        quantity: qty,
        item_notes: item.item_notes ? item.item_notes.trim() : undefined,
      });
    }

    try {
      setIsSubmitting(true);
      const payload = {
        purpose: trimmedPurpose,
        borrowing_days: Number(borrowingDays) || 7,
        notes: notes.trim() || undefined,
        items: sanitizedItems,
      };

      const result = await borrowingService.createBorrowing(payload);
      setCreatedResult(result);
    } catch (err) {
      console.error('Error creating borrowing request:', err);
      setFormError(err.response?.data?.message || 'Không thể tạo yêu cầu mượn thiết bị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingEquipments) {
    return <Loading text="Đang tải danh mục thiết bị khả dụng..." />;
  }

  // Success Screen
  if (createdResult) {
    return (
      <div className="create-borrowing-success">
        <div className="card success-card text-center">
          <div className="success-icon-large">🎉</div>
          <h2 className="success-heading">Tạo Yêu Cầu Mượn Thiết Bị Thành Công!</h2>
          <p className="success-desc">
            Yêu cầu mượn của bạn đã được tiếp nhận và đang ở trạng thái{' '}
            <span className="badge-status-pending">Chờ duyệt (PENDING)</span>.
          </p>

          <div className="success-code-box">
            <span className="code-label">MÃ PHIẾU MƯỢN CỦA BẠN:</span>
            <span className="code-value">{createdResult.borrowing_code}</span>
          </div>

          <p className="text-muted mb-4 font-sm">
            Lưu ý: Đơn ở trạng thái Chờ duyệt chưa chiếm dụng tồn kho. Nhân viên Lab sẽ xem xét và duyệt phiếu của bạn sớm nhất.
          </p>

          <div className="success-actions">
            <Link
              to={`/borrower/borrowings/${createdResult.id}`}
              className="btn btn-primary"
            >
              Xem Chi Tiết Phiếu Mượn
            </Link>
            <Link
              to="/borrower/borrowings"
              className="btn btn-outline"
            >
              Về Lịch Sử Phiếu Mượn
            </Link>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setCreatedResult(null);
                setPurpose('');
                setNotes('');
                setItems([{ equipment_id: '', quantity: 1, item_notes: '' }]);
              }}
            >
              Tạo Yêu Cầu Khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-borrowing-page">
      <div className="page-header-box">
        <div>
          <h2 className="page-title">Tạo Yêu Cầu Mượn Thiết Bị</h2>
          <p className="text-muted">
            Chọn một hoặc nhiều thiết bị cần mượn, điền mục đích sử dụng và gửi yêu cầu phê duyệt.
          </p>
        </div>
        <Link to="/borrower/equipments" className="btn btn-outline-sm">
          &laquo; Xem danh mục thiết bị
        </Link>
      </div>

      <ErrorMessage message={formError} />

      <form onSubmit={handleSubmit} className="card p-4 create-form" noValidate>
        {/* Section 1: General Info */}
        <div className="form-section">
          <h3 className="section-heading">1. Thông tin chung về đợt mượn</h3>
          
          <div className="form-group">
            <label htmlFor="create-purpose" className="form-label">
              Mục đích mượn thiết bị <span className="required">*</span>
            </label>
            <textarea
              id="create-purpose"
              className="form-control"
              rows="3"
              placeholder="Nêu rõ mục đích nghiên cứu, học tập, môn học hoặc dự án lab (tối thiểu 5 ký tự)..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={isSubmitting}
              required
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group form-col">
              <label htmlFor="create-days" className="form-label">
                Số ngày mượn dự kiến <span className="required">*</span>
              </label>
              <input
                id="create-days"
                type="number"
                className="form-control"
                min="1"
                max="14"
                value={borrowingDays}
                onChange={(e) => setBorrowingDays(Math.min(14, Math.max(1, Number(e.target.value))))}
                disabled={isSubmitting}
                required
              />
              <span className="form-hint">Thời gian mượn tối đa là 14 ngày.</span>
            </div>

            <div className="form-group form-col">
              <label htmlFor="create-notes" className="form-label">
                Ghi chú thêm (tùy chọn)
              </label>
              <input
                id="create-notes"
                type="text"
                className="form-control"
                placeholder="Ghi chú thời gian nhận hoặc yêu cầu đặc biệt..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Items List */}
        <div className="form-section mt-4">
          <div className="flex-between mb-2">
            <h3 className="section-heading">2. Danh sách thiết bị đăng ký mượn</h3>
            <button
              type="button"
              className="btn btn-outline-sm"
              onClick={handleAddItemRow}
              disabled={isSubmitting || items.length >= availableEquipments.length}
            >
              + Thêm thiết bị khác
            </button>
          </div>

          <div className="item-rows-container">
            {items.map((item, index) => {
              const selectedEq = availableEquipments.find((e) => e.id === Number(item.equipment_id));
              const maxAvailable = selectedEq ? selectedEq.available_quantity : 1;

              return (
                <div key={index} className="item-row-card">
                  <div className="item-row-index">#{index + 1}</div>

                  <div className="item-row-fields">
                    <div className="form-group item-field-eq">
                      <label className="form-label">
                        Thiết bị <span className="required">*</span>
                      </label>
                      <select
                        className="form-control"
                        value={item.equipment_id}
                        onChange={(e) => handleItemChange(index, 'equipment_id', e.target.value)}
                        disabled={isSubmitting}
                        required
                      >
                        <option value="">-- Chọn thiết bị --</option>
                        {availableEquipments.map((eq) => {
                          const isChosenElsewhere = items.some(
                            (other, oIdx) => oIdx !== index && Number(other.equipment_id) === eq.id
                          );
                          return (
                            <option
                              key={eq.id}
                              value={eq.id}
                              disabled={isChosenElsewhere || eq.available_quantity <= 0}
                            >
                              [{eq.code}] {eq.name} (Khả dụng: {eq.available_quantity})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="form-group item-field-qty">
                      <label className="form-label">
                        Số lượng <span className="required">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control text-center"
                        min="1"
                        max={maxAvailable}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            'quantity',
                            Math.min(maxAvailable, Math.max(1, Number(e.target.value)))
                          )
                        }
                        disabled={isSubmitting || !item.equipment_id}
                        required
                      />
                      <span className="form-hint text-center">Tối đa: {maxAvailable}</span>
                    </div>

                    <div className="form-group item-field-notes">
                      <label className="form-label">Ghi chú món này</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ghi chú riêng cho món này..."
                        value={item.item_notes}
                        onChange={(e) => handleItemChange(index, 'item_notes', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-outline-danger item-remove-btn"
                      onClick={() => handleRemoveItemRow(index)}
                      disabled={isSubmitting}
                      title="Xóa dòng này"
                    >
                      &times;
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="form-submit-bar mt-4">
          <Link to="/borrower/equipments" className="btn btn-outline">
            Hủy thao tác
          </Link>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang gửi yêu cầu mượn...' : 'Gửi Yêu Cầu Mượn Thiết Bị'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateBorrowingPage;
