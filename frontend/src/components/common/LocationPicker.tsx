import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, X, Check, Search, Loader2, Info, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useCity } from '../../context/CityContext';
import {
  matchAddressToAdminCities,
  getCityCoordinates,
  CityMatchResult
} from '../../utils/cityMatcher';

// Fix for default marker icon in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface SelectedLocationData {
  address: string;
  lat: number;
  lng: number;
  detectedCity?: string | null;
  categoryKey?: string | null;
}

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: SelectedLocationData) => void;
}

const LocationMarker: React.FC<{ setPosition: (pos: L.LatLng) => void; position: L.LatLng | null }> = ({
  setPosition,
  position
}) => {
  const map = useMap();
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 18, { duration: 0.8 });
    }
  });

  return position === null ? null : (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          if (marker != null) {
            const newPos = marker.getLatLng();
            setPosition(newPos);
          }
        }
      }}
    />
  );
};

const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Invalidate Leaflet map size on modal open and window resize
const MapResizer: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  const map = useMap();
  useEffect(() => {
    if (isOpen) {
      const timers = [
        setTimeout(() => map.invalidateSize(), 100),
        setTimeout(() => map.invalidateSize(), 300),
        setTimeout(() => map.invalidateSize(), 600)
      ];
      const handleResize = () => map.invalidateSize();
      window.addEventListener('resize', handleResize);
      return () => {
        timers.forEach(clearTimeout);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, map]);
  return null;
};

interface PlaceSuggestion {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ isOpen, onClose, onSelect }) => {
  const { selectedCity, selectedCategory, cityCategories } = useCity();

  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [addressText, setAddressText] = useState('');
  const [validation, setValidation] = useState<CityMatchResult | null>(null);

  // Dynamic initial center based on user's active delivery city in British Columbia
  const [center, setCenter] = useState<[number, number]>(() => getCityCoordinates(selectedCity));
  const [zoom, setZoom] = useState(13);

  // Search and Autocomplete states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  // Refinement Form fields
  const [unit, setUnit] = useState('');
  const [instructions, setInstructions] = useState('');

  // Reset state and center on selected city when modal opens
  useEffect(() => {
    if (isOpen) {
      setUnit('');
      setInstructions('');
      setSearchQuery('');
      setSuggestions([]);
      const cityCoord = getCityCoordinates(selectedCity);
      setCenter(cityCoord);
      setZoom(13);
    }
  }, [isOpen, selectedCity]);

