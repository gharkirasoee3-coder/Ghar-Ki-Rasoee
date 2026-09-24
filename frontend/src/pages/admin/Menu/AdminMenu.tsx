import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { ENV } from '../../../config/env.config';
import { toast } from 'sonner';
import { Save, RefreshCw, Layers, Calendar, Sliders, ShieldCheck, Image } from 'lucide-react';

interface PlanConfig {
  name: string;
  price: number;
  features: string[];
  roti?: number;
  sabziChoices?: number;
}

interface CustomPricingRules {
  basePrice: number;
  pricePerRoti: number;
  pricePerRice: number;
  pricePerSabzi: number;
  raitaPrice3Days: number;
  raitaPriceDaily: number;
  dessertPriceWeekly: number;
  dessertPriceDaily: number;
  saturdaySpecialPrice: number;
  // One-Time Meal Rates & Alignments
  oneTimeBasePrice?: number;
  oneTimeBaseRoti?: number;
  oneTimeBaseSabzi?: number;
  oneTimePricePerRoti?: number;
  oneTimePricePerSabzi?: number;
  oneTimeRaitaPrice?: number;
  oneTimeDessertPrice?: number;
}

interface MenuItem {
  sabziOptions?: string[];
  sabziSet1?: string[];
  sabziSet2?: string[];
  roti: number;
  raita?: boolean;
  raitaType?: string;
  dessert?: boolean;
  isSaturdaySpecial?: boolean;
  specialFoodOptions?: string[];
  dessertOptions?: string[];
}

interface WeeklyMenuConfig {
  monday: MenuItem;
  tuesday: MenuItem;
  wednesday: MenuItem;
  thursday: MenuItem;
  friday: MenuItem;
  saturday: MenuItem;
}

interface CityCategoryConfig {
  name: string;
  cities: string[];
  deliveryFeeSettings: {
    minAmountForFreeDelivery: number;
    deliveryFee: number;
  };
  planPrices: {
    basic: number;
    standard: number;
    premium: number;
    customizableBase: number;
  };
}

interface MenuConfig {
  plans: Record<string, PlanConfig>;
  customPricingConfig: CustomPricingRules;
  weeklyMenus: {
    basic: WeeklyMenuConfig;
    standard: WeeklyMenuConfig;
    premium: WeeklyMenuConfig;
  };
  menuImages?: {
    vancouver: string;
    others: string;
  };
  deliveryFeeSettings?: {
    minAmountForFreeDelivery: number;
    deliveryFee: number;
  };
  cityCategories?: Record<string, CityCategoryConfig>;
}

