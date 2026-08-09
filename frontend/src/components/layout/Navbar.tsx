import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
// import { useCart } from '../../context/CartContext';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, role } = useAuth();
  // const { cartCount, toggleCart } = useCart(); // Removed
  
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Menu', path: '/menu' },
    { name: 'Pricing', path: '/pricing' },
  ];

  const userNavLinks = user ? [
    { name: 'My Subscription', path: '/my-subscription' },
  ] : [];

  const allNavLinks = [...navLinks, ...userNavLinks];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to={role === 'admin' ? '/admin' : '/'} className="flex-shrink-0 flex items-center gap-2">
            <img src="/logo.svg" alt="Ghar Ki Rasoee Logo" className="h-14 w-auto" />
            <span className="text-2xl font-bold text-primary tracking-tight">GHAR KI RASOEE</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {allNavLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(link.path) ? 'text-primary' : 'text-text-secondary hover:text-primary'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-6">
             {/* Cart Removed */}

             {user ? (
               role === 'admin' ? (
                 <Link to="/admin/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface hover:bg-gray-100 transition">
                   <User size={18} className="text-primary" />
                   <span className="text-sm font-medium">Admin</span>
                 </Link>
               ) : (
                 <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface hover:bg-gray-100 transition">
                   <User size={18} className="text-primary" />
                   <span className="text-sm font-medium">Dashboard</span>
                 </Link>
               )
             ) : (
               <div className="flex items-center gap-3">
                 <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-primary">Login</Link>
                 <Link to="/register" className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-hover transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                   Sign Up
                 </Link>
               </div>
             )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-text-secondary hover:text-primary p-2 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xl animate-fade-in z-40">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {allNavLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive(link.path) 
                    ? 'text-primary bg-primary/10 pl-5' 
                    : 'text-text-secondary hover:text-primary hover:bg-gray-50'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-100 mt-2">
              {user ? (
                role === 'admin' ? (
                  <Link to="/admin/dashboard" onClick={() => setIsOpen(false)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface text-primary font-medium">
                    <User size={18} /> Admin
                  </Link>
                ) : (
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface text-primary font-medium">
                    <User size={18} /> Dashboard
                  </Link>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login" onClick={() => setIsOpen(false)} className="w-full text-center py-2 text-text-secondary font-medium border border-gray-200 rounded-lg">Login</Link>
                  <Link to="/register" onClick={() => setIsOpen(false)} className="w-full text-center py-2 bg-primary text-white font-medium rounded-lg shadow-sm">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
