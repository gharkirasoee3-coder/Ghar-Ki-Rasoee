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
            map.flyTo(e.latlng, 18);
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
        ></Marker>
    );
};

const MapController: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({ isOpen, onClose, onSelect }) => {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const [loading, setLoading] = useState(false);
    const [addressText, setAddressText] = useState('');
    const [center, setCenter] = useState<[number, number]>([43.6532, -79.3832]); // Toronto
    const [zoom, setZoom] = useState(11);

    // Search and Autocomplete states
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
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
            },
            (error) => {
                console.error("Error getting current location:", error);
                setLoading(false);
                toast.error('Unable to access location. Please search for your address or tap the map.');
                // Set default center to Toronto if location fails
                if (!position) {
                    setCenter([43.6532, -79.3832]);
                    setZoom(11);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
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
                // Parse a clean address from details if possible
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

    const handleSelectSuggestion = (sug: any) => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh] border border-gray-100">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-primary to-orange-500 text-white shrink-0">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <MapPin size={20} className="animate-bounce" /> Setup Delivery Location
                        </h3>
                        <p className="text-white/80 text-xs mt-0.5 font-medium">Verify your address and drop the pin directly on your home</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-all active:scale-95">
                        <X size={22} />
                    </button>
                </div>

                {/* Main Split Layout */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                    
                    {/* Left side: Interactive Map */}
                    <div className="flex-1 h-[45vh] md:h-full relative z-0 border-b md:border-b-0 md:border-r border-gray-100">
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
                            <LocationMarker setPosition={setPosition} position={position} />
                        </MapContainer>

                        {/* Floating Help Banner */}
                        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur px-3 py-2 rounded-xl border border-gray-200 shadow-lg text-xs font-semibold text-gray-700 flex items-center gap-2 max-w-[280px]">
                            <Info size={14} className="text-primary shrink-0" />
                            <span>Drag the pin or tap the map to match your exact home location.</span>
                        </div>
                    </div>

                    {/* Right side: Address Search and Details Refinement Panel */}
                    <div className="w-full md:w-[360px] bg-gray-50 flex flex-col overflow-y-auto shrink-0 p-5 space-y-4">
                        
                        {/* 1. Address Search Bar */}
                        <div className="space-y-1.5 relative">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Search Address
                            </label>
                            <div className="relative flex items-center">
                                <span className="absolute left-3.5 text-gray-400">
                                    {searching ? <Loader2 size={16} className="animate-spin text-primary" /> : <Search size={16} />}
                                </span>
                                <input
                                    type="text"
                                    placeholder="Type address..."
                                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Autocomplete Dropdown List */}
                            {suggestions.length > 0 && (
                                <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[2000] overflow-hidden max-h-60 overflow-y-auto divide-y divide-gray-100">
                                    {suggestions.map((sug, i) => (
                                        <li key={i}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectSuggestion(sug)}
                                                className="w-full px-4 py-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-start gap-2.5"
                                            >
                                                <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                                                <span className="line-clamp-2">{sug.display_name}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Location Quick Button */}
                        <button 
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 py-2.5 rounded-xl transition"
                        >
                            <Navigation size={14} className={loading ? 'animate-pulse' : ''} />
                            {loading ? 'Detecting Location...' : 'Use Current Location'}
                        </button>

                        <hr className="border-gray-200" />

                        {/* 2. Refinement Details Form */}
                        <div className="space-y-4 flex-1">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Selected Address
                                </label>
                                <div className="p-3.5 bg-white border border-gray-200/60 rounded-2xl flex gap-2.5 items-start">
                                    <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                                    <span className="text-xs text-gray-700 font-bold leading-relaxed break-words">
                                        {addressText || 'No location pointed yet'}
                                    </span>
                                </div>
                            </div>

                            {/* Apt / Suite / Floor */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Apt / Suite / Unit / Floor
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Apt 4B, 3rd Floor"
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                />
                            </div>

                            {/* Delivery Instructions */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Buzz Code / Delivery Notes
                                </label>
                                <textarea
                                    placeholder="e.g. Buzz 1234, leave at front reception desk"
                                    rows={3}
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <div className="shrink-0 pt-2">
                            <button 
                                type="button"
                                onClick={handleConfirm}
                                disabled={!position || !addressText}
                                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-2 shadow-md shadow-primary/20 active:scale-[0.98]"
                            >
                                <Check size={18} /> Confirm Location
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationPicker;
