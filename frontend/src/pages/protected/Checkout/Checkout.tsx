import React, { useState, useEffect } from 'react';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import PageContainer from '../../../components/layout/PageContainer';
import { MapPin, CreditCard, Map as MapIcon } from 'lucide-react';
import LocationPicker from '../../../components/common/LocationPicker';

const Checkout: React.FC = () => {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [address, setAddress] = useState('');
  const [date] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [paymentMethod, setPaymentMethod] = useState('Online');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);

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
                if (res.data.data.savedAddresses) {
                    setSavedAddresses(res.data.data.savedAddresses);
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            }
        }
    };
    fetchProfile();
  }, [user]);

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

  const handleLocationSelect = (location: { address: string; lat: number; lng: number }) => {
      setAddress(location.address);
      // We could also store lat/lng if needed for backend, but address is sufficient for now.
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

      const token = await user.getIdToken();
      
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
            deliveryDate: date,
            items: orderItems,
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
    <PageContainer className="py-10">
      <h1 className="text-3xl font-bold text-text-primary mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left: Form */}
        <div>
          <form onSubmit={handlePlaceOrder} className="space-y-6 bg-white p-6 rounded-card shadow-sm border border-gray-100">
             <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
               <MapPin size={20} className="text-primary" /> Delivery Details
             </h2>
             
             {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

             <div>
               <div className="flex justify-between items-center mb-1">
                   <label className="block text-sm font-medium text-gray-700">Delivery Address</label>
                   <button 
                     type="button" 
                     onClick={() => setIsMapOpen(true)}
                     className="text-xs flex items-center gap-1 text-primary hover:text-primary-hover"
                   >
                       <MapIcon size={14} /> Pick on Map
                   </button>
               </div>
               <textarea 
                 required
                 value={address}
                 onChange={(e) => setAddress(e.target.value)}
                 className="w-full p-2 border rounded-md focus:ring-primary focus:border-primary mb-2"
                 rows={3}
                 placeholder="Enter your full address..."
               />
                
               <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
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
                       <p className="text-xs text-gray-500 mb-2">Saved Addresses:</p>
                       <div className="flex flex-wrap gap-2">
                           {savedAddresses.map((addr, idx) => (
                               <button 
                                 key={idx}
                                 type="button"
                                 onClick={() => setAddress(addr)}
                                 className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded px-2 py-1 truncate max-w-[200px]"
                                 title={addr}
                               >
                                   {addr}
                               </button>
                           ))}
                       </div>
                   </div>
               )}
             </div>

             <LocationPicker 
                isOpen={isMapOpen} 
                onClose={() => setIsMapOpen(false)} 
                onSelect={handleLocationSelect} 
             />



             <div className="pt-4 border-t border-gray-100">
               <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                 <CreditCard size={20} className="text-primary" /> Payment Method
               </h2>
               
                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="Online" 
                      checked={paymentMethod === 'Online'} 
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium block">Credit/Debit Card</span>
                      <span className="text-xs text-gray-500">Secure online payment via Stripe</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input 
                      type="radio" 
                      name="paymentMethod" 
                      value="Cash on Delivery" 
                      checked={paymentMethod === 'Cash on Delivery'} 
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="font-medium block">Cash on Delivery</span>
                      <span className="text-xs text-gray-500">Pay when you receive the delivery</span>
                    </div>
                  </label>
                </div>

                <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-800 mb-4">
                  {paymentMethod === 'Cash on Delivery' 
                    ? 'You can pay via Cash or Interac e-Transfer upon delivery.' 
                    : 'Stripe Checkout will securely process your payment. Apple Pay and Google Pay will be auto-enabled if supported.'}
                </div>
               <button 
                 type="submit"
                 disabled={loading}
                 className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary-hover transition disabled:opacity-70 flex justify-center items-center"
               >
                 {loading ? (
                   <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                 ) : (
                   `Pay $${cartTotal.toFixed(2)} & Place Order`
                 )}
               </button>
             </div>
          </form>
        </div>

        {/* Right: Order Summary */}
        <div>
          <div className="bg-gray-50 p-6 rounded-card sticky top-24">
             <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
             <div className="space-y-4 mb-6">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">{item.quantity} x {item.name}</span>
                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
             </div>
             <div className="border-t border-gray-200 pt-4 flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
             </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Checkout;
