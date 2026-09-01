import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { useStore } from '../../store/useStore';
import { useToast } from '../ui/Toast';
import DonAppLogo from '../ui/DonAppLogo';
import Helpers from '../../utils/helpers';
import Modal from '../ui/Modal';

const { ADMIN, SELLER, CLIENT } = APP_CONFIG.ROLES;

const NAV_ITEMS = [
  {
    section: 'Principal',
    items: [
      { id: 'wall', label: 'Muro de Impacto', icon: 'Sprout', page: '/wall', allowedRoles: [ADMIN, SELLER, CLIENT] },
      { id: 'profile', label: 'Mi Perfil', icon: 'UserCircle', page: '/profile', allowedRoles: [ADMIN, SELLER, CLIENT] },
    ],
  },
  {
    section: 'Gestión',
    items: [
      { id: 'categories', label: 'Categorías', icon: 'FolderTree', page: '/categories', allowedRoles: [ADMIN, SELLER] },
      { id: 'products', label: 'Productos', icon: 'Package', page: '/products', allowedRoles: [ADMIN, SELLER, CLIENT] },
      { id: 'services', label: 'Servicios', icon: 'Wrench', page: '/services', allowedRoles: [ADMIN, SELLER, CLIENT] },
      { id: 'customers', label: 'Clientes', icon: 'Users', page: '/customers', allowedRoles: [ADMIN, SELLER] },
      { id: 'billing', label: 'Facturación', icon: 'FileText', page: '/billing', allowedRoles: [ADMIN, SELLER] },
    ],
  },
  {
    section: 'Análisis',
    items: [
      { id: 'statistics', label: 'Estadísticas', icon: 'BarChart3', page: '/statistics', allowedRoles: [ADMIN] },
      { id: 'market', label: 'Mercadeo', icon: 'TrendingUp', page: '/market', allowedRoles: [ADMIN] },
    ],
  },
  {
    section: 'Planificación',
    items: [
      { id: 'agenda', label: 'Agenda', icon: 'Calendar', page: '/agenda', allowedRoles: [ADMIN, SELLER, CLIENT] },
    ],
  },
  {
    section: 'Administración',
    items: [
      { id: 'tokens', label: 'Tokens de IA', icon: 'Sparkles', page: '/admin/tokens', allowedRoles: [ADMIN] },
      { id: 'social', label: 'Redes Sociales', icon: 'Share2', page: '/admin/social', allowedRoles: [ADMIN] },
    ],
  },
];

export default function Sidebar({ isOpen, closeMobile }) {
  const { currentUser, sidebarCollapsed, logout, toggleSidebar } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const userRole = currentUser?.role;

  const getAvatarUrl = () => {
    return Helpers.resolveMediaUrl(currentUser?.avatar_url || currentUser?.avatar);
  };

  const handleAvatarError = (e) => {
    e.target.style.display = 'none';
    e.target.nextSibling.style.display = 'flex';
  };

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada', 'Hasta pronto');
    navigate('/login');
  };

  const visibleSections = NAV_ITEMS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.allowedRoles.includes(userRole)),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      <aside className={`sidebar`} id="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <button className="btn btn-ghost btn-icon-only sidebar-toggle-btn" onClick={toggleSidebar} title="Alternar menú">
            <LucideIcons.Menu width="20" height="20" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleSections.map((section, idx) => (
            <div className="sidebar-section" key={idx}>
              <div className="sidebar-section-title">{section.section}</div>
              {section.items.map((item) => {
                const Icon = LucideIcons[item.icon];
                const isActive = location.pathname.startsWith(item.page);

                return (
                  <Link
                    key={item.id}
                    to={item.page}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    data-tooltip={item.label}
                    onClick={closeMobile}
                  >
                    <span className="nav-item-icon">
                      {Icon && <Icon width="20" height="20" />}
                    </span>
                    <span className="nav-item-text">{item.label}</span>
                    {item.badge && <span className="nav-item-badge">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" id="sidebar-user-menu" onClick={() => setIsLogoutModalOpen(true)}>
            <div className="avatar avatar-sm">
              {getAvatarUrl() ? (
                <>
                  <img
                    src={getAvatarUrl()}
                    alt={currentUser.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <span style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 'inherit' }}>
                    {currentUser?.name?.substring(0, 2).toUpperCase()}
                  </span>
                </>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 'inherit' }}>
                  {currentUser?.name?.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{currentUser?.name}</div>
              <div className="sidebar-user-role">{APP_CONFIG.ROLE_LABELS[currentUser?.role]}</div>
            </div>
          </div>
        </div>
      </aside>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        id="sidebar-overlay"
        onClick={closeMobile}
      ></div>
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Cerrar sesión"
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsLogoutModalOpen(false) },
          { label: 'Cerrar sesión', className: 'btn-danger', onClick: handleLogout }
        ]}
      >
        <div style={{ color: 'var(--text-secondary)', width: '100%', padding: '10px 0' }}>¿Estás seguro de que deseas cerrar sesión?</div>
      </Modal>
    </>
  );
}
