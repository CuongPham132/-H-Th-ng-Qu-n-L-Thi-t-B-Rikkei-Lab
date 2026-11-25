import React from 'react';

/**
 * Pagination Component
 * @param {Object} props
 * @param {number} props.page - Current active page (1-based)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} [props.total] - Total number of records
 * @param {Function} props.onPageChange - Callback when a page is selected
 */
export function Pagination({ page = 1, totalPages = 1, total = 0, onPageChange }) {
  if (totalPages <= 1 && total === 0) return null;

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };

  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  // Generate page numbers to display
  const pages = [];
  const maxButtons = 5;
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Hiển thị trang <strong>{page}</strong> / <strong>{totalPages || 1}</strong>
        {total !== undefined && ` (Tổng số ${total} bản ghi)`}
      </div>

      <div className="pagination-buttons">
        <button
          type="button"
          className="btn btn-outline-sm pagination-btn"
          onClick={handlePrev}
          disabled={page <= 1}
          aria-label="Trang trước"
        >
          &laquo; Trước
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`btn btn-outline-sm pagination-num ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="btn btn-outline-sm pagination-btn"
          onClick={handleNext}
          disabled={page >= totalPages}
          aria-label="Trang kế tiếp"
        >
          Sau &raquo;
        </button>
      </div>
    </div>
  );
}

export default Pagination;
