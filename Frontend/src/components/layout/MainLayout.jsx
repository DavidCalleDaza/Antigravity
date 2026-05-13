import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNavbar from './BottomNavbar';
import DynamicBackground from './DynamicBackground';
import { useStore } from '../../store/useStore';

const MOBILE_BREAKPOINT = 768;

const MainLayout = () => {
  const { sidebarCollapsed } = useStore();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''} min-h-screen w-full text-gray-900 dark:text-gray-100 transition-colors duration-300 relative`}>
      <DynamicBackground />
      {!isMobile && <Sidebar isOpen={sidebarOpen} closeMobile={() => setSidebarOpen(false)} />}
      
      <div className="app-main">
        <Header />
        <main className="page-content pt-4 overflow-x-hidden relative z-10" style={{ paddingBottom: isMobile ? '100px' : '0' }}>
          <Outlet />
        </main>
      </div>

      {isMobile && <BottomNavbar />}
    </div>
  );
};

export default MainLayout;