-- ==============================================================================
-- RIKKEI LAB - SEED DATA
-- Purpose: Initial mock data for testing database schema, relationships, and queries.
--
-- Password note:
-- The password hash below represents "Password@123" generated via bcrypt (cost factor 12):
-- $2b$12$B.FdnSXzWWdsFotxACieSeWfrxonqvAv4ZayGiQmTwyqgMnY4VEOG
-- For Backend implementation, passwords should be verified with bcrypt.compare() or argon2.verify().
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. Seed Users (1 Admin, 2 Staff, 3 Borrower)
-- ------------------------------------------------------------------------------
TRUNCATE TABLE borrowing_items;
TRUNCATE TABLE borrowings;
TRUNCATE TABLE equipments;
TRUNCATE TABLE users;

INSERT INTO users (id, email, password_hash, full_name, role, phone, is_active, created_at) VALUES
(1, 'admin@rikkeilab.vn', '$2b$12$B.FdnSXzWWdsFotxACieSeWfrxonqvAv4ZayGiQmTwyqgMnY4VEOG', 'Hệ Thống Quản Trị Viên', 'ADMIN', '0901000001', 1, '2026-11-01 08:00:00'),
(2, 'staff.nguyen@rikkeilab.vn', '$2b$12$B.FdnSXzWWdsFotxACieSeWfrxonqvAv4ZayGiQmTwyqgMnY4VEOG', 'Nguyễn Văn Cường (Staff)', 'STAFF', '0902000002', 1, '2026-11-01 08:30:00'),
(3, 'staff.tran@rikkeilab.vn', '$2b$12$B.FdnSXzWWdsFotxACieSeWfrxonqvAv4ZayGiQmTwyqgMnY4VEOG', 'Trần Thị Mai (Staff)', 'STAFF', '0902000003', 1, '2026-11-01 08:30:00'),
(4, 'borrower.le@rikkeilab.vn', '$2b$12$B.FdnSXzWWdsFotxACieSeWfrxonqvAv4ZayGiQmTwyqgMnY4VEOG', 'Lê Hoàng Nam (Dev)', 'BORROWER', '0903000004', 1, '2026-11-02 09:00:00'),
(5, 'borrower.pham@rikkeilab.vn', '$2b$12$B.FdnSXzWWdsFotxACieSeWfrxonqvAv4ZayGiQmTwyqgMnY4VEOG', 'Phạm Minh Anh (Tester)', 'BORROWER', '0903000005', 1, '2026-11-02 09:30:00'),
(6, 'borrower.hoang@rikkeilab.vn', '$2b$12$B.FdnSXzWWdsFotxACieSeWfrxonqvAv4ZayGiQmTwyqgMnY4VEOG', 'Hoàng Gia Bảo (AI Engineer)', 'BORROWER', '0903000006', 1, '2026-11-02 10:00:00');

