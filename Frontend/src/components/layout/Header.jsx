import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Moon, Sun, Package, Wrench, Store, User, Loader2, X, ShoppingBag, ArrowLeftRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiClient, searchClient } from '../../utils/apiClient';
import { connectNotifications, disconnectNotifications } from '../../utils/notificationsSocket';
import Helpers from '../../utils/helpers';

export default function Header({ title, breadcrumb = [], toggleMobileSidebar }) {
  const { theme, toggleTheme, isAuthenticated, currentUser, activeViewMode, toggleActiveViewMode, notifications, unreadCount, setNotifications, markAsRead } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const navigate = useNavigate();

  // ── Global Search State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
      document.body.classList.toggle('page-scrolled', isScrolled);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.classList.remove('page-scrolled');
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get('/notifications')
        .then(data => setNotifications(data))
        .catch(err => console.error(err));
      
      connectNotifications();
    }
    return () => disconnectNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Debounced Live Search ──
  useEffect(() => {
    const cleanQuery = searchQuery.trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsSearchOpen(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchClient.global(cleanQuery, 20);
        setSearchResults(data.results || []);
      } catch (err) {
        console.error('Error in global search:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await apiClient.patch(`/notifications/${notif.id}/read`);
        markAsRead(notif.id);
      } catch (err) {
        console.error(err);
      }
    }
    setShowNotifications(false);
    if (notif.data_json?.appointment_id) {
      navigate('/agenda');
    }
  };

  const handleSelectResult = (item) => {
    setIsSearchOpen(false);
    if (item.type === 'product') {
      navigate('/products');
    } else if (item.type === 'service') {
      navigate('/services');
    } else if (item.type === 'business') {
      navigate('/wall');
    } else {
      navigate(item.url || '/wall');
    }
  };

  const formatRelativeTime = (dateStr) => {
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    const diff = new Date(dateStr) - new Date();
    const diffMins = Math.round(diff / 60000);
    if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
    const diffHours = Math.round(diff / 3600000);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    return rtf.format(Math.round(diff / 86400000), 'day');
  };

  const getBadgeStyle = (badgeType) => {
    switch (badgeType) {
      case 'product':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          text: '#10b981',
          border: 'rgba(16, 185, 129, 0.25)',
          Icon: Package,
        };
      case 'service':
        return {
          bg: 'rgba(59, 130, 246, 0.12)',
          text: '#3b82f6',
          border: 'rgba(59, 130, 246, 0.25)',
          Icon: Wrench,
        };
      case 'business':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          text: '#d97706',
          border: 'rgba(245, 158, 11, 0.25)',
          Icon: Store,
        };
      default:
        return {
          bg: 'rgba(139, 92, 246, 0.12)',
          text: '#8b5cf6',
          border: 'rgba(139, 92, 246, 0.25)',
          Icon: User,
        };
    }
  };

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`} id="navbar">
      <div className="navbar-left">
        <div>
          <h1 className="navbar-title">{title}</h1>
          {breadcrumb.length > 0 && (
            <div className="navbar-breadcrumb">
              <a href="/wall">Inicio</a>
              {breadcrumb.map((item, i) => (
                <span key={i}>
                  <span className="separator">/</span>
                  {i === breadcrumb.length - 1 ? (
                    <span>{item.label}</span>
                  ) : (
                    <a href={item.href}>{item.label}</a>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {/* ── Switch de Modo Dual (Solo para Vendedores con perfil comercial activo) ── */}
        {currentUser?.role === 'seller' && (
          <button
            type="button"
            onClick={toggleActiveViewMode}
            className="btn btn-sm"
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeViewMode === 'seller' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: activeViewMode === 'seller' ? 'var(--gold, #d4af37)' : '#60a5fa',
              border: `1px solid ${activeViewMode === 'seller' ? 'rgba(212, 175, 55, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
              transition: 'all 0.2s ease',
            }}
            title={activeViewMode === 'seller' ? 'Cambiar a Modo Cliente (Ver catálogo y mis citas)' : 'Cambiar a Modo Vendedor (Gestionar mi negocio)'}
          >
            {activeViewMode === 'seller' ? (
              <>
                <Store width="14" height="14" />
                <span>Modo Vendedor</span>
              </>
            ) : (
              <>
                <User width="14" height="14" />
                <span>Modo Cliente</span>
              </>
            )}
            <ArrowLeftRight width="12" height="12" style={{ opacity: 0.6, marginLeft: '2px' }} />
          </button>
        )}

        {/* ── Buscador Global Inteligente ── */}
        <div className="navbar-search" ref={searchContainerRef} style={{ position: 'relative', width: '300px' }}>
          <span className="search-icon" style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', zIndex: 1 }}>
            {isSearching ? (
              <Loader2 width="16" height="16" className="animate-spin text-primary" />
            ) : (
              <Search width="16" height="16" />
            )}
          </span>
          <input
            type="text"
            className="form-input search-input"
            placeholder="Buscar productos, servicios..."
            id="global-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setIsSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsSearchOpen(false);
            }}
            autoComplete="off"
            style={{ width: '100%', paddingLeft: '36px', paddingRight: searchQuery ? '32px' : '14px', boxSizing: 'border-box' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                zIndex: 2,
              }}
              title="Limpiar búsqueda"
            >
              <X width="14" height="14" />
            </button>
          )}

          {/* ── Dropdown Flotante de Resultados ── */}
          {isSearchOpen && searchQuery.trim().length >= 2 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '380px',
                maxHeight: '420px',
                backgroundColor: 'var(--surface-raised, #ffffff)',
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: '12px',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)',
                zIndex: 10000,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border, #e2e8f0)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary, #64748b)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--surface, #f8fafc)',
                }}
              >
                <span>Resultados de búsqueda</span>
                <span>{searchResults.length} {searchResults.length === 1 ? 'encontrado' : 'encontrados'}</span>
              </div>

              <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '6px' }}>
                {isSearching ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Loader2 width="24" height="24" className="animate-spin mx-auto mb-2 text-primary" />
                    <span style={{ fontSize: '13px' }}>Buscando en la plataforma...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Search width="28" height="28" style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Sin resultados</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      No se encontraron coincidencias para «{searchQuery}»
                    </div>
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const badge = getBadgeStyle(item.badge_type);
                    const BadgeIcon = badge.Icon;
                    const resolvedImage = item.image_url ? Helpers.resolveMediaUrl(item.image_url) : null;

                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        onClick={() => handleSelectResult(item)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-50, rgba(46, 125, 50, 0.08))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Thumbnail o Ícono */}
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: item.type === 'user' ? '50%' : '8px',
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {resolvedImage ? (
                            <img
                              src={resolvedImage}
                              alt={item.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div style={{ display: resolvedImage ? 'none' : 'flex', color: badge.text }}>
                            <BadgeIcon width="18" height="18" />
                          </div>
                        </div>

                        {/* Textos */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: '2px',
                              }}
                            >
                              {item.subtitle}
                            </div>
                          )}
                        </div>

                        {/* Etiqueta / Badge */}
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '20px',
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <BadgeIcon width="10" height="10" />
                          {item.badge_label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="notification-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
          <button 
            className="navbar-notification" 
            id="notifications-btn" 
            data-tooltip="Notificaciones"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell width="20" height="20" />
            {unreadCount > 0 && <span className="notification-dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'white' }}>{unreadCount}</span>}
          </button>
          
          {showNotifications && (
            <div style={{ position: 'absolute', top: '100%', right: 0, width: '300px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                Notificaciones
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No tienes notificaciones</div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif)}
                      style={{ 
                        padding: '12px 16px', 
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        backgroundColor: notif.is_read ? 'transparent' : 'rgba(var(--primary-color-rgb), 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: notif.is_read ? 'normal' : 'bold', fontSize: '14px' }}>{notif.title}</span>
                        {!notif.is_read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', flexShrink: 0, marginTop: '4px' }} />}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{notif.message}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{formatRelativeTime(notif.created_at)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button className="theme-toggle" id="theme-toggle" data-tooltip="Cambiar tema" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun width="20" height="20" id="theme-icon" /> : <Moon width="20" height="20" id="theme-icon" />}
        </button>
      </div>
    </header>
  );
}

