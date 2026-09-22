import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../components/layout/PageContainer';
import PlansSection from '../Home/PlansSection';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { X, Check, Loader2, Plus, Minus, Clock, Truck, ArrowRight, Utensils } from 'lucide-react';
import { getNextDeliverySchedule } from '../../../utils/deliverySchedule';

const dayNames: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday'
};

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [weeklyMenu, setWeeklyMenu] = useState<any>(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [customPricingConfig, setCustomPricingConfig] = useState<any>({
    oneTimeBasePrice: 13.00,
    oneTimeBaseRoti: 8,
    oneTimeBaseSabzi: 2,
    oneTimePricePerRoti: 0.60,
    oneTimePricePerSabzi: 3.00,
    oneTimeRaitaPrice: 2.00,
    oneTimeDessertPrice: 3.00,
  });
  
  // Customization States
  const deliverySchedule = getNextDeliverySchedule();
  const [selectedDay, setSelectedDay] = useState<string>(deliverySchedule.dayName);
  const [selectedRoti, setSelectedRoti] = useState<number>(8);
  const [dishBoxes, setDishBoxes] = useState<Record<string, number>>({});
  const [extraRaita, setExtraRaita] = useState<boolean>(false);
  const [extraSweet, setExtraSweet] = useState<boolean>(false);

  // Dynamic Pricing Parameters from Admin Engine
  const basePrice = Number(customPricingConfig.oneTimeBasePrice) || 13.00;
  const baseRoti = Number(customPricingConfig.oneTimeBaseRoti) || 8;
  const baseSabzi = Number(customPricingConfig.oneTimeBaseSabzi) || 2;
  const pricePerRoti = Number(customPricingConfig.oneTimePricePerRoti) || 0.60;
  const pricePerSabzi = Number(customPricingConfig.oneTimePricePerSabzi) || 3.00;
  const raitaRate = Number(customPricingConfig.oneTimeRaitaPrice) || 2.00;
  const sweetRate = Number(customPricingConfig.oneTimeDessertPrice) || 3.00;

  useEffect(() => {
    // Prefetch pricing config on mount
    axios.get(`${ENV.API_URL}/menu/plans`)
      .then(res => {
        if (res.data.success && res.data.data.customPricingConfig) {
          setCustomPricingConfig((prev: any) => ({
            ...prev,
            ...res.data.data.customPricingConfig
          }));
        }
      })
      .catch(err => console.error("Error prefetching pricing config:", err));
  }, []);

  const openCustomizer = async () => {
    if (!user) {
      toast.error("Please login to customize and order your tiffin!");
      navigate('/login');
      return;
    }
    const freshSchedule = getNextDeliverySchedule();
    setSelectedDay(freshSchedule.dayName);
    setIsModalOpen(true);
    setLoadingMenu(true);
    try {
      const [menuRes, plansRes] = await Promise.all([
        !weeklyMenu ? axios.get(`${ENV.API_URL}/menu/plans/standard/menu`) : Promise.resolve(null),
        axios.get(`${ENV.API_URL}/menu/plans`)
      ]);
      if (menuRes && menuRes.data.success) {
        setWeeklyMenu(menuRes.data.data.weeklyMenu);
      }
      if (plansRes && plansRes.data.success && plansRes.data.data.customPricingConfig) {
        setCustomPricingConfig((prev: any) => ({
          ...prev,
          ...plansRes.data.data.customPricingConfig
        }));
      }
    } catch (err) {
      console.error("Error fetching menu/pricing:", err);
      toast.error("Failed to load latest menu choices. Please try again.");
    } finally {
      setLoadingMenu(false);
    }
  };

  const availableSabzis = useMemo(() => {
    if (!weeklyMenu || !weeklyMenu[selectedDay]) return [];
    const dayMenu = weeklyMenu[selectedDay];
    const list: string[] = [];
    if (Array.isArray(dayMenu.sabziSet1)) list.push(...dayMenu.sabziSet1);
    if (Array.isArray(dayMenu.sabziSet2)) list.push(...dayMenu.sabziSet2);
    if (Array.isArray(dayMenu.sabzi)) list.push(...dayMenu.sabzi);
    return Array.from(new Set(list)).filter(Boolean);
  }, [weeklyMenu, selectedDay]);

  useEffect(() => {
    if (availableSabzis.length > 0) {
      setDishBoxes(prev => {
        const existingKeys = Object.keys(prev);
        const hasAll = availableSabzis.length === existingKeys.length && availableSabzis.every(d => existingKeys.includes(d));
        if (hasAll) return prev;
        
        const initial: Record<string, number> = {};
        availableSabzis.forEach((dish, idx) => {
          if (availableSabzis.length >= baseSabzi) {
            initial[dish] = idx < baseSabzi ? 1 : 0;
          } else {
            initial[dish] = baseSabzi;
          }
        });
        return initial;
      });
    } else {
      setDishBoxes({});
    }
  }, [availableSabzis, baseSabzi]);

  const getDishCount = (dish: string): number => dishBoxes[dish] || 0;

  const setDishCount = (dish: string, count: number) => {
    const safeCount = Math.max(0, count);
    setDishBoxes(prev => ({
      ...prev,
      [dish]: safeCount
    }));
  };

  const totalSabziBoxes = useMemo(() => {
    return Object.values(dishBoxes).reduce((sum, count) => sum + (count || 0), 0);
  }, [dishBoxes]);

  const calculatePrice = () => {
    const rotiDifference = selectedRoti - baseRoti;
    const rotiPriceDiff = rotiDifference * pricePerRoti;
    const sabziDifference = totalSabziBoxes - baseSabzi;
    const sabziPriceDiff = sabziDifference * pricePerSabzi;
    const raitaPrice = extraRaita ? raitaRate : 0;
    const sweetPrice = extraSweet ? sweetRate : 0;
    const total = basePrice + rotiPriceDiff + sabziPriceDiff + raitaPrice + sweetPrice;
    return Math.max(5.00, parseFloat(total.toFixed(2)));
  };

  const handleProceedToCheckout = () => {
    const selectedEntries = Object.entries(dishBoxes).filter(([_, count]) => count > 0);
    const sabziSummary = selectedEntries.length > 0
      ? selectedEntries.map(([dish, count]) => `${count}x ${dish}`).join(', ')
      : '0 Sabzi Boxes';

    const dayName = dayNames[selectedDay] || 'Today';
    const finalPrice = calculatePrice();
    const customizedPlan = {
      name: `One-Time Meal (${dayName}: ${totalSabziBoxes > 0 ? sabziSummary : '0 Sabzi'}, ${selectedRoti} Rotis)`,
      price: finalPrice,
      type: 'one-time',
      features: [
        '1 Tiffin (Personalized One-Time Meal)',
        `${dayName}'s Fresh Menu`,
        `Roti Count: ${selectedRoti} Fresh Rotis`,
        totalSabziBoxes > 0
          ? `Sabzi Choice: ${sabziSummary} (Total ${totalSabziBoxes} Box${totalSabziBoxes > 1 ? 'es' : ''})`
          : 'No Sabzi Box (0 Boxes)',
        extraRaita ? 'Extra Raita or Salad included' : (weeklyMenu[selectedDay]?.raita ? 'Standard Raita or Salad included' : 'Fresh Salad & Pickle included'),
        extraSweet ? 'Extra Dessert Sweet included' : 'No dessert sweet',
        'Free delivery',
      ],
      customDetails: {
        day: selectedDay,
        rotiCount: selectedRoti,
        sabziBoxes: totalSabziBoxes,
        sabziBreakdown: dishBoxes,
        selectedSabzi: totalSabziBoxes > 0 ? sabziSummary : 'None',
        sabziSet1: selectedEntries[0]?.[0] || 'None',
        sabziSet2: selectedEntries[1]?.[0] || selectedEntries[0]?.[0] || 'None',
        extraRaita,
        extraSweet
      }
    };
    setIsModalOpen(false);
    navigate('/subscription-checkout', { state: { plan: customizedPlan } });
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
       <div className="bg-gradient-to-b from-primary/10 to-transparent py-16 text-center">
         <PageContainer>
           <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Transparent Pricing</h1>
           <p className="text-slate-600 max-w-2xl mx-auto text-lg font-medium">
             No hidden charges. No delivery fees. Just pure, wholesome food at a predictable cost.
           </p>
         </PageContainer>
       </div>
       
       <PlansSection />
       
       <PageContainer className="pb-20">
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-100 shadow-xl max-w-4xl mx-auto text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
             
             <span className="bg-secondary/15 text-secondary text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-4 inline-block">
                Single Order Option
             </span>
             <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Looking for a One-Time Meal?</h2>
             <p className="text-slate-500 mb-8 max-w-lg mx-auto font-medium text-sm md:text-base leading-relaxed">
               Want to try before you subscribe? Customize your meal dynamically: select your target day, choose your Roti count, select your Sabzi preferences, and add delicious extras.
             </p>
             
              <button 
                onClick={openCustomizer}
                className="px-10 py-4 bg-secondary text-white rounded-2xl font-bold hover:bg-blue-600 transition shadow-lg hover:shadow-xl hover:shadow-blue-500/10 active:scale-95 transform duration-200"
              >
                Configure & Order One-Time Meal (${basePrice.toFixed(0)})
              </button>
           </div>
        </PageContainer>

        {/* Modern Clean Customizer Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-5 md:p-6 animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-hidden relative flex flex-col transition-all duration-300">
              
              {/* Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-primary bg-primary/10 px-3 py-0.5 rounded-full uppercase tracking-wider">
                      Single Meal Order
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Customize Your One-Time Meal
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Personalize your daily ingredients, rotis, and extras for fresh home delivery
                  </p>
                </div>
                
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              {/* Content Area */}
              <div className="p-5 sm:p-7 md:p-8 overflow-y-auto flex-1 bg-slate-50/40 space-y-6">
                {loadingMenu ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 size={36} className="text-primary animate-spin" />
                    <p className="text-sm font-bold text-slate-700">Loading today's fresh menu...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Inclusions & Standard Base Bar */}
                    <div className="bg-white border border-slate-200/70 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <span className="text-base">🍱</span>
                        <span>Standard Base Tiffin (${basePrice.toFixed(2)} CAD) includes:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 font-medium">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">🌾 Basmati Rice</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">🥗 Fresh Salad</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">🥣 Mango Pickle</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">🫓 {baseRoti} Fresh Rotis</span>
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg">🍲 {baseSabzi} Choice Sabzis</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-slate-900 px-3 py-1 rounded-full shrink-0">
                        <Clock size={12} />
                        <span>10:00 PM CUTOFF</span>
                      </div>
                    </div>

                    {/* 3-Column Interactive Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      
                      {/* Column 1: Delivery Schedule & Add-ons (4 cols) */}
                      <div className="lg:col-span-3 space-y-5 flex flex-col">
                        
                        {/* Delivery Schedule Information Card */}
                        <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/60 border border-blue-100/90 p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
                          <div className="flex items-center gap-3 border-b border-blue-200/50 pb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                              <Truck size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Scheduled Delivery (8:00 AM)</span>
                              <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                                {deliverySchedule.formattedDate} at 8:00 AM
                              </h4>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold text-slate-700 pt-1">
                            <div className="bg-white/80 border border-blue-100/70 p-2 rounded-xl text-center">
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">Cutoff</span>
                              <span className="text-[11px]">10:00 PM</span>
                            </div>
                            <div className="bg-white/80 border border-blue-100/70 p-2 rounded-xl text-center">
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">Days</span>
                              <span className="text-[11px]">Mon–Sat</span>
                            </div>
                            <div className="bg-white/80 border border-blue-100/70 p-2 rounded-xl text-center">
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">Sunday</span>
                              <span className="text-[11px] text-red-600">Off</span>
                            </div>
                          </div>

                          <div className="bg-white/90 border border-blue-100 p-2.5 rounded-xl text-xs font-medium text-slate-700 leading-normal">
                            {deliverySchedule.isAfterCutoff 
                              ? `🌙 Night Order (After 10 PM): Delivery on ${deliverySchedule.formattedDate} at 8:00 AM.` 
                              : `✅ On Time (Before 10 PM): Delivery on ${deliverySchedule.formattedDate} at 8:00 AM.`}
                          </div>
                        </div>

                        {/* Optional Add-ons */}
                        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-3 flex-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                            ✨ Optional Add-ons
                          </label>
                          <div className="space-y-2.5">
                            <div 
                              onClick={() => setExtraRaita(prev => !prev)}
                              className={`p-3.5 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                                extraRaita 
                                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                              }`}
                            >
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Extra Raita / Salad</h4>
                                <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">+${raitaRate.toFixed(2)} CAD</span>
                              </div>
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                extraRaita ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {extraRaita && <Check size={12} strokeWidth={3} />}
                              </div>
                            </div>

                            <div 
                              onClick={() => setExtraSweet(prev => !prev)}
                              className={`p-3.5 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                                extraSweet 
                                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                              }`}
                            >
                              <div>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Extra Sweet Dessert</h4>
                                <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">+${sweetRate.toFixed(2)} CAD</span>
                              </div>
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                extraSweet ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {extraSweet && <Check size={12} strokeWidth={3} />}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Column 2: Roti Quantity & Base Inclusions (3 cols) */}
                      <div className="lg:col-span-4 space-y-5 flex flex-col">
                        {/* Roti Quantity Stepper */}
                        <div className="bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div>
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                🫓 Roti Quantity (0 to Unlimited)
                              </label>
                              <span className="text-[11px] text-slate-500 block mt-0.5">Base tiffin includes {baseRoti} rotis</span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                              ± ${pricePerRoti.toFixed(2)} CAD / roti
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                            <div>
                              <span className="text-sm font-bold text-slate-900 block">Fresh Tawa Rotis</span>
                              <span className="text-xs text-slate-500">
                                {selectedRoti === 0 ? 'No rotis' : `${selectedRoti} rotis selected`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                type="button"
                                onClick={() => setSelectedRoti(prev => Math.max(0, prev - 1))}
                                disabled={selectedRoti <= 0}
                                className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center transition shadow-sm active:scale-95"
                                title="Decrease roti"
                              >
                                <Minus size={16} strokeWidth={2.5} />
                              </button>
                              
                              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-inner focus-within:ring-2 focus-within:ring-primary/20">
                                <input
                                  type="number"
                                  min="0"
                                  value={selectedRoti === 0 ? '' : selectedRoti}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                    setSelectedRoti(isNaN(val) ? 0 : Math.max(0, val));
                                  }}
                                  className="w-12 text-center font-bold text-lg text-slate-900 bg-transparent focus:outline-none"
                                />
                                <span className="text-[10px] font-bold uppercase text-slate-400">Rotis</span>
                              </div>

                              <button 
                                type="button"
                                onClick={() => setSelectedRoti(prev => prev + 1)}
                                className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center justify-center transition shadow-sm active:scale-95"
                                title="Increase roti"
                              >
                                <Plus size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Included Base Sides Card */}
                        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-3 flex-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Utensils size={14} className="text-primary" /> Included In Every Meal
                          </label>
                          <div className="space-y-2 text-xs text-slate-600 font-medium pt-1">
                            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                              <span>🌾 Steamed Basmati Rice</span>
                              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">Included</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                              <span>🥗 Fresh Garden Salad</span>
                              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">Included</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                              <span>🥣 Homemade Mango Pickle</span>
                              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">Included</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Column 3: Sabji Box Quantities by Dish (5 cols) */}
                      <div className="lg:col-span-5 bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col space-y-4">
                        {/* Sabji Box Overview Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                              <span>🍲</span>
                              <span>Daily Fresh Sabji Choices</span>
                            </label>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Choose 0 to unlimited boxes per dish (Base meal includes {baseSabzi} boxes total)
                            </span>
                          </div>
                          <div className="shrink-0">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-sm ${
                              totalSabziBoxes === baseSabzi 
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : totalSabziBoxes > baseSabzi
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : totalSabziBoxes === 0
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              <span className="w-2 h-2 rounded-full bg-current"></span>
                              <span>{totalSabziBoxes} Box{totalSabziBoxes !== 1 ? 'es' : ''} Total</span>
                            </span>
                          </div>
                        </div>

                        {/* Dish List with Individual Box Steppers & Full Sabji Name Display */}
                        <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[340px] pr-1">
                          {availableSabzis.length > 0 ? (
                            availableSabzis.map((sabzi: string) => {
                              const count = getDishCount(sabzi);
                              const isActive = count > 0;
                              return (
                                <div
                                  key={sabzi}
                                  className={`p-4 sm:p-4.5 border-2 rounded-2xl transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                                    isActive
                                      ? 'border-primary bg-primary/[0.04] shadow-md shadow-primary/5 ring-1 ring-primary/20'
                                      : 'border-slate-200/90 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {/* Sabji Full Name Section - Never Truncated */}
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-start gap-2.5">
                                      <span className="text-lg shrink-0 mt-0.5">🥘</span>
                                      <div className="flex-1">
                                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug break-words">
                                          {sabzi}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                          {isActive ? (
                                            <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                                              {count} Box{count > 1 ? 'es' : ''} Selected
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-semibold text-slate-400">
                                              0 Boxes selected
                                            </span>
                                          )}
                                          <span className="text-[10px] text-slate-400 font-medium">
                                            • 8oz fresh container
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Stepper with Direct Number Input */}
                                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => setDishCount(sabzi, count - 1)}
                                      disabled={count <= 0}
                                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center transition shadow-sm active:scale-95"
                                      title={`Decrease ${sabzi}`}
                                    >
                                      <Minus size={14} strokeWidth={2.5} />
                                    </button>

                                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-inner focus-within:ring-2 focus-within:ring-primary/20">
                                      <input
                                        type="number"
                                        min="0"
                                        value={count === 0 ? '' : count}
                                        placeholder="0"
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                          setDishCount(sabzi, isNaN(val) ? 0 : Math.max(0, val));
                                        }}
                                        className="w-10 text-center font-black text-sm sm:text-base text-slate-900 bg-transparent focus:outline-none"
                                      />
                                      <span className="text-[9px] font-bold uppercase text-slate-400">Box</span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setDishCount(sabzi, count + 1)}
                                      className="w-8 h-8 rounded-xl bg-primary text-white hover:bg-primary-hover flex items-center justify-center transition shadow-sm shadow-primary/20 active:scale-95"
                                      title={`Increase ${sabzi}`}
                                    >
                                      <Plus size={14} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 border border-slate-200">
                              Chef's Fresh Daily Sabji Selection (2 Boxes Included)
                            </div>
                          )}
                        </div>

                        {/* Quick Helper / Info Note */}
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 font-medium flex items-center justify-between">
                          <span>💡 Any combination of dishes is supported.</span>
                          {totalSabziBoxes > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const reset: Record<string, number> = {};
                                availableSabzis.forEach(d => { reset[d] = 0; });
                                setDishBoxes(reset);
                              }}
                              className="text-slate-400 hover:text-red-600 text-[10px] font-bold uppercase transition"
                            >
                              Clear all
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* Footer Summary */}
              <div className="px-6 sm:px-8 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Calculated Total
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                      ${calculatePrice().toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">CAD (Free Delivery)</span>
                  </div>
                </div>
                
                <button
                  onClick={handleProceedToCheckout}
                  disabled={loadingMenu}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-primary to-primary-hover text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={16} />
                </button>
              </div>

            </div>
          </div>
        )}
    </div>
  );
};

export default Pricing;
