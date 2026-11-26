import React from 'react';
import Icon from './Icon.jsx';

/**
 * EmptyState Component
 * Displays empty feedback when lists or tables have no records
 * @param {Object} props
 * @param {string|React.ReactNode} [props.icon='inbox'] - Icon name or ReactNode
 * @param {string} props.title - Main empty title
 * @param {string} [props.description] - Additional explanatory text
 * @param {React.ReactNode} [props.action] - Optional action button/link
 */
export function EmptyState({ icon = 'inbox', title = 'Không có dữ liệu', description, action }) {
  const renderIcon = () => {
    if (typeof icon === 'string') {
      let iconName = 'inbox';
      if (icon === 'search') iconName = 'search';
      else if (icon === 'box' || icon === 'equipment') iconName = 'equipment';
      else if (icon === 'clipboard') iconName = 'clipboard';
      else if (icon === 'users') iconName = 'users';
      else if (icon === 'inbox') iconName = 'inbox';
      else if (icon.length < 20) iconName = icon;

      return <Icon name={iconName} size={44} color="var(--color-text-light)" />;
    }
    return icon;
  };

  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        {renderIcon()}
      </div>
      <h4 className="empty-state-title">{title}</h4>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export default EmptyState;
