const { error } = require('../utils/apiResponse');

/**
 * Centralized Express Error Handling Middleware.
 * Catches unhandled errors and maps database-specific constraints to HTTP statuses.
 */
function errorHandler(err, req, res, next) {
  // In development, log full stack trace
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  // 1. MySQL Duplicate Key Error (1062)
  if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
    return error(res, 'Dữ liệu đã tồn tại trong hệ thống (Duplicate Entry).', 409, {
      detail: err.sqlMessage || err.message,
    });
  }

  // 2. MySQL Foreign Key Restrict Error (1451)
  if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return error(res, 'Không thể xóa hoặc sửa bản ghi vì đang có dữ liệu tham chiếu (Foreign Key Restrict).', 409, {
      detail: err.sqlMessage || err.message,
    });
  }

  // 3. MySQL Foreign Key Invalid Reference (1452)
  if (err.errno === 1452 || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return error(res, 'Dữ liệu tham chiếu không tồn tại (Foreign Key Not Found).', 400, {
      detail: err.sqlMessage || err.message,
    });
  }

  // 4. MySQL Check Constraint Violation (3819)
  if (err.errno === 3819 || err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return error(res, 'Dữ liệu vi phạm quy tắc ràng buộc toàn vẹn (Check Constraint Violated).', 400, {
      detail: err.sqlMessage || err.message,
    });
  }

  // 5. MySQL Deadlock Exceeded (1213)
  if (err.errno === 1213 || err.code === 'ER_LOCK_DEADLOCK') {
    return error(res, 'Hệ thống đang bận xử lý giao dịch đồng thời (Deadlock). Vui lòng thử lại.', 503);
  }

  // 6. Custom Application Errors with explicit status codes
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ (Internal Server Error)';

  return error(res, message, statusCode, err.errors || null);
}

module.exports = errorHandler;
