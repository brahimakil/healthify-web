import { useAuth } from '../contexts/AuthContext';

export default function Header({ sidebarOpen, toggleSidebar }) {
  const auth = useAuth();
  
  return (
    <header className="bg-white shadow sticky top-0 z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <button
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <h1 className="ml-2 text-xl sm:text-2xl font-bold text-indigo-600 truncate">Healthify Dietitian</h1>
        </div>
        
        {auth && auth.currentUser && (
          <div className="flex items-center">
            <span className="hidden sm:inline mr-2 text-gray-700">Welcome,</span>
            <span className="text-gray-900 font-medium">{auth.currentUser.displayName}</span>
          </div>
        )}
      </div>
    </header>
  );
}
