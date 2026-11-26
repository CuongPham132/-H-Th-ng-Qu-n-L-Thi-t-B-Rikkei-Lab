import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import equipmentService from '../services/equipment.service.js';
import borrowingService from '../services/borrowing.service.js';
import StatusBadge from '../components/common/StatusBadge.jsx';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Icon from '../components/common/Icon.jsx';
import Breadcrumb from '../components/common/Breadcrumb.jsx';
import { useToast } from '../contexts/ToastContext.jsx';

export function EquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick borrow form state
  const [quantity, setQuantity] = useState(1);
  const [borrowingDays, setBorrowingDays] = useState(7);
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    async function fetchDetail() {
      try {
        setIsLoading(true);
        setErrorMsg('');
        const data = await equipmentService.getEquipmentById(id);
        setEquipment(data);
        setQuantity(1);
      } catch (err) {
        console.error('Error fetching equipment detail:', err);
        setErrorMsg(err.response?.data?.message || 'Không thể tải thông tin chi tiết thiết bị.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetail();
  }, [id]);

  const handleQuickBorrowSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedPurpose = purpose.trim();
    if (!trimmedPurpose || trimmedPurpose.length < 5) {
      setFormError('Mục đích mượn thiết bị phải có ít nhất 5 ký tự.');
      return;
    }

    if (quantity <= 0 || quantity > equipment.available_quantity) {
      setFormError(`Số lượng mượn không hợp lệ. Khả dụng tối đa là ${equipment.available_quantity}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        purpose: trimmedPurpose,
        borrowing_days: Number(borrowingDays) || 7,
        notes: notes.trim() || undefined,
        items: [
          {
            equipment_id: equipment.id,
            quantity: Number(quantity),
          },
        ],
      };

      const result = await borrowingService.createBorrowing(payload);
      navigate(`/borrower/borrowings/${result.id}`, {
        state: { message: `Tạo yêu cầu mượn thiết bị thành công! Mã phiếu: ${result.borrowing_code}` },
      });
    } catch (err) {
      setFormError(err.response?.data?.message || 'Không thể tạo yêu cầu mượn thiết bị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading text="Đang tải thông tin thiết bị..." />;
  }

  if (errorMsg || !equipment) {
    return (
      <div className="equipment-detail-page">
        <ErrorMessage message={errorMsg || 'Không tìm thấy thiết bị.'} />
        <Link to="/borrower/equipments" className="btn btn-outline mt-3">
          &laquo; Quay lại danh sách thiết bị
        </Link>
      </div>
    );
  }

  const isAvailable = equipment.available_quantity > 0 && equipment.status === 'AVAILABLE';

  return (
    <div className="equipment-detail-page">
      <Breadcrumb
        items={[
          { label: 'Danh mục thiết bị', to: '/borrower/equipments' },
          { label: equipment.code || equipment.name },
        ]}
      />
      <div className="detail-navigation">
        <Link to="/borrower/equipments" className="btn btn-outline-sm">
          &laquo; Quay lại danh mục thiết bị
        </Link>
      </div>

      <div className="detail-layout-grid">
        {/* Left Column: Equipment Info */}
        <div className="card equipment-main-card">
          <div className="card-header flex-between">
            <div>
              <span className="code-tag">{equipment.code}</span>
              <h2 className="equipment-detail-title">{equipment.name}</h2>
            </div>
            <StatusBadge status={equipment.status} type="equipment" />
          </div>

          <div className="card-body">
            <div className="detail-section">
              <h4 className="section-title">Danh mục & Thông số</h4>
              <div className="info-grid">
                <div className="info-box">
                  <span className="info-box-label">Danh mục:</span>
                  <span className="info-box-value category-pill">{equipment.category}</span>
                </div>
                <div className="info-box">
                  <span className="info-box-label">Số lượng khả dụng:</span>
                  <span className={`info-box-value font-bold ${isAvailable ? 'text-success' : 'text-danger'}`}>
                    {equipment.available_quantity} món
                  </span>
                </div>
                <div className="info-box">
                  <span className="info-box-label">Tổng số lượng lab:</span>
                  <span className="info-box-value font-bold">{equipment.total_quantity} món</span>
                </div>
                <div className="info-box">
                  <span className="info-box-label">Trạng thái thiết bị:</span>
                  <span className="info-box-value">{equipment.status}</span>
                </div>
              </div>
            </div>

            <div className="detail-section mt-4">
              <h4 className="section-title">Mô tả chi tiết</h4>
              <div className="description-box">
                {equipment.description ? (
                  <p>{equipment.description}</p>
                ) : (
                  <p className="text-muted italic">Thiết bị chưa có mô tả chi tiết từ quản trị viên.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Borrow Form */}
        <div className="card quick-borrow-card">
          <div className="card-header">
            <h3 className="card-title">Đăng ký mượn thiết bị</h3>
          </div>

          <div className="card-body">
            {isAvailable ? (
              <form onSubmit={handleQuickBorrowSubmit} noValidate>
                <ErrorMessage message={formError} />

                <div className="form-group">
                  <label htmlFor="borrow-qty" className="form-label">
                    Số lượng cần mượn <span className="required">*</span>
                  </label>
                  <div className="quantity-selector">
                    <button
                      type="button"
                      className="btn btn-outline-sm qty-btn"
                      onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                      disabled={quantity <= 1 || isSubmitting}
                    >
                      -
                    </button>
                    <input
                      id="borrow-qty"
                      type="number"
                      className="form-control text-center font-bold"
                      min="1"
                      max={equipment.available_quantity}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setQuantity(Math.min(equipment.available_quantity, Math.max(1, val)));
                        }
                      }}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-sm qty-btn"
                      onClick={() => setQuantity((prev) => Math.min(equipment.available_quantity, prev + 1))}
                      disabled={quantity >= equipment.available_quantity || isSubmitting}
                    >
                      +
                    </button>
                  </div>
                  <span className="form-hint">
                    Tối đa có thể mượn: <strong>{equipment.available_quantity}</strong> món
                  </span>
                </div>

                <div className="form-group">
                  <label htmlFor="borrow-days" className="form-label">
                    Thời gian mượn (ngày) <span className="required">*</span>
                  </label>
                  <input
                    id="borrow-days"
                    type="number"
                    className="form-control"
                    min="1"
                    max="14"
                    value={borrowingDays}
                    onChange={(e) => setBorrowingDays(Math.min(14, Math.max(1, Number(e.target.value))))}
                    disabled={isSubmitting}
                  />
                  <span className="form-hint">Quy định phòng lab: Tối đa 14 ngày.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="borrow-purpose" className="form-label">
                    Mục đích mượn <span className="required">*</span>
                  </label>
                  <textarea
                    id="borrow-purpose"
                    className="form-control"
                    rows="3"
                    placeholder="Ví dụ: Phục vụ môn học Hệ thống nhúng phân tán..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    disabled={isSubmitting}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label htmlFor="borrow-notes" className="form-label">
                    Ghi chú thêm
                  </label>
                  <input
                    id="borrow-notes"
                    type="text"
                    className="form-control"
                    placeholder="Ghi chú dành cho quản trị viên (nếu có)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu Mượn'}
                </button>

                <div className="mt-3 text-center">
                  <Link
                    to={`/borrower/borrowings/create?equipment_id=${equipment.id}`}
                    className="text-muted font-sm"
                  >
                    + Hoặc thêm vào đơn mượn nhiều thiết bị
                  </Link>
                </div>
              </form>
            ) : (
              <div className="unavailable-notice">
                <span className="notice-icon">
                  <Icon name="alert" size={32} color="var(--color-warning)" />
                </span>
                <p className="notice-text">
                  Thiết bị hiện tại không đủ số lượng khả dụng để mượn hoặc đang ở trạng thái bảo trì.
                </p>
                <Link to="/borrower/equipments" className="btn btn-outline btn-block mt-3">
                  Chọn thiết bị khác
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EquipmentDetailPage;
