-- ==============================================================================
-- RIKKEI LAB - DATABASE SCHEMA DEFINITION
-- Target DBMS: MySQL 8.4 (InnoDB)
-- Charset: utf8mb4 | Collation: utf8mb4_0900_ai_ci
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. Table: users
-- Mô tả: Lưu trữ thông tin người dùng hệ thống (Admin, Staff, Borrower).
-- Nguyên tắc: Vô hiệu hóa tài khoản bằng is_active = 0, không xóa cứng để
-- bảo toàn lịch sử giao dịch mượn trả thiết bị.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tự tăng',
    email VARCHAR(191) NOT NULL COMMENT 'Email đăng nhập duy nhất',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Mật khẩu đã băm (bcrypt/argon2)',
    full_name VARCHAR(100) NOT NULL COMMENT 'Họ và tên người dùng',
    role ENUM('BORROWER', 'STAFF', 'ADMIN') NOT NULL DEFAULT 'BORROWER' COMMENT 'Vai trò người dùng',
    phone VARCHAR(20) NULL COMMENT 'Số điện thoại liên lạc',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Trạng thái hoạt động (1: Active, 0: Disabled/Soft-deleted)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo bản ghi',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật bản ghi',
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('BORROWER', 'STAFF', 'ADMIN')),
    CONSTRAINT chk_users_is_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Danh sách người dùng và phân quyền';

