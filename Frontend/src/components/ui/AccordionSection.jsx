import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function AccordionSection({
  icon,
  title,
  isOpen,
  onToggle,
  summary,
  children,
  className = '',
}) {
  return (
    <div className={`accordion-section ${isOpen ? 'is-open' : ''} ${className}`}>
      <button
        type="button"
        className="accordion-section-header"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="accordion-section-header-left">
          {icon && <span className="accordion-section-icon">{icon}</span>}
          <div className="accordion-section-titles">
            <span className="accordion-section-title">{title}</span>
            {summary && <span className="accordion-section-summary">{summary}</span>}
          </div>
        </div>
        <div className="accordion-section-header-right">
          <ChevronDown
            className={`accordion-chevron ${isOpen ? 'is-rotated' : ''}`}
            width={18}
            height={18}
          />
        </div>
      </button>
      <div className={`accordion-section-body ${isOpen ? 'is-open' : ''}`}>
        <div className="accordion-section-content">
          {children}
        </div>
      </div>
    </div>
  );
}
