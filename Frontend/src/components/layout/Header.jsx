import { Menu, Search, Bell, Moon, Sun } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function Header({ title, breadcrumb = [], toggleMobileSidebar }) {
  const { theme, toggleTheme } = useStore();

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

        <button className="navbar-notification" id="notifications-btn" data-tooltip="Notificaciones">
          <Bell width="20" height="20" />
          <span className="notification-dot"></span>
        </button>

        <button className="theme-toggle" id="theme-toggle" data-tooltip="Cambiar tema" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun width="20" height="20" id="theme-icon" /> : <Moon width="20" height="20" id="theme-icon" />}
        </button>
      </div>
    </header>
  );
}
