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
export default function Dropdown({ options, value, onChange, className = '' }) {
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
    onChange(optValue);
    setOpen(false);
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  return (
    <div className={`custom-dropdown ${className}`} ref={wrapperRef}>
      <div
        className={`custom-dropdown-trigger ${open ? 'open' : ''}`}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        style={{ outline: 'none' }}
      >
        <span className="custom-dropdown-value">{selected ? selected.label : ''}</span>
        <ChevronDown className="custom-dropdown-chevron" width="14" height="14" />
      </div>

      {open && (
        <div className="custom-dropdown-menu" role="listbox">
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