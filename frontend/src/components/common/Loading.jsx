import React from 'react';

/**
 * Loading Component
 * @param {Object} props
 * @param {boolean} [props.fullScreen=false] - Whether to show as a full screen overlay
 * @param {string} [props.text='Đang tải dữ liệu...'] - Optional loading text
 */
export function Loading({ fullScreen = false, text = 'Đang tải dữ liệu...' }) {
  const content = (
    <div className="loading-container">
      <div className="spinner" role="status" aria-label="Loading"></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  return content;
}

export default Loading;
