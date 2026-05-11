import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '../../store/useStore';

export default function DashboardLayout() {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { sidebarCollapsed } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) {
      const cur = document.getElementById('cursor');
      const ring = document.getElementById('cursorRing');
      if (!cur || !ring) return;
      let mx = 0, my = 0, rx = 0, ry = 0;
      document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        cur.style.left = mx + 'px';
        cur.style.top = my + 'px';
      });
      (function loop() {
        rx += (mx - rx) * .12;
        ry += (my - ry) * .12;
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
        requestAnimationFrame(loop);
      })();
      document.querySelectorAll('a, button, .nav-item, .card, .btn, input, select, textarea').forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('expand'));
        el.addEventListener('mouseleave', () => ring.classList.remove('expand'));
      });
    }
  }, []);

  const getPageConfig = () => {
    switch(location.pathname) {
      case '/dashboard': return { title: 'Dashboard', breadcrumb: [{ label: 'Dashboard' }] };
      case '/products': return { title: 'Productos', breadcrumb: [{ label: 'Productos' }] };
      case '/services': return { title: 'Servicios', breadcrumb: [{ label: 'Servicios' }] };
      case '/billing': return { title: 'Facturación', breadcrumb: [{ label: 'Facturación' }] };
      case '/agenda': return { title: 'Agenda', breadcrumb: [{ label: 'Agenda' }] };
      case '/wall': return { title: 'Muro Social', breadcrumb: [{ label: 'Muro Social' }] };
      case '/statistics': return { title: 'Estadísticas', breadcrumb: [{ label: 'Estadísticas' }] };
      case '/market': return { title: 'Estudio de Mercado', breadcrumb: [{ label: 'Mercadeo' }] };
      default: return { title: 'Servinow', breadcrumb: [] };
    }
  };

  const config = getPageConfig();

  return (
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobileSidebarOpen ? 'sidebar-open' : ''}`} id="app">
      <div className="cursor" id="cursor"></div>
      <div className="cursor-ring" id="cursorRing"></div>
      <div className="grid-bg"></div>
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        closeMobile={() => setMobileSidebarOpen(false)} 
      />
      <main className="app-main">
        <Header 
          title={config.title} 
          breadcrumb={config.breadcrumb} 
          toggleMobileSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)} 
        />
        <Outlet />
      </main>
    </div>
  );
}
