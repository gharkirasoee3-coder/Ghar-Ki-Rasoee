/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';



interface CityContextType {
  selectedCity: string | null;
  selectCity: (city: string) => void;
  clearCity: () => void;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCity, setSelectedCityState] = useState<string | null>(() => {
    return localStorage.getItem('gkr_selected_city') || null;
  });

  const selectCity = (city: string) => {
    localStorage.setItem('gkr_selected_city', city);
    setSelectedCityState(city);
  };

  const clearCity = () => {
    localStorage.removeItem('gkr_selected_city');
    setSelectedCityState(null);
  };

  return (
    <CityContext.Provider value={{ selectedCity, selectCity, clearCity }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
};