const AdminMenu: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<MenuConfig | null>(null);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'pricing' | 'menu' | 'images' | 'cities'>('pricing');
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard' | 'premium'>('standard');
  const [selectedDay, setSelectedDay] = useState<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'>('monday');

  const [uploadingVancouver, setUploadingVancouver] = useState(false);
  const [uploadingOthers, setUploadingOthers] = useState(false);

  const days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[] = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];

  const handleImageUpload = async (file: File, type: 'vancouver' | 'others') => {
    const isVancouver = type === 'vancouver';
    if (isVancouver) setUploadingVancouver(true);
    else setUploadingOthers(true);

    try {
      const token = await user?.getIdToken();
      const formData = new FormData();
      formData.append('image', file);

      const res = await axios.post(`${ENV.API_URL}/admin/menu/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.success && res.data.data.url) {
        const downloadUrl = res.data.data.url;
        setConfig(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            menuImages: {
              vancouver: prev.menuImages?.vancouver || '',
              others: prev.menuImages?.others || '',
              [type]: downloadUrl
            }
          };
        });
        toast.success("Image uploaded to Cloudinary successfully! Remember to save changes.");
      } else {
        toast.error("Upload failed. Invalid response from server.");
      }
    } catch (error: any) {
      console.error("Error setting up upload:", error);
      const errMsg = error.response?.data?.message || error.message;
      toast.error(`Upload failed: ${errMsg}`);
    } finally {
      if (isVancouver) setUploadingVancouver(false);
      else setUploadingOthers(false);
    }
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      const res = await axios.get(`${ENV.API_URL}/admin/menu/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setConfig(res.data.data);
      }
    } catch (error) {
      console.error("Failed to load admin menu configuration:", error);
      toast.error("Failed to load menu configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [user]);

  const handleSaveConfig = async (updatedConfig: MenuConfig) => {
    try {
      setSaving(true);
      const token = await user?.getIdToken();
      const res = await axios.put(`${ENV.API_URL}/admin/menu/config`, updatedConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setConfig(res.data.data);
        toast.success("Menu configuration successfully updated in Firestore!");
      }
    } catch (error) {
      console.error("Failed to save configuration:", error);
      toast.error("Failed to save configuration. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // State update handlers
  const updatePlanFeaturesArray = (planKey: string, newFeatures: string[]) => {
    if (!config) return;
    const updated = { ...config };
    updated.plans[planKey].features = newFeatures;
    setConfig(updated);
  };

  const updatePricingRule = (key: keyof CustomPricingRules, value: number) => {
    if (!config) return;
    const updated = { ...config };
    if (!updated.customPricingConfig) {
      updated.customPricingConfig = {
        basePrice: 100,
        pricePerRoti: 5,
        pricePerRice: 10,
        pricePerSabzi: 20,
        raitaPrice3Days: 10,
        raitaPriceDaily: 20,
        dessertPriceWeekly: 10,
        dessertPriceDaily: 30,
        saturdaySpecialPrice: 15,
        oneTimeBasePrice: 13,
        oneTimeBaseRoti: 8,
        oneTimeBaseSabzi: 2,
        oneTimePricePerRoti: 0.60,
        oneTimePricePerSabzi: 3.00,
        oneTimeRaitaPrice: 2.00,
        oneTimeDessertPrice: 3.00
      };
    }
    updated.customPricingConfig[key] = value;
    setConfig(updated);
  };

  const updateDeliverySetting = (key: 'minAmountForFreeDelivery' | 'deliveryFee', value: number) => {
    if (!config) return;
    const updated = { ...config };
    if (!updated.deliveryFeeSettings) {
      updated.deliveryFeeSettings = { minAmountForFreeDelivery: 150, deliveryFee: 15 };
    }
    updated.deliveryFeeSettings[key] = value;
    setConfig(updated);
  };

  const updateCityCategorySetting = (
    categoryKey: string,
    field: 'name' | 'cities' | 'minAmountForFreeDelivery' | 'deliveryFee' | 'basic' | 'standard' | 'premium' | 'customizableBase',
    value: any
  ) => {
    if (!config) return;
    const updated = { ...config };
    if (!updated.cityCategories) {
      updated.cityCategories = {};
    }
    if (!updated.cityCategories[categoryKey]) {
      updated.cityCategories[categoryKey] = {
        name: categoryKey === 'local' ? 'Local Cities' : 'Far Cities',
        cities: [],
        deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
        planPrices: { basic: 150, standard: 190, premium: 220, customizableBase: 100 }
      };
    }

    const cat = updated.cityCategories[categoryKey];
    if (field === 'name') {
      cat.name = value;
    } else if (field === 'cities') {
      cat.cities = value;
    } else if (field === 'minAmountForFreeDelivery' || field === 'deliveryFee') {
      cat.deliveryFeeSettings[field] = Number(value) || 0;
    } else {
      cat.planPrices[field] = Number(value) || 0;
    }
    setConfig(updated);
  };

  const updateMenuField = (field: keyof MenuItem, value: any) => {
    if (!config) return;
    const updated = { ...config };
    const targetMenu = updated.weeklyMenus[selectedPlan][selectedDay];
    
    // Set field value directly
    (targetMenu as any)[field] = value;
    setConfig(updated);
  };

  const updateMenuArrayDirect = (field: keyof MenuItem, newArray: string[]) => {
    if (!config) return;
    const updated = { ...config };
    const targetMenu = updated.weeklyMenus[selectedPlan][selectedDay];
    
    (targetMenu as any)[field] = newArray;
    setConfig(updated);
  };

  const renderArrayFieldManager = (label: string, field: keyof MenuItem, options: string[], placeholder: string = "Option") => {
    const list = options || [];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">{label}</label>
          <span className="text-[10px] text-slate-400 font-bold">{list.length} Items</span>
        </div>
        <div className="space-y-2">
          {list.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center group">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newArr = [...list];
                  newArr[idx] = e.target.value;
                  updateMenuArrayDirect(field, newArr);
                }}
                className="px-3.5 py-2 text-xs font-semibold w-full border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                placeholder={`${placeholder} #${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => {
                  const newArr = list.filter((_, i) => i !== idx);
                  updateMenuArrayDirect(field, newArr);
                }}
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0 opacity-70 sm:opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Remove option"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            const newArr = [...list, ""];
            updateMenuArrayDirect(field, newArr);
          }}
          className="text-xs text-primary font-bold hover:text-primary-hover flex items-center gap-1 mt-1 transition"
        >
          + Add Option
        </button>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-text-secondary font-medium">Loading administrative settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-gray-200">
        <p className="text-red-500 font-bold">Failed to load configuration. Click below to retry.</p>
        <button onClick={fetchConfig} className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-bold">
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-[1600px] mx-auto pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sliders className="text-primary shrink-0" />
            <span>Menu &amp; Plans Dashboard</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Configure prices, customization rules, weekly meals, and pricing engines.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchConfig}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 font-bold text-xs sm:text-sm transition text-slate-700 shadow-sm"
          >
            <RefreshCw size={15} />
            <span>Reset Changes</span>
          </button>
          <button
            onClick={() => handleSaveConfig(config)}
            disabled={saving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white hover:bg-primary-hover rounded-xl font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 md:gap-6 overflow-x-auto no-scrollbar scroll-smooth pb-0.5 -mx-1 px-1">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`pb-3.5 sm:pb-4 px-2 sm:px-3 font-bold text-xs sm:text-sm md:text-base transition relative shrink-0 flex items-center gap-2 ${
            activeTab === 'pricing' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Layers size={18} className="shrink-0" />
          <span>Subscription Tiers &amp; Features</span>
          {activeTab === 'pricing' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-3.5 sm:pb-4 px-2 sm:px-3 font-bold text-xs sm:text-sm md:text-base transition relative shrink-0 flex items-center gap-2 ${
            activeTab === 'menu' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar size={18} className="shrink-0" />
          <span>Weekly Menu Planner</span>
          {activeTab === 'menu' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`pb-3.5 sm:pb-4 px-2 sm:px-3 font-bold text-xs sm:text-sm md:text-base transition relative shrink-0 flex items-center gap-2 ${
            activeTab === 'images' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Image size={18} className="shrink-0" />
          <span>Menu Sheets (Images)</span>
          {activeTab === 'images' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('cities')}
          className={`pb-3.5 sm:pb-4 px-2 sm:px-3 font-bold text-xs sm:text-sm md:text-base transition relative shrink-0 flex items-center gap-2 ${
            activeTab === 'cities' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sliders size={18} className="shrink-0" />
          <span>City Pricing &amp; Delivery</span>
          {activeTab === 'cities' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"></div>}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'pricing' ? (
        <div className="space-y-6">
          {/* Base Plan Features Manager */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="text-primary shrink-0" />
                  <span>Subscription Tiers &amp; Features</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Configure customer-facing feature bullet points for standard and customizable plan tiers. Plan pricing is managed per city category in the &quot;City Pricing &amp; Delivery&quot; tab.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('cities')}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl transition flex items-center gap-2 w-fit shrink-0 self-start md:self-auto"
              >
                <Sliders size={14} />
                <span>Manage City Pricing &amp; Delivery →</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-5 lg:gap-6">
              {['basic', 'standard', 'premium', 'customizable'].map((planKey) => {
                const plan = config.plans[planKey];
                if (!plan) return null;
                const isCustomizable = planKey === 'customizable';
                
                return (
                  <div 
                    key={planKey} 
                    className={`p-5 sm:p-6 rounded-3xl space-y-5 transition-all duration-300 border-2 hover:shadow-lg flex flex-col justify-between ${
                      planKey === 'premium' ? 'bg-gradient-to-br from-purple-50/50 via-indigo-50/10 to-slate-50/30 border-purple-200 shadow-sm shadow-purple-100/30 hover:border-purple-300' :
                      planKey === 'standard' ? 'bg-gradient-to-br from-blue-50/40 via-indigo-50/10 to-slate-50/30 border-blue-200 shadow-sm shadow-blue-100/30 hover:border-blue-300' :
                      planKey === 'customizable' ? 'bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-yellow-50/30 border-amber-300 shadow-md shadow-amber-100/60 hover:border-amber-400' :
                      'bg-gradient-to-br from-emerald-50/40 via-teal-50/10 to-slate-50/30 border-emerald-200 shadow-sm shadow-emerald-100/30 hover:border-emerald-300'
                    }`}
                  >
                    <div className="space-y-5">
                      {/* Plan Header */}
                      <div className={`flex flex-col xs:flex-row xs:items-center justify-between gap-3 border-b pb-4 ${
                        planKey === 'premium' ? 'border-purple-100' :
                        planKey === 'standard' ? 'border-blue-100' :
                        planKey === 'customizable' ? 'border-amber-200' :
                        'border-emerald-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                            planKey === 'premium' ? 'bg-purple-100 text-purple-700' :
                            planKey === 'standard' ? 'bg-blue-100 text-blue-700' : 
                            planKey === 'customizable' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-200' : 'bg-green-100 text-green-700'
                          }`}>
                            {isCustomizable ? '★' : planKey.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-extrabold text-slate-800 capitalize text-sm sm:text-base">
                                {isCustomizable ? 'Highly Flexible' : `${planKey} Plan`}
                              </h3>
                              {planKey === 'premium' && (
                                <span className="bg-purple-100 border border-purple-200 text-purple-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                  Top Tier
                                </span>
                              )}
                              {planKey === 'standard' && (
                                <span className="bg-blue-100 border border-blue-200 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                  Most Popular
                                </span>
                              )}
                              {planKey === 'basic' && (
                                <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                  Essential
                                </span>
                              )}
                              {isCustomizable && (
                                <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                                  Custom Builder
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                              {isCustomizable ? 'Build Your Own Plan' : 'Features visible on customer cards'}
                            </p>
                          </div>
                        </div>

                        {/* City Pricing Badge Indicator */}
                        <span className="text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-xl bg-white/80 border border-slate-200 text-slate-600 shrink-0 self-start xs:self-auto">
                          📍 Price in City Config
                        </span>
                      </div>

                      {/* Plan Features */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Features list</label>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            planKey === 'premium' ? 'bg-purple-100 text-purple-700' :
                            planKey === 'standard' ? 'bg-blue-100 text-blue-700' :
                            planKey === 'customizable' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {plan.features.length} Items
                          </span>
                        </div>
                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className="flex gap-2 items-center group">
                              <span className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                planKey === 'premium' ? 'bg-purple-100 text-purple-700' :
                                planKey === 'standard' ? 'bg-blue-100 text-blue-700' :
                                planKey === 'customizable' ? 'bg-amber-200/60 text-amber-800' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => {
                                  const newFeatures = [...plan.features];
                                  newFeatures[idx] = e.target.value;
                                  updatePlanFeaturesArray(planKey, newFeatures);
                                }}
                                className={`px-3 py-2 text-xs font-semibold w-full border rounded-xl focus:outline-none focus:ring-2 bg-white transition-all duration-200 ${
                                  planKey === 'premium' ? 'border-purple-200 focus:ring-purple-500/20 focus:border-purple-400' :
                                  planKey === 'standard' ? 'border-blue-200 focus:ring-blue-500/20 focus:border-blue-400' :
                                  planKey === 'customizable' ? 'border-amber-200 focus:ring-amber-500/20 focus:border-amber-400' :
                                  'border-emerald-200 focus:ring-emerald-500/20 focus:border-emerald-400'
                                }`}
                                placeholder={isCustomizable ? `Custom feature #${idx + 1}` : `e.g. ${idx === 0 ? '4 Tawa Roti' : idx === 1 ? '1 Sabzi' : 'Fresh ingredients'}`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newFeatures = plan.features.filter((_, i) => i !== idx);
                                  updatePlanFeaturesArray(planKey, newFeatures);
                                }}
                                className={`p-1.5 rounded-lg transition shrink-0 opacity-70 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                                  planKey === 'premium' ? 'text-purple-500 hover:text-red-600 hover:bg-purple-100/50' :
                                  planKey === 'standard' ? 'text-blue-500 hover:text-red-600 hover:bg-blue-100/50' :
                                  planKey === 'customizable' ? 'text-amber-500 hover:text-red-600 hover:bg-amber-100/50' :
                                  'text-emerald-500 hover:text-red-600 hover:bg-emerald-100/50'
                                }`}
                                title="Remove feature"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newFeatures = [...plan.features, ""];
                        updatePlanFeaturesArray(planKey, newFeatures);
                      }}
                      className={`text-xs font-bold flex items-center gap-1 mt-3 pt-2 border-t border-dashed transition ${
                        planKey === 'premium' ? 'border-purple-200 text-purple-700 hover:text-purple-900' :
                        planKey === 'standard' ? 'border-blue-200 text-blue-700 hover:text-blue-900' :
                        planKey === 'customizable' ? 'border-amber-200 text-amber-700 hover:text-amber-900' :
                        'border-emerald-200 text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      + Add Feature Field
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeTab === 'menu' ? (
        <div className="space-y-6">
          {/* Top Control Bar: Plan & Day Pickers */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-6 shadow-sm">
            {/* Plan Selector */}
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Subscription Tier</label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {(['basic', 'standard', 'premium'] as const).map((tier) => {
                  const isActive = selectedPlan === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => setSelectedPlan(tier)}
                      className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 rounded-2xl font-black text-xs capitalize transition duration-150 flex items-center justify-center gap-2 border ${
                        isActive
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        tier === 'premium' ? 'bg-purple-500' :
                        tier === 'standard' ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <span>{tier} Plan Menu</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day Selector */}
            <div className="space-y-2.5 border-t border-slate-100 pt-5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Weekday</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
                {days.map((day) => {
                  const isActive = selectedDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-2xl font-extrabold capitalize text-xs transition duration-150 text-center border truncate ${
                        isActive
                          ? 'bg-primary border-primary text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200/70 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Editing Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 shadow-sm">
            {/* Header */}
            <div className="border-b border-slate-150 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 capitalize flex items-center gap-2">
                  <Calendar className="text-primary shrink-0" />
                  <span>{selectedPlan} Plan: {selectedDay}'s Menu Setup</span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">Configure dishes, roti sizes, desserts, and sides served to customers on this day.</p>
              </div>
              <div className="self-start sm:self-auto bg-slate-900 text-white px-3.5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider capitalize">
                {selectedDay} Config
              </div>
            </div>

            {/* Saturday Specials for Premium */}
            {selectedDay === 'saturday' && selectedPlan === 'premium' ? (
              <div className="space-y-6">
                <div className="p-4 sm:p-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 rounded-3xl flex flex-col sm:flex-row gap-4 justify-between sm:items-center shadow-sm">
                  <div>
                    <h4 className="font-extrabold text-orange-950 text-sm sm:text-base">Saturday Chef's Special Toggle</h4>
                    <p className="text-xs text-orange-850 mt-0.5">When active, subscribers select a single premium dish and weekend dessert instead of standard weekly meals.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!config.weeklyMenus.premium.saturday.isSaturdaySpecial}
                      onChange={(e) => updateMenuField('isSaturdaySpecial', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {config.weeklyMenus.premium.saturday.isSaturdaySpecial && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                      {renderArrayFieldManager('Special Dishes Options', 'specialFoodOptions', config.weeklyMenus.premium.saturday.specialFoodOptions || [], 'Special Dish')}
                    </div>
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                      {renderArrayFieldManager('Special Weekend Desserts', 'dessertOptions', config.weeklyMenus.premium.saturday.dessertOptions || [], 'Dessert')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Regular Day configuration */
              <div className="space-y-6">
                {selectedPlan === 'basic' ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                    {renderArrayFieldManager('Sabzi Options List', 'sabziOptions', config.weeklyMenus.basic[selectedDay].sabziOptions || [], 'Sabzi')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                      {renderArrayFieldManager('Sabzi Set 1 Options', 'sabziSet1', config.weeklyMenus[selectedPlan][selectedDay].sabziSet1 || [], 'Sabzi')}
                    </div>
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                      {renderArrayFieldManager('Sabzi Set 2 Options', 'sabziSet2', config.weeklyMenus[selectedPlan][selectedDay].sabziSet2 || [], 'Sabzi')}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-6 border-t border-slate-100 items-end">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Default Roti Count</label>
                    <input
                      type="number"
                      value={config.weeklyMenus[selectedPlan][selectedDay].roti}
                      onChange={(e) => updateMenuField('roti', Number(e.target.value))}
                      className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none bg-white"
                    />
                  </div>

                  {selectedPlan === 'premium' ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Daily Raita Selection</label>
                      <input
                        type="text"
                        value={config.weeklyMenus.premium[selectedDay].raitaType || ''}
                        onChange={(e) => updateMenuField('raitaType', e.target.value)}
                        className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none bg-white"
                        placeholder="Boondi Raita, Kheera Raita"
                      />
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer select-none">
                      <label htmlFor="raita-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">Include Raita Side</label>
                      <input
                        type="checkbox"
                        id="raita-checkbox"
                        checked={!!config.weeklyMenus[selectedPlan][selectedDay].raita}
                        onChange={(e) => updateMenuField('raita', e.target.checked)}
                        className="h-5 w-5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer"
                      />
                    </div>
                  )}

                  {selectedPlan === 'premium' && selectedDay === 'wednesday' && (
                    <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer select-none">
                      <label htmlFor="dessert-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">Include Wednesday Dessert</label>
                      <input
                        type="checkbox"
                        id="dessert-checkbox"
                        checked={!!config.weeklyMenus.premium[selectedDay].dessert}
                        onChange={(e) => updateMenuField('dessert', e.target.checked)}
                        className="h-5 w-5 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'images' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Image className="text-primary shrink-0" />
                <span>Weekly Menu Sheets Manager</span>
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Upload or paste image URLs for the menu sheets shown to users. They will be displayed on the public Menu page based on their city.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Vancouver & Area */}
              <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-5">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                  <h3 className="font-extrabold text-slate-800 text-sm">Vancouver &amp; Lower Mainland</h3>
                  <span className="text-[10px] bg-red-100 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase w-fit">
                    Vancouver, Burnaby, Richmond, etc.
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Preview */}
                  <div className="aspect-[4/3] bg-white border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center relative group shadow-sm">
                    {config.menuImages?.vancouver ? (
                      <img
                        src={config.menuImages.vancouver}
                        alt="Vancouver Menu Preview"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs font-semibold">No Image Uploaded</span>
                    )}
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Upload Image File</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'vancouver');
                        }}
                        className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer cursor-pointer w-full sm:w-auto"
                        disabled={uploadingVancouver}
                      />
                      {uploadingVancouver && (
                        <span className="text-xs text-primary font-bold animate-pulse">Uploading...</span>
                      )}
                    </div>
                  </div>

                  {/* Direct URL Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Or Paste Image URL</label>
                    <input
                      type="text"
                      value={config.menuImages?.vancouver || ''}
                      onChange={(e) => {
                        setConfig(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            menuImages: {
                              vancouver: e.target.value,
                              others: prev.menuImages?.others || ''
                            }
                          };
                        });
                      }}
                      className="px-3.5 py-2.5 text-xs font-semibold w-full border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      placeholder="https://example.com/menu-vancouver.jpg"
                    />
                  </div>
                </div>
              </div>

              {/* Other Cities */}
              <div className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-5">
                <div className="flex flex-col xs:flex-row xs:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                  <h3 className="font-extrabold text-slate-800 text-sm">Remaining Canadian Cities</h3>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold uppercase w-fit">
                    All other cities
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Preview */}
                  <div className="aspect-[4/3] bg-white border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center relative group shadow-sm">
                    {config.menuImages?.others ? (
                      <img
                        src={config.menuImages.others}
                        alt="Others Menu Preview"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs font-semibold">No Image Uploaded</span>
                    )}
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Upload Image File</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'others');
                        }}
                        className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer cursor-pointer w-full sm:w-auto"
                        disabled={uploadingOthers}
                      />
                      {uploadingOthers && (
                        <span className="text-xs text-primary font-bold animate-pulse">Uploading...</span>
                      )}
                    </div>
                  </div>

                  {/* Direct URL Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Or Paste Image URL</label>
                    <input
                      type="text"
                      value={config.menuImages?.others || ''}
                      onChange={(e) => {
                        setConfig(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            menuImages: {
                              vancouver: prev.menuImages?.vancouver || '',
                              others: e.target.value
                            }
                          };
                        });
                      }}
                      className="px-3.5 py-2.5 text-xs font-semibold w-full border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      placeholder="https://example.com/menu-others.jpg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* City Pricing & Delivery Config Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Sliders className="text-primary shrink-0" />
                <span>City Pricing &amp; Delivery Config</span>
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Configure plan prices, delivery thresholds, and flat delivery fees for different city categories.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {(['local', 'far'] as const).map((catKey) => {
                const category = config.cityCategories?.[catKey] || {
                  name: catKey === 'local' ? 'Local Cities' : 'Far Cities',
                  cities: [],
                  deliveryFeeSettings: { minAmountForFreeDelivery: 150, deliveryFee: 15 },
                  planPrices: { basic: 150, standard: 190, premium: 220, customizableBase: 100 }
                };

                return (
                  <div key={catKey} className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-6">
                    <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="space-y-1 flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category Name</label>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => updateCityCategorySetting(catKey, 'name', e.target.value)}
                          className="font-extrabold text-slate-800 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none transition w-full"
                        />
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shrink-0 self-start sm:self-auto ${
                        catKey === 'local' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {catKey.toUpperCase()} TIER
                      </span>
                    </div>

                    {/* Cities List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">Covered Cities</label>
                        <span className="text-[10px] text-slate-400 font-bold">{category.cities.length} Cities</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-h-[50px] p-3 bg-white border border-slate-200 rounded-2xl max-h-[160px] overflow-y-auto">
                        {category.cities.length === 0 ? (
                          <span className="text-slate-400 text-xs italic font-medium p-1">No cities added. Any address containing city names not in &quot;Local Cities&quot; will default to the &quot;Far Cities&quot; pricing model.</span>
                        ) : (
                          category.cities.map((city, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl">
                              {city}
                              <button
                                type="button"
                                onClick={() => {
                                  const newCities = category.cities.filter((_, i) => i !== idx);
                                  updateCityCategorySetting(catKey, 'cities', newCities);
                                }}
                                className="text-slate-400 hover:text-red-500 font-bold ml-1 transition"
                              >
                                ✕
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      {/* Add City Input */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          id={`new-city-input-${catKey}`}
                          placeholder="e.g. Surrey"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const value = input.value.trim();
                              if (value && !category.cities.includes(value)) {
                                updateCityCategorySetting(catKey, 'cities', [...category.cities, value]);
                                input.value = '';
                              }
                            }
                          }}
                          className="px-3.5 py-2 text-xs font-semibold w-full border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`new-city-input-${catKey}`) as HTMLInputElement | null;
                            const value = input?.value.trim();
                            if (value && !category.cities.includes(value)) {
                              updateCityCategorySetting(catKey, 'cities', [...category.cities, value]);
                              if (input) input.value = '';
                            }
                          }}
                          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition shrink-0"
                        >
                          Add City
                        </button>
                      </div>
                    </div>

                    {/* Delivery settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Min Order for Free Delivery</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            value={category.deliveryFeeSettings?.minAmountForFreeDelivery ?? 150}
                            onChange={(e) => updateCityCategorySetting(catKey, 'minAmountForFreeDelivery', e.target.value)}
                            className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                          />
                          <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Flat Delivery Fee</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            value={category.deliveryFeeSettings?.deliveryFee ?? 15}
                            onChange={(e) => updateCityCategorySetting(catKey, 'deliveryFee', e.target.value)}
                            className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                          />
                          <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing override section */}
                    <div className="space-y-4 pt-4 border-t border-slate-200/60">
                      <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">Subscription Tier Price Overrides</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Basic Plan Price</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                            <input
                              type="number"
                              value={category.planPrices?.basic ?? 150}
                              onChange={(e) => updateCityCategorySetting(catKey, 'basic', e.target.value)}
                              className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            />
                            <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Standard Plan Price</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                            <input
                              type="number"
                              value={category.planPrices?.standard ?? 190}
                              onChange={(e) => updateCityCategorySetting(catKey, 'standard', e.target.value)}
                              className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            />
                            <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Premium Plan Price</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                            <input
                              type="number"
                              value={category.planPrices?.premium ?? 220}
                              onChange={(e) => updateCityCategorySetting(catKey, 'premium', e.target.value)}
                              className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            />
                            <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Customizable Base Price</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                            <input
                              type="number"
                              value={category.planPrices?.customizableBase ?? 100}
                              onChange={(e) => updateCityCategorySetting(catKey, 'customizableBase', e.target.value)}
                              className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                            />
                            <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Plan Pricing Engine & Add-on Rates */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders className="text-primary shrink-0" />
                  <span>Custom Plan Pricing Engine &amp; Add-on Rates</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  Configure live pricing rules, add-on rates, supplement prices, and global fallback delivery settings used to calculate customizable subscriptions &amp; one-time meal orders.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-amber-100 border border-amber-200 text-amber-800 rounded-full w-fit shrink-0">
                ⚡ Live Calculation Engine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
              {/* Card 1: One-Time Meal & Instant Add-on Rates */}
              <div className="p-5 sm:p-6 rounded-3xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white space-y-4 shadow-sm shadow-amber-100/40 hover:border-amber-400 transition-all">
                <div className="flex items-center justify-between border-b border-amber-200/70 pb-3">
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                    <span>🍱</span>
                    <span>One-Time Meal Rates</span>
                  </h4>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 uppercase tracking-wider">
                    Single Order
                  </span>
                </div>
                
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Base Meal Price (Default)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-400 font-extrabold text-xs sm:text-sm">$</span>
                      <input
                        type="number"
                        step="0.5"
                        value={config.customPricingConfig?.oneTimeBasePrice ?? 13}
                        onChange={(e) => updatePricingRule('oneTimeBasePrice', Number(e.target.value))}
                        className="pl-7 pr-12 py-2.5 w-full border border-amber-250 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                      />
                      <span className="absolute right-3 text-slate-400 font-bold text-[10px] uppercase">CAD</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">Included Rotis</label>
                      <input
                        type="number"
                        value={config.customPricingConfig?.oneTimeBaseRoti ?? 8}
                        onChange={(e) => updatePricingRule('oneTimeBaseRoti', Number(e.target.value))}
                        className="px-3 py-2 w-full border border-amber-250 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">Included Sabzis</label>
                      <input
                        type="number"
                        value={config.customPricingConfig?.oneTimeBaseSabzi ?? 2}
                        onChange={(e) => updatePricingRule('oneTimeBaseSabzi', Number(e.target.value))}
                        className="px-3 py-2 w-full border border-amber-250 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-amber-200/50">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">± Rate / Roti</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.1"
                          value={config.customPricingConfig?.oneTimePricePerRoti ?? 0.60}
                          onChange={(e) => updatePricingRule('oneTimePricePerRoti', Number(e.target.value))}
                          className="pl-6 pr-9 py-2 w-full border border-amber-250 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">± Rate / Sabzi</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.5"
                          value={config.customPricingConfig?.oneTimePricePerSabzi ?? 3.00}
                          onChange={(e) => updatePricingRule('oneTimePricePerSabzi', Number(e.target.value))}
                          className="pl-6 pr-9 py-2 w-full border border-amber-250 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-amber-200/50">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">+ Extra Raita</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.5"
                          value={config.customPricingConfig?.oneTimeRaitaPrice ?? 2.00}
                          onChange={(e) => updatePricingRule('oneTimeRaitaPrice', Number(e.target.value))}
                          className="pl-6 pr-9 py-2 w-full border border-amber-250 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">+ Extra Sweet</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          step="0.5"
                          value={config.customPricingConfig?.oneTimeDessertPrice ?? 3.00}
                          onChange={(e) => updatePricingRule('oneTimeDessertPrice', Number(e.target.value))}
                          className="pl-6 pr-9 py-2 w-full border border-amber-250 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Monthly Custom Plan: Core Parameters */}
              <div className="p-5 sm:p-6 rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-indigo-50/15 to-white space-y-4 shadow-sm shadow-blue-100/30 hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between border-b border-blue-200/70 pb-3">
                  <h4 className="text-xs font-black text-blue-950 uppercase tracking-wide border-l-2 border-primary pl-2">
                    Monthly Custom Core
                  </h4>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                    Monthly Plan
                  </span>
                </div>
                
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Base Monthly Price</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-400 font-extrabold text-xs sm:text-sm">$</span>
                      <input
                        type="number"
                        value={config.customPricingConfig?.basePrice ?? 100}
                        onChange={(e) => updatePricingRule('basePrice', Number(e.target.value))}
                        className="pl-7 pr-16 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      />
                      <span className="absolute right-3 text-slate-400 font-bold text-[10px] uppercase">CAD/mo</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">Roti / mo</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          value={config.customPricingConfig?.pricePerRoti ?? 5}
                          onChange={(e) => updatePricingRule('pricePerRoti', Number(e.target.value))}
                          className="pl-6 pr-8 py-2 w-full border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">Rice / mo</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          value={config.customPricingConfig?.pricePerRice ?? 10}
                          onChange={(e) => updatePricingRule('pricePerRice', Number(e.target.value))}
                          className="pl-6 pr-8 py-2 w-full border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">Sabzi / mo</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          value={config.customPricingConfig?.pricePerSabzi ?? 20}
                          onChange={(e) => updatePricingRule('pricePerSabzi', Number(e.target.value))}
                          className="pl-6 pr-8 py-2 w-full border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic pt-1">
                    Base components multiplied across monthly weekday delivery cycles.
                  </p>
                </div>
              </div>

              {/* Card 3: Monthly Custom Plan: Supplements */}
              <div className="p-5 sm:p-6 rounded-3xl border border-purple-200/80 bg-gradient-to-br from-purple-50/40 via-violet-50/15 to-white space-y-4 shadow-sm shadow-purple-100/30 hover:border-purple-300 transition-all">
                <div className="flex items-center justify-between border-b border-purple-200/70 pb-3">
                  <h4 className="text-xs font-black text-purple-950 uppercase tracking-wide border-l-2 border-primary pl-2">
                    Monthly Supplements
                  </h4>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider">
                    Add-on Rates
                  </span>
                </div>
                
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">Raita (3 Days)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          value={config.customPricingConfig?.raitaPrice3Days ?? 10}
                          onChange={(e) => updatePricingRule('raitaPrice3Days', Number(e.target.value))}
                          className="pl-6 pr-9 py-2 w-full border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">Raita (Daily)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          value={config.customPricingConfig?.raitaPriceDaily ?? 20}
                          onChange={(e) => updatePricingRule('raitaPriceDaily', Number(e.target.value))}
                          className="pl-6 pr-9 py-2 w-full border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-purple-200/50">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">Wed Dessert</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          value={config.customPricingConfig?.dessertPriceWeekly ?? 10}
                          onChange={(e) => updatePricingRule('dessertPriceWeekly', Number(e.target.value))}
                          className="pl-6 pr-9 py-2 w-full border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 truncate">Sat Special</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          value={config.customPricingConfig?.saturdaySpecialPrice ?? 15}
                          onChange={(e) => updatePricingRule('saturdaySpecialPrice', Number(e.target.value))}
                          className="pl-6 pr-9 py-2 w-full border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        />
                        <span className="absolute right-2 text-slate-400 font-bold text-[8px] uppercase">CAD</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic pt-1">
                    Monthly add-on costs calculated on custom subscriber checkouts.
                  </p>
                </div>
              </div>

              {/* Card 4: Global Delivery Fee Settings */}
              <div className="p-5 sm:p-6 rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-teal-50/15 to-white space-y-4 shadow-sm shadow-emerald-100/30 hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between border-b border-emerald-200/70 pb-3">
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide border-l-2 border-primary pl-2">
                    Global Delivery Defaults
                  </h4>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                    Fallback
                  </span>
                </div>
                
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Free Delivery Threshold</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-400 font-bold text-xs sm:text-sm">$</span>
                      <input
                        type="number"
                        value={config.deliveryFeeSettings?.minAmountForFreeDelivery ?? 150}
                        onChange={(e) => updateDeliverySetting('minAmountForFreeDelivery', Number(e.target.value))}
                        className="pl-7 pr-12 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      />
                      <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Flat Delivery Fee</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-slate-400 font-bold text-xs sm:text-sm">$</span>
                      <input
                        type="number"
                        value={config.deliveryFeeSettings?.deliveryFee ?? 15}
                        onChange={(e) => updateDeliverySetting('deliveryFee', Number(e.target.value))}
                        className="pl-7 pr-12 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                      />
                      <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic pt-1">
                    Applied globally when an address does not match a specific city configuration tier.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer Info Box */}
      <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 text-white flex flex-col sm:flex-row gap-4 items-start sm:items-center shadow-lg">
        <ShieldCheck className="text-primary shrink-0" size={32} />
        <div>
          <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-300">Secured Control Panel</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Updating the menu configurations saves immediately to the database and propagates instantly to the customer's subscription dashboard and payment calculation engine.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminMenu;

