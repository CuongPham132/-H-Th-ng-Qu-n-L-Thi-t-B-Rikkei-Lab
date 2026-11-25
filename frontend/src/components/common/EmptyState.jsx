import React from 'react';

/**
 * EmptyState Component
 * Displays empty feedback when lists or tables have no records
 * @param {Object} props
 * @param {string} [props.icon='📭'] - Emoji or icon
 * @param {string} props.title - Main empty title
 * @param {string} [props.description] - Additional explanatory text
 * @param {React.ReactNode} [props.action] - Optional action button/link
 */
export function EmptyState({ icon = '📭', title = 'Không có dữ liệu', description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">{icon}</span>
      <h4 className="empty-state-title">{title}</h4>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export default EmptyState;
