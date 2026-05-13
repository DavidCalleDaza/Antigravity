import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNavbar from './BottomNavbar';
import DynamicBackground from './DynamicBackground';

const MOBILE_BREAKPOINT = 768;

const MainLayout = () => {
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
    <div className="min-h-screen w-full text-gray-900 dark:text-gray-100 transition-colors duration-300 relative">
      <DynamicBackground />
      <Header/>
      <main className="w-full pt-4 overflow-x-hidden relative z-10" style={{ paddingBottom: isMobile ? '100px' : '0' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet/>
        </div>
      </main>
      {isMobile ? (
        <BottomNavbar />
      ) : (
        <Sidebar isOpen={sidebarOpen} closeMobile={() => setSidebarOpen(false)} />
      )}
    </div>
  );
};

export default MainLayout;