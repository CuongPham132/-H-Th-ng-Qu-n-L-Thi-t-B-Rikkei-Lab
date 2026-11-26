import React from 'react';
import Icon from './Icon.jsx';

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
        <span className="error-icon" aria-hidden="true">
          <Icon name="alert" size={18} color="var(--color-danger)" />
        </span>
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
          <Icon name="refresh" size={13} style={{ marginRight: 6 }} />
          Thử lại
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
