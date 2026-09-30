import React, { useState, useRef, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Outlet, useLocation } from 'react-router-dom';
import { useCity } from '../../context/CityContext';
import { MapPin, Search, X, Check, AlertCircle } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    selectedCity,
    selectCity,
    isCityModalOpen,
    closeCityModal,
    cityCategories,
    supportedCities
  } = useCity();
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

  // Filter admin-configured supported cities
  const filteredCities = supportedCities.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bypassPaths = ['/login', '/register'];
  const isBypassed = bypassPaths.includes(location.pathname);

  // Show modal if not selected or if user clicked to change city
  const showCityModal = (!selectedCity && !isBypassed) || isCityModalOpen;

  // Group cities by category
  const localCities = supportedCities.filter((c) => c.categoryKey === 'local');
  const farCities = supportedCities.filter((c) => c.categoryKey === 'far');

  return (
    <>
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />

      {showCityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-100 p-6 md:p-8 animate-in zoom-in-95 duration-200 relative max-h-[92vh] overflow-y-auto">
            {/* Close Button if a city is already selected */}
            {selectedCity && (
              <button
                type="button"
                onClick={closeCityModal}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            )}

            {/* Branding Header */}
            <div className="text-center">
              <h1 className="text-3xl font-black text-primary tracking-tight">Ghar Ki Rasoee</h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-5">
                Fresh Indian Tiffin Service • British Columbia
              </p>

              <div className="bg-red-50 text-primary w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-100 shadow-sm">
                <MapPin size={28} className="animate-bounce" />
              </div>

              <h2 className="text-xl font-extrabold text-text-primary mb-1">Select Your Delivery City</h2>
              <p className="text-xs sm:text-sm text-text-secondary max-w-sm mx-auto mb-5 leading-relaxed">
                Menus and subscription pricing vary by region. Please select your delivery city in British Columbia.
              </p>
            </div>

            {/* City Search Area */}
            <div className="space-y-5">
              <div className="relative max-w-md mx-auto w-full" ref={dropdownRef}>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-gray-400">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search supported cities (e.g. Vancouver, Surrey)..."
                    className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-inner"
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
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-100">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((cityObj) => {
                        const isSelected = selectedCity?.toLowerCase() === cityObj.name.toLowerCase();
                        return (
                          <button
                            key={cityObj.name}
                            type="button"
                            onClick={() => handleSelectCity(cityObj.name)}
                            className={`w-full px-5 py-3 text-left text-sm font-semibold transition-colors flex items-center justify-between ${
                              isSelected ? 'bg-red-50 text-primary font-bold' : 'text-gray-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <MapPin size={14} className={isSelected ? 'text-primary' : 'text-gray-400'} />
                              {cityObj.name}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                cityObj.categoryKey === 'local'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {cityObj.categoryName}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      searchQuery.trim().length > 0 && (
                        <div className="px-5 py-4 text-center space-y-1">
                          <AlertCircle size={20} className="text-amber-500 mx-auto mb-1" />
                          <p className="text-xs font-bold text-slate-700">Service Not Available in &quot;{searchQuery}&quot;</p>
                          <p className="text-[11px] text-slate-400">
                            We currently deliver to configured cities in British Columbia. Please select from the list below.
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Grouped Serviceable Cities */}
              <div className="space-y-4 pt-1">
                {/* Local Cities Section */}
                {localCities.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {cityCategories.local?.name || 'Local Cities'} (Lower Mainland)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Standard Pricing
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {localCities.map((c) => {
                        const isSelected = selectedCity?.toLowerCase() === c.name.toLowerCase();
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => handleSelectCity(c.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-primary text-white shadow-md shadow-primary/20 ring-2 ring-primary/30'
                                : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Far Cities Section */}
                {farCities.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {cityCategories.far?.name || 'Far Cities'} (Extended Delivery)
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        Far Tier Pricing
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {farCities.map((c) => {
                        const isSelected = selectedCity?.toLowerCase() === c.name.toLowerCase();
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => handleSelectCity(c.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-600/30'
                                : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MainLayout;
