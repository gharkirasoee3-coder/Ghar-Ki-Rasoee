import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PageContainer from '../../../components/layout/PageContainer';
import { Search, MapPin, X, Download, ExternalLink, ArrowRight, Info } from 'lucide-react';
import { ENV } from '../../../config/env.config';

import { useCity } from '../../../context/CityContext';
import { CANADIAN_CITIES, SPECIFIC_CITIES, POPULAR_CITIES as popularCities } from '../../../config/city.config';

const Menu: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedCity, selectCity } = useCity();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuImages, setMenuImages] = useState<{ vancouver: string; others: string }>({
    vancouver: '/For-Vancouver-Burnaby-Richmond-New-Westminster-Langley.jpeg',
    others: '/remaining-city.jpeg'
  });

  // Fetch dynamic menu images on mount
  useEffect(() => {
    const fetchMenuImages = async () => {
      try {
        const res = await axios.get(`${ENV.API_URL}/menu/menu-images`);
        if (res.data.success && res.data.data.menuImages) {
          setMenuImages(res.data.data.menuImages);
        }
      } catch (error) {
        console.error("Failed to fetch menu images:", error);
      }
    };
    fetchMenuImages();
  }, []);

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

  // Determine if specific menu image should be shown
  const isSpecificCity = selectedCity 
    ? SPECIFIC_CITIES.includes(selectedCity.toLowerCase().trim()) 
    : false;

  const menuImageSrc = isSpecificCity 
    ? menuImages.vancouver
    : menuImages.others;

  const getMenuImageName = (src: string, defaultName: string) => {
    if (!src) return defaultName;
    if (src.startsWith('/')) return src.substring(1);
    try {
      const url = new URL(src);
      const pathname = url.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1) || defaultName;
    } catch {
      return defaultName;
    }
  };

  const menuImageName = isSpecificCity
    ? getMenuImageName(menuImages.vancouver, 'For-Vancouver-Burnaby-Richmond-New-Westminster-Langley.jpeg')
    : getMenuImageName(menuImages.others, 'remaining-city.jpeg');


  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <PageContainer className="py-12 text-center">
          <span className="bg-red-50 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3 inline-block">
            Fresh Indian Tiffin Service
          </span>
          <h1 className="text-4xl font-extrabold text-text-primary mb-4 tracking-tight md:text-5xl">
            Our Delicious Tiffin Menu
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            We deliver hot, fresh, home-cooked meals prepared with 100% fresh ingredients. Select your city to see the weekly rotation menu for your area.
          </p>
        </PageContainer>
      </div>

      <PageContainer className="mt-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* City Selection Area */}
          <div className="bg-white rounded-card shadow-sm border border-gray-200 p-6 md:p-8 transition-all hover:shadow-md">
            {!selectedCity ? (
              <div className="space-y-6">
                <div className="text-center max-w-md mx-auto">
                  <div className="bg-red-50 text-primary w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin size={24} className="animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">Select Your Delivery City</h3>
                  <p className="text-sm text-text-secondary">
                    Menus vary by region to ensure local kitchens deliver your meals fresh and hot.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-lg mx-auto" ref={dropdownRef}>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-gray-400">
                      <Search size={20} />
                    </span>
                    <input
                      type="text"
                      placeholder="Search your city in Canada (e.g. Burnaby, Toronto...)"
                      className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all shadow-inner"
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
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Suggestions */}
                  {showDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-gray-100">
                      {filteredCities.length > 0 ? (
                        filteredCities.map((city) => (
                          <button
                            key={city}
                            onClick={() => handleSelectCity(city)}
                            className="w-full px-5 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-red-50 hover:text-primary transition-colors flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2">
                              <MapPin size={16} className="text-gray-400" />
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
                        <div className="px-5 py-4 text-center">
                          <p className="text-sm font-medium text-text-secondary mb-2">Can't find your city?</p>
                          <button
                            onClick={() => handleSelectCity(searchQuery)}
                            className="text-sm font-bold text-primary hover:underline flex items-center gap-1 mx-auto"
                          >
                            Use "{searchQuery}" <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Popular Cities Grid */}
                <div className="max-w-lg mx-auto pt-2">
                  <span className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 text-center">
                    Or select a popular city:
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {popularCities.map((city) => (
                      <button
                        key={city}
                        onClick={() => handleSelectCity(city)}
                        className="px-4 py-2 bg-gray-100 hover:bg-red-50 hover:text-primary border border-transparent hover:border-red-200 rounded-full text-sm font-bold text-text-primary transition-all active:scale-95"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-red-50 text-primary w-12 h-12 rounded-full flex items-center justify-center shrink-0">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                      Currently Showing Menu For
                    </span>
                    <h3 className="text-2xl font-black text-text-primary leading-tight">
                      {selectedCity}
                    </h3>
                  </div>
                </div>
                {/* <button
                  onClick={handleClearSelection}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm flex items-center gap-2"
                >
                  Change City
                </button> */}
              </div>
            )}
          </div>

          {/* Menu Image Display Section */}
          {selectedCity ? (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-card shadow-lg border border-gray-200 overflow-hidden">
                {/* Image Toolbar */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-sm font-bold text-gray-700">Weekly Menu Sheet ({selectedCity})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={menuImageSrc}
                      download={menuImageName}
                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-primary hover:border-red-100 transition shadow-sm"
                      title="Download Menu"
                    >
                      <Download size={18} />
                    </a>
                    <a
                      href={menuImageSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-primary hover:border-red-100 transition shadow-sm flex items-center gap-1.5 text-xs font-bold"
                    >
                      View Fullsize <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {/* Big Image display */}
                <div className="p-4 md:p-6 bg-gray-100 flex justify-center items-center">
                  <div className="relative group max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                    <img
                      src={menuImageSrc}
                      alt={`Tiffin Menu for ${selectedCity}`}
                      className="w-full h-auto object-contain mx-auto max-h-[80vh] transition-transform duration-300"
                    />
                  </div>
                </div>

                {/* Additional Info / CTA */}
                <div className="p-6 md:p-8 bg-white border-t border-gray-100 text-center space-y-6">
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-xl text-left max-w-2xl mx-auto">
                    <div className="flex gap-3">
                      <div className="shrink-0 text-orange-600">
                        <Info size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-orange-950 text-sm">Important Note:</h4>
                        <p className="text-orange-900 text-xs mt-0.5 leading-relaxed font-medium">
                          All meals are prepared using 100% fresh ingredients. Sabji will not be repeated in 3-4 weeks. Standard tiffins are delivered Monday-Saturday.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h3 className="text-xl font-bold text-text-primary mb-2">Love the menu? Subscribe today!</h3>
                    <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
                      Get fresh, home-cooked Indian meals delivered to your doorstep. Choose a plan that fits your lifestyle.
                    </p>
                    <Link
                      to="/pricing"
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary-hover text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-base"
                    >
                      View Plans & Subscribe <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-card border border-gray-200 p-12 text-center text-text-secondary space-y-4">
              <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <Search size={40} />
              </div>
              <p className="font-bold text-lg text-text-primary">No City Selected</p>
              <p className="text-sm max-w-sm mx-auto">
                Please search or click on your city above to view the respective tiffin menu for your region.
              </p>
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
};

export default Menu;
