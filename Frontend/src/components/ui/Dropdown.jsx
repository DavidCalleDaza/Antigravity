import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/* *
 * Dropdown custom — replacement for native <select>.
 *
 * Why it exists: the native <select> cannot be re-styled in the part
 * open (the <option> list) because that layer is drawn by the system
 * operating/browser, not the CSS of the app. This component uses <div>s
 * normal for the trigger and options, so 100% of the look
 * (background, hover, text, borders) leaves our theme, not the OS.
 *
 * Use the .custom-dropdown-* classes that already exist in Statistics.css
 * (and that can be reused in any other module).
 *
 *Props:
 * - options: [{ value, label }]
 * - value: currently selected value
 * - onChange: (value) => void
 * - className: optional class for the wrapper (min-width control, etc.) */
export default function Dropdown({ 
  options = [], 
  value, 
  onChange, 
  className = '', 
  disabled = false, 
  placeholder = '' 
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selected = options.find((o) => o.value === value);
  const displayText = selected ? selected.label : (placeholder || (options[0]?.label || ''));

  const handleSelect = (optValue) => {
    onChange(optValue);
    setOpen(false);
  };

  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  return (
    <div className={`custom-dropdown ${disabled ? 'disabled' : ''} ${className}`} ref={wrapperRef}>
      <div
        className={`custom-dropdown-trigger ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        style={{ 
          outline: 'none',
          ...(disabled ? { opacity: 0.45, cursor: 'not-allowed' } : {})
        }}
      >
        <span className="custom-dropdown-value">{displayText}</span>
        <ChevronDown className="custom-dropdown-chevron" width="14" height="14" />
      </div>

      {open && !disabled && (
        <div className="custom-dropdown-menu" role="listbox">
          {options.map((opt) => {
            const isOptDisabled = !!opt.disabled;
            return (
              <div
                key={opt.value}
                className={`custom-dropdown-option ${opt.value === value ? 'selected' : ''} ${isOptDisabled ? 'disabled' : ''}`}
                role="option"
                aria-selected={opt.value === value}
                aria-disabled={isOptDisabled}
                onClick={() => {
                  if (!isOptDisabled) handleSelect(opt.value);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  ...(isOptDisabled ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
                  ...(opt.style || {})
                }}
              >
                {opt.icon && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, color: opt.iconColor || 'inherit' }}>
                    {opt.icon}
                  </span>
                )}
                <span style={{ color: opt.color || 'inherit' }}>{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}