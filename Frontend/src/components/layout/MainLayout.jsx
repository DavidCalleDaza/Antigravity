import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNavbar from './BottomNavbar';
import DynamicBackground from './DynamicBackground';

const MainLayout = () => {
  return (
    <div className="min-h-screen w-full text-gray-900 dark:text-gray-100 transition-colors duration-300 relative">
      <DynamicBackground />
      <Header/>
      <main className="w-full pt-4 overflow-x-hidden relative z-10" style={{ paddingBottom: '100px' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet/>
        </div>
      </main>
      <BottomNavbar/>
    </div>
  );
};

export default MainLayout;