-- ------------------------------------------------------------------------------
-- 2. Seed Equipments (6 loại thiết bị thuộc các danh mục khác nhau)
-- Chú thích số lượng:
-- ID 1: total=10, reserved=2 (từ BRW #2), borrowed=3 (từ BRW #3) -> available = 5
-- ID 2: total=5, reserved=0, borrowed=0 (BRW #4 đã RETURN) -> available = 5
-- ID 3: total=4, reserved=1 (từ BRW #2), borrowed=0 (BRW #7 đã EXPIRED giải phóng) -> available = 3
-- ID 4: total=8, reserved=0, borrowed=2 (từ BRW #3) -> available = 6
-- ID 5: total=15, reserved=0, borrowed=0 (BRW #1 PENDING chưa giữ chỗ) -> available = 15
-- ID 6: total=6, reserved=0, borrowed=0 -> available = 6
-- ------------------------------------------------------------------------------
INSERT INTO equipments (id, code, name, category, description, total_quantity, reserved_quantity, borrowed_quantity, status, is_active, created_at) VALUES
(1, 'EQP-LAP-001', 'Laptop Dell Latitude 5530 (i7/16GB/512GB)', 'LAPTOP', 'Laptop dành cho lập trình viên phát triển dự án lab', 10, 2, 3, 'AVAILABLE', 1, '2026-11-01 09:00:00'),
(2, 'EQP-LAP-002', 'MacBook Pro 14 M2 (16GB/512GB)', 'LAPTOP', 'Laptop Apple chuyên dụng build ứng dụng iOS/macOS', 5, 0, 0, 'AVAILABLE', 1, '2026-11-01 09:00:00'),
(3, 'EQP-PRJ-001', 'Máy chiếu Epson EB-E01 XGA 3300 Lumens', 'PROJECTOR', 'Máy chiếu phòng họp báo cáo tiến độ và demo', 4, 1, 0, 'AVAILABLE', 1, '2026-11-01 09:00:00'),
(4, 'EQP-MON-001', 'Màn hình Dell UltraSharp U2723QE 4K IPS', 'MONITOR', 'Màn hình đồ họa và kiểm thử độ phân giải cao', 8, 0, 2, 'AVAILABLE', 1, '2026-11-01 09:00:00'),
(5, 'EQP-KIT-001', 'Kit vi điều khiển STM32F4 Discovery', 'LAB_TOOL', 'Kit thí nghiệm IoT và hệ thống nhúng phân tán', 15, 0, 0, 'AVAILABLE', 1, '2026-11-01 09:00:00'),
(6, 'EQP-NET-001', 'Switch Cisco Catalyst 2960-X 24 Port', 'NETWORK', 'Thiết bị chuyển mạch quản lý mạng thí nghiệm', 6, 0, 0, 'AVAILABLE', 1, '2026-11-01 09:00:00');

-- ------------------------------------------------------------------------------
-- 3. Seed Borrowings (Bao phủ đầy đủ các trạng thái trong vòng đời nghiệp vụ)
-- Status flow: PENDING, APPROVED, BORROWED, RETURNED, REJECTED, CANCELLED, EXPIRED
-- ------------------------------------------------------------------------------
INSERT INTO borrowings (
    id, borrowing_code, borrower_id, status, purpose, 
    approved_by, approved_at, pickup_deadline, 
    borrowed_at, due_date, returned_at, 
    rejected_by, rejected_at, rejection_reason, notes, created_at
) VALUES
-- 1. PENDING: Đơn vừa tạo, chờ nhân viên duyệt (chưa giữ tồn kho)
(
    1, 'BRW-202611-0001', 4, 'PENDING', 'Nghiên cứu lập trình nhúng truyền thông CAN Bus',
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL, 'Cần thêm cáp kết nối nếu có', '2026-11-25 08:30:00'
),
-- 2. APPROVED: Đã duyệt, đang giữ chỗ, chờ người mượn đến nhận trước hạn pickup_deadline
(
    2, 'BRW-202611-0002', 5, 'APPROVED', 'Chuẩn bị phòng họp báo cáo khách hàng và demo sản phẩm',
    2, '2026-11-25 09:15:00', '2026-11-27 17:00:00',
    NULL, NULL, NULL,
    NULL, NULL, NULL, 'Vui lòng nhận tại bàn kỹ thuật tầng 3', '2026-11-25 08:45:00'
),
-- 3. BORROWED: Đã bàn giao thực tế, đang trong quá trình mượn (thời hạn <= 14 ngày)
(
    3, 'BRW-202611-0003', 6, 'BORROWED', 'Huấn luyện mô hình Computer Vision và kiểm thử hiển thị',
    3, '2026-11-20 10:00:00', '2026-11-22 17:00:00',
    '2026-11-21 14:00:00', '2026-12-05 14:00:00', NULL,
    NULL, NULL, NULL, 'Đầy đủ phụ kiện cáp nguồn HDMI', '2026-11-20 09:30:00'
),
-- 4. RETURNED: Đã hoàn trả đầy đủ thiết bị, giải phóng số lượng tồn kho
(
    4, 'BRW-202611-0004', 4, 'RETURNED', 'Build ứng dụng iOS cho khách hàng nghiệm thu dự án',
    2, '2026-11-10 10:00:00', '2026-11-12 17:00:00',
    '2026-11-11 11:00:00', '2026-11-25 11:00:00', '2026-11-24 16:30:00',
    NULL, NULL, NULL, 'Thiết bị hoạt động tốt, không trầy xước', '2026-11-10 09:00:00'
),
-- 5. REJECTED: Bị nhân viên từ chối
(
    5, 'BRW-202611-0005', 5, 'REJECTED', 'Mượn thiết bị kiểm tra thử nghiệm tại nhà cá nhân',
    2, NULL, NULL,
    NULL, NULL, NULL,
    2, '2026-11-22 14:00:00', 'Quy định lab không hỗ trợ mang thiết bị thí nghiệm chuyên sâu ra khỏi cơ quan', 'Đã trao đổi qua email với requester', '2026-11-22 13:00:00'
),
-- 6. CANCELLED: Người mượn chủ động hủy khi còn ở trạng thái PENDING
(
    6, 'BRW-202611-0006', 6, 'CANCELLED', 'Mượn màn hình phụ phục vụ kiểm thử song song',
    NULL, NULL, NULL,
    NULL, NULL, NULL,
    NULL, NULL, NULL, 'Requester đã chuyển sang phòng lab khác có sẵn màn hình', '2026-11-23 10:00:00'
),
-- 7. EXPIRED: Đã được APPROVED nhưng quá hạn pickup_deadline mà không đến nhận -> Tự động hết hạn, nhả reserved
(
    7, 'BRW-202611-0007', 4, 'EXPIRED', 'Mượn máy chiếu demo thuyết trình nội bộ',
    3, '2026-11-15 08:30:00', '2026-11-17 17:00:00',
    NULL, NULL, NULL,
    NULL, NULL, NULL, 'Quá hạn pickup_deadline lúc 2026-11-17 17:00:00 mà requester không đến nhận', '2026-11-15 08:00:00'
);

-- ------------------------------------------------------------------------------
-- 4. Seed Borrowing Items (Chi tiết quan hệ N:N giữa borrowings và equipments)
-- ------------------------------------------------------------------------------
INSERT INTO borrowing_items (id, borrowing_id, equipment_id, quantity, returned_quantity, item_notes) VALUES
-- Đơn 1 (PENDING): Mượn 2 Kit STM32 (chưa giữ chỗ)
(1, 1, 5, 2, 0, 'Yêu cầu kèm cáp nạp ST-Link'),

-- Đơn 2 (APPROVED): Mượn 2 Laptop Dell + 1 Máy chiếu Epson (Giữ chỗ 2 EQP-1, 1 EQP-3)
(2, 2, 1, 2, 0, 'Cần cài sẵn Windows 11 và Office'),
(3, 2, 3, 1, 0, 'Kèm điều khiển từ xa và cáp HDMI'),

-- Đơn 3 (BORROWED): Mượn 3 Laptop Dell + 2 Màn hình Dell UltraSharp (Đang mượn 3 EQP-1, 2 EQP-4)
(4, 3, 1, 3, 0, 'Bàn giao nguyên tem niêm phong'),
(5, 3, 4, 2, 0, 'Kèm chân đế xoay và cáp Type-C to DisplayPort'),

-- Đơn 4 (RETURNED): Đã mượn 1 MacBook Pro, đã trả đủ 1
(6, 4, 2, 1, 1, 'Đã hoàn trả đầy đủ sạc cáp chính hãng'),

-- Đơn 5 (REJECTED): Từng xin mượn 1 Kit STM32 (đã từ chối, không giữ hàng)
(7, 5, 5, 1, 0, 'Đã từ chối mượn'),

-- Đơn 6 (CANCELLED): Từng xin mượn 1 Màn hình (hủy khi pending, không giữ hàng)
(8, 6, 4, 1, 0, 'Người mượn tự hủy'),

-- Đơn 7 (EXPIRED): Từng được duyệt 1 Máy chiếu (quá hạn pickup, đã nhả giữ hàng)
(9, 7, 3, 1, 0, 'Đơn hết hạn nhận, kho đã nhả số lượng reserved');

SET FOREIGN_KEY_CHECKS = 1;
