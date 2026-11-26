import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

/**
 * Breadcrumb Component
 * @param {Array<{ label: string, to?: string }>} items - List of crumb objects
 */
export function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="breadcrumb-nav mb-3" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link to="/" className="breadcrumb-link" title="Trang chủ">
            <Icon name="home" size={14} />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              <li className="breadcrumb-separator" aria-hidden="true">
                /
              </li>
              <li className={`breadcrumb-item ${isLast ? 'active' : ''}`} aria-current={isLast ? 'page' : undefined}>
                {!isLast && item.to ? (
                  <Link to={item.to} className="breadcrumb-link">
                    {item.label}
                  </Link>
                ) : (
                  <span className="breadcrumb-current">{item.label}</span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
