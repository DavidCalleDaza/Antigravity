import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Moon, Sun } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiClient } from '../../utils/apiClient';
import { connectNotifications, disconnectNotifications } from '../../utils/notificationsSocket';

export default function Header({ title, breadcrumb = [], toggleMobileSidebar }) {
  const { theme, toggleTheme, isAuthenticated, notifications, unreadCount, setNotifications, markAsRead } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const formatRelativeTime = (dateStr) => {
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    const diff = new Date(dateStr) - new Date();
    const diffMins = Math.round(diff / 60000);
    if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
    const diffHours = Math.round(diff / 3600000);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    return rtf.format(Math.round(diff / 86400000), 'day');
  };

  return (
    <header className="navbar" id="navbar">
      <div className="navbar-left">
        <div>
          <h1 className="navbar-title">{title}</h1>
          {breadcrumb.length > 0 && (
            <div className="navbar-breadcrumb">
              <a href="/dashboard">Inicio</a>
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
        <div className="navbar-search">
          <span className="search-icon">
            <Search width="16" height="16" />
          </span>
          <input type="text" className="form-input search-input" placeholder="Buscar..." id="global-search" />
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
