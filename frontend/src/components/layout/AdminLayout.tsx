import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, LogOut, Menu, CreditCard, Truck, Users, Ticket, Utensils, Star, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: Truck, label: 'Deliveries', path: '/admin/deliveries' },
    { icon: ShoppingBag, label: 'Orders', path: '/admin/orders' },
    { icon: CreditCard, label: 'Subscriptions', path: '/admin/subscriptions' },
    { icon: Ticket, label: 'Coupons', path: '/admin/coupons' },
    { icon: Utensils, label: 'Menu & Plans', path: '/admin/menu' },
    { icon: Star, label: 'Reviews', path: '/admin/reviews' },
    { icon: Calendar, label: 'Holidays', path: '/admin/holidays' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      {/* Mobile Header Trigger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center px-4 justify-between">
         <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="h-8 w-auto" />
            <span className="font-bold text-lg text-primary">Ghar Ki Rasoee</span>
         </div>
         <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600">
            <Menu size={24} />
         </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`bg-slate-900 border-r border-slate-800 fixed inset-y-0 left-0 z-50 transition-all duration-300 shadow-2xl ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className={`h-20 flex items-center ${isSidebarOpen ? 'justify-between px-6' : 'justify-center'} border-b border-slate-800 transition-all duration-300`}>
            <div className={`flex items-center gap-2 transition-all ${!isSidebarOpen && 'hidden'}`}>
                <img src="/logo.svg" alt="Logo" className="h-8 w-auto" />
                <h1 className="font-black text-xl text-white tracking-tighter truncate">
                GHAR KI RASOEE
                </h1>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors hidden md:block"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 space-y-2 ${isSidebarOpen ? 'p-4 overflow-y-auto' : 'p-2 overflow-visible'}`}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon size={20} className={`transition-colors ${!isSidebarOpen ? 'mx-auto' : ''}`} />
                <span className={`transition-all ${!isSidebarOpen ? 'hidden opacity-0' : 'opacity-100'}`}>
                  {item.label}
                </span>
                {!isSidebarOpen && (
                   <div className="hidden group-hover:block absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl whitespace-nowrap z-[100]">
                      {item.label}
                   </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-bold group relative"
            >
              <LogOut size={20} className={`${!isSidebarOpen ? 'mx-auto' : ''}`} />
              <span className={`transition-all ${!isSidebarOpen ? 'hidden opacity-0' : 'opacity-100'}`}>
                Logout
              </span>
              {!isSidebarOpen && (
                   <div className="hidden group-hover:block absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl whitespace-nowrap z-[100]">
                      Logout
                   </div>
              )}
            </button>
          </div>
        </div>
      </aside>
      
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main 
        className={`min-h-screen transition-all duration-300 ${
          isSidebarOpen ? 'md:ml-64 ml-0' : 'md:ml-20 ml-0'
        } pt-20 md:pt-0`}
      >
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
