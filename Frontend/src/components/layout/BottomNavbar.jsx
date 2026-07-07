import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Wrench, HeartHandshake, UserCircle, FileText, BarChart3, Calendar, MoreHorizontal, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { APP_CONFIG } from '../../config/appConfig';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;

const MAIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', allowedRoles: [ADMIN, SELLER, CLIENT] },
  { id: 'products', label: 'Productos', icon: Package, path: '/products', allowedRoles: [ADMIN, SELLER, CLIENT] },
  { id: 'services', label: 'Servicios', icon: Wrench, path: '/services', allowedRoles: [ADMIN, SELLER, CLIENT] },
  { id: 'wall', label: 'Muro Social', icon: HeartHandshake, path: '/wall', allowedRoles: [ADMIN, SELLER, CLIENT] },
  { id: 'profile', label: 'Mi Perfil', icon: UserCircle, path: '/profile', allowedRoles: [ADMIN, SELLER, CLIENT] },
];

const SECONDARY_NAV_ITEMS = [
  { id: 'billing', label: 'Facturación', icon: FileText, path: '/billing', allowedRoles: [ADMIN, SELLER] },
  { id: 'statistics', label: 'Estadísticas', icon: BarChart3, path: '/statistics', allowedRoles: [ADMIN] },
  { id: 'agenda', label: 'Agenda', icon: Calendar, path: '/agenda', allowedRoles: [ADMIN, SELLER, CLIENT] },
];

export default function BottomNavbar() {
  const { currentUser } = useStore();
  const location = useLocation();
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef(null);
  const moreButtonRef = useRef(null);

  const userRole = currentUser?.role;

  const visibleMainItems = MAIN_NAV_ITEMS.filter(item => item.allowedRoles.includes(userRole));
  const visibleSecondaryItems = SECONDARY_NAV_ITEMS.filter(item => item.allowedRoles.includes(userRole));
  const hasSecondaryItems = visibleSecondaryItems.length > 0;

  const isActive = (path) => location.pathname.startsWith(path);

  useEffect(() => {
    const handleMouseDown = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target)
      ) {
        setPopoverOpen(false);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleMouseDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isPopoverOpen]);

  return (
    <nav className="bottom-navbar">
      <div className="bottom-navbar-container">
        {visibleMainItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`bottom-navbar-item ${active ? 'active' : ''}`}
            >
              <Icon
                size={24}
                className="icon"
                strokeWidth={active ? 2 : 1.5}
              />
              <span className="bottom-navbar-label">
                {item.label}
              </span>
              {!active && (
                <span className="bottom-navbar-dot" />
              )}
            </Link>
          );
        })}

        {hasSecondaryItems && (
          <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
            <button
              ref={moreButtonRef}
              onClick={() => setPopoverOpen(!isPopoverOpen)}
              className={`bottom-navbar-item ${isPopoverOpen ? 'active' : ''}`}
              aria-label="Más opciones"
              aria-expanded={isPopoverOpen}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {isPopoverOpen ? (
                <X size={24} className="icon" strokeWidth={2} />
              ) : (
                <MoreHorizontal size={24} className="icon" strokeWidth={1.5} />
              )}
              <span className="bottom-navbar-label">Más</span>
              {!isPopoverOpen && (
                <span className="bottom-navbar-dot" />
              )}
            </button>

            {isPopoverOpen && (
              <div ref={popoverRef} className="bottom-navbar-popover">
                {visibleSecondaryItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setPopoverOpen(false)}
                      className={`bottom-navbar-popover-item ${active ? 'active' : ''}`}
                    >
                      <Icon size={18} strokeWidth={active ? 2 : 1.5} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}