-- ------------------------------------------------------------------------------
-- 2. Table: equipments
-- Mô tả: Quản lý thiết bị trong phòng lab.
-- Quản lý số lượng:
--   - total_quantity: Tổng số thiết bị thuộc quyền sở hữu của Lab.
--   - reserved_quantity: Số lượng đang giữ chỗ cho các đơn APPROVED chờ nhận.
--   - borrowed_quantity: Số lượng thực tế đang mượn ngoài phòng Lab (BORROWED).
--   - available_quantity: Số lượng thực sự còn lại sẵn sàng cho mượn (Generated Stored).
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS equipments;
CREATE TABLE equipments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính tự tăng',
    code VARCHAR(50) NOT NULL COMMENT 'Mã định danh duy nhất của thiết bị (VD: EQP-LAP-001)',
    name VARCHAR(150) NOT NULL COMMENT 'Tên thiết bị',
    category VARCHAR(50) NOT NULL COMMENT 'Phân loại thiết bị (LAPTOP, PROJECTOR, MONITOR, LAB_TOOL, NETWORK...)',
    description TEXT NULL COMMENT 'Mô tả chi tiết và cấu hình thiết bị',
    total_quantity INT NOT NULL DEFAULT 0 COMMENT 'Tổng số lượng thiết bị Lab sở hữu',
    reserved_quantity INT NOT NULL DEFAULT 0 COMMENT 'Số lượng đang giữ chỗ (các đơn APPROVED)',
    borrowed_quantity INT NOT NULL DEFAULT 0 COMMENT 'Số lượng thực tế đang được mượn (các đơn BORROWED)',
    available_quantity INT GENERATED ALWAYS AS (
        total_quantity - reserved_quantity - borrowed_quantity
    ) STORED COMMENT 'Số lượng còn trống để đăng ký mượn (tự động tính)',
    status ENUM('AVAILABLE', 'MAINTENANCE', 'DISCONTINUED') NOT NULL DEFAULT 'AVAILABLE' COMMENT 'Trạng thái sẵn sàng chung',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1: Đang quản lý, 0: Ngừng khai thác',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tạo thiết bị',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật',
    PRIMARY KEY (id),
    CONSTRAINT uk_equipments_code UNIQUE (code),
    CONSTRAINT chk_equipments_quantities CHECK (
        total_quantity >= 0 
        AND reserved_quantity >= 0 
        AND borrowed_quantity >= 0 
        AND (reserved_quantity + borrowed_quantity) <= total_quantity
    ),
    CONSTRAINT chk_equipments_available CHECK (available_quantity >= 0),
    CONSTRAINT chk_equipments_status CHECK (status IN ('AVAILABLE', 'MAINTENANCE', 'DISCONTINUED')),
    CONSTRAINT chk_equipments_is_active CHECK (is_active IN (0, 1)),
    KEY idx_equipments_category_status (category, status, is_active),
    KEY idx_equipments_available (available_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Danh mục thiết bị và kiểm soát tồn kho';

-- ------------------------------------------------------------------------------
-- 3. Table: borrowings
-- Mô tả: Phiếu yêu cầu mượn trả thiết bị.
-- Vòng đời trạng thái:
--   PENDING -> APPROVED -> BORROWED -> RETURNED
--   Kết thúc khác: REJECTED, CANCELLED, EXPIRED
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS borrowings;
CREATE TABLE borrowings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính phiếu mượn',
    borrowing_code VARCHAR(50) NOT NULL COMMENT 'Mã phiếu mượn duy nhất (VD: BRW-202611-0001)',
    borrower_id BIGINT UNSIGNED NOT NULL COMMENT 'ID người tạo yêu cầu (FK -> users.id)',
    status ENUM(
        'PENDING', 
        'APPROVED', 
        'BORROWED', 
        'RETURNED', 
        'REJECTED', 
        'CANCELLED', 
        'EXPIRED'
    ) NOT NULL DEFAULT 'PENDING' COMMENT 'Trạng thái xử lý phiếu mượn',
    purpose VARCHAR(255) NOT NULL COMMENT 'Mục đích mượn thiết bị',
    approved_by BIGINT UNSIGNED NULL COMMENT 'ID nhân viên duyệt đơn (FK -> users.id)',
    approved_at DATETIME NULL COMMENT 'Thời điểm duyệt đơn',
    pickup_deadline DATETIME NULL COMMENT 'Hạn chót đến nhận thiết bị sau khi duyệt',
    borrowed_at DATETIME NULL COMMENT 'Thời điểm thực tế bàn giao thiết bị',
    due_date DATETIME NULL COMMENT 'Hạn cuối phải trả thiết bị (tối đa 14 ngày kể từ borrowed_at)',
    returned_at DATETIME NULL COMMENT 'Thời điểm thực tế hoàn trả thiết bị',
    rejected_by BIGINT UNSIGNED NULL COMMENT 'ID nhân viên từ chối đơn (FK -> users.id)',
    rejected_at DATETIME NULL COMMENT 'Thời điểm từ chối đơn',
    rejection_reason VARCHAR(255) NULL COMMENT 'Lý do từ chối yêu cầu mượn',
    notes TEXT NULL COMMENT 'Ghi chú bổ sung trong quá trình bàn giao/hoàn trả',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm gửi yêu cầu',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời điểm cập nhật trạng thái',
    PRIMARY KEY (id),
    CONSTRAINT uk_borrowings_code UNIQUE (borrowing_code),
    CONSTRAINT fk_borrowings_borrower FOREIGN KEY (borrower_id) 
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_borrowings_approved_by FOREIGN KEY (approved_by) 
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_borrowings_rejected_by FOREIGN KEY (rejected_by) 
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_borrowings_status CHECK (
        status IN ('PENDING', 'APPROVED', 'BORROWED', 'RETURNED', 'REJECTED', 'CANCELLED', 'EXPIRED')
    ),
    CONSTRAINT chk_borrowings_dates CHECK (
        due_date IS NULL OR borrowed_at IS NULL OR (
            due_date >= borrowed_at AND due_date <= DATE_ADD(borrowed_at, INTERVAL 14 DAY)
        )
    ),
    CONSTRAINT chk_borrowings_returned_date CHECK (
        returned_at IS NULL OR borrowed_at IS NULL OR returned_at >= borrowed_at
    ),
    KEY idx_borrowings_borrower_created (borrower_id, created_at DESC),
    KEY idx_borrowings_status_created (status, created_at DESC),
    KEY idx_borrowings_status_deadlines (status, pickup_deadline, due_date),
    KEY idx_borrowings_approved_by (approved_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Quản lý phiếu yêu cầu và hợp đồng mượn trả';

-- ------------------------------------------------------------------------------
-- 4. Table: borrowing_items
-- Mô tả: Bảng trung gian quan hệ N:N giữa borrowings và equipments.
-- Cho phép 1 phiếu mượn chứa nhiều loại thiết bị, mỗi loại với số lượng cụ thể.
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS borrowing_items;
CREATE TABLE borrowing_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Khóa chính chi tiết mượn',
    borrowing_id BIGINT UNSIGNED NOT NULL COMMENT 'ID phiếu mượn (FK -> borrowings.id)',
    equipment_id BIGINT UNSIGNED NOT NULL COMMENT 'ID loại thiết bị (FK -> equipments.id)',
    quantity INT NOT NULL DEFAULT 1 COMMENT 'Số lượng đăng ký mượn',
    returned_quantity INT NOT NULL DEFAULT 0 COMMENT 'Số lượng thực tế đã hoàn trả',
    item_notes VARCHAR(255) NULL COMMENT 'Ghi chú tình trạng thiết bị lúc mượn/trả',
    PRIMARY KEY (id),
    CONSTRAINT uk_borrowing_items_pair UNIQUE (borrowing_id, equipment_id),
    CONSTRAINT fk_borrowing_items_borrowing FOREIGN KEY (borrowing_id) 
        REFERENCES borrowings (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_borrowing_items_equipment FOREIGN KEY (equipment_id) 
        REFERENCES equipments (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_borrowing_items_qty CHECK (quantity > 0),
    CONSTRAINT chk_borrowing_items_returned_qty CHECK (
        returned_quantity >= 0 AND returned_quantity <= quantity
    ),
    KEY idx_borrowing_items_equipment (equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Chi tiết danh mục thiết bị trong từng phiếu mượn';

SET FOREIGN_KEY_CHECKS = 1;
