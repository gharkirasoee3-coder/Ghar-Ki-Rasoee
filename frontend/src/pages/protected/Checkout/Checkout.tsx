import React, { useState, useEffect } from 'react';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import PageContainer from '../../../components/layout/PageContainer';
import { MapPin, CreditCard, Map as MapIcon, Truck, Info, Phone } from 'lucide-react';
import LocationPicker, { SelectedLocationData } from '../../../components/common/LocationPicker';
import { getNextDeliverySchedule } from '../../../utils/deliverySchedule';
import { useCity } from '../../../context/CityContext';
import { matchAddressToAdminCities } from '../../../utils/cityMatcher';
import { AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

const Checkout: React.FC = () => {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { selectedCity, selectedCategory, selectCity, cityCategories } = useCity();
  const navigate = useNavigate();
  
  const deliverySchedule = getNextDeliverySchedule();
  const [address, setAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [date] = useState(deliverySchedule.deliveryDate); // Calculated delivery date
  const [paymentMethod, setPaymentMethod] = useState('Online');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState({
    minAmountForFreeDelivery: 150,
    deliveryFee: 15,
  });

  const isCOD = paymentMethod === 'Cash on Delivery';
  const deliveryFee = isCOD && cartTotal < deliverySettings.minAmountForFreeDelivery
    ? deliverySettings.deliveryFee
    : 0;
  const serviceFee = Math.round((cartTotal * 0.025 + 0.30) * 100) / 100;
  const finalTotal = Math.round((cartTotal + deliveryFee + serviceFee) * 100) / 100;

  // Move validation logic after hooks to avoid conditional hook execution
  const isCartEmpty = items.length === 0;

  useEffect(() => {
    const fetchProfile = async () => {
        if (user) {
            try {
                const token = await user.getIdToken();
                const res = await axios.get(`${ENV.API_URL}/auth/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.data) {
                    const profileData = res.data.data;
                    if (profileData.phone && profileData.phone !== 'N/A') {
                        setCustomerPhone((prev) => prev || profileData.phone);
                    } else if (user.phoneNumber) {
                        setCustomerPhone((prev) => prev || user.phoneNumber || '');
                    }
                    if (profileData.savedAddresses) {
                        setSavedAddresses(profileData.savedAddresses);
                    }
                    if (!address && profileData.address && profileData.address !== 'No address provided') {
                        setAddress(profileData.address);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            }
        }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const response = await axios.get(`${ENV.API_URL}/menu/plans`, {
          params: { city: selectedCity },
        });
        if (response.data?.data?.deliveryFeeSettings) {
          setDeliverySettings(response.data.data.deliveryFeeSettings);
        }
      } catch (fetchError) {
        console.error('Failed to fetch delivery fee settings:', fetchError);
      }
    };
    fetchDeliverySettings();
  }, [selectedCity]);

  if (isCartEmpty) {
    return (
      <PageContainer className="py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <button onClick={() => navigate('/menu')} className="text-primary hover:underline">
          Go to Menu
        </button>
      </PageContainer>
    );
  }

  // Address validation against dynamic admin city categories
  const addressMatch = address ? matchAddressToAdminCities(address, cityCategories) : null;
  const isAddressMismatch = Boolean(
    address && addressMatch?.eligible && addressMatch?.categoryKey && selectedCategory && addressMatch.categoryKey !== selectedCategory
  );
  const isAddressUnsupported = Boolean(address && address.trim().length > 5 && !addressMatch?.eligible);

  const handleSyncCity = () => {
    if (!addressMatch?.city) return;
    selectCity(addressMatch.city);
    toast.success(`Switched delivery city to ${addressMatch.city}.`);
  };

  const handleLocationSelect = (location: SelectedLocationData) => {
    setAddress(location.address);
    if (location.detectedCity) {
      selectCity(location.detectedCity);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!user) {
         throw new Error('You must be logged in to place an order.');
      }
      if (!address) {
         throw new Error('Please enter a delivery address.');
      }
      if (isAddressUnsupported) {
         throw new Error('Delivery is not available to this address. Please choose a supported delivery location.');
      }
      if (isAddressMismatch) {
         throw new Error(`Your delivery address is in ${addressMatch?.city} (${addressMatch?.categoryName}). Please click 'Switch to ${addressMatch?.city}' to continue.`);
      }
      if (!customerPhone || customerPhone.trim().replace(/\D/g, '').length < 7) {
         throw new Error('Please enter a valid contact phone number.');
      }
      if (!termsAccepted) {
         throw new Error('Please agree to the Terms of Service & Cancellation Policy to place your order.');
      }

      const token = await user.getIdToken();

      // Sync phone and address to user profile
      await axios.post(
        `${ENV.API_URL}/auth/update-profile`,
        { phone: customerPhone, address },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(err => console.error("Failed to auto-sync profile:", err));
      
      const orderItems = items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      if (paymentMethod === 'Online') {
        // Create Stripe checkout session for one-time order
        const response = await axios.post(
          `${ENV.API_URL}/payments/create-checkout-session`,
          {
            type: 'one-time',
            amount: cartTotal,
            deliveryAddress: address,
            city: selectedCity,
            deliveryDate: date,
            items: orderItems,
            customerPhone,
            notes,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success && response.data.data.url) {
          // Save address if requested
          if (saveAddress) {
            await axios.post(`${ENV.API_URL}/auth/save-address`, { address }, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(err => console.error("Failed to save address:", err));
          }
          clearCart();
          // Redirect to Stripe Checkout page
          window.location.href = response.data.data.url;
        } else {
          throw new Error("Failed to initialize checkout session");
        }
      } else {
        // Cash on Delivery
        const orderData = {
          orderType: 'one-time',
          items: orderItems,
          price: cartTotal,
          deliveryDate: date,
          deliveryAddress: address,
          city: selectedCity,
          customerPhone,
          notes,
          paymentMethod: 'Cash on Delivery',
          paymentStatus: 'Pending'
        };

        await axios.post(`${ENV.API_URL}/orders`, orderData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (saveAddress) {
          await axios.post(`${ENV.API_URL}/auth/save-address`, { address }, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(err => console.error("Failed to save address:", err));
        }

        clearCart();
        navigate('/order-success');
      }
    } catch (err: unknown) {
      console.error('Checkout Error:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message || 'Failed to place order');
      } else {
        setError((err as Error).message || 'Failed to place order');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer className="py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6 sm:mb-8 tracking-tight">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Form */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handlePlaceOrder} className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-xl border border-gray-100">
               <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <MapPin size={20} className="text-primary" /> Delivery Details
               </h2>
               
               {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{error}</div>}

               <div>
                 <div className="flex justify-between items-center mb-1.5">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Address</label>
                     <button 
                       type="button" 
                       onClick={() => setIsMapOpen(true)}
                       className="text-xs flex items-center gap-1 font-bold text-primary hover:text-primary-hover"
                     >
                         <MapIcon size={14} /> Pick on Map
                     </button>
                 </div>
                 <textarea 
                   required
                   value={address}
                   onChange={(e) => setAddress(e.target.value)}
                   className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm mb-2"
                   rows={3}
                   placeholder="Enter your full address..."
                 />
                  
                 <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-4 cursor-pointer font-medium">
                     <input 
                       type="checkbox" 
                       checked={saveAddress}
                       onChange={(e) => setSaveAddress(e.target.checked)}
                       className="rounded text-primary focus:ring-primary"
                     />
                     <span>Save this address for future orders</span>
                 </label>
                 
                 {savedAddresses.length > 0 && (
                     <div className="mt-2">
                         <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Saved Addresses:</p>
                         <div className="flex flex-wrap gap-2">
                             {savedAddresses.map((addr, idx) => (
                                 <button 
                                   key={idx}
                                   type="button"
                                   onClick={() => setAddress(addr)}
                                   className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg px-2.5 py-1.5 truncate max-w-[220px] font-medium"
                                   title={addr}
                                 >
                                     {addr}
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}

                  {/* Address Verification Feedback & Pricing Mismatch Banner */}
                  {address && addressMatch && (
                    <div className="mt-3.5 space-y-2">
                      {isAddressUnsupported ? (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-900 animate-in fade-in">
                          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1 text-xs">
                            <strong className="block text-red-800 uppercase tracking-wider text-[11px] font-black">
                              Delivery Unavailable For This Address
                            </strong>
                            <p className="mt-0.5 leading-relaxed text-red-700">
                              {addressMatch.error || 'This address is outside our delivery zones. Ghar Ki Rasoee only delivers to configured cities in British Columbia.'}
                            </p>
                          </div>
                        </div>
                      ) : isAddressMismatch ? (
                        <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-sm animate-in fade-in">
                          <div className="flex items-start gap-2 flex-1 text-xs">
                            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-amber-900 uppercase tracking-wider text-[11px] font-black">
                                Delivery City Mismatch
                              </strong>
                              <p className="mt-0.5 leading-relaxed text-amber-800">
                                Address is in <strong>{addressMatch.city}</strong> ({addressMatch.categoryName}), but active city is <strong>{selectedCity}</strong> ({cityCategories[selectedCategory || 'local']?.name || 'Local Cities'}).
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleSyncCity}
                            className="shrink-0 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer"
                          >
                            Switch to {addressMatch.city}
                          </button>
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Check size={14} className="text-emerald-600" />
                            <span>Address verified: Delivering to {addressMatch.city}</span>
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-200/60 rounded-full">
                            {addressMatch.categoryName}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
               </div>

               <LocationPicker 
                  isOpen={isMapOpen} 
                  onClose={() => setIsMapOpen(false)} 
                  onSelect={handleLocationSelect} 
               />

               {/* Contact Details & Delivery Notes */}
               <div className="bg-gray-50/80 p-5 sm:p-6 rounded-2xl border border-gray-100 space-y-4">
                 <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                   <Phone size={18} className="text-primary" /> Contact Details & Instructions
                 </h3>
                 <div>
                   <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                     Phone Number <span className="text-red-500">* (Required for Driver)</span>
                   </label>
                   <input 
                     type="tel"
                     required
                     placeholder="e.g. +1 (604) 555-0199"
                     value={customerPhone}
                     onChange={(e) => setCustomerPhone(e.target.value)}
                     className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                   />
                   <p className="text-[11px] text-gray-400 mt-1">Our driver will call this number upon arrival or for buzzer entry.</p>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                     Delivery Notes / Buzzer Code <span className="text-gray-400 font-normal text-[11px]">(Optional)</span>
                   </label>
                   <input 
                     type="text"
                     placeholder="e.g. Leave at front porch, Buzzer #204"
                     value={notes}
                     onChange={(e) => setNotes(e.target.value)}
                     className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                   />
                 </div>
               </div>

               {/* Delivery Schedule Information Ticket */}
               <div className="bg-[#f0fdf4] border-2 border-green-200/80 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
                 <div className="flex items-center gap-3 border-b border-green-200 pb-2.5">
                   <div className="w-9 h-9 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0">
                     <Truck size={20} strokeWidth={2.5} />
                   </div>
                   <div>
                     <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 block">
                       Scheduled Meal Delivery (8:00 AM)
                     </span>
                     <h4 className="text-sm sm:text-base font-black text-gray-900">
                       {deliverySchedule.formattedDate} at 8:00 AM
                     </h4>
                   </div>
                 </div>

                 <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-gray-700">
                   <div className="bg-white border border-green-100 p-2 rounded-xl text-center">
                     <span className="text-[9px] text-gray-400 block font-bold uppercase">Cutoff</span>
                     <span>10:00 PM</span>
                   </div>
                   <div className="bg-white border border-green-100 p-2 rounded-xl text-center">
                     <span className="text-[9px] text-gray-400 block font-bold uppercase">Days</span>
                     <span>Mon – Sat</span>
                   </div>
                   <div className="bg-white border border-green-100 p-2 rounded-xl text-center">
                     <span className="text-[9px] text-gray-400 block font-bold uppercase">Sunday</span>
                     <span className="text-red-600">Off</span>
                   </div>
                 </div>

                 <div className="bg-white border border-green-200 p-3 rounded-xl text-xs font-medium text-gray-800">
                   {deliverySchedule.isAfterCutoff 
                     ? `🌙 Night Order (After 10:00 PM): Delivery scheduled for ${deliverySchedule.formattedDate} at 8:00 AM.` 
                     : `✅ On-Time Order (Before 10:00 PM): Delivery scheduled for ${deliverySchedule.formattedDate} at 8:00 AM.`}
                 </div>
               </div>

               <div className="pt-4 border-t border-gray-100">
                 <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                   <CreditCard size={20} className="text-primary" /> Payment Method
                 </h2>
                 
                  <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        value="Online" 
                        checked={paymentMethod === 'Online'} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-sm text-gray-800 block">Credit/Debit Card</span>
                        <span className="text-xs text-gray-500 font-medium">Secure online payment via Stripe</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                      <input 
                        type="radio" 
                        name="paymentMethod" 
                        value="Cash on Delivery" 
                        checked={paymentMethod === 'Cash on Delivery'} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-sm text-gray-800 block">Cash on Delivery</span>
                        <span className="text-xs text-gray-500 font-medium">Pay when you receive the delivery</span>
                      </div>
                    </label>
                  </div>

                  {/* Mandatory Cancellation Policy & Terms Checkpoint */}
                  <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-sm mb-5">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        required
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-gray-300 shrink-0 cursor-pointer"
                      />
                      <span className="text-xs text-gray-700 leading-relaxed font-medium select-none">
                        By clicking "Pay & Place Order", you agree to our{' '}
                        <Link to="/refund-policy" target="_blank" className="text-primary hover:underline font-bold">
                          Terms of Service
                        </Link>{' '}
                        and understand that all food orders are final. No refunds are given for cancellations or accidental orders once preparation begins.
                      </span>
                    </label>
                  </div>

                 <button 
                   type="submit"
                   disabled={loading || !termsAccepted || isAddressMismatch || isAddressUnsupported}
                   className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base hover:bg-primary-hover transition shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center cursor-pointer"
                 >
                   {loading ? (
                     <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                   ) : isAddressMismatch ? (
                     `Resolve City Mismatch to Order`
                   ) : isAddressUnsupported ? (
                     `Address Outside Delivery Area`
                   ) : (
                     `Pay $${finalTotal.toFixed(2)} CAD & Place Order`
                   )}
                 </button>
               </div>
            </form>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-[2rem] border border-gray-100 shadow-xl sticky top-24">
               <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
               <div className="space-y-3 mb-6 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-gray-700 font-medium">{item.quantity} x {item.name}</span>
                      <span className="font-bold text-gray-900 whitespace-nowrap">${(item.price * item.quantity).toFixed(2)} CAD</span>
                    </div>
                  ))}
               </div>

               <div className="border-t border-gray-100 pt-4 space-y-2.5">
                  <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-semibold text-gray-900 whitespace-nowrap">${cartTotal.toFixed(2)} CAD</span>
                  </div>

                  {isCOD && (
                    <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
                      <span className="font-medium">Delivery Fee</span>
                      {deliveryFee > 0 ? (
                        <span className="font-semibold text-orange-600 whitespace-nowrap">+${deliveryFee.toFixed(2)} CAD</span>
                      ) : (
                        <span className="font-bold text-green-600">FREE</span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
                    <span className="flex items-center gap-1 font-medium">
                      <span>Platform Service Fee</span>
                      <span className="text-[10px] text-gray-400 font-normal">(2.5% + $0.30)</span>
                    </span>
                    <span className="font-semibold text-gray-900 whitespace-nowrap">+${serviceFee.toFixed(2)} CAD</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-4">
                    <div>
                      <span className="text-base sm:text-lg font-black text-gray-900 block">Total Due</span>
                      <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Delivery and platform fees included</span>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-baseline justify-end gap-1.5 whitespace-nowrap">
                        <span className="text-2xl sm:text-3xl font-black text-gray-950 font-mono tracking-tight">
                          ${finalTotal.toFixed(2)}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider">CAD</span>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="mt-5 bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                 <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                 <p className="leading-relaxed">
                   <strong>Platform Service Fee:</strong> A 2.5% service fee + $0.30 platform fee applies to every payment method, including Cash on Delivery.
                 </p>
               </div>

               <p className="text-[11px] text-gray-500 text-center mt-3 font-medium">
                 By placing your order, you agree to our{' '}
                 <Link to="/refund-policy" target="_blank" className="text-primary hover:underline font-bold">
                   Refund & Cancellation Policy
                 </Link>.
               </p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Checkout;
