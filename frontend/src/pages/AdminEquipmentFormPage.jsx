import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import equipmentService from '../services/equipment.service.js';
import Loading from '../components/common/Loading.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';

export function AdminEquipmentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    description: '',
    total_quantity: 1,
  });

  const [existingEquipment, setExistingEquipment] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      const fetchDetail = async () => {
        try {
          setIsLoading(true);
          setErrorMsg('');
          const eq = await equipmentService.getEquipmentById(id);
          setExistingEquipment(eq);
          setFormData({
            code: eq.code,
            name: eq.name,
            category: eq.category,
            description: eq.description || '',
            total_quantity: eq.total_quantity,
          });
        } catch (err) {
          console.error('Error fetching equipment for edit:', err);
          setErrorMsg(err.response?.data?.message || 'Không thể tải thông tin thiết bị.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchDetail();
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};

    if (!isEditMode) {
      if (!formData.code.trim()) {
        errors.code = 'Mã thiết bị là trường bắt buộc.';
      } else if (formData.code.trim().length < 2 || formData.code.trim().length > 50) {
        errors.code = 'Mã thiết bị phải có độ dài từ 2 đến 50 ký tự.';
      }
    }

    if (!formData.name.trim()) {
      errors.name = 'Tên thiết bị là trường bắt buộc.';
    } else if (formData.name.trim().length < 2 || formData.name.trim().length > 150) {
      errors.name = 'Tên thiết bị phải có độ dài từ 2 đến 150 ký tự.';
    }

    if (!formData.category.trim()) {
      errors.category = 'Danh mục thiết bị là trường bắt buộc.';
    } else if (formData.category.trim().length < 2 || formData.category.trim().length > 50) {
      errors.category = 'Danh mục thiết bị phải có độ dài từ 2 đến 50 ký tự.';
    }

    const qty = Number(formData.total_quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      errors.total_quantity = 'Tổng số lượng phải là số nguyên không âm (>= 0).';
    } else if (isEditMode && existingEquipment) {
      const committed = Number(existingEquipment.reserved_quantity || 0) + Number(existingEquipment.borrowed_quantity || 0);
      if (qty < committed) {
        errors.total_quantity = `Tổng số lượng không thể thấp hơn số đang giữ chỗ & đang mượn (${committed}).`;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      if (isEditMode) {
        // Update equipment: cannot change code
        await equipmentService.updateEquipment(id, {
          name: formData.name.trim(),
          category: formData.category.trim().toUpperCase(),
          description: formData.description.trim() || null,
          total_quantity: Number(formData.total_quantity),
        });
      } else {
        // Create equipment
        await equipmentService.createEquipment({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          category: formData.category.trim().toUpperCase(),
          description: formData.description.trim() || null,
          total_quantity: Number(formData.total_quantity),
        });
      }

      navigate('/admin/equipments');
    } catch (err) {
      console.error('Error saving equipment:', err);
      setErrorMsg(err.response?.data?.message || 'Không thể lưu thông tin thiết bị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading text="Đang tải dữ liệu thiết bị..." />;
  }

  return (
    <div className="admin-equipment-form-page" style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div className="flex-between mb-4">
        <Link to="/admin/equipments" className="btn btn-outline-sm">
          &laquo; Quay lại danh sách thiết bị
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            {isEditMode ? `✏️ Chỉnh sửa thiết bị: ${existingEquipment?.name}` : '➕ Thêm thiết bị mới'}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card-body">
            {errorMsg && <ErrorMessage message={errorMsg} />}

            {/* Invariant Info Banner for Edit Mode */}
            {isEditMode && existingEquipment && (
              <div className="audit-card mb-4">
                <div className="audit-card-title">📊 Tồn kho hệ thống hiện tại (Quản lý tự động bởi Backend)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '6px' }}>
                  <div>Tổng hiện tại: <strong>{existingEquipment.total_quantity}</strong></div>
                  <div style={{ color: '#16a34a' }}>Khả dụng: <strong>{existingEquipment.available_quantity}</strong></div>
                  <div style={{ color: '#d97706' }}>Đang giữ (Reserved): <strong>{existingEquipment.reserved_quantity || 0}</strong></div>
                  <div style={{ color: '#7c3aed' }}>Đang mượn (Borrowed): <strong>{existingEquipment.borrowed_quantity || 0}</strong></div>
                </div>
                <span className="field-hint" style={{ marginTop: '6px', display: 'block' }}>
                  * Các trường Khả dụng, Đang giữ và Đang mượn được tính toán và đồng bộ tự động theo các giao dịch mượn/trả.
                </span>
              </div>
            )}

            {/* Code */}
            <div className="form-group mb-3">
              <label htmlFor="eqCode" className="form-label" style={{ fontWeight: 600 }}>
                Mã thiết bị (Code) <span className="text-danger">*</span>
              </label>
              <input
                id="eqCode"
                name="code"
                type="text"
                className={`form-input ${fieldErrors.code ? 'border-danger' : ''}`}
                placeholder="VD: EQP-LAP-003"
                value={formData.code}
                onChange={handleChange}
                disabled={isEditMode || isSubmitting}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              {isEditMode && <span className="field-hint">Mã thiết bị là định danh duy nhất và không thể thay đổi sau khi tạo.</span>}
              {fieldErrors.code && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{fieldErrors.code}</span>}
            </div>

            {/* Name */}
            <div className="form-group mb-3">
              <label htmlFor="eqName" className="form-label" style={{ fontWeight: 600 }}>
                Tên thiết bị <span className="text-danger">*</span>
              </label>
              <input
                id="eqName"
                name="name"
                type="text"
                className={`form-input ${fieldErrors.name ? 'border-danger' : ''}`}
                placeholder="VD: Laptop Dell Latitude 5540 (i7/32GB/1TB)"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {fieldErrors.name && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{fieldErrors.name}</span>}
            </div>

            {/* Category */}
            <div className="form-group mb-3">
              <label htmlFor="eqCategory" className="form-label" style={{ fontWeight: 600 }}>
                Danh mục thiết bị (Category) <span className="text-danger">*</span>
              </label>
              <input
                id="eqCategory"
                name="category"
                type="text"
                className={`form-input ${fieldErrors.category ? 'border-danger' : ''}`}
                placeholder="VD: LAPTOP, PROJECTOR, MONITOR, LAB_TOOL, NETWORK"
                value={formData.category}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {fieldErrors.category && <span className="text-danger" style={{ fontSize: '0.8rem' }}>{fieldErrors.category}</span>}
            </div>

            {/* Total Quantity */}
            <div className="form-group mb-3">
              <label htmlFor="eqTotalQty" className="form-label" style={{ fontWeight: 600 }}>
                Tổng số lượng sở hữu (Total Quantity) <span className="text-danger">*</span>
              </label>
              <input
                id="eqTotalQty"
                name="total_quantity"
                type="number"
                min={0}
                className={`form-input ${fieldErrors.total_quantity ? 'border-danger' : ''}`}
                value={formData.total_quantity}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {fieldErrors.total_quantity && (
                <span className="text-danger" style={{ fontSize: '0.8rem' }}>{fieldErrors.total_quantity}</span>
              )}
            </div>

            {/* Description */}
            <div className="form-group mb-3">
              <label htmlFor="eqDescription" className="form-label" style={{ fontWeight: 600 }}>
                Mô tả chi tiết và ghi chú cấu hình
              </label>
              <textarea
                id="eqDescription"
                name="description"
                rows={4}
                className="form-textarea"
                placeholder="Cấu hình, thông số kỹ thuật, phụ kiện đi kèm..."
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="card-footer p-3" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Link to="/admin/equipments" className="btn btn-outline" disabled={isSubmitting}>
              Hủy bỏ
            </Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật thiết bị' : 'Tạo thiết bị mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminEquipmentFormPage;
