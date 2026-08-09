import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../components/layout/PageContainer';
import PlansSection from '../Home/PlansSection';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { X, Check, Loader2, Calendar, Plus, Minus } from 'lucide-react';

const dayNames: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday', 
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday'
};

const getTargetDayName = () => {
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  let todayIndex = now.getDay();
  // If past 8 PM (20:00), we target tomorrow's tiffin
  if (now.getHours() >= 20) {
    todayIndex = (todayIndex + 1) % 7;
  }
  const day = daysOfWeek[todayIndex];
  return day === 'sunday' ? 'monday' : day;
};

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [weeklyMenu, setWeeklyMenu] = useState<any>(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  
  // Customization States
  const [selectedDay] = useState<string>(getTargetDayName());
  const [selectedRoti, setSelectedRoti] = useState<number>(8);
  const [selectedSabzi1, setSelectedSabzi1] = useState<string>('');
  const [selectedSabzi2, setSelectedSabzi2] = useState<string>('');
  const [extraRaita, setExtraRaita] = useState<boolean>(false);
  const [extraSweet, setExtraSweet] = useState<boolean>(false);

  const now = new Date();
  const isTomorrow = now.getHours() >= 20 || now.getDay() === 0;
  const dayLabel = isTomorrow ? "Tomorrow" : "Today";

  const openCustomizer = async () => {
    if (!user) {
      toast.error("Please login to customize and order your tiffin!");
      navigate('/login');
      return;
    }
    setIsModalOpen(true);
    if (!weeklyMenu) {
      setLoadingMenu(true);
      try {
        const response = await axios.get(`${ENV.API_URL}/menu/plans/standard/menu`);
        if (response.data.success) {
          setWeeklyMenu(response.data.data.weeklyMenu);
        }
      } catch (err) {
        console.error("Error fetching menu:", err);
        toast.error("Failed to load menu choices. Please try again.");
      } finally {
        setLoadingMenu(false);
      }
    }
  };

  useEffect(() => {
    if (weeklyMenu && weeklyMenu[selectedDay]) {
      const dayMenu = weeklyMenu[selectedDay];
      if (dayMenu.sabziSet1 && dayMenu.sabziSet1.length > 0) {
        setSelectedSabzi1(dayMenu.sabziSet1[0]);
      } else {
        setSelectedSabzi1('');
      }
      if (dayMenu.sabziSet2 && dayMenu.sabziSet2.length > 0) {
        setSelectedSabzi2(dayMenu.sabziSet2[0]);
      } else {
        setSelectedSabzi2('');
      }
    }
  }, [selectedDay, weeklyMenu]);

  const calculatePrice = () => {
    const basePrice = 13.0;
    const rotiDifference = selectedRoti - 8;
    const rotiPriceDiff = rotiDifference * 0.60;
    const raitaPrice = extraRaita ? 2.00 : 0;
    const sweetPrice = extraSweet ? 3.00 : 0;
    const total = basePrice + rotiPriceDiff + raitaPrice + sweetPrice;
    return Math.max(8.0, parseFloat(total.toFixed(2)));
  };

  const handleProceedToCheckout = () => {
    if (!selectedSabzi1 || !selectedSabzi2) {
      toast.error("Please choose a sabzi option for both Set 1 and Set 2.");
      return;
    }
    const dayName = dayNames[selectedDay];
    const finalPrice = calculatePrice();
    const customizedPlan = {
      name: `One-Time Standard Meal (${dayName}: ${selectedSabzi1} & ${selectedSabzi2})`,
      price: finalPrice,
      type: 'one-time',
      features: [
        '1 Tiffin (Home-style meal)',
        `${dayName}'s Menu`,
        `Roti Count: ${selectedRoti}`,
        `Set 1: ${selectedSabzi1}`,
        `Set 2: ${selectedSabzi2}`,
        extraRaita ? 'Extra Raita or Salad included' : (weeklyMenu[selectedDay]?.raita ? 'Standard Raita or Salad included' : 'No raita or salad on this day'),
        extraSweet ? 'Extra Dessert Sweet included' : 'No dessert',
        'Free delivery',
      ],
      customDetails: {
        day: selectedDay,
        rotiCount: selectedRoti,
        sabziSet1: selectedSabzi1,
        sabziSet2: selectedSabzi2,
        extraRaita,
        extraSweet
      }
    };
    setIsModalOpen(false);
    navigate('/subscription-checkout', { state: { plan: customizedPlan } });
  };

  const currentDayMenu = weeklyMenu ? weeklyMenu[selectedDay] : null;

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
               Configure & Order One-Time Meal ($13)
             </button>
          </div>
       </PageContainer>

       {/* Customizer Modal */}        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 md:p-6 animate-fade-in">
            <div className="bg-[#f3f4f6] rounded-2xl border-[4px] border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-5xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden relative flex flex-col transition-all duration-300">
              
              {/* Header */}
              <div className="p-6 border-b-[4px] border-black flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#fde047] sticky top-0 z-10">
                <div className="flex-1">
                  <span className="text-[10px] font-black text-black uppercase tracking-widest bg-white border-2 border-black px-3 py-1 rounded-full mb-1.5 inline-block">
                    Tiffin Personalization
                  </span>
                  <h3 className="text-3xl font-black text-black leading-none uppercase tracking-tight">Customize Your One-Time Meal</h3>
                  <p className="text-sm text-black font-semibold mt-1">Configure ingredients, quantities, and extras for your tiffin</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2.5 bg-white border-2 border-black rounded-lg text-black hover:bg-slate-100 active:translate-x-[1px] active:translate-y-[1px] transition-all duration-100"
                  >
                    <X size={22} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
                {loadingMenu ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-4">
                    <Loader2 size={40} className="text-black animate-spin" />
                    <p className="text-base font-extrabold text-black uppercase tracking-wider">Retrieving today's fresh menu...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Horizontal Inclusions & Warnings Bar (Saves massive vertical space) */}
                    <div className="bg-[#f3f4f6] border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl flex flex-col md:flex-row justify-between items-center gap-3">
                      <div className="flex items-center gap-2 text-sm font-black text-black">
                        <span className="text-lg">🍱</span>
                        <span>STANDARD BASE TIFFIN ($13.00) INCLUSIONS:</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-bold text-slate-800 bg-white border-2 border-black/10 px-4 py-1.5 rounded-lg">
                        <span>🌾 Basmati Rice</span>
                        <span className="text-black/35">•</span>
                        <span>🥗 Fresh Salad</span>
                        <span className="text-black/35">•</span>
                        <span>🥣 Mango Pickle</span>
                        <span className="text-black/35">•</span>
                        <span>🫓 8 Fresh Rotis</span>
                        <span className="text-black/35">•</span>
                        <span>🍲 2 Choice Sabzis</span>
                      </div>
                      <div className="text-[10px] font-black uppercase text-white bg-black border-2 border-black px-3 py-1 rounded-md shadow-[2px_2px_0px_0px_rgba(250,204,21,1)]">
                        <span>8:00 PM CUTOFF</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
                      
                      {/* Column 1: Delivery target, Rotis & Add-ons */}
                      <div className="space-y-5">
                        
                        {/* Targeted Delivery Day (Detailed Information Ticket) */}
                        <div className="bg-[#bae6fd] border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-12 h-12 bg-white/20 rounded-full translate-x-4 -translate-y-4" />
                          <div className="flex items-center gap-3 border-b-2 border-black border-dashed pb-3">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              <Calendar size={22} strokeWidth={2.5} className="animate-bounce" />
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-black/60 block">Scheduled Delivery</span>
                              <h4 className="text-base font-black text-black mt-0.5">
                                {dayLabel}: {dayNames[selectedDay]}
                              </h4>
                            </div>
                          </div>
                          
                          <div className="space-y-2.5 text-xs font-black text-black">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">⏰</span>
                              <span>Cutoff Time: 8:00 PM Daily</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">📴</span>
                              <span>Sunday Deliveries: Not Available</span>
                            </div>
                            <div className="bg-white border-2 border-black p-2.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[11px] font-bold leading-normal text-slate-800 mt-2">
                              {isTomorrow 
                                ? "⚠️ Late Order: Placed after 8:00 PM cutoff. Scheduled for tomorrow." 
                                : "✅ On Time: Placed before 8:00 PM cutoff. Scheduled for today."}
                            </div>
                          </div>
                        </div>

                        {/* Roti Count Selector */}
                        <div className="bg-[#fef08a] border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                              🫓 Roti Count
                            </label>
                            <span className="text-[10px] font-black text-black bg-white border-2 border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">± $0.60 / roti</span>
                          </div>
                          
                          <div className="flex items-center justify-between bg-white border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(250,204,21,1)]">
                            <span className="text-sm font-black text-black">Fresh Tawa Roti</span>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => setSelectedRoti(prev => Math.max(0, prev - 1))}
                                disabled={selectedRoti <= 0}
                                className="w-9 h-9 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black hover:bg-[#ff8a8a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40"
                              >
                                <Minus size={16} strokeWidth={3} />
                              </button>
                              <span className="text-lg font-black text-black w-6 text-center">{selectedRoti}</span>
                              <button 
                                onClick={() => setSelectedRoti(prev => Math.min(12, prev + 1))}
                                disabled={selectedRoti >= 12}
                                className="w-9 h-9 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black hover:bg-[#8aff8a] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40"
                              >
                                <Plus size={16} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Optional Extras */}
                        <div className="bg-[#fed7aa] border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl space-y-3">
                          <label className="text-xs font-black uppercase tracking-wider text-black block">
                            ✨ Optional Add-ons
                          </label>
                          <div className="space-y-3">
                            <div 
                              onClick={() => setExtraRaita(prev => !prev)}
                              className={`p-3.5 rounded-xl border-2 border-black cursor-pointer flex justify-between items-center transition-all bg-white hover:bg-slate-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] \${
                                extraRaita ? 'bg-[#ffedd5] shadow-none translate-x-[2px] translate-y-[2px]' : ''
                              }`}
                            >
                              <div>
                                <h4 className="text-sm font-black text-black">Extra Raita or Salad</h4>
                                <span className="text-[10px] text-slate-700 font-extrabold font-mono block mt-0.5">+$2.00 CAD</span>
                              </div>
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 border-black transition-all \${
                                extraRaita ? 'bg-black text-white' : 'bg-white'
                              }`}>
                                {extraRaita && <Check size={14} strokeWidth={4} />}
                              </div>
                            </div>

                            <div 
                              onClick={() => setExtraSweet(prev => !prev)}
                              className={`p-3.5 rounded-xl border-2 border-black cursor-pointer flex justify-between items-center transition-all bg-white hover:bg-slate-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] \${
                                extraSweet ? 'bg-[#fce7f3] shadow-none translate-x-[2px] translate-y-[2px]' : ''
                              }`}
                            >
                              <div>
                                <h4 className="text-sm font-black text-black">Extra Sweet Dessert</h4>
                                <span className="text-[10px] text-slate-700 font-extrabold font-mono block mt-0.5">+$3.00 CAD</span>
                              </div>
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 border-black transition-all \${
                                extraSweet ? 'bg-black text-white' : 'bg-white'
                              }`}>
                                {extraSweet && <Check size={14} strokeWidth={4} />}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Column 2: Sabzi Set 1 Choices */}
                      <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl flex flex-col space-y-4">
                        {currentDayMenu?.sabziSet1 && (
                          <div className="space-y-4 flex-1">
                            <label className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 border-b-2 border-black pb-3">
                              <span className="w-6 h-6 rounded-full bg-[#4ade80] border-2 border-black flex items-center justify-center text-[10px] font-black text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">1</span>
                              <span>Select Sabzi 1 (Set 1)</span>
                            </label>
                            <div className="grid grid-cols-1 gap-3">
                              {currentDayMenu.sabziSet1.map((sabzi: string) => (
                                <div
                                  key={sabzi}
                                  onClick={() => setSelectedSabzi1(sabzi)}
                                  className={`flex items-center justify-between p-4 border-2 border-black rounded-xl cursor-pointer transition-all duration-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-50 \sm${
                                    selectedSabzi1 === sabzi
                                      ? 'bg-[#bbf7d0] shadow-none translate-x-[2px] translate-y-[2px] font-black border-2 border-black'
                                      : ''
                                  }`}
                                >
                                  <span className="text-sm font-black text-black">{sabzi}</span>
                                  {selectedSabzi1 === sabzi ? (
                                    <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center border border-black">
                                      <Check size={12} strokeWidth={4} />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-white border border-slate-300" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Column 3: Sabzi Set 2 Choices */}
                      <div className="bg-white border-[3px] border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl flex flex-col space-y-4">
                        {currentDayMenu?.sabziSet2 && (
                          <div className="space-y-4 flex-1">
                            <label className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 border-b-2 border-black pb-3">
                              <span className="w-6 h-6 rounded-full bg-[#c084fc] border-2 border-black flex items-center justify-center text-[10px] font-black text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">2</span>
                              <span>Select Sabzi 2 (Set 2)</span>
                            </label>
                            <div className="grid grid-cols-1 gap-3">
                              {currentDayMenu.sabziSet2.map((sabzi: string) => (
                                <div
                                  key={sabzi}
                                  onClick={() => setSelectedSabzi2(sabzi)}
                                  className={`flex items-center justify-between p-4 border-2 border-black rounded-xl cursor-pointer transition-all duration-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white hover:bg-slate-50 \sm${
                                    selectedSabzi2 === sabzi
                                      ? 'bg-[#e9d5ff] shadow-none translate-x-[2px] translate-y-[2px] font-black border-2 border-black'
                                      : ''
                                  }`}
                                >
                                  <span className="text-sm font-black text-black">{sabzi}</span>
                                  {selectedSabzi2 === sabzi ? (
                                    <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center border border-black">
                                      <Check size={12} strokeWidth={4} />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-white border border-slate-300" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* Footer Summary */}
              <div className="p-6 border-t-[4px] border-black bg-[#f3f4f6] flex items-center justify-between sticky bottom-0 z-10">
                <div>
                  <span className="text-xs font-black text-black uppercase tracking-wider block">Configured Price</span>
                  <span className="text-4xl font-black text-black font-mono tracking-tight">${calculatePrice().toFixed(2)}</span>
                </div>
                
                <button
                  onClick={handleProceedToCheckout}
                  disabled={loadingMenu || !selectedSabzi1 || !selectedSabzi2}
                  className="h-16 px-10 bg-[#fde047] border-[3px] border-black text-black font-black uppercase tracking-wider rounded-xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center"
                >
                  Proceed to Checkout
                </button>
              </div>

            </div>
          </div>
        )}
    </div>
  );
};

export default Pricing;
