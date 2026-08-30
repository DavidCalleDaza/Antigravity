import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RectangleHorizontal, Minimize2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

const Drawer = ({
  isOpen,
  onClose,
  position = 'left',
  title,
  children,
  showHeader = true,
  closeIcon = true,
  width,
  headerActions = null,
  onToggleExpand = null,
  isExpanded = false,
}) => {
  const setSidebarCollapsed = useStore(state => state.setSidebarCollapsed);
  const sidebarCollapsed = useStore(state => state.sidebarCollapsed);

  const [shouldRender, setShouldRender] = React.useState(isOpen);
  const [animateOpen, setAnimateOpen] = React.useState(false);

  useEffect(() => {
    let openFrame;
    let unmountTimer;

    if (isOpen) {
      setShouldRender(true);
      openFrame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateOpen(true));
      });
    } else {
      setAnimateOpen(false);
      unmountTimer = setTimeout(() => setShouldRender(false), 360);
    }

    return () => {
      if (openFrame) cancelAnimationFrame(openFrame);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
        document.documentElement.style.setProperty('--active-drawer-width', width || '420px');
        if (!sidebarCollapsed) {
          setSidebarCollapsed(true);
        }
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      if (position === 'right') {
        document.body.classList.remove('drawer-open-right');
        document.documentElement.style.removeProperty('--active-drawer-width');
      }
    };
  }, [isOpen, onClose, position, width]);

  if (!shouldRender) return null;

  const positionClass = position === 'right' ? 'drawer-right' : 'drawer-left';

  return createPortal(
    <>
      <div
        className={`drawer-overlay ${animateOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`drawer ${positionClass} ${animateOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { maxWidth: width } : undefined}
      >
        {showHeader && (
          <div className="drawer-header">
            <div className="drawer-title-row">
              <h3 className="drawer-title">{title}</h3>
            </div>
            {headerActions && (
              <div className="drawer-header-actions">
                {headerActions}
              </div>
            )}
            <div className="drawer-header-controls" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {onToggleExpand && (
                <button
                  type="button"
                  className="drawer-close drawer-expand-btn"
                  onClick={onToggleExpand}
                  aria-label={isExpanded ? 'Contraer panel' : 'Expandir panel'}
                  title={isExpanded ? 'Contraer panel' : 'Expandir panel'}
                >
                  {isExpanded ? <Minimize2 width="18" height="18" /> : <RectangleHorizontal width="18" height="18" />}
                </button>
              )}
              {closeIcon && (
                <button className="drawer-close" onClick={onClose} aria-label="Cerrar">
                  <X width="20" height="20" />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="drawer-body">
          {children}
        </div>
      </aside>
    </>,
    document.body
  );
};

export default Drawer;