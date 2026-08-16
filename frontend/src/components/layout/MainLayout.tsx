import React, { useState, useRef, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Outlet, useLocation } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import { CANADIAN_CITIES, SPECIFIC_CITIES, POPULAR_CITIES } from '../../config/city.config';
import { MapPin, Search, X, ArrowRight } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { selectedCity, selectCity } = useCity();
  const location = useLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCity = (city: string) => {
    selectCity(city);
    setSearchQuery('');
    setShowDropdown(false);
  };

  // Filter cities based on search
  const filteredCities = CANADIAN_CITIES.filter(city => 
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bypassPaths = ['/login', '/register'];
  const isBypassed = bypassPaths.includes(location.pathname);

  // If selectedCity is null and path is not bypassed, show the city prompt overlay
  const showCityModal = !selectedCity && !isBypassed;

  return (
    <>
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />

      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-100 p-6 md:p-8 animate-in zoom-in-95 duration-200">
            {/* Branding Header */}
            <div className="text-center">
              <h1 className="text-3xl font-black text-primary tracking-tight">Ghar Ki Rasoee</h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-6">
                Fresh Indian Tiffin Service
              </p>
              
              <div className="bg-red-50 text-primary w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <MapPin size={32} className="animate-bounce" />
              </div>
              
              <h2 className="text-xl font-bold text-text-primary mb-2">Select Your Delivery City</h2>
              <p className="text-sm text-text-secondary max-w-sm mx-auto mb-6">
                Menus and delivery schedules vary by region. Please select your city to view the weekly meal rotation for your area.
              </p>
            </div>

            {/* City Search Area */}
            <div className="space-y-6">
              <div className="relative max-w-md mx-auto w-full" ref={dropdownRef}>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-gray-400">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search your city (e.g. Vancouver, Toronto...)"
                    className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-inner"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {showDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <button
                          key={city}
                          onClick={() => handleSelectCity(city)}
                          className="w-full px-5 py-3.5 text-left text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-primary transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <MapPin size={14} className="text-gray-400" />
                            {city}
                          </span>
                          {SPECIFIC_CITIES.includes(city.toLowerCase()) && (
                            <span className="text-[10px] bg-red-100 text-primary px-2 py-0.5 rounded-full font-bold">
                              Lower Mainland
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      searchQuery.trim().length > 1 && (
                        <div className="px-5 py-4 text-center">
                          <p className="text-sm font-medium text-text-secondary mb-2">Can't find your city?</p>
                          <button
                            onClick={() => handleSelectCity(searchQuery)}
                            className="text-sm font-bold text-primary hover:underline flex items-center gap-1 mx-auto"
                          >
                            Use "{searchQuery}" <ArrowRight size={14} />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Popular Cities Grid */}
              <div className="max-w-md mx-auto pt-2">
                <span className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 text-center">
                  Or select a popular city:
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {POPULAR_CITIES.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleSelectCity(city)}
                      className="px-4 py-2 bg-gray-100 hover:bg-red-50 hover:text-primary border border-transparent hover:border-red-200 rounded-full text-xs font-bold text-text-primary transition-all active:scale-95"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainLayout;
