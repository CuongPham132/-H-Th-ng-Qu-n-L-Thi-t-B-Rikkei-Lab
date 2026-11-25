-- ==============================================================================
-- RIKKEI LAB - TRANSACTION DESIGN & CONCURRENCY CONTROL GUIDELINES (REVISED)
-- Mục tiêu: Chuẩn hóa toàn bộ quy trình Transaction và khóa đồng thời (Concurrency)
-- Hệ quản trị: MySQL 8.4 InnoDB
-- Tầng áp dụng: Service Layer Backend (sử dụng mysql2/promise)
-- Mức độ cô lập đề xuất: REPEATABLE READ (mặc định) hoặc READ COMMITTED
-- ==============================================================================

/*
================================================================================
QUY TẮC THIẾT YẾU CHO BACKEND (mysql2/promise):
================================================================================
1. ĐẢM BẢO CHUNG MỘ CONNECTION CHO TOÀN BỘ TRANSACTION:
   - Tuyệt đối KHÔNG gọi `pool.query()` rời rạc giữa các bước.
   - Bắt buộc phải lấy riêng một connection từ pool:
     const connection = await pool.getConnection();
     try {
       await connection.beginTransaction();
       // Mọi câu lệnh SQL trong transaction PHẢI gọi qua `connection.execute()`
       // ...
       await connection.commit();
     } catch (error) {
       await connection.rollback();
       throw error;
     } finally {
       connection.release();
     }

2. CHỐNG DEADLOCK KHI KHÓA NHIỀU DÒNG THIẾT BỊ (ORDER BY id ASC):
   - Khi khóa thiết bị bằng `SELECT ... FOR UPDATE`, luôn luôn sắp xếp danh sách 
     `equipment_id` theo thứ tự tăng dần (`ORDER BY id ASC`).
   - Điều này đảm bảo tất cả các transaction đồng thời đều yêu cầu khóa tài nguyên 
     theo cùng một thứ tự, triệt tiêu hoàn toàn nguy cơ Deadlock vòng tròn.

3. XÂY DỰNG PLACEHOLDERS ĐỘNG CHO MỆNH ĐỀ `IN (?)`:
   - Chuẩn SQL và prepared statements của `mysql2.execute()` yêu cầu số lượng dấu `?`
     phải khớp chính xác với số phần tử mảng:
     const placeholders = equipmentIds.map(() => '?').join(', ');
     const sql = `SELECT ... FROM equipments WHERE id IN (${placeholders}) ORDER BY id ASC FOR UPDATE;`;
     const [rows] = await connection.execute(sql, equipmentIds);
================================================================================
*/


-- ==============================================================================
-- NGHIỆP VỤ 1: TẠO YÊU CẦU MƯỢN (CREATE BORROWING REQUEST)
-- Actor: BORROWER
-- Mục đích: Đăng ký mượn 1 hoặc nhiều loại thiết bị.
-- Quy tắc: Trạng thái ban đầu là PENDING; CHƯA giữ số lượng tồn kho.
-- ==============================================================================
START TRANSACTION;

-- 1.1 Kiểm tra người dùng có hợp lệ và đang hoạt động không
SELECT id, full_name, role, is_active 
FROM users 
WHERE id = ? 
FOR SHARE;
-- [Validation in App]:
-- Nếu user không tồn tại hoặc is_active = 0 -> ROLLBACK; báo lỗi: Tài khoản không hợp lệ.

-- 1.2 Tạo bản ghi phiếu mượn ở trạng thái PENDING
INSERT INTO borrowings (borrowing_code, borrower_id, status, purpose, notes)
VALUES (?, ?, 'PENDING', ?, ?);

SET @new_borrowing_id = LAST_INSERT_ID();

-- 1.3 Thêm từng dòng thiết bị vào borrowing_items
-- Lưu ý: Backend lặp qua mảng thiết bị để insert
INSERT INTO borrowing_items (borrowing_id, equipment_id, quantity, returned_quantity, item_notes)
VALUES 
(@new_borrowing_id, ?, ?, 0, ?),
(@new_borrowing_id, ?, ?, 0, ?);

COMMIT;


