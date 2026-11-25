import React from 'react';

/**
 * ErrorMessage Component
 * @param {Object} props
 * @param {string} props.message - Error message to display
 * @param {Array<string>} [props.details] - Optional list of detailed errors
 * @param {Function} [props.onRetry] - Optional retry callback
 */
export function ErrorMessage({ message, details = null, onRetry = null }) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <div className="error-banner-content">
        <span className="error-icon" aria-hidden="true">⚠️</span>
        <div className="error-text">
          <p className="error-title">{message}</p>
          {Array.isArray(details) && details.length > 0 && (
            <ul className="error-details">
              {details.map((detail, index) => (
                <li key={index}>{typeof detail === 'string' ? detail : detail.message || JSON.stringify(detail)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-outline-danger btn-sm" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
