import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './SideBar';

const Layout = ({ children, defaultExpanded = true }) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(defaultExpanded);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar toggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)} />
      <div className="flex flex-1 pt-14">
        <Sidebar isExpanded={isSidebarExpanded} />
        <main className={`flex-1 transition-all duration-300 ${isSidebarExpanded ? 'md:ml-60 ml-0' : 'md:ml-20 ml-0'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