-- ==============================================================================
-- NGHIỆP VỤ 2: DUYỆT YÊU CẦU MƯỢN (APPROVE BORROWING REQUEST)
-- Actor: STAFF / ADMIN
-- Mục đích: Duyệt đơn và giữ chỗ thiết bị (Hold inventory).
-- Quy tắc then chốt:
--   1. Chống Race Condition: 2 Staff duyệt cùng lúc vượt tồn kho khả dụng.
--   2. Kiểm tra trạng thái thiết bị: Bắt buộc is_active = 1 và status = 'AVAILABLE'.
--   3. Kiểm tra số lượng: available_quantity >= requested_quantity.
--   4. Tăng reserved_quantity tương ứng; cập nhật pickup_deadline (VD: 48 giờ).
-- ==============================================================================
START TRANSACTION;

-- 2.1 Khóa và kiểm tra trạng thái phiếu mượn
SELECT id, borrowing_code, status 
FROM borrowings 
WHERE id = ? 
FOR UPDATE;
-- [Validation in App]:
-- Bắt buộc status phải là 'PENDING'.
-- Nếu status != 'PENDING' -> ROLLBACK; thông báo: "Phiếu mượn đã được xử lý bởi người khác."

-- 2.2 Lấy danh sách thiết bị và số lượng yêu cầu trong phiếu
SELECT equipment_id, quantity 
FROM borrowing_items 
WHERE borrowing_id = ?;

-- 2.3 Khóa các dòng thiết bị trong kho theo thứ tự ID tăng dần (Chống Deadlock)
-- Backend tạo placeholders tương ứng số ID: WHERE id IN (?, ?, ...)
SELECT id, code, name, is_active, status, total_quantity, reserved_quantity, borrowed_quantity, available_quantity
FROM equipments 
WHERE id IN (?, ?) 
ORDER BY id ASC 
FOR UPDATE;

-- [Validation in App]:
-- Duyệt qua từng thiết bị cần duyệt:
--   a) Kiểm tra is_active:
--      Nếu is_active = 0 -> ROLLBACK; báo lỗi: "Thiết bị [code] đã ngừng hoạt động."
--   b) Kiểm tra status:
--      Nếu status != 'AVAILABLE' (đang 'MAINTENANCE' hoặc 'DISCONTINUED'):
--      -> ROLLBACK; báo lỗi: "Thiết bị [code] hiện đang bảo trì hoặc ngừng khai thác."
--   c) Kiểm tra tồn kho khả dụng:
--      Nếu available_quantity < requested_quantity:
--      -> ROLLBACK; báo lỗi: "Thiết bị [code] không đủ số lượng khả dụng để duyệt (còn: X, cần: Y)."

-- 2.4 Cập nhật tăng reserved_quantity (giữ chỗ) cho từng thiết bị
UPDATE equipments 
SET reserved_quantity = reserved_quantity + ? 
WHERE id = ?;

-- 2.5 Cập nhật trạng thái phiếu mượn sang APPROVED và gán hạn nhận thiết bị
UPDATE borrowings 
SET 
    status = 'APPROVED',
    approved_by = ?,
    approved_at = NOW(),
    pickup_deadline = DATE_ADD(NOW(), INTERVAL 2 DAY),
    notes = CONCAT(IFNULL(notes, ''), ' | Đã duyệt bởi Staff ID: ', ?)
WHERE id = ?;

COMMIT;


-- ==============================================================================
-- NGHIỆP VỤ 3: BÀN GIAO THIẾT BỊ (HANDOVER / BORROW)
-- Actor: STAFF
-- Mục đích: Bàn giao thiết bị thực tế cho người mượn đến nhận.
-- Quy tắc:
--   1. Đơn phải ở trạng thái APPROVED và chưa quá pickup_deadline.
--   2. Chuyển số lượng từ giữ chỗ (reserved_quantity) sang đang mượn (borrowed_quantity).
--   3. Xác định borrowed_at = NOW(), due_date <= borrowed_at + 14 ngày.
-- ==============================================================================
START TRANSACTION;

-- 3.1 Khóa và kiểm tra phiếu mượn
SELECT id, borrowing_code, status, pickup_deadline 
FROM borrowings 
WHERE id = ? 
FOR UPDATE;
-- [Validation in App]:
--   a) Bắt buộc status = 'APPROVED'. Nếu sai -> ROLLBACK.
--   b) Kiểm tra hạn nhận: Nếu NOW() > pickup_deadline:
--      -> ROLLBACK; báo lỗi: "Phiếu mượn đã quá hạn nhận thiết bị. Vui lòng chuyển sang trạng thái EXPIRED."

-- 3.2 Lấy danh sách thiết bị trong phiếu
SELECT equipment_id, quantity 
FROM borrowing_items 
WHERE borrowing_id = ?;

-- 3.3 Khóa các dòng thiết bị liên quan theo thứ tự tăng dần
SELECT id, reserved_quantity, borrowed_quantity 
FROM equipments 
WHERE id IN (?, ?) 
ORDER BY id ASC 
FOR UPDATE;

-- 3.4 Luân chuyển số lượng tồn kho: Giảm reserved_quantity, Tăng borrowed_quantity
UPDATE equipments 
SET 
    reserved_quantity = reserved_quantity - ?,
    borrowed_quantity = borrowed_quantity + ?
WHERE id = ?;

-- 3.5 Cập nhật phiếu mượn sang BORROWED và chốt thời hạn mượn (tối đa 14 ngày)
UPDATE borrowings 
SET 
    status = 'BORROWED',
    borrowed_at = NOW(),
    due_date = DATE_ADD(NOW(), INTERVAL ? DAY), -- Tham số ngày <= 14
    notes = CONCAT(IFNULL(notes, ''), ' | Bàn giao thiết bị thực tế lúc ', NOW())
WHERE id = ?;

COMMIT;


-- ==============================================================================
-- NGHIỆP VỤ 4: HOÀN TRẢ THIẾT BỊ (RETURN EQUIPMENT - HỖ TRỢ HOÀN TRẢ TỪNG PHẦN)
-- Actor: STAFF
-- Mục đích: Tiếp nhận thiết bị hoàn trả từ Borrower.
-- Quy tắc:
--   1. Hỗ trợ HOÀN TRẢ TỪNG PHẦN (Partial Return): Người mượn có thể trả trước
--      một số lượng hoặc một vài thiết bị trong phiếu.
--   2. Giảm borrowed_quantity trong equipments tương ứng với số lượng trả đợt này.
--   3. Tăng returned_quantity trong borrowing_items.
--   4. Kiểm tra điều kiện hoàn tất:
--      - Nếu TẤT CẢ thiết bị trong phiếu đã trả đủ (returned_quantity = quantity):
--        -> Chuyển phiếu sang 'RETURNED', ghi nhận returned_at = NOW().
--      - Nếu VẪN CÒN thiết bị chưa trả đủ:
--        -> Giữ nguyên trạng thái 'BORROWED', ghi chú nhật ký trả từng phần.
-- ==============================================================================
START TRANSACTION;

-- 4.1 Khóa và kiểm tra phiếu mượn
SELECT id, borrowing_code, status, borrowed_at 
FROM borrowings 
WHERE id = ? 
FOR UPDATE;
-- [Validation in App]: Bắt buộc status phải là 'BORROWED'. Nếu sai -> ROLLBACK.

-- 4.2 Lấy và khóa các dòng chi tiết thiết bị được trả trong đợt này
-- Input từ Client: Mảng các mục trả [{ equipment_id: 1, return_qty: 1 }, ...]
SELECT equipment_id, quantity, returned_quantity 
FROM borrowing_items 
WHERE borrowing_id = ? AND equipment_id IN (?, ?) 
ORDER BY equipment_id ASC 
FOR UPDATE;

-- [Validation in App]:
-- Với mỗi thiết bị trong danh sách hoàn trả:
--   Kiểm tra: return_qty > 0 VÀ (returned_quantity + return_qty) <= quantity.
--   Nếu trả quá số lượng đang mượn -> ROLLBACK; báo lỗi: "Số lượng hoàn trả vượt quá số lượng đã mượn."

-- 4.3 Khóa các dòng thiết bị trong kho (ORDER BY id ASC)
SELECT id, borrowed_quantity 
FROM equipments 
WHERE id IN (?, ?) 
ORDER BY id ASC 
FOR UPDATE;

-- 4.4 Thực hiện cập nhật số lượng trả cho từng thiết bị
-- a) Tăng returned_quantity trong borrowing_items:
UPDATE borrowing_items 
SET returned_quantity = returned_quantity + ? 
WHERE borrowing_id = ? AND equipment_id = ?;

-- b) Giảm borrowed_quantity trong equipments (giải phóng thiết bị về kho):
UPDATE equipments 
SET borrowed_quantity = borrowed_quantity - ? 
WHERE id = ?;

-- 4.5 Kiểm tra xem phiếu mượn đã hoàn trả 100% hay chỉ là trả từng phần
SELECT COUNT(*) AS remaining_items
FROM borrowing_items 
WHERE borrowing_id = ? AND returned_quantity < quantity;

-- [Xử lý rẽ nhánh nghiệp vụ tại App]:
-- Nếu remaining_items == 0: TOÀN BỘ THIẾT BỊ ĐÃ ĐƯỢC TRẢ ĐỦ -> Hoàn tất phiếu
UPDATE borrowings 
SET 
    status = 'RETURNED',
    returned_at = NOW(),
    notes = CONCAT(IFNULL(notes, ''), ' | Hoàn tất trả đủ thiết bị lúc ', NOW())
WHERE id = ?;

-- Nếu remaining_items > 0: VẪN CÒN THIẾT BỊ CHƯA TRẢ HẾT -> Giữ BORROWED, ghi chú đợt trả
-- UPDATE borrowings 
-- SET notes = CONCAT(IFNULL(notes, ''), ' | Hoàn trả một phần lúc ', NOW()) 
-- WHERE id = ?;

COMMIT;


-- ==============================================================================
-- NGHIỆP VỤ 5A: TỪ CHỐI YÊU CẦU MƯỢN (STAFF REJECT)
-- Actor: STAFF / ADMIN
-- Mục đích: Từ chối yêu cầu mượn của Borrower.
-- Quy tắc:
--   1. Áp dụng cho phiếu ở trạng thái 'PENDING' hoặc 'APPROVED'.
--   2. BẮT BUỘC ghi nhận: rejected_by, rejected_at, rejection_reason.
--   3. Xử lý kho:
--      - Nếu đơn đang 'PENDING': Chưa từng giữ kho -> KHÔNG cần cập nhật kho.
--      - Nếu đơn đang 'APPROVED': Đã giữ chỗ -> BẮT BUỘC nhả reserved_quantity!
-- ==============================================================================
START TRANSACTION;

-- 5A.1 Khóa và kiểm tra trạng thái phiếu mượn
SELECT id, borrowing_code, status 
FROM borrowings 
WHERE id = ? 
FOR UPDATE;
-- [Validation in App]:
-- Cho phép từ chối nếu status IN ('PENDING', 'APPROVED').
-- Nếu status đã là 'BORROWED', 'RETURNED', 'REJECTED', 'CANCELLED', 'EXPIRED':
-- -> ROLLBACK; báo lỗi: "Không thể từ chối phiếu mượn ở trạng thái hiện tại."

-- 5A.2 Xử lý giải phóng kho nếu đơn từng được APPROVED
-- Lấy trạng thái hiện tại đã đọc ở bước 5A.1:
-- NẾU status == 'APPROVED':
SELECT equipment_id, quantity 
FROM borrowing_items 
WHERE borrowing_id = ?;

SELECT id, reserved_quantity 
FROM equipments 
WHERE id IN (?, ?) 
ORDER BY id ASC 
FOR UPDATE;

-- Giảm reserved_quantity để nhả tồn kho về lại available_quantity:
UPDATE equipments 
SET reserved_quantity = reserved_quantity - ? 
WHERE id = ?;
-- NẾU status == 'PENDING': Bỏ qua bước cập nhật kho.

-- 5A.3 Cập nhật phiếu mượn sang REJECTED và lưu đầy đủ thông tin kiểm toán
UPDATE borrowings 
SET 
    status = 'REJECTED',
    rejected_by = ?,
    rejected_at = NOW(),
    rejection_reason = ?,
    notes = CONCAT(IFNULL(notes, ''), ' | Nhân viên từ chối: ', ?)
WHERE id = ?;

COMMIT;


-- ==============================================================================
-- NGHIỆP VỤ 5B: HỦY YÊU CẦU MƯỢN (BORROWER CANCEL)
-- Actor: BORROWER (Người tạo đơn tự hủy)
-- Mục đích: Người mượn chủ động hủy đơn khi không còn nhu cầu.
-- Quy tắc:
--   1. Chỉ người tạo đơn (hoặc Admin hỗ trợ) mới có quyền hủy.
--   2. Áp dụng cho phiếu ở trạng thái 'PENDING' hoặc 'APPROVED'.
--   3. KHÔNG GHI NHẬN rejected_by, rejected_at, rejection_reason (vì không phải Staff từ chối).
--   4. Ghi nhận lý do hủy của Borrower vào trường `notes`.
--   5. Xử lý kho:
--      - Nếu 'PENDING': Không giữ kho -> Không cập nhật kho.
--      - Nếu 'APPROVED': Đã giữ chỗ -> BẮT BUỘC nhả reserved_quantity!
-- ==============================================================================
START TRANSACTION;

-- 5B.1 Khóa và kiểm tra quyền sở hữu đơn
SELECT id, borrower_id, status 
FROM borrowings 
WHERE id = ? 
FOR UPDATE;
-- [Validation in App]:
--   a) Kiểm tra quyền: borrower_id == current_user_id (hoặc role == 'ADMIN').
--      Nếu sai -> ROLLBACK; báo lỗi: "Bạn không có quyền hủy yêu cầu này."
--   b) Kiểm tra trạng thái: status IN ('PENDING', 'APPROVED').
--      Nếu status == 'BORROWED':
--      -> ROLLBACK; báo lỗi: "Thiết bị đã bàn giao, không thể hủy. Vui lòng thực hiện thủ tục trả thiết bị."

-- 5B.2 Giải phóng kho nếu đơn từng được APPROVED
-- NẾU status == 'APPROVED':
SELECT equipment_id, quantity 
FROM borrowing_items 
WHERE borrowing_id = ?;

SELECT id, reserved_quantity 
FROM equipments 
WHERE id IN (?, ?) 
ORDER BY id ASC 
FOR UPDATE;

UPDATE equipments 
SET reserved_quantity = reserved_quantity - ? 
WHERE id = ?;
-- NẾU status == 'PENDING': Bỏ qua bước cập nhật kho.

-- 5B.3 Cập nhật phiếu mượn sang CANCELLED (KHÔNG điền rejected_by / rejected_at)
UPDATE borrowings 
SET 
    status = 'CANCELLED',
    notes = CONCAT(IFNULL(notes, ''), ' | Người mượn tự hủy lúc ', NOW(), ' - Lý do: ', ?)
WHERE id = ?;

COMMIT;


-- ==============================================================================
-- NGHIỆP VỤ 6: XỬ LÝ HẾT HẠN NHẬN THIẾT BỊ (EXPIRE UNCLAIMED REQUESTS)
-- Actor: SYSTEM BACKGROUND WORKER / CRONJOB
-- Tần suất: Chạy định kỳ (mỗi 15 - 30 phút).
-- Mục đích: Tự động hủy các đơn APPROVED quá hạn pickup_deadline mà người mượn không đến nhận.
-- Quy tắc: Nhả reserved_quantity về lại kho khả dụng; chuyển status sang EXPIRED.
-- ==============================================================================
START TRANSACTION;

-- 6.1 Khóa bản ghi quá hạn nhận
SELECT id, borrowing_code, status, pickup_deadline 
FROM borrowings 
WHERE id = ? AND status = 'APPROVED' AND pickup_deadline < NOW() 
FOR UPDATE;
-- [Validation in App]: Nếu không tìm thấy dòng nào khớp (có thể vừa được bàn giao ở luồng khác)
-- -> ROLLBACK; bỏ qua.

-- 6.2 Lấy chi tiết thiết bị và khóa các dòng trong equipments
SELECT equipment_id, quantity 
FROM borrowing_items 
WHERE borrowing_id = ?;

SELECT id, reserved_quantity 
FROM equipments 
WHERE id IN (?, ?) 
ORDER BY id ASC 
FOR UPDATE;

-- 6.3 Giải phóng số lượng giữ chỗ về kho khả dụng
UPDATE equipments 
SET reserved_quantity = reserved_quantity - ? 
WHERE id = ?;

-- 6.4 Chuyển trạng thái phiếu sang EXPIRED
UPDATE borrowings 
SET 
    status = 'EXPIRED',
    notes = CONCAT(IFNULL(notes, ''), ' | Tự động hết hạn do quá hạn pickup_deadline lúc ', NOW())
WHERE id = ?;

COMMIT;
