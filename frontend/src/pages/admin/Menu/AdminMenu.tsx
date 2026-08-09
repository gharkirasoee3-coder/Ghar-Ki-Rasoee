import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { ENV } from '../../../config/env.config';
import { toast } from 'sonner';
import { Save, RefreshCw, Layers, Calendar, DollarSign, Sliders, ShieldCheck, Image } from 'lucide-react';

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
  pricePerSabzi: number;
  raitaPrice3Days: number;
  raitaPriceDaily: number;
  dessertPriceWeekly: number;
  dessertPriceDaily: number;
  saturdaySpecialPrice: number;
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
}

const AdminMenu: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<MenuConfig | null>(null);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'pricing' | 'menu' | 'images'>('pricing');
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
  const updatePlanPrice = (planKey: string, price: number) => {
    if (!config) return;
    const updated = { ...config };
    updated.plans[planKey].price = price;
    setConfig(updated);
  };

  const updatePlanFeaturesArray = (planKey: string, newFeatures: string[]) => {
    if (!config) return;
    const updated = { ...config };
    updated.plans[planKey].features = newFeatures;
    setConfig(updated);
  };

  const updatePricingRule = (key: keyof CustomPricingRules, value: number) => {
    if (!config) return;
    const updated = { ...config };
    updated.customPricingConfig[key] = value;
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
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-555 flex items-center justify-center shrink-0">
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
                className="text-slate-400 hover:text-red-650 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="text-primary" />
            Menu & Plans Dashboard
          </h1>
          <p className="text-slate-500 text-sm">Configure prices, customization rules, and weekly meals.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchConfig}
            className="flex items-center gap-2 px-5 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-sm transition"
          >
            <RefreshCw size={16} />
            Reset Changes
          </button>
          <button
            onClick={() => handleSaveConfig(config)}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white hover:bg-primary-hover rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`pb-4 px-2 font-bold text-base transition relative ${
            activeTab === 'pricing' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <DollarSign size={18} />
            Plan Pricing & Customization Rules
          </span>
          {activeTab === 'pricing' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-4 px-2 font-bold text-base transition relative ${
            activeTab === 'menu' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Calendar size={18} />
            Weekly Menu Planner
          </span>
          {activeTab === 'menu' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`pb-4 px-2 font-bold text-base transition relative ${
            activeTab === 'images' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Image size={18} />
            Menu Sheets (Images)
          </span>
          {activeTab === 'images' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full"></div>}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'pricing' ? (
        <div className="grid md:grid-cols-12 gap-8 items-start">
          {/* Base Plan Pricing */}
          <div className="md:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 space-y-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="text-primary" />
                  Subscription Tiers Manager
                </h2>
                <p className="text-slate-500 text-xs mt-1">Configure base prices and customer-facing features for standard plan tiers.</p>
              </div>

              <div className="space-y-8">
                {['basic', 'standard', 'premium', 'customizable'].map((planKey) => {
                  const plan = config.plans[planKey];
                  if (!plan) return null;
                  const isCustomizable = planKey === 'customizable';
                  
                  return (
                    <div 
                      key={planKey} 
                      className={`p-6 rounded-3xl space-y-5 transition-all duration-300 border-2 hover:shadow-lg ${
                        planKey === 'premium' ? 'bg-gradient-to-br from-purple-50/50 via-indigo-50/10 to-slate-50/30 border-purple-205 shadow-sm shadow-purple-100/30 hover:border-purple-350' :
                        planKey === 'standard' ? 'bg-gradient-to-br from-blue-50/40 via-indigo-50/10 to-slate-50/30 border-blue-205 shadow-sm shadow-blue-100/30 hover:border-blue-350' :
                        planKey === 'customizable' ? 'bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-yellow-50/30 border-amber-300 shadow-md shadow-amber-100/60 hover:border-amber-400' :
                        'bg-gradient-to-br from-emerald-50/40 via-teal-50/10 to-slate-50/30 border-emerald-205 shadow-sm shadow-emerald-100/30 hover:border-emerald-350'
                      }`}
                    >
                      {/* Plan Header */}
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
                        planKey === 'premium' ? 'border-purple-100' :
                        planKey === 'standard' ? 'border-blue-100' :
                        planKey === 'customizable' ? 'border-amber-200' :
                        'border-emerald-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            planKey === 'premium' ? 'bg-purple-100 text-purple-700' :
                            planKey === 'standard' ? 'bg-blue-100 text-blue-700' : 
                            planKey === 'customizable' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-250' : 'bg-green-100 text-green-700'
                          }`}>
                            {isCustomizable ? '★' : planKey.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-extrabold text-slate-800 capitalize text-sm">
                                {isCustomizable ? 'Highly Flexible' : `${planKey} Plan`}
                              </h3>
                              {planKey === 'premium' && (
                                <span className="bg-purple-100 border border-purple-200 text-purple-750 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                  Top Tier
                                </span>
                              )}
                              {planKey === 'standard' && (
                                <span className="bg-blue-100 border border-blue-200 text-blue-750 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                  Most Popular
                                </span>
                              )}
                              {planKey === 'basic' && (
                                <span className="bg-emerald-105 border border-emerald-200 text-emerald-750 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                  Essential
                                </span>
                              )}
                              {isCustomizable && (
                                <span className="bg-amber-100 border border-amber-250 text-amber-850 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                                  Custom Builder
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-450 font-semibold">
                              {isCustomizable ? 'Build Your Own Plan (Base customizable price)' : 'Define price and features visible to users'}
                            </p>
                          </div>
                        </div>

                        {/* Price Input with Prefix/Suffix */}
                        <div className="w-full sm:w-44 space-y-1">
                          <label className="block text-[10px] font-black text-slate-455 uppercase tracking-wider">
                            {isCustomizable ? 'Base Setup Price' : 'Base Price'}
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3.5 text-slate-400 font-extrabold text-sm">$</span>
                            <input
                              type="number"
                              value={plan.price}
                              onChange={(e) => updatePlanPrice(planKey, Number(e.target.value))}
                              className={`pl-7 pr-12 py-2 w-full border rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 bg-white transition-all duration-200 ${
                                planKey === 'premium' ? 'border-purple-200 focus:ring-purple-500/20 focus:border-purple-400' :
                                planKey === 'standard' ? 'border-blue-200 focus:ring-blue-500/20 focus:border-blue-400' :
                                planKey === 'customizable' ? 'border-amber-250 focus:ring-amber-500/20 focus:border-amber-400' :
                                'border-emerald-200 focus:ring-emerald-500/20 focus:border-emerald-400'
                              }`}
                            />
                            <span className="absolute right-3 text-slate-400 font-bold text-[10px] uppercase">CAD</span>
                          </div>
                        </div>
                      </div>

                      {/* Plan Features */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Features list</label>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            planKey === 'premium' ? 'bg-purple-100 text-purple-750' :
                            planKey === 'standard' ? 'bg-blue-100 text-blue-755' :
                            planKey === 'customizable' ? 'bg-amber-100 text-amber-850' :
                            'bg-emerald-100 text-emerald-755'
                          }`}>
                            {plan.features.length} Items
                          </span>
                        </div>
                        <div className="space-y-2">
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className="flex gap-2.5 items-center group">
                              <span className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                planKey === 'premium' ? 'bg-purple-100 text-purple-700' :
                                planKey === 'standard' ? 'bg-blue-100 text-blue-700' :
                                planKey === 'customizable' ? 'bg-amber-200/60 text-amber-850' :
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
                                className={`px-3.5 py-2.5 text-xs font-semibold w-full border rounded-xl focus:outline-none focus:ring-2 bg-white transition-all duration-200 ${
                                  planKey === 'premium' ? 'border-purple-250 focus:ring-purple-500/20 focus:border-purple-400' :
                                  planKey === 'standard' ? 'border-blue-250 focus:ring-blue-500/20 focus:border-blue-400' :
                                  planKey === 'customizable' ? 'border-amber-250 focus:ring-amber-500/20 focus:border-amber-400' :
                                  'border-emerald-250 focus:ring-emerald-500/20 focus:border-emerald-400'
                                }`}
                                placeholder={isCustomizable ? `Custom feature #${idx + 1}` : `e.g. ${idx === 0 ? '4 Tawa Roti' : idx === 1 ? '1 Sabzi' : 'Fresh ingredients'}`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newFeatures = plan.features.filter((_, i) => i !== idx);
                                  updatePlanFeaturesArray(planKey, newFeatures);
                                }}
                                className={`p-1.5 rounded-lg transition shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                                  planKey === 'premium' ? 'text-purple-500 hover:text-red-650 hover:bg-purple-100/50' :
                                  planKey === 'standard' ? 'text-blue-500 hover:text-red-650 hover:bg-blue-100/50' :
                                  planKey === 'customizable' ? 'text-amber-500 hover:text-red-650 hover:bg-amber-100/50' :
                                  'text-emerald-500 hover:text-red-650 hover:bg-emerald-100/50'
                                }`}
                                title="Remove feature"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newFeatures = [...plan.features, ""];
                            updatePlanFeaturesArray(planKey, newFeatures);
                          }}
                          className={`text-xs font-bold flex items-center gap-1 mt-1 transition ${
                            planKey === 'premium' ? 'text-purple-700 hover:text-purple-855' :
                            planKey === 'standard' ? 'text-blue-700 hover:text-blue-855' :
                            planKey === 'customizable' ? 'text-amber-700 hover:text-amber-855' :
                            'text-emerald-700 hover:text-emerald-855'
                          }`}
                        >
                          + Add Feature Field
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Customization Rules */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 space-y-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Sliders className="text-primary" />
                  Custom Plan Pricing Engine
                </h2>
                <p className="text-slate-500 text-xs mt-1">Configure live pricing rules and add-on rates used to calculate customizable subscriptions.</p>
              </div>

              <div className="space-y-6">
                {/* Core pricing parameters */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l-2 border-primary pl-2">Core Pricing Parameters</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Base Customizable Price</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-slate-450 font-extrabold text-sm">$</span>
                        <input
                          type="number"
                          value={config.customPricingConfig.basePrice}
                          onChange={(e) => updatePricingRule('basePrice', Number(e.target.value))}
                          className="pl-7 pr-12 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="absolute right-3.5 text-slate-450 font-bold text-[10px] uppercase">CAD/mo</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Rate Per Roti</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            value={config.customPricingConfig.pricePerRoti}
                            onChange={(e) => updatePricingRule('pricePerRoti', Number(e.target.value))}
                            className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Rate Per Sabzi</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            value={config.customPricingConfig.pricePerSabzi}
                            onChange={(e) => updatePricingRule('pricePerSabzi', Number(e.target.value))}
                            className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supplement Rates */}
                <div className="space-y-3.5 border-t border-slate-100 pt-5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-l-2 border-primary pl-2">Supplement Rates</h4>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Raita (3 Days/Wk)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            value={config.customPricingConfig.raitaPrice3Days}
                            onChange={(e) => updatePricingRule('raitaPrice3Days', Number(e.target.value))}
                            className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Raita (Daily)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            value={config.customPricingConfig.raitaPriceDaily}
                            onChange={(e) => updatePricingRule('raitaPriceDaily', Number(e.target.value))}
                            className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Dessert (Weekly)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            value={config.customPricingConfig.dessertPriceWeekly}
                            onChange={(e) => updatePricingRule('dessertPriceWeekly', Number(e.target.value))}
                            className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Dessert (Daily)</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-slate-400 font-bold text-sm">$</span>
                          <input
                            type="number"
                            value={config.customPricingConfig.dessertPriceDaily}
                            onChange={(e) => updatePricingRule('dessertPriceDaily', Number(e.target.value))}
                            className="pl-6 pr-10 py-2 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                          <span className="absolute right-3 text-slate-400 font-bold text-[9px] uppercase">CAD</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Saturday Special Premium</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-slate-400 font-extrabold text-sm">$</span>
                        <input
                          type="number"
                          value={config.customPricingConfig.saturdaySpecialPrice}
                          onChange={(e) => updatePricingRule('saturdaySpecialPrice', Number(e.target.value))}
                          className="pl-7 pr-12 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="absolute right-3.5 text-slate-400 font-bold text-[10px] uppercase">CAD</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'menu' ? (
        <div className="space-y-6">
          {/* Top Control Bar: Plan & Day Pickers */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
            {/* Plan Selector */}
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Subscription Tier</label>
              <div className="flex flex-wrap gap-2">
                {(['basic', 'standard', 'premium'] as const).map((tier) => {
                  const isActive = selectedPlan === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => setSelectedPlan(tier)}
                      className={`px-6 py-2.5 rounded-2xl font-black text-xs capitalize transition duration-150 flex items-center gap-2 border ${
                        isActive
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        tier === 'premium' ? 'bg-purple-500' :
                        tier === 'standard' ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      {tier} Plan Menu
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day Selector */}
            <div className="space-y-2.5 border-t border-slate-100 pt-5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Weekday</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {days.map((day) => {
                  const isActive = selectedDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`py-3 px-4 rounded-2xl font-extrabold capitalize text-xs transition duration-150 text-center border ${
                        isActive
                          ? 'bg-primary border-primary text-white shadow-sm'
                          : 'bg-slate-50 border-slate-150/70 text-slate-700 hover:bg-slate-100/70 hover:border-slate-250'
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
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-8 shadow-sm">
            {/* Header */}
            <div className="border-b border-slate-150 pb-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 capitalize flex items-center gap-2">
                  <Calendar className="text-primary" />
                  {selectedPlan} Plan: {selectedDay}'s Menu Setup
                </h3>
                <p className="text-slate-500 text-xs mt-1">Configure dishes, roti sizes, desserts, and sides served to customers on this day.</p>
              </div>
              <div className="self-start sm:self-auto bg-slate-900 text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider capitalize">
                {selectedDay} Config
              </div>
            </div>

            {/* Saturday Specials for Premium */}
            {selectedDay === 'saturday' && selectedPlan === 'premium' ? (
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 rounded-3xl flex flex-col sm:flex-row gap-4 justify-between sm:items-center shadow-sm">
                  <div>
                    <h4 className="font-extrabold text-orange-950 text-base">Saturday Chef's Special Toggle</h4>
                    <p className="text-xs text-orange-850 mt-0.5">When active, subscribers select a single premium dish and weekend dessert instead of standard weekly meals.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={!!config.weeklyMenus.premium.saturday.isSaturdaySpecial}
                      onChange={(e) => updateMenuField('isSaturdaySpecial', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {config.weeklyMenus.premium.saturday.isSaturdaySpecial && (
                  <div className="grid md:grid-cols-2 gap-6 items-start">
                    <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                      {renderArrayFieldManager('Special Dishes Options', 'specialFoodOptions', config.weeklyMenus.premium.saturday.specialFoodOptions || [], 'Special Dish')}
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                      {renderArrayFieldManager('Special Weekend Desserts', 'dessertOptions', config.weeklyMenus.premium.saturday.dessertOptions || [], 'Dessert')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Regular Day configuration */
              <div className="space-y-6">
                {selectedPlan === 'basic' ? (
                  <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                    {renderArrayFieldManager('Sabzi Options List', 'sabziOptions', config.weeklyMenus.basic[selectedDay].sabziOptions || [], 'Sabzi')}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6 items-start">
                    <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                      {renderArrayFieldManager('Sabzi Set 1 Options', 'sabziSet1', config.weeklyMenus[selectedPlan][selectedDay].sabziSet1 || [], 'Sabzi')}
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50/50 border border-slate-200/60">
                      {renderArrayFieldManager('Sabzi Set 2 Options', 'sabziSet2', config.weeklyMenus[selectedPlan][selectedDay].sabziSet2 || [], 'Sabzi')}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-3 gap-6 pt-6 border-t border-slate-100 items-end">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-650">Default Roti Count</label>
                    <input
                      type="number"
                      value={config.weeklyMenus[selectedPlan][selectedDay].roti}
                      onChange={(e) => updateMenuField('roti', Number(e.target.value))}
                      className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                  </div>

                  {selectedPlan === 'premium' ? (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-650">Daily Raita Selection</label>
                      <input
                        type="text"
                        value={config.weeklyMenus.premium[selectedDay].raitaType || ''}
                        onChange={(e) => updateMenuField('raitaType', e.target.value)}
                        className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        placeholder="Boondi Raita, Kheera Raita"
                      />
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer select-none">
                      <label htmlFor="raita-checkbox" className="text-xs font-bold text-slate-600 cursor-pointer">Include Raita Side</label>
                      <input
                        type="checkbox"
                        id="raita-checkbox"
                        checked={!!config.weeklyMenus[selectedPlan][selectedDay].raita}
                        onChange={(e) => updateMenuField('raita', e.target.checked)}
                        className="h-5 w-5 rounded text-primary focus:ring-primary border-slate-350 cursor-pointer"
                      />
                    </div>
                  )}

                  {selectedPlan === 'premium' && (
                    <div className="border border-slate-200 rounded-2xl p-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer select-none">
                      <label htmlFor="dessert-checkbox" className="text-xs font-bold text-slate-600 cursor-pointer">Include Sweet/Dessert</label>
                      <input
                        type="checkbox"
                        id="dessert-checkbox"
                        checked={!!config.weeklyMenus.premium[selectedDay].dessert}
                        onChange={(e) => updateMenuField('dessert', e.target.checked)}
                        className="h-5 w-5 rounded text-primary focus:ring-primary border-slate-350 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Image className="text-primary" />
                Weekly Menu Sheets Manager
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Upload or paste image URLs for the menu sheets shown to users. They will be displayed on the public Menu page based on their city.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Vancouver & Area */}
              <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-extrabold text-slate-800 text-sm">Vancouver & Lower Mainland</h3>
                  <span className="text-[10px] bg-red-100 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">
                    Vancouver, Burnaby, Richmond, etc.
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Preview */}
                  <div className="aspect-[4/3] bg-white border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center relative group">
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
                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'vancouver');
                        }}
                        className="text-xs text-slate-650 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer cursor-pointer"
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
              <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-extrabold text-slate-800 text-sm">Remaining Canadian Cities</h3>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold uppercase">
                    All other cities
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Preview */}
                  <div className="aspect-[4/3] bg-white border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center relative group">
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
                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, 'others');
                        }}
                        className="text-xs text-slate-655 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer cursor-pointer"
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
      )}
      
      {/* Footer Info Box */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white flex gap-4 items-center">
        <ShieldCheck className="text-primary shrink-0" size={32} />
        <div>
          <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">Secured Control Panel</h4>
          <p className="text-xs text-slate-300 mt-1">
            Updating the menu configurations saves immediately to the database and propagates instantly to the customer's subscription dashboard and payment calculation engine.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminMenu;
