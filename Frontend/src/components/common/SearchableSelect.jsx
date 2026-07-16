import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, ChevronDown } from 'lucide-react';
import '../../../css/pages/SearchableSelect.css';

/**
 * SearchableSelect
 * Select genérico con buscador. Reemplaza cualquier <select> nativo.
 *
 * Props:
 * - value, onChange(id)
 * - options: array de objetos
 * - getLabel(option) -> string   (default: option.name)
 * - getValue(option) -> id       (default: option.id)
 * - placeholder / searchPlaceholder
 * - renderOption(option, { isSelected, index, select }) -> JSX
 *     Opcional. Si no se pasa, se usa el render por defecto (nombre + check).
 *     `select` es la función a llamar en el onClick del item.
 * - footer({ searchQuery, close }) -> JSX
 *     Opcional. Se renderiza debajo de la lista (ej: botón "Crear nuevo").
 * - onClose()
 *     Opcional. Se llama cuando el dropdown se cierra (click afuera o selección),
 *     útil para resetear estado propio del wrapper (ej: formulario de creación).
 * - emptyText, disabled
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  getLabel = (o) => o.name,
  getValue = (o) => o.id,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  renderOption,
  footer,
  onClose,
  emptyText = 'Sin resultados',
  disabled = false,
  clearable = false,
  size = 'default', // 'default' | 'compact'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  function close() {
    setIsOpen(false);
    setSearchQuery('');
    onClose?.();
  }

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const selectedOption = options.find((o) => getValue(o) === value);

  const filteredOptions = options.filter((o) =>
    getLabel(o).toLowerCase().includes(searchQuery.toLowerCase())
  );

  function selectOption(option) {
    onChange(getValue(option));
    close();
  }

  return (
    <div className={`searchable-select-wrapper searchable-select-wrapper--${size}`} ref={dropdownRef}>
      <div
        className="searchable-select-trigger"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isOpen}
        aria-disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className="searchable-select-trigger-text">
          {selectedOption ? getLabel(selectedOption) : placeholder}
        </span>
        <span className="searchable-select-trigger-actions">
          {clearable && selectedOption && !disabled && (
            <span
              className="searchable-select-clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              title="Quitar selección"
            >
              ×
            </span>
          )}
          <ChevronDown width="16" height="16" className="searchable-select-chevron" />
        </span>
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-search-wrapper">
            <Search width="14" height="14" className="searchable-select-search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="searchable-select-search-input"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="searchable-select-list">
            {filteredOptions.length === 0 ? (
              <div className="searchable-select-no-results">{emptyText}</div>
            ) : (
              filteredOptions.map((option, idx) => {
                const val = getValue(option);
                const isSelected = val === value;
                const select = () => selectOption(option);

                if (renderOption) {
                  return (
                    <React.Fragment key={val}>
                      {renderOption(option, { isSelected, index: idx, select })}
                    </React.Fragment>
                  );
                }

                return (
                  <button
                    key={val}
                    type="button"
                    className={`searchable-select-item ${
                      isSelected ? 'searchable-select-item--selected' : ''
                    }`}
                    onClick={select}
                  >
                    <span className="searchable-select-item-name">{getLabel(option)}</span>
                    {isSelected && (
                      <Check width="14" height="14" className="searchable-select-check" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {footer && (
            <div className="searchable-select-footer">{footer({ searchQuery, close })}</div>
          )}
        </div>
      )}
    </div>
  );
}