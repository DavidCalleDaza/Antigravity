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
  { id: 'wall', label: 'Muro de Impacto', icon: HeartHandshake, path: '/wall', allowedRoles: [ADMIN, SELLER, CLIENT] },
  { id: 'profile', label: 'Mi Perfil', icon: UserCircle, path: '/profile', allowedRoles: [ADMIN, SELLER, CLIENT] },
];

const SECONDARY_NAV_ITEMS = [
  { id: 'billing', label: 'Facturación', icon: FileText, path: '/billing', allowedRoles: [ADMIN, SELLER] },
  { id: 'statistics', label: 'Estadísticas', icon: BarChart3, path: '/statistics', allowedRoles: [ADMIN] },
  { id: 'agenda', label: 'Agenda', icon: Calendar, path: '/agenda', allowedRoles: [ADMIN, SELLER, CLIENT] },
];

export default function TopNavbar() {
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
    <nav className="w-full bg-white dark:bg-[#0a0a0c] border-b border-gray-200 dark:border-yellow-600/20 sticky top-[var(--navbar-height)] z-[9998]">
      <div className="w-full flex items-center justify-around h-16 px-4 sm:px-8 max-w-screen-2xl mx-auto overflow-x-auto hide-scrollbar gap-4">
        {visibleMainItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap
                ${active
                  ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-400/10 dark:bg-yellow-400/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <Icon
                size={20}
                className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={`text-sm font-medium ${active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-t-md bg-yellow-500 dark:bg-yellow-400" />
              )}
            </Link>
          );
        })}

        {hasSecondaryItems && (
          <div className="relative">
            <button
              ref={moreButtonRef}
              onClick={() => setPopoverOpen(!isPopoverOpen)}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap
                ${isPopoverOpen
                  ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-400/10 dark:bg-yellow-400/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <MoreHorizontal size={20} strokeWidth={2} />
              <span className="text-sm font-medium">Más</span>
            </button>

            {isPopoverOpen && (
              <div
                ref={popoverRef}
                className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#0a0a0c] rounded-xl shadow-xl border border-gray-200 dark:border-yellow-600/20 py-1 overflow-hidden"
              >
                {visibleSecondaryItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setPopoverOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150
                        ${active
                          ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-400/10 dark:bg-yellow-400/20 font-semibold'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-yellow-400/10'
                        }
                      `}
                    >
                      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
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
