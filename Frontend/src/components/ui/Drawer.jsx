import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Drawer = ({
  isOpen,
  onClose,
  position = 'left',
  title,
  children,
  showHeader = true,
  closeIcon = true
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      if (position === 'right') {
        document.body.classList.add('drawer-open-right');
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      if (position === 'right') {
        document.body.classList.remove('drawer-open-right');
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClass = position === 'right' ? 'drawer-right' : 'drawer-left';

  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`drawer ${positionClass} ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {showHeader && (
          <div className="drawer-header">
            <div className="drawer-title-row">
              <h3 className="drawer-title">{title}</h3>
            </div>
            {closeIcon && (
              <button className="drawer-close" onClick={onClose} aria-label="Cerrar">
                <X width="20" height="20" />
              </button>
            )}
          </div>
        )}
        <div className="drawer-body">
          {children}
        </div>
      </aside>
    </>
  );
};

export default Drawer;