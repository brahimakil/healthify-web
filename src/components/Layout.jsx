import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  // Default to closed sidebar on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth >= 768; // 768px is the md breakpoint in Tailwind
  });
  
  // Handle responsive sidebar state on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Fixed sidebar width
  const SIDEBAR_WIDTH = 256; // 64 in rem (16rem = 256px)
  
  // Use CSS variables for smoother transitions
  const layoutStyle = {
    '--sidebar-width': `${SIDEBAR_WIDTH}px`,
  };
  
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50" style={layoutStyle}>
      {/* Mobile sidebar overlay */}
      <div className={`md:hidden fixed inset-0 z-40 ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75" 
          onClick={() => setSidebarOpen(false)}
        ></div>
        <div className="fixed left-0 top-0 h-full w-64 bg-indigo-800">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <Sidebar />
        </div>
      </div>
      
      {/* Desktop sidebar - fixed position for performance */}
      <div 
        className="hidden md:block fixed left-0 top-0 h-full z-10 bg-indigo-800"
        style={{
          width: SIDEBAR_WIDTH,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform'
        }}
      >
        <Sidebar />
      </div>
      
      {/* Main content - with padding based on sidebar state */}
      <div 
        className="flex flex-col w-full flex-1"
        style={{
          marginLeft: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0',
          transition: 'margin-left 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'margin-left'
        }}
      >
        <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="py-6 px-6 sm:px-8 md:px-10 lg:px-12 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
