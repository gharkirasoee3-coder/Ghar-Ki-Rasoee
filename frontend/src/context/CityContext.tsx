/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ENV } from '../config/env.config';
import { CityCategoryConfig, normalizeCityName } from '../utils/cityMatcher';

export interface SupportedCity {
  name: string;
  categoryKey: string;
  categoryName: string;
}

interface CityContextType {
  selectedCity: string | null;
  selectedCategory: string | null;
  selectCity: (city: string) => void;
  clearCity: () => void;
  isCityModalOpen: boolean;
  openCityModal: () => void;
  closeCityModal: () => void;
  cityCategories: Record<string, CityCategoryConfig>;
  supportedCities: SupportedCity[];
  getCityCategory: (city: string | null) => string | null;
  refreshCityConfig: () => Promise<void>;
  loadingCities: boolean;
}

const defaultCityCategories: Record<string, CityCategoryConfig> = {
  local: {
    name: "Local Cities",
    cities: ["Vancouver", "Burnaby", "Richmond", "New Westminster", "Langley", "Surrey", "Delta", "Coquitlam", "Port Coquitlam", "Port Moody"],
    deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
    planPrices: { basic: 150, standard: 190, premium: 220, customizableBase: 100 }
  },
  far: {
    name: "Far Cities",
    cities: ["Abbotsford", "Chilliwack", "Mission", "Maple Ridge", "White Rock", "Pitt Meadows"],
    deliveryFeeSettings: { minAmountForFreeDelivery: 200, deliveryFee: 25 },
    planPrices: { basic: 180, standard: 220, premium: 250, customizableBase: 120 }
  }
};

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCity, setSelectedCityState] = useState<string | null>(() => {
    return localStorage.getItem('gkr_selected_city') || null;
  });

  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [cityCategories, setCityCategories] = useState<Record<string, CityCategoryConfig>>(defaultCityCategories);
  const [loadingCities, setLoadingCities] = useState(false);

  const refreshCityConfig = useCallback(async () => {
    try {
      setLoadingCities(true);
      const res = await axios.get(`${ENV.API_URL}/menu/supported-cities`).catch(() => {
        // Fallback to /menu/plans if supported-cities route is caching
        return axios.get(`${ENV.API_URL}/menu/plans`);
      });
      if (res.data?.data?.cityCategories) {
        setCityCategories(res.data.data.cityCategories);
      }
    } catch (err) {
      console.error("Failed to fetch supported cities from backend, using defaults:", err);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  useEffect(() => {
    refreshCityConfig();
  }, [refreshCityConfig]);

  const selectCity = (city: string) => {
    localStorage.setItem('gkr_selected_city', city);
    setSelectedCityState(city);
    setIsCityModalOpen(false);
  };

  const clearCity = () => {
    localStorage.removeItem('gkr_selected_city');
    setSelectedCityState(null);
  };

  const openCityModal = () => setIsCityModalOpen(true);
  const closeCityModal = () => setIsCityModalOpen(false);

  // Derive flat list of supported cities
  const supportedCities: SupportedCity[] = [];
  for (const key of Object.keys(cityCategories)) {
    const cat = cityCategories[key];
    const cities = cat?.cities || [];
    for (const city of cities) {
      if (city && city.trim()) {
        supportedCities.push({
          name: city.trim(),
          categoryKey: key,
          categoryName: cat.name || key
        });
      }
    }
  }

  const getCityCategory = useCallback((city: string | null): string | null => {
    if (!city) return null;
    const norm = normalizeCityName(city);
    for (const key of Object.keys(cityCategories)) {
      const cat = cityCategories[key];
      const cities = cat?.cities || [];
      if (cities.some(c => normalizeCityName(c) === norm)) {
        return key;
      }
    }
    return null;
  }, [cityCategories]);

  const selectedCategory = getCityCategory(selectedCity);

  return (
    <CityContext.Provider
      value={{
        selectedCity,
        selectedCategory,
        selectCity,
        clearCity,
        isCityModalOpen,
        openCityModal,
        closeCityModal,
        cityCategories,
        supportedCities,
        getCityCategory,
        refreshCityConfig,
        loadingCities
      }}
    >
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
