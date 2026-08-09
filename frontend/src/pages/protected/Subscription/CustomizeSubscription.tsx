import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import PageContainer from '../../../components/layout/PageContainer';
import { toast } from 'sonner';
import { Check, ChevronLeft, Save, Star, Sparkles, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface DayPreferences {
  sabzi1?: string;
  sabzi2?: string;
  sabzi3?: string;
  specialFood?: string;
  dessert?: string;
  sideOption?: 'Raita' | 'Salad';
}

interface WeeklyPreferences {
  monday: DayPreferences;
  tuesday: DayPreferences;
  wednesday: DayPreferences;
  thursday: DayPreferences;
  friday: DayPreferences;
  saturday: DayPreferences;
}

interface CustomSpecs {
  roti: number;
  sabziChoices: number;
  raitaOption: 'none' | '3days' | 'daily';
  dessertOption: 'none' | 'weekly' | 'daily';
  saturdaySpecial: boolean;
}

const CustomizeSubscription: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subscription, setSubscription] = useState<any>(null);
  const [planType, setPlanType] = useState<'basic' | 'standard' | 'premium' | 'custom'>('standard');
  const [customSpecs, setCustomSpecs] = useState<CustomSpecs | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  
  // Weekly menus fetched from the API
  const [weeklyMenus, setWeeklyMenus] = useState<any>(null);

  const [preferences, setPreferences] = useState<WeeklyPreferences>({
    monday: {},
    tuesday: {},
    wednesday: {},
    thursday: {},
    friday: {},
    saturday: {}
  });

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNames: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday'
  };

  useEffect(() => {
    const initPage = async () => {
      try {
        if (!user) return;
        const token = await user.getIdToken();

        // 1. Fetch weekly menus for all plans
        const [basicRes, standardRes, premiumRes] = await Promise.all([
          axios.get(`${ENV.API_URL}/menu/plans/basic/menu`),
          axios.get(`${ENV.API_URL}/menu/plans/standard/menu`),
          axios.get(`${ENV.API_URL}/menu/plans/premium/menu`)
        ]);

        const fetchedMenus = {
          basic: basicRes.data.data.weeklyMenu,
          standard: standardRes.data.data.weeklyMenu,
          premium: premiumRes.data.data.weeklyMenu
        };
        setWeeklyMenus(fetchedMenus);

        // 2. Fetch user's subscription
        const search = window.location.search;
        const params = new URLSearchParams(search);
        const subscriptionIdParam = params.get('subscriptionId');

        let subUrl = `${ENV.API_URL}/subscriptions`;
        if (subscriptionIdParam) {
          subUrl += `?subscriptionId=${subscriptionIdParam}`;
        }

        const res = await axios.get(subUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.data.data) {
          navigate('/pricing');
          return;
        }

        let sub = res.data.data;
        if (Array.isArray(sub)) {
          const activeSub = sub.find((s: any) => s.status === 'Active');
          if (activeSub) {
            sub = activeSub;
          } else if (sub.length > 0) {
            sub = sub[0];
          } else {
            navigate('/pricing');
            return;
          }
        }
        setSubscription(sub);

        const plan = sub.plan?.toLowerCase() || '';
        const details = sub.planDetails || {};
        
        // 3. Map Plan Type and Specs
        let currentPlanType: 'basic' | 'standard' | 'premium' | 'custom' = 'standard';
        let specs: CustomSpecs | null = null;

        if (details.custom || plan.includes('custom')) {
          currentPlanType = 'custom';
          specs = {
            roti: Number(details.roti) !== undefined ? Number(details.roti) : 6,
            sabziChoices: Number(details.sabziChoices) || 2,
            raitaOption: details.raitaOption || '3days',
            dessertOption: details.dessertOption || 'none',
            saturdaySpecial: !!details.saturdaySpecial
          };
          setCustomSpecs(specs);
        } else if (plan.includes('basic')) {
          currentPlanType = 'basic';
        } else if (plan.includes('premium')) {
          currentPlanType = 'premium';
        }

        setPlanType(currentPlanType);

        // 4. Build Default Preferences
        const getDefaultPrefs = (): WeeklyPreferences => {
          // For custom plans, base menus on standard/premium
          const referenceType = currentPlanType === 'custom' ? 'premium' : currentPlanType;
          const refMenu = fetchedMenus[referenceType];
          const defaults: any = {};

          days.forEach(day => {
            const dMenu = refMenu[day] || {};
            const dayPrefs: any = {};

            // Check if Saturday Special is active for this user
            const isSatSpec = dMenu.isSaturdaySpecial && 
              (currentPlanType === 'premium' || (currentPlanType === 'custom' && specs?.saturdaySpecial));

            if (isSatSpec) {
              if (dMenu.specialFoodOptions) dayPrefs.specialFood = dMenu.specialFoodOptions[0];
              if (dMenu.dessertOptions) dayPrefs.dessert = dMenu.dessertOptions[0];
            } else {
              // Standard sabzi selection
              const numChoices = currentPlanType === 'custom' ? (specs?.sabziChoices || 2) : (currentPlanType === 'basic' ? 1 : 2);
              
              const s1 = dMenu.sabziSet1 || dMenu.sabziOptions || [];
              const s2 = dMenu.sabziSet2 || [];

              if (numChoices === 1) {
                dayPrefs.sabzi1 = s1[0] || '';
              } else if (numChoices === 2) {
                dayPrefs.sabzi1 = s1[0] || '';
                dayPrefs.sabzi2 = s2[0] || '';
              } else if (numChoices === 3) {
                dayPrefs.sabzi1 = s1[0] || '';
                dayPrefs.sabzi2 = s2[0] || '';
                dayPrefs.sabzi3 = s1[1] || s1[0] || '';
              }
            }
            dayPrefs.sideOption = 'Raita';
            defaults[day] = dayPrefs;
          });
          return defaults;
        };

        const defaultPreferences = getDefaultPrefs();

        // 5. Fetch saved preferences
        const customRes = await axios.get(
          `${ENV.API_URL}/menu/customizations/${sub.subscriptionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (customRes.data.data?.customization?.preferences) {
          const savedPrefs = customRes.data.data.customization.preferences;
          const mergedPrefs = { ...defaultPreferences };
          days.forEach(day => {
            if (savedPrefs[day] && Object.keys(savedPrefs[day]).length > 0) {
              mergedPrefs[day as keyof WeeklyPreferences] = {
                ...mergedPrefs[day as keyof WeeklyPreferences],
                ...savedPrefs[day]
              };
            }
          });
          setPreferences(mergedPrefs);
        } else {
          setPreferences(defaultPreferences);
        }
      } catch (error) {
        console.error("Failed to initialize customization page:", error);
        toast.error("Failed to load menus. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [user, navigate]);

  // Determine current active menus and specs
  const getActiveDayMenu = () => {
    if (!weeklyMenus) return null;
    const ref = planType === 'custom' ? 'premium' : planType;
    return weeklyMenus[ref]?.[selectedDay] || null;
  };

  const currentDayMenu = getActiveDayMenu();
  const currentDayPrefs = preferences[selectedDay as keyof WeeklyPreferences] || {};

  // Custom configurations helper
  const isSaturdaySpecialActive = () => {
    if (!currentDayMenu?.isSaturdaySpecial) return false;
    if (planType === 'premium') return true;
    if (planType === 'custom' && customSpecs?.saturdaySpecial) return true;
    return false;
  };

  const getSabziCount = () => {
    if (planType === 'custom') return customSpecs?.sabziChoices || 2;
    if (planType === 'basic') return 1;
    return 2;
  };

  const isRaitaIncludedToday = () => {
    if (planType === 'custom') {
      const opt = customSpecs?.raitaOption || 'none';
      if (opt === 'daily') return true;
      if (opt === '3days' && ['monday', 'wednesday', 'friday'].includes(selectedDay)) return true;
      return false;
    }
    if (planType === 'premium') return true;
    if (['basic', 'standard'].includes(planType) && ['monday', 'wednesday', 'friday'].includes(selectedDay)) return true;
    return false;
  };

  const isDessertIncludedToday = () => {
    if (planType === 'custom') {
      const opt = customSpecs?.dessertOption || 'none';
      if (opt === 'daily') return true;
      if (opt === 'weekly' && selectedDay === 'wednesday') return true;
      return false;
    }
    if (planType === 'premium' && (selectedDay === 'wednesday' || currentDayMenu?.isSaturdaySpecial)) return true;
    return false;
  };

  // Selection handlers
  const handleSabziSelect = (sabzi: string, position: 1 | 2 | 3) => {
    setPreferences(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay as keyof WeeklyPreferences],
        [`sabzi${position}`]: sabzi
      }
    }));
  };

  const handleSpecialSelect = (type: 'specialFood' | 'dessert', value: string) => {
    setPreferences(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay as keyof WeeklyPreferences],
        [type]: value
      }
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const token = await user?.getIdToken();
      await axios.post(
        `${ENV.API_URL}/menu/customizations`,
        {
          subscriptionId: subscription.subscriptionId,
          preferences
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Preferences saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['mySubscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['myCustomization', subscription.subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['adminDeliveries'] });
      navigate('/my-subscription');
    } catch (error) {
      console.error('Failed to save preferences', error);
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isComplete = () => {
    if (!weeklyMenus) return false;
    return days.every(day => {
      const ref = planType === 'custom' ? 'premium' : planType;
      const dayMenu = weeklyMenus[ref]?.[day] || {};
      const dayPrefs = preferences[day as keyof WeeklyPreferences] || {};
      
      const isSatSpec = dayMenu.isSaturdaySpecial && 
        (planType === 'premium' || (planType === 'custom' && customSpecs?.saturdaySpecial));

      if (isSatSpec) {
        return dayPrefs.specialFood && dayPrefs.dessert;
      }
      
      const count = getSabziCount();
      if (count === 1) return !!dayPrefs.sabzi1;
      if (count === 2) return !!(dayPrefs.sabzi1 && dayPrefs.sabzi2);
      return !!(dayPrefs.sabzi1 && dayPrefs.sabzi2 && dayPrefs.sabzi3);
    });
  };

  if (loading || !currentDayMenu) {
    return (
      <PageContainer className="py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading customization parameters...</p>
        </div>
      </PageContainer>
    );
  }

  // Generate lists for custom dropdowns
  const sSet1 = currentDayMenu.sabziSet1 || currentDayMenu.sabziOptions || [];
  const sSet2 = currentDayMenu.sabziSet2 || [];
  const allSabziOptions = [...sSet1, ...sSet2];

  return (
    <PageContainer className="py-10">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/my-subscription')}
          className="flex items-center gap-2 text-text-secondary hover:text-primary mb-4 transition font-medium"
        >
          <ChevronLeft size={20} />
          Back to My Subscription
        </button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary mb-2 flex items-center gap-2">
              <Sparkles size={26} className="text-primary" />
              Customize Your Meal Selections
            </h1>
            <p className="text-text-secondary text-sm md:text-base">Configure your dish preferences for every delivery day.</p>
          </div>
          <div className="bg-primary/5 px-6 py-3.5 rounded-2xl border-2 border-primary/20 w-fit">
            <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Active Plan</p>
            <p className="text-xl font-black text-primary capitalize">{planType === 'custom' ? 'Custom Plan' : `${planType} Plan`}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Day Selector Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white lg:rounded-2xl border lg:border-gray-200 p-4 sticky top-[73px] lg:top-24 z-30 lg:z-0 -mx-4 lg:mx-0 shadow-sm lg:shadow-none overflow-x-auto lg:overflow-visible">
            <h3 className="font-extrabold text-base mb-4 hidden lg:block uppercase tracking-wider text-text-secondary">Select Day</h3>
            <div className="flex lg:flex-col space-x-3 lg:space-x-0 lg:space-y-2 min-w-max lg:min-w-0 px-1 lg:px-0">
              {days.map((day) => {
                const ref = planType === 'custom' ? 'premium' : planType;
                const dayMenu = weeklyMenus[ref]?.[day] || {};
                const dayPrefs = preferences[day as keyof WeeklyPreferences] || {};
                
                let isCompleteDay = false;
                const isSatSpec = dayMenu.isSaturdaySpecial && 
                  (planType === 'premium' || (planType === 'custom' && customSpecs?.saturdaySpecial));

                if (isSatSpec) {
                  isCompleteDay = !!(dayPrefs.specialFood && dayPrefs.dessert);
                } else {
                  const count = getSabziCount();
                  if (count === 1) isCompleteDay = !!dayPrefs.sabzi1;
                  else if (count === 2) isCompleteDay = !!(dayPrefs.sabzi1 && dayPrefs.sabzi2);
                  else isCompleteDay = !!(dayPrefs.sabzi1 && dayPrefs.sabzi2 && dayPrefs.sabzi3);
                }

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-shrink-0 lg:w-full flex items-center gap-2 lg:justify-between px-5 py-2.5 lg:py-3.5 rounded-full lg:rounded-xl font-bold transition-all text-sm lg:text-base border lg:border-0 ${
                      selectedDay === day
                        ? 'bg-primary text-white shadow-md border-primary'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <span>{dayNames[day]}</span>
                    {isCompleteDay && (
                      <Check size={16} className={selectedDay === day ? 'text-white' : 'text-green-600'} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Customization Area */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-text-primary mb-1">{dayNames[selectedDay]}'s Menu Choices</h2>
              <p className="text-text-secondary text-sm">
                {isSaturdaySpecialActive() 
                  ? "It's Saturday Special! Customize your premium treat." 
                  : `Please customize your ${getSabziCount()} daily sabzi choice(s) below.`
                }
              </p>
            </div>

            {/* Saturday Special View */}
            {isSaturdaySpecialActive() ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50/50 border-2 border-yellow-400/60 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <Star className="text-yellow-600" size={26} fill="currentColor" />
                    <h3 className="text-xl font-black text-orange-950">Saturday Special</h3>
                    <Sparkles className="text-yellow-600 animate-pulse" size={22} />
                  </div>

                  {/* Special Food Selection */}
                  <div className="mb-8">
                    <h4 className="font-bold text-sm text-orange-950 uppercase tracking-wider mb-4">Choose Your Special Dish:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {currentDayMenu.specialFoodOptions?.map((food: string) => (
                        <button
                          key={food}
                          onClick={() => handleSpecialSelect('specialFood', food)}
                          className={`p-4 rounded-xl border-2 font-bold transition-all text-center ${
                            currentDayPrefs.specialFood === food
                              ? 'border-orange-500 bg-orange-100 text-orange-950 shadow-md'
                              : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                          }`}
                        >
                          {food}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dessert Selection */}
                  <div>
                    <h4 className="font-bold text-sm text-pink-950 uppercase tracking-wider mb-4">Choose Saturday Dessert:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {currentDayMenu.dessertOptions?.map((dessert: string) => (
                        <button
                          key={dessert}
                          onClick={() => handleSpecialSelect('dessert', dessert)}
                          className={`p-4 rounded-xl border-2 font-bold transition-all text-center ${
                            currentDayPrefs.dessert === dessert
                              ? 'border-pink-500 bg-pink-100 text-pink-950 shadow-md'
                              : 'border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50'
                          }`}
                        >
                          {dessert}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Regular Day Sabzi Selector */
              <div className="space-y-6">
                {/* 1 Sabzi Choice */}
                {getSabziCount() === 1 && (
                  <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                    <h4 className="font-bold text-base text-text-primary uppercase tracking-wider mb-4">Choose Your Main Sabzi:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {allSabziOptions.map((sabzi) => (
                        <button
                          key={sabzi}
                          onClick={() => handleSabziSelect(sabzi, 1)}
                          className={`p-4 rounded-xl border-2 font-bold transition-all text-center ${
                            currentDayPrefs.sabzi1 === sabzi
                              ? 'border-primary bg-primary/10 text-primary shadow-md'
                              : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-primary/5'
                          }`}
                        >
                          {sabzi}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2 Sabzi Choices (Sets) */}
                {getSabziCount() >= 2 && (
                  <>
                    <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-200/60">
                      <h4 className="font-bold text-base text-blue-950 uppercase tracking-wider mb-4">Sabzi Selection 1 (Set A):</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {sSet1.map((sabzi: string) => (
                          <button
                            key={sabzi}
                            onClick={() => handleSabziSelect(sabzi, 1)}
                            className={`p-4 rounded-xl border-2 font-bold transition-all text-center ${
                              currentDayPrefs.sabzi1 === sabzi
                                ? 'border-blue-600 bg-blue-100 text-blue-950 shadow-md'
                                : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/30'
                            }`}
                          >
                            {sabzi}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-green-50/50 rounded-2xl p-6 border border-green-200/60">
                      <h4 className="font-bold text-base text-green-950 uppercase tracking-wider mb-4">Sabzi Selection 2 (Set B):</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {sSet2.map((sabzi: string) => (
                          <button
                            key={sabzi}
                            onClick={() => handleSabziSelect(sabzi, 2)}
                            className={`p-4 rounded-xl border-2 font-bold transition-all text-center ${
                              currentDayPrefs.sabzi2 === sabzi
                                ? 'border-green-600 bg-green-100 text-green-950 shadow-md'
                                : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/30'
                            }`}
                          >
                            {sabzi}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 3 Sabzi Choices (Custom only) */}
                {getSabziCount() === 3 && (
                  <div className="bg-purple-50/50 rounded-2xl p-6 border border-purple-200/60">
                    <h4 className="font-bold text-base text-purple-950 uppercase tracking-wider mb-4">Sabzi Selection 3 (Extra Selection):</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {allSabziOptions.map((sabzi: string) => (
                        <button
                          key={sabzi}
                          onClick={() => handleSabziSelect(sabzi, 3)}
                          className={`p-4 rounded-xl border-2 font-bold transition-all text-center ${
                            currentDayPrefs.sabzi3 === sabzi
                              ? 'border-purple-600 bg-purple-100 text-purple-950 shadow-md'
                              : 'border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50/30'
                          }`}
                        >
                          {sabzi}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Side Option Choice Block */}
                {isRaitaIncludedToday() && (
                  <div className="bg-orange-50/40 rounded-2xl p-5 border border-orange-200 shadow-xs my-4">
                    <div className="mb-3">
                      <h4 className="font-black text-sm text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🥗</span> Choose Daily Side Dish:
                      </h4>
                      <p className="text-[11px] font-semibold text-orange-850 mt-0.5">
                        Select which fresh side option you would like to receive with today's delivery:
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['Raita', 'Salad'] as const).map((side) => {
                        const isSelected = (currentDayPrefs.sideOption || 'Raita') === side;
                        return (
                          <button
                            key={side}
                            type="button"
                            onClick={() => {
                              setPreferences(prev => ({
                                ...prev,
                                [selectedDay]: {
                                  ...prev[selectedDay as keyof WeeklyPreferences],
                                  sideOption: side
                                }
                              }));
                            }}
                            className={`p-3 rounded-xl border-2 font-black transition-all flex items-center gap-3.5 shadow-xs group ${
                              isSelected
                                ? 'border-[#ea580c] bg-orange-100/90 text-orange-950 shadow-xs ring-2 ring-[#ea580c]/15'
                                : 'border-gray-250 bg-white text-gray-700 hover:border-orange-350 hover:bg-orange-50/10'
                            }`}
                          >
                            <span className="text-2xl group-hover:scale-110 transition-transform duration-205">
                              {side === 'Raita' ? '🥣' : '🥗'}
                            </span>
                            <div className="flex flex-col text-left mr-auto">
                              <span className="text-xs font-black">{side}</span>
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                {side === 'Raita' ? 'Fresh Yogurt Raita' : 'Crispy Garden Salad'}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-[#ea580c] text-white">
                                Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dynamic meal inclusion list */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-5 border border-gray-200 flex flex-col gap-3 shadow-sm">
                  <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Other Inclusions for this day:</h5>
                  <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-700">
                    <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-gray-150 shadow-xs">
                      <span>🫓</span>
                      <span>{planType === 'custom' ? customSpecs?.roti : currentDayMenu.roti} Tawa Roti</span>
                    </div>

                    {isRaitaIncludedToday() && (
                      <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-gray-150 shadow-xs">
                        <span>🥗</span>
                        <span className="text-[#ea580c]">Selected Side: {currentDayPrefs.sideOption || 'Raita'}</span>
                      </div>
                    )}

                    {isDessertIncludedToday() && (
                      <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-gray-150 shadow-xs">
                        <span>🍮</span>
                        <span className="text-pink-600">Dessert Included</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-center flex-col items-center gap-3">
        <button
          onClick={handleSavePreferences}
          disabled={!isComplete() || saving}
          className="flex items-center gap-3 px-10 py-4 bg-primary text-white hover:bg-primary-hover rounded-xl font-bold text-lg shadow-lg hover:shadow-primary/30 transition disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
        >
          <Save size={22} />
          {saving ? 'Saving...' : isComplete() ? 'Save Preferences' : 'Complete All Days to Save'}
        </button>
        {!isComplete() && (
          <p className="text-xs text-red-500 font-bold flex items-center gap-1.5">
            <AlertCircle size={14} />
            Please make sure you have selected dishes for all 6 days (Monday through Saturday).
          </p>
        )}
      </div>
    </PageContainer>
  );
};

export default CustomizeSubscription;
