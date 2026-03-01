import React, { useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Fuel, 
  Banknote, 
  BookOpen, 
  Package, 
  LogOut, 
  Menu, 
  X, 
  Users,
  History
} from 'lucide-react';

const Layout: React.FC = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!authContext) return null;
  const { user, logout } = authContext;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Cash Counter', path: '/cash', icon: <Banknote size={20} /> },
    { name: 'Fuel Management', path: '/fuels', icon: <Fuel size={20} /> },
    { name: 'Party Ledger', path: '/ledger', icon: <BookOpen size={20} /> },
    { name: 'Inventory', path: '/inventory', icon: <Package size={20} /> },
  ];

  // Add Admin only routes
  if (user?.role === 'admin') {
    navItems.push({ name: 'Sell Transactions', path: '/transactions', icon: <History size={20} /> });
    navItems.push({ name: 'Users', path: '/users', icon: <Users size={20} /> });
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-20 px-6 bg-slate-950">
          <div className="flex flex-col justify-center">
            <span className="text-xl font-bold tracking-tight text-indigo-400 leading-tight">Salim & Sons</span>
            <span className="text-xs font-medium text-slate-400 tracking-wider uppercase mt-0.5">Fuel Station Pro</span>
          </div>
          <button 
            className="lg:hidden text-gray-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center px-4 py-3 mb-2 rounded-xl bg-slate-800">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium text-red-400 transition-colors rounded-xl hover:bg-slate-800 hover:text-red-300"
            >
              <LogOut size={20} className="mr-3" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        {/* Top header */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 lg:hidden">
          <button
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-slate-900 leading-tight">Salim & Sons</span>
            <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">Fuel Station Pro</span>
          </div>
          <div className="w-6" /> {/* Spacer for centering */}
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
