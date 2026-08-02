import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Dropdown({ 
  options = [], 
  value, 
  onChange, 
  className = '', 
  placeholder = '', 
  disabled = false 
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

  const handleSelect = (optValue) => {
    if (disabled) return;
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
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        style={{
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <span className={`custom-dropdown-value ${!selected ? 'custom-dropdown-placeholder' : ''}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="custom-dropdown-chevron" width="14" height="14" />
      </div>

      {open && !disabled && (
        <div className="custom-dropdown-menu" role="listbox">
          {placeholder && (
            <div
              className={`custom-dropdown-option ${value === '' ? 'selected' : ''}`}
              role="option"
              aria-selected={value === ''}
              onClick={() => handleSelect('')}
            >
              <span className="custom-dropdown-placeholder">{placeholder}</span>
            </div>
          )}
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-dropdown-option ${opt.value === value ? 'selected' : ''}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt.value)}
            >
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}