import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, X, Check, Search, Loader2, Info } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

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

interface LocationPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (location: { address: string; lat: number; lng: number }) => void;
}

const LocationMarker: React.FC<{ setPosition: (pos: L.LatLng) => void, position: L.LatLng | null }> = ({ setPosition, position }) => {
    const map = useMap();
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, 18, { duration: 0.8 });
        },
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

const MapController: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
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
                setTimeout(() => map.invalidateSize(), 600),
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
}

const LocationPicker: React.FC<LocationPickerProps> = ({ isOpen, onClose, onSelect }) => {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const [loading, setLoading] = useState(false);
    const [addressText, setAddressText] = useState('');
    const [center, setCenter] = useState<[number, number]>([43.6532, -79.3832]); // Toronto
    const [zoom, setZoom] = useState(12);

    // Search and Autocomplete states
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [searching, setSearching] = useState(false);

    // Refinement Form fields
    const [unit, setUnit] = useState('');
    const [instructions, setInstructions] = useState('');

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setUnit('');
            setInstructions('');
            setSearchQuery('');
            setSuggestions([]);
        }
    }, [isOpen]);

    // Debounced search for address suggestions
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSuggestions([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setSearching(true);
            try {
                const response = await axios.get(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
                );
                setSuggestions(response.data || []);
            } catch (error) {
                console.error("Error fetching address suggestions:", error);
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
                console.error("Error getting current location:", error);
                setLoading(false);
                toast.error('Unable to access location. Please search your address or tap the map.');
                if (!position) {
                    setCenter([43.6532, -79.3832]);
                    setZoom(12);
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
                const addr = response.data.address;
                const street = addr.road || addr.suburb || '';
                const houseNumber = addr.house_number || '';
                const city = addr.city || addr.town || addr.village || '';
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
            }
        } catch (error) {
            console.error("Error reverse geocoding location:", error);
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
    };

    const handleConfirm = () => {
        if (position && addressText) {
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
                lng: position.lng
            });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-[94vh] sm:h-[90vh] md:h-[88vh] border border-gray-100">
                
                {/* Header */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-primary via-red-600 to-orange-500 text-white shrink-0 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                            <MapPin size={20} className="text-white animate-bounce" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-base sm:text-lg tracking-tight leading-tight">
                                Pinpoint Your Delivery Location
                            </h3>
                            <p className="text-white/85 text-[11px] sm:text-xs font-medium">
                                Drag the pin or tap anywhere on the map to set exact delivery coordinates
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-white/20 rounded-full transition-all active:scale-95 text-white"
                        aria-label="Close Map"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Main Split Layout: Spacious Map (Left) + Detail Form (Right) */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 relative">
                    
                    {/* Map Container: Generous 65%-72% space on desktop, 55vh on mobile */}
                    <div className="flex-1 h-[50vh] sm:h-[55vh] lg:h-full relative z-0 border-b lg:border-b-0 lg:border-r border-gray-200">
                        <MapContainer 
                            center={center} 
                            zoom={zoom} 
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapController center={center} zoom={zoom} />
                            <MapResizer isOpen={isOpen} />
                            <LocationMarker setPosition={setPosition} position={position} />
                        </MapContainer>

                        {/* Top-Right Floating GPS / Detect Button */}
                        <div className="absolute top-3.5 right-3.5 z-[1000] flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={handleUseCurrentLocation}
                                disabled={loading}
                                className="flex items-center gap-2 bg-white text-gray-800 hover:text-primary px-3.5 py-2.5 rounded-xl shadow-lg border border-gray-200/80 text-xs font-bold transition hover:shadow-xl active:scale-95 disabled:opacity-50"
                                title="Locate Me with GPS"
                            >
                                <Navigation size={15} className={`text-primary ${loading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">{loading ? 'Locating...' : 'Locate Me'}</span>
                            </button>
                        </div>

                        {/* Bottom-Left Floating Tip Banner */}
                        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-200/90 shadow-lg text-[11px] font-semibold text-gray-700 flex items-center gap-2 max-w-[280px] sm:max-w-xs pointer-events-none">
                            <Info size={14} className="text-primary shrink-0" />
                            <span>Click or drag the red pin to set your exact doorstep.</span>
                        </div>
                    </div>

                    {/* Right Side Details & Search Panel */}
                    <div className="w-full lg:w-[380px] xl:w-[420px] bg-slate-50/70 flex flex-col overflow-y-auto shrink-0 p-4 sm:p-5 space-y-4">
                        
                        {/* 1. Address Search Bar */}
                        <div className="space-y-1.5 relative">
                            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <Search size={12} className="text-primary" /> Search Address or Postal Code
                            </label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3.5 text-gray-400 pointer-events-none">
                                    {searching ? <Loader2 size={16} className="animate-spin text-primary" /> : <Search size={16} />}
                                </span>
                                <input
                                    type="text"
                                    placeholder="e.g. 123 Main St, Vancouver, BC..."
                                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Autocomplete Dropdown */}
                            {suggestions.length > 0 && (
                                <ul className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[2000] overflow-hidden max-h-56 overflow-y-auto divide-y divide-gray-100">
                                    {suggestions.map((sug, i) => (
                                        <li key={i}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectSuggestion(sug)}
                                                className="w-full px-4 py-3 text-left text-xs font-semibold text-gray-700 hover:bg-orange-50/50 hover:text-primary transition-colors flex items-start gap-2.5"
                                            >
                                                <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                                                <span className="line-clamp-2 leading-relaxed">{sug.display_name}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* 2. Detected / Selected Address Card */}
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-wider">
                                Selected Location
                            </label>
                            <div className="p-3.5 bg-white border border-gray-200/80 rounded-2xl shadow-sm flex gap-3 items-start">
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
                                        <p className="text-[10px] text-gray-400 font-mono mt-1">
                                            Coords: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 3. Refinement Form Fields */}
                        <div className="space-y-3.5 pt-1">
                            {/* Apt / Unit */}
                            <div className="space-y-1.5">
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
                            <div className="space-y-1.5">
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

                        {/* Confirm Button */}
                        <div className="pt-2 mt-auto shrink-0">
                            <button 
                                type="button"
                                onClick={handleConfirm}
                                disabled={!position || !addressText}
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
