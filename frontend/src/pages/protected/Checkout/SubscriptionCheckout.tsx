import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageContainer from '../../../components/layout/PageContainer';
import { Check, ShieldCheck, MapPin, AlertCircle, CreditCard, DollarSign, AlertTriangle, X, Calendar } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import LocationPicker from '../../../components/common/LocationPicker';
import { useCity } from '../../../context/CityContext';

const SubscriptionCheckout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan, address: prefilledAddress } = location.state || {};
  const { selectedCity } = useCity();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [address, setAddress] = useState(prefilledAddress || '');
  const [paymentMethod, setPaymentMethod] = useState<'Stripe' | 'COD'>('Stripe');

  // Recurring subscription states (only for subscription type plans)
  const [isRecurring, setIsRecurring] = useState(true);
  const [legalConsent, setLegalConsent] = useState(false);

  // Active subscription checking states
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [bypassWarning, setBypassWarning] = useState(false);
  const [replacePlan, setReplacePlan] = useState(true);

  // Coupon states
  const [couponInput, setCouponInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    finalAmount: number;
    duration?: 'once' | 'repeating' | 'forever';
    durationInMonths?: number | null;
  } | null>(null);

  const isOneTime = plan?.type === 'one-time';

  const [selectedDays, setSelectedDays] = useState<string[]>(
    plan?.customDetails?.deliveryDays || [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    ]
  );

  const [deliverySettings, setDeliverySettings] = useState<{ minAmountForFreeDelivery: number; deliveryFee: number }>({
    minAmountForFreeDelivery: 150,
    deliveryFee: 15
  });

  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const res = await axios.get(`${ENV.API_URL}/menu/plans`, {
          params: { city: selectedCity }
        });
        if (res.data.success && res.data.data.deliveryFeeSettings) {
          setDeliverySettings(res.data.data.deliveryFeeSettings);
        }
      } catch (err) {
        console.error("Failed to fetch delivery settings:", err);
      }
    };
    fetchDeliverySettings();
  }, [selectedCity]);

  const getAdjustedPrice = () => {
    const basePrice = plan?.price || 0;
    if (isOneTime) return basePrice;
    const adjusted = (basePrice * selectedDays.length) / 6;
    return Math.round(adjusted * 100) / 100;
  };

  const getCouponAmounts = () => {
    const baseAmount = getAdjustedPrice();
    if (!appliedCoupon) return { discountAmount: 0, finalAmount: baseAmount };

    let discount = 0;
    if (appliedCoupon.discountType === 'percentage') {
      discount = baseAmount * (appliedCoupon.discountValue / 100);
    } else {
      discount = appliedCoupon.discountValue;
    }
    discount = Math.min(discount, baseAmount);
    const minCharge = paymentMethod === 'Stripe' ? 0.50 : 0;
    const final = Math.max(minCharge, baseAmount - discount);
    return {
      discountAmount: discount,
      finalAmount: Math.round(final * 100) / 100
    };
  };

  const { discountAmount, finalAmount } = getCouponAmounts();
  const basePriceForDelivery = getAdjustedPrice();
  const isFreeDelivery = basePriceForDelivery >= deliverySettings.minAmountForFreeDelivery;
  const deliveryFee = isFreeDelivery ? 0 : deliverySettings.deliveryFee;
  const totalAmount = Math.round((finalAmount + deliveryFee) * 100) / 100;

  useEffect(() => {
    const checkActiveSubscription = async () => {
      if (!user || isOneTime) return;
      try {
        const token = await user.getIdToken();
        const res = await axios.get(`${ENV.API_URL}/subscriptions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const subs = res.data.data;
        if (Array.isArray(subs)) {
          const active = subs.some((s: any) => s.status === 'Active');
          if (active) setHasActiveSub(true);
        } else if (subs && subs.status === 'Active') {
          setHasActiveSub(true);
        }
      } catch (err) {
        console.error("Error checking active subscription:", err);
      }
    };
    checkActiveSubscription();
  }, [user, isOneTime]);

  useEffect(() => {
    if (paymentMethod === 'COD' && appliedCoupon?.duration === 'repeating') {
      setAppliedCoupon(null);
      setCouponInput('');
      setCouponSuccess('');
      setCouponError('Multi-month discount coupons are only valid for Stripe payments.');
    }
  }, [paymentMethod, appliedCoupon]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setError('');
    setCouponError('');
    setCouponSuccess('');
    try {
      const token = await user?.getIdToken();
      const response = await axios.post(
        `${ENV.API_URL}/payments/validate-coupon`,
        {
          code: couponInput.trim(),
          amount: getAdjustedPrice()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.success) {
        const couponData = response.data.data;
        setAppliedCoupon(couponData);
        setCouponSuccess('Coupon discount applied successfully!');
        if (couponData.duration === 'repeating') {
          setIsRecurring(true);
          setLegalConsent(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      setCouponError(err.response?.data?.message || 'Invalid or expired coupon code');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponSuccess('');
    setCouponError('');
  };

  if (!plan) {
    return (
      <PageContainer className="py-20 text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">No plan selected</h2>
        <button 
          onClick={() => navigate('/pricing')} 
          className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-primary-hover transition"
        >
          View Plans
        </button>
      </PageContainer>
    );
  }

  const executeCheckout = async (bypass = false, chosenReplacePlan = true) => {
    setError('');

    if (!isOneTime && paymentMethod === 'Stripe' && isRecurring && !legalConsent) {
      setError("You must authorize recurring billing by checking the confirmation box to proceed.");
      return;
    }

    if (hasActiveSub && !bypass) {
      setShowWarningModal(true);
      return;
    }

    if (!isOneTime && selectedDays.length === 0) {
      setError("Please select at least one delivery day.");
      return;
    }

    setLoading(true);

    try {
      if (!user) throw new Error("Please log in to continue");
      if (!address) throw new Error("Please select a delivery address");

      const token = await user.getIdToken();

      const customDetailsPayload = isOneTime ? undefined : {
        ...(plan.customDetails || {}),
        deliveryDays: selectedDays,
        basePlan: plan.customDetails?.basePlan || plan.name
      };

      if (paymentMethod === 'Stripe') {
        const response = await axios.post(
          `${ENV.API_URL}/payments/create-checkout-session`,
          {
            type: isOneTime ? 'one-time' : 'subscription',
            planName: plan.name,
            amount: getAdjustedPrice(),
            deliveryAddress: address,
            city: selectedCity,
            couponCode: appliedCoupon ? appliedCoupon.code : undefined,
            isRecurring: isOneTime ? false : isRecurring,
            customDetails: customDetailsPayload,
            items: [{ name: plan.name, quantity: 1, price: getAdjustedPrice() }],
            replacePlan: chosenReplacePlan,
            deliveryFee,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success && response.data.data.url) {
          window.location.href = response.data.data.url;
        } else {
          throw new Error("Failed to initialize checkout session");
        }
      } else {
        if (isOneTime) {
          // One-time meal with COD
          const response = await axios.post(
            `${ENV.API_URL}/orders`,
            {
              orderType: 'one-time',
              items: [{ name: plan.name, quantity: 1, price: plan.price }],
              price: plan.price,
              deliveryAddress: address,
              city: selectedCity,
              paymentMethod: 'Cash on Delivery',
              paymentStatus: 'Pending',
              couponCode: appliedCoupon ? appliedCoupon.code : undefined,
              deliveryFee,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response.data.success) {
            navigate('/order-success');
          } else {
            throw new Error(response.data.message || "Failed to create order");
          }
        } else {
          // Subscription with COD
          const response = await axios.post(
            `${ENV.API_URL}/subscriptions`,
            {
              plan: plan.name,
              planDetails: {
                ...plan,
                price: getAdjustedPrice()
              },
              durationMonths: 1,
              deliveryAddress: address,
              city: selectedCity,
              paymentMethod: 'Cash on Delivery',
              paymentStatus: 'Pending',
              couponCode: appliedCoupon ? appliedCoupon.code : undefined,
              customDetails: customDetailsPayload,
              replacePlan: chosenReplacePlan,
              deliveryFee,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response.data.success) {
            navigate('/my-subscription');
          } else {
            throw new Error(response.data.message || "Failed to create subscription");
          }
        }
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.response?.data?.message || err.message || "Failed to process request");
      setLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCheckout(bypassWarning, replacePlan);
  };

  const handleProceedReplace = async () => {
    setReplacePlan(true);
    setShowWarningModal(false);
    setBypassWarning(true);
    await executeCheckout(true, true);
  };

  const handleProceedAdd = async () => {
    setReplacePlan(false);
    setShowWarningModal(false);
    setBypassWarning(true);
    await executeCheckout(true, false);
  };

  return (
    <PageContainer className="py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight">
          {isOneTime ? 'Ready for a One-Time Meal?' : 'Complete Your Subscription'}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Plan Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl sticky top-24">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
              <div className="p-5 bg-gradient-to-br from-primary/5 to-orange-50 rounded-2xl mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-lg text-gray-800">{plan.name}</span>
                  <span className="font-extrabold text-xl text-primary">
                    {isOneTime ? `$${plan.price}` : `$${getAdjustedPrice()}/mo`}
                  </span>
                </div>
                <ul className="space-y-2.5 text-sm text-gray-600 mt-4">
                  {plan.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Promo Code Input */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Promo / Coupon Code
                </label>
                {!appliedCoupon ? (
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Enter code"
                      className="w-full pl-3 pr-20 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        setCouponError('');
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput || validatingCoupon}
                      className="absolute right-1 px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {validatingCoupon ? '...' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-green-50 border border-green-200/60 p-3 rounded-xl">
                    <div>
                      <span className="font-bold text-xs text-green-800 tracking-wider uppercase block">
                        {appliedCoupon.code} Applied
                      </span>
                      <span className="text-[10px] text-green-600 font-medium">
                        {appliedCoupon.discountType === 'percentage' 
                          ? `${appliedCoupon.discountValue}% discount` 
                          : `$${appliedCoupon.discountValue.toFixed(2)} CAD discount`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> {couponError}
                  </p>
                )}
                {couponSuccess && (
                  <p className="text-green-600 text-xs mt-1.5 font-medium flex items-center gap-1">
                    <Check size={12} /> {couponSuccess}
                  </p>
                )}

                {appliedCoupon && appliedCoupon.duration === 'repeating' && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200/60 rounded-2xl space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h4 className="text-xs font-bold text-orange-950">Auto-Renewal Notice</h4>
                        <p className="text-[11px] leading-relaxed text-orange-800 font-medium mt-1">
                          This promo code <strong>{appliedCoupon.code}</strong> provides <strong>{appliedCoupon.durationInMonths} month(s) {appliedCoupon.discountValue === 100 ? 'free' : 'discounted'}</strong>.
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-orange-100 flex flex-col gap-2">
                      <p className="text-xs font-bold text-orange-950 leading-snug">
                        Do you want to continue with recurring payment automatically after the free period ends?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRecurring(true);
                            setLegalConsent(true);
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                            isRecurring
                              ? 'bg-orange-600 text-white shadow-sm'
                              : 'bg-white border border-orange-200 text-orange-850 hover:bg-orange-100/50'
                          }`}
                        >
                          <Check size={14} /> Yes, Auto-Renew
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleRemoveCoupon();
                            setIsRecurring(false);
                            setLegalConsent(false);
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 bg-white border border-orange-200 text-orange-850 hover:bg-orange-100/50`}
                        >
                          No, Cancel Discount
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">${getAdjustedPrice().toFixed(2)} CAD</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-sm font-semibold text-green-600">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-${discountAmount.toFixed(2)} CAD</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  {deliveryFee > 0 ? (
                    <span className="font-semibold text-orange-600">+${deliveryFee.toFixed(2)} CAD</span>
                  ) : (
                    <span className="font-bold text-green-600">FREE</span>
                  )}
                </div>

                {deliveryFee > 0 && (
                  <p className="text-[10px] text-gray-400 font-bold leading-normal">
                    Add ${(deliverySettings.minAmountForFreeDelivery - basePriceForDelivery).toFixed(2)} CAD more to unlock free delivery (minimum ${deliverySettings.minAmountForFreeDelivery} CAD).
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center font-bold text-lg border-t pt-4 mt-4">
                <span className="text-gray-700">Total</span>
                <span className="text-xl text-gray-950">
                  ${totalAmount.toFixed(2)} CAD
                </span>
              </div>

              {appliedCoupon && appliedCoupon.duration === 'repeating' && (
                <p className="text-[10px] text-gray-400 font-bold text-right mt-1.5 leading-snug">
                  Charges automatically renew at ${getAdjustedPrice().toFixed(2)} CAD/mo after {appliedCoupon.durationInMonths} month(s).
                </p>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-xl">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="text-primary" /> Delivery Address
              </h2>
              
              {!address ? (
                <button 
                  onClick={() => setIsLocationPickerOpen(true)}
                  className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-primary hover:text-primary transition-all duration-300 flex flex-col items-center gap-2 group"
                >
                  <MapPin size={32} className="group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-sm">Select Delivery Location on Map</span>
                </button>
              ) : (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60">
                  <div className="flex justify-between items-start">
                    <div className="max-w-[80%]">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Delivering To</p>
                      <p className="text-gray-800 font-medium leading-relaxed">{address}</p>
                    </div>
                    <button 
                      onClick={() => setIsLocationPickerOpen(true)}
                      className="text-primary text-sm font-bold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Days Selection */}
            {!isOneTime && (
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-xl space-y-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="text-primary" size={22} /> Delivery Schedule
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Choose which days of the week you would like to receive deliveries. The price of your subscription scales dynamically based on the frequency.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDays(selectedDays.filter((d) => d !== day));
                          } else {
                            setSelectedDays([...selectedDays, day]);
                          }
                        }}
                        className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 capitalize flex items-center justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5'
                            : 'border-gray-100 hover:border-gray-200 text-gray-600'
                        }`}
                      >
                        <span>{day}</span>
                        {isSelected ? (
                          <Check size={16} className="text-primary" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-gray-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedDays.length === 0 && (
                  <p className="text-red-500 text-xs font-semibold flex items-center gap-1 mt-2">
                    <AlertCircle size={14} /> Please select at least one delivery day.
                  </p>
                )}
                <p className="text-xs text-gray-400 font-medium bg-gray-50 p-3 rounded-xl border border-gray-200/50 mt-3">
                  💡 <strong>Tip:</strong> If you select fewer days, your monthly billing will decrease proportionally. Your meal options/customizations will apply to the days you select.
                </p>
              </div>
            )}

            {/* Payment Section */}
            <form onSubmit={handleCheckout} className="bg-white p-6 sm:p-8 rounded-[2rem] border border-gray-100 shadow-xl space-y-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Choose Payment Method</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stripe Pay option */}
                <label className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${
                  paymentMethod === 'Stripe'
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="Stripe" 
                    checked={paymentMethod === 'Stripe'} 
                    onChange={() => setPaymentMethod('Stripe')}
                    className="text-primary focus:ring-primary h-5 w-5"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${paymentMethod === 'Stripe' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block">Credit/Debit Card</span>
                      <span className="text-xs text-gray-400">Secure pay via Stripe</span>
                    </div>
                  </div>
                </label>

                {/* Cash on Delivery option */}
                <label className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center gap-4 ${
                  paymentMethod === 'COD'
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="COD" 
                    checked={paymentMethod === 'COD'} 
                    onChange={() => setPaymentMethod('COD')}
                    className="text-primary focus:ring-primary h-5 w-5"
                  />
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${paymentMethod === 'COD' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block">Cash on Delivery</span>
                      <span className="text-xs text-gray-400">Pay when delivered</span>
                    </div>
                  </div>
                </label>
              </div>

              {/* Subscription option section - only show for subscription plans */}
              {!isOneTime && paymentMethod === 'Stripe' && (
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200/60 space-y-4">
                  <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Subscription Option</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="radio" 
                        name="recurringOption" 
                        checked={isRecurring} 
                        onChange={() => setIsRecurring(true)}
                        className="text-primary focus:ring-primary h-4 w-4"
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-900 block">Auto-Renewing Subscription (Recurring)</span>
                        <span className="text-xs text-gray-500">Automatically renews and charges your card every month. Cancel anytime.</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-3 cursor-pointer ${appliedCoupon?.duration === 'repeating' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                       <input 
                         type="radio" 
                         name="recurringOption" 
                         checked={!isRecurring} 
                         disabled={appliedCoupon?.duration === 'repeating'}
                         onChange={() => {
                           setIsRecurring(false);
                           setLegalConsent(false);
                         }}
                         className="text-primary focus:ring-primary h-4 w-4"
                       />
                       <div>
                         <span className="text-sm font-bold text-gray-900 block">One-Time Payment (30 Days access)</span>
                         <span className="text-xs text-gray-500">
                           Non-recurring. You will need to manually renew the plan at the end of 30 days.
                           {appliedCoupon?.duration === 'repeating' && (
                             <span className="text-red-500 font-bold block mt-0.5">
                               ⚠️ Multi-month discount coupon requires auto-renewal
                             </span>
                           )}
                         </span>
                       </div>
                     </label>
                  </div>

                  {isRecurring && (
                    <div className="pt-3 border-t border-gray-200/60">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={legalConsent}
                          disabled={appliedCoupon?.duration === 'repeating'}
                          onChange={(e) => setLegalConsent(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary border-gray-300"
                        />
                        <span className="text-xs text-gray-600 leading-relaxed">
                          I authorize Ghar Ki Rasoee to save my payment details and automatically charge my card{" "}
                          {appliedCoupon && appliedCoupon.duration === 'repeating' ? (
                            <span className="font-semibold text-gray-900">
                              ${appliedCoupon.finalAmount.toFixed(2)} CAD for the first {appliedCoupon.durationInMonths} month(s), and then ${plan.price.toFixed(2)} CAD
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              ${(appliedCoupon ? appliedCoupon.finalAmount : plan.price).toFixed(2)} CAD
                            </span>
                          )}{" "}
                          on a monthly recurring basis until cancelled. I can cancel or pause my auto-renewal subscription at any time from my account dashboard.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {paymentMethod === 'Stripe' ? (
                <div className="bg-blue-50/50 border border-blue-200/60 p-4 rounded-2xl text-sm text-blue-800 flex gap-3">
                  <ShieldCheck className="shrink-0 text-blue-600 mt-0.5" size={20} />
                  <p className="leading-relaxed">
                    Stripe Checkout will securely handle your payment. We do not store or see your card details. Apple Pay and Google Pay will be auto-enabled if supported.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl text-sm text-amber-800 flex gap-3">
                  <AlertCircle className="shrink-0 text-amber-600 mt-0.5" size={20} />
                  <p className="leading-relaxed">
                    You can pay using cash or Interac e-Transfer when the food is delivered.
                  </p>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading || !address}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-hover transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-lg shadow-primary/20 hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : isOneTime ? (
                  paymentMethod === 'Stripe'
                    ? `Pay $${(appliedCoupon ? appliedCoupon.finalAmount : plan.price).toFixed(2)} CAD`
                    : 'Place Order (COD)'
                ) : (
                  paymentMethod === 'Stripe' 
                    ? `Pay $${(appliedCoupon ? appliedCoupon.finalAmount : plan.price).toFixed(2)} CAD` 
                    : 'Confirm Subscription (COD)'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <LocationPicker 
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        onSelect={(loc) => setAddress(loc.address)}
      />

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 md:p-8 border border-red-100 shadow-2xl relative">
            <button 
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center mt-2">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm">
                <AlertTriangle size={28} />
              </div>

              <h3 className="text-xl md:text-2xl font-black text-gray-950 tracking-tight leading-snug text-center">
                Active Subscription Detected
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-1 text-center">
                You already have an active meal subscription. Choose how you want to proceed.
              </p>
              
              <div className="mt-6 space-y-3 w-full">
                {/* Option 1: Add Plan */}
                <button
                  type="button"
                  onClick={handleProceedAdd}
                  className="w-full text-left p-4 rounded-2xl border-2 border-primary bg-primary/[0.02] hover:bg-primary/[0.05] transition-all flex items-start gap-3.5 group"
                >
                  <div className="p-2 bg-primary text-white rounded-xl mt-0.5 shrink-0">
                    <Check size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-gray-900 group-hover:text-primary transition-colors">
                        Add as Additional Plan (Multi-Plan)
                      </span>
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed font-semibold">
                      Keep your current plan running continuously. Both plans will active together under your account (ideal for parents, siblings, or another home).
                    </p>
                  </div>
                </button>

                {/* Option 2: Replace Plan */}
                <button
                  type="button"
                  onClick={handleProceedReplace}
                  className="w-full text-left p-4 rounded-2xl border-2 border-red-200 bg-red-50/[0.01] hover:bg-red-50/[0.04] transition-all flex items-start gap-3.5 group animate-pulse"
                >
                  <div className="p-2 bg-red-100 text-red-650 rounded-xl mt-0.5 border border-red-200 shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="w-full">
                    <span className="font-extrabold text-sm text-gray-900 group-hover:text-red-600 transition-colors block">
                      Replace Current Plan
                    </span>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed font-semibold">
                      Automatically cancel and replace your current active plan.
                    </p>
                    <div className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-[10.5px] text-red-800 font-extrabold leading-relaxed shadow-inner">
                      ⚠️ Please note: If you proceed with this new purchase, your current plan will be automatically canceled and replaced.
                      <div className="mt-1 text-red-900 font-black">
                        No refund or return of money will be provided for any remaining days of your previous plan.
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div className="w-full mt-5 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel & Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default SubscriptionCheckout;