  // Debounced search for address suggestions (biased to Canada / British Columbia)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&countrycodes=ca&limit=5&addressdetails=1`
        );
        setSuggestions(response.data || []);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPos = new L.LatLng(latitude, longitude);
        setPosition(newPos);
        setCenter([latitude, longitude]);
        setZoom(18);
        fetchAddress(latitude, longitude);
        setLoading(false);
        toast.success('Location detected!');
      },
      (error) => {
        console.error('Error getting current location:', error);
        setLoading(false);
        toast.error('Unable to access GPS location. Please search your address or tap the map.');
        if (!position) {
          setCenter(getCityCoordinates(selectedCity));
          setZoom(13);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (response.data && response.data.display_name) {
        const addr = response.data.address || {};
        const street = addr.road || addr.suburb || '';
        const houseNumber = addr.house_number || '';
        const city = addr.city || addr.town || addr.municipality || addr.village || '';
        const state = addr.state || '';
        const postcode = addr.postcode || '';

        let cleanAddr = '';
        if (houseNumber && street) {
          cleanAddr = `${houseNumber} ${street}, ${city}`;
        } else if (street) {
          cleanAddr = `${street}, ${city}`;
        } else {
          cleanAddr = response.data.display_name;
        }

        if (state) cleanAddr += `, ${state}`;
        if (postcode) cleanAddr += `, ${postcode}`;

        setAddressText(cleanAddr);

        // Validate address against live Admin cityCategories
        const match = matchAddressToAdminCities(cleanAddr, cityCategories, addr);
        setValidation(match);

        if (!match.eligible) {
          if (match.outOfProvince) {
            toast.error(`Service unavailable in ${match.provinceName || 'this region'}. We only operate in British Columbia.`);
          } else {
            toast.error('This location is outside our currently serviceable cities.');
          }
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding location:', error);
    }
  };

  useEffect(() => {
    if (position) {
      fetchAddress(position.lat, position.lng);
    }
  }, [position]);

  const handleSelectSuggestion = (sug: PlaceSuggestion) => {
    const lat = parseFloat(sug.lat);
    const lon = parseFloat(sug.lon);
    const newPos = new L.LatLng(lat, lon);

    setPosition(newPos);
    setCenter([lat, lon]);
    setZoom(18);
    setAddressText(sug.display_name);
    setSuggestions([]);
    setSearchQuery('');

    // Immediate validation
    const match = matchAddressToAdminCities(sug.display_name, cityCategories, sug.address);
    setValidation(match);
  };

  const handleConfirm = () => {
    if (position && addressText) {
      if (validation && !validation.eligible) {
        toast.error('Cannot proceed: Selected address is not in a serviceable delivery area.');
        return;
      }

      let combinedAddress = addressText;
      if (unit.trim()) {
        combinedAddress += `, Apt/Unit: ${unit.trim()}`;
      }
      if (instructions.trim()) {
        combinedAddress += ` (Instructions: ${instructions.trim()})`;
      }

      onSelect({
        address: combinedAddress,
        lat: position.lat,
        lng: position.lng,
        detectedCity: validation?.city || null,
        categoryKey: validation?.categoryKey || null
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-[94vh] sm:h-[90vh] md:h-[88vh] border border-gray-100">
        {/* Modal Top Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                Select Delivery Location
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                British Columbia Service Territory • Active City: <strong className="text-primary">{selectedCity || 'None'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content: Map + Form */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Map Section */}
          <div className="flex-1 h-[45%] lg:h-full relative min-h-[250px] z-10">
            <MapContainer
              center={center}
              zoom={zoom}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker setPosition={setPosition} position={position} />
              <MapController center={center} zoom={zoom} />
              <MapResizer isOpen={isOpen} />
            </MapContainer>

            {/* GPS Locate Button */}
            <div className="absolute top-4 right-4 z-[400]">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={loading}
                className="flex items-center gap-2 bg-white text-gray-800 hover:text-primary px-3.5 py-2.5 rounded-xl shadow-lg border border-gray-200/80 text-xs font-bold transition hover:shadow-xl active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin text-primary" /> : <Navigation size={16} className="text-primary" />}
                <span>Locate Me</span>
              </button>
            </div>

            {/* Tap Hint */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] bg-black/75 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none backdrop-blur-sm whitespace-nowrap">
              Tap anywhere on map or drag pin to position
            </div>
          </div>

          {/* Sidebar / Refinement Panel */}
          <div className="w-full lg:w-[420px] bg-gray-50/70 border-t lg:border-t-0 lg:border-l border-gray-200/80 flex flex-col p-4 sm:p-5 overflow-y-auto space-y-3.5">
            {/* 1. Address Search Autocomplete */}
            <div className="relative">
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1">
                Search Street Address (BC)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 123 Main St, Vancouver, BC..."
                  className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
              </div>

              {/* Suggestions List */}
              {suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {suggestions.map((sug) => (
                    <li
                      key={sug.place_id}
                      onClick={() => handleSelectSuggestion(sug)}
                      className="p-3 hover:bg-red-50/70 hover:text-primary cursor-pointer transition font-medium text-gray-700 leading-snug"
                    >
                      {sug.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 2. Selected Location Card */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                Selected Location
              </label>
              <div className="p-3 bg-white border border-gray-200/80 rounded-2xl shadow-sm flex gap-2.5 items-start">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-900 font-bold leading-relaxed break-words">
                    {addressText || (
                      <span className="text-gray-400 font-medium italic">
                        Tap on the map or search address above to select location
                      </span>
                    )}
                  </p>
                  {position && (
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      GPS: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Validation Feedback Alert */}
            {validation && (
              <div>
                {!validation.eligible ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-red-600">
                      <AlertTriangle size={15} className="shrink-0" />
                      <span>Delivery Unavailable Here</span>
                    </div>
                    <p className="text-[11px] text-red-700 leading-relaxed">
                      {validation.error || 'This address is outside our delivery area in British Columbia.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Check size={14} className="text-emerald-600" />
                      <span>Serviceable: {validation.city}</span>
                    </div>
                    <span className="text-[9px] uppercase font-black px-2 py-0.5 bg-emerald-200/60 rounded-full">
                      {validation.categoryName}
                    </span>
                  </div>
                )}

                {/* Pricing Tier Warning Note if Different Category */}
                {validation.eligible && validation.categoryKey !== selectedCategory && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex gap-1.5 items-start">
                    <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Notice: This address is in <strong>{validation.categoryName}</strong>. If confirmed, your plan price and delivery fee will synchronize at checkout.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 4. Refinement Form Fields */}
            <div className="space-y-3 pt-1">
              {/* Apt / Unit */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  Apartment / Suite / Unit / Buzz (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apt 4B, Unit 203, Buzz #1234"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>

              {/* Delivery Instructions */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  Delivery Instructions (Optional)
                </label>
                <textarea
                  placeholder="e.g. Leave by front door, call upon arrival..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-sm resize-none"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>
            </div>

            {/* 5. Confirm Button */}
            <div className="pt-2 mt-auto shrink-0">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!position || !addressText || (validation !== null && !validation.eligible)}
                className="w-full bg-primary text-white py-3.5 rounded-xl sm:rounded-2xl font-bold text-sm hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-2 shadow-lg shadow-primary/25 active:scale-[0.98]"
              >
                <Check size={18} /> Confirm Delivery Address
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
