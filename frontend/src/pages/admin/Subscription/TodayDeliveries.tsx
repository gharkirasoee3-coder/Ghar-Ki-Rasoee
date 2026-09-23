import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { useAuth } from '../../../context/AuthContext';
import { 
  Truck, 
  User, 
  MapPin, 
  Calendar,
  ChevronRight,
  Phone,
  Search,
  RefreshCw,
  ClipboardList,
  Copy,
  Check,
  Filter,
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Delivery {
  subscriptionId: string;
  orderId?: string;
  userId: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
  mealPreference: 'Veg' | 'Non-Veg';
  todayCustomization: Record<string, string | number>;
  deliveryStatus: string;
  day: string;
  startDate?: string | null;
  endDate?: string | null;
  remainingDays?: number | null;
  paymentStatus?: string;
  subscriptionStatus?: string;
  isCustomized?: boolean;
}

interface DeliveryResponse {
  deliveries: Delivery[];
  date: string;
  day: string;
}

const TodayDeliveries: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('All');
  const [customizationFilter, setCustomizationFilter] = useState<'All' | 'Customized' | 'Default'>('All');
  const [copiedSubId, setCopiedSubId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<DeliveryResponse>({
    queryKey: ['adminDeliveries'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const response = await axios.get(`${ENV.API_URL}/admin/deliveries/today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    },
    enabled: !!user,
  });

  const deliveries = useMemo(() => data?.deliveries || [], [data]);
  const dateInfo = { date: data?.date || '', day: data?.day || '' };

  const triggerSchedulerMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      await axios.post(`${ENV.API_URL}/admin/deliveries/trigger-scheduler`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      toast.success("Daily orders generated successfully!");
      window.location.reload();
    },
    onError: () => {
      toast.error("Failed to trigger scheduler. Check server logs.");
    }
  });

  // Extract all unique plans dynamically from current deliveries
  const availablePlans = useMemo(() => {
    const defaultPlans = ['Basic', 'Standard', 'Premium'];
    const plansFromDeliveries = deliveries
      .map(d => d.plan)
      .filter(Boolean);

    const set = new Set<string>();
    defaultPlans.forEach(p => set.add(p));
    plansFromDeliveries.forEach(p => {
      const clean = p.replace(/ plan/i, '').trim();
      if (clean) set.add(clean);
    });
    return Array.from(set);
  }, [deliveries]);

  // Plan counts for quick-filter tabs
  const planCounts = useMemo(() => {
    const counts: Record<string, number> = { All: deliveries.length };
    availablePlans.forEach(p => {
      counts[p] = deliveries.filter(d => 
        (d.plan || '').toLowerCase().includes(p.toLowerCase())
      ).length;
    });
    return counts;
  }, [deliveries, availablePlans]);

  // Copy subscription ID helper
  const handleCopySubId = (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(subId);
    setCopiedSubId(subId);
    toast.success("Subscription ID copied!");
    setTimeout(() => setCopiedSubId(null), 2000);
  };

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(del => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        (del.customerName || '').toLowerCase().includes(query) || 
        (del.address || '').toLowerCase().includes(query) ||
        (del.phone || '').includes(query) ||
        (del.email || '').toLowerCase().includes(query) ||
        (del.subscriptionId || '').toLowerCase().includes(query) ||
        (del.orderId || '').toLowerCase().includes(query);

      const matchesPlan = planFilter === 'All' || 
        (del.plan || '').toLowerCase().includes(planFilter.toLowerCase());

      const matchesCustomization = 
        customizationFilter === 'All' ||
        (customizationFilter === 'Customized' && !!del.isCustomized) ||
        (customizationFilter === 'Default' && !del.isCustomized);

      return matchesSearch && matchesPlan && matchesCustomization;
    });
  }, [deliveries, searchTerm, planFilter, customizationFilter]);

  const hasActiveFilters = searchTerm !== '' || planFilter !== 'All' || customizationFilter !== 'All';

  const clearAllFilters = () => {
    setSearchTerm('');
    setPlanFilter('All');
    setCustomizationFilter('All');
  };

  if (isLoading && deliveries.length === 0) return (
    <div className="p-10 text-center animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Daily Deliveries</h1>
          <div className="flex items-center gap-2 text-gray-500 mt-1 font-medium">
            <Calendar size={18} className="text-primary" />
            <span className="capitalize">{dateInfo.day}, {dateInfo.date ? new Date(dateInfo.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Loading...'}</span>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-4">
            <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['adminDeliveries'] })}
                className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm"
                title="Refresh Data"
            >
                <RefreshCw size={20} />
            </button>
            <button 
                onClick={() => triggerSchedulerMutation.mutate()}
                disabled={triggerSchedulerMutation.isPending}
                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black hover:bg-gray-800 transition-all disabled:opacity-50 shadow-lg shadow-gray-200"
            >
                <RefreshCw size={18} className={triggerSchedulerMutation.isPending ? 'animate-spin' : ''} />
                {triggerSchedulerMutation.isPending ? 'GENERATING...' : 'RUN DAILY SCHEDULER'}
            </button>
            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Truck size={24} />
                </div>
                <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Total Packages</p>
                    <p className="text-2xl font-black text-gray-900 leading-none">{deliveries.length}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Subscription Quick-Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setPlanFilter('All')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all shadow-sm ${
            planFilter === 'All'
              ? 'bg-gray-900 text-white shadow-gray-300'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
          }`}
        >
          <Layers size={14} />
          <span>All Subscriptions</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            planFilter === 'All' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
          }`}>
            {planCounts['All'] || 0}
          </span>
        </button>

        {availablePlans.map((planName) => {
          const isSelected = planFilter.toLowerCase() === planName.toLowerCase();
          const count = planCounts[planName] || 0;
          return (
            <button
              key={planName}
              onClick={() => setPlanFilter(planName)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all shadow-sm ${
                isSelected
                  ? 'bg-primary text-white shadow-primary/20'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              <span>{planName} Plan</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Detailed Filters */}
      <div className="bg-gray-100 p-5 rounded-3xl border border-gray-200/80 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Search by customer, phone, address, or subscription ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 text-sm font-medium shadow-sm transition-all text-gray-800 placeholder-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={14} />
                </button>
              )}
          </div>

          {/* Subscription Plan Filter */}
          <div className="w-full md:w-auto">
              <select 
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="w-full md:w-48 px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 text-sm font-bold text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                  <option value="All">All Subscription Plans</option>
                  {availablePlans.map(p => (
                    <option key={p} value={p}>{p} Plan</option>
                  ))}
              </select>
          </div>

          {/* Meal Customization Filter */}
          <div className="w-full md:w-auto">
              <select 
                  value={customizationFilter}
                  onChange={(e) => setCustomizationFilter(e.target.value as 'All' | 'Customized' | 'Default')}
                  className="w-full md:w-60 px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 text-sm font-bold text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                  <option value="All">All Meal Types (Default & Custom)</option>
                  <option value="Customized">Customized Meals Only</option>
                  <option value="Default">Default Menu Rotation Only</option>
              </select>
          </div>
        </div>

        {/* Filter stats & Clear active filters */}
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 pt-1 px-1">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <span>Showing <strong className="text-gray-900">{filteredDeliveries.length}</strong> of <strong className="text-gray-900">{deliveries.length}</strong> scheduled deliveries</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 text-primary hover:text-primary-hover font-bold hover:underline transition-colors"
            >
              <X size={14} />
              <span>Reset all filters</span>
            </button>
          )}
        </div>
      </div>

      {dateInfo.day.toLowerCase() === 'sunday' ? (
        <div className="bg-amber-50 rounded-3xl p-20 shadow-sm border border-amber-200 text-center">
            <div className="flex flex-col items-center max-w-md mx-auto text-amber-700">
                <Calendar size={80} className="mb-6 opacity-80" />
                <h3 className="text-2xl font-black text-amber-900">No Delivery Today (Sunday)</h3>
                <p className="text-sm mt-3 font-semibold text-amber-800">
                    Pure Veg Tiffin Service does not deliver on Sundays.
                </p>
                <p className="text-xs mt-1 text-amber-600">
                    Active subscription cards are hidden today because no deliveries are scheduled.
                </p>
            </div>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 shadow-sm border border-gray-100 text-center">
            <div className="flex flex-col items-center max-w-xs mx-auto text-gray-400">
                <Truck size={80} className="mb-6 opacity-20" />
                <h3 className="text-xl font-bold text-gray-900">No deliveries found</h3>
                <p className="text-sm mt-2 font-medium">Try adjusting your search or subscription filters.</p>
                {hasActiveFilters && (
                  <button 
                      onClick={clearAllFilters}
                      className="mt-6 text-primary font-bold text-sm hover:underline"
                  >
                      Clear all filters
                  </button>
                )}
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {filteredDeliveries.map((delivery) => {
            const planLower = (delivery.plan || '').toLowerCase();
            const isPremium = planLower.includes('premium');
            const isStandard = planLower.includes('standard');
            const isBasic = planLower.includes('basic');

            return (
              <div 
                key={delivery.subscriptionId} 
                className={`group bg-white rounded-3xl shadow-sm border-t-4 overflow-hidden hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col ${
                  isPremium ? 'border-purple-500' : 
                  isStandard ? 'border-blue-500' : 
                  isBasic ? 'border-emerald-500' : 'border-amber-500'
                }`}
              >
                <div className="p-6 pb-2">
                  {/* Subscription ID & Status Bar */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <button
                      onClick={(e) => handleCopySubId(delivery.subscriptionId, e)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-mono font-bold transition-all"
                      title="Click to copy Subscription ID"
                    >
                      <span>Sub: #{delivery.subscriptionId.slice(0, 8)}...</span>
                      {copiedSubId === delivery.subscriptionId ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={12} className="text-gray-400" />
                      )}
                    </button>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      delivery.deliveryStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                      delivery.deliveryStatus === 'Out for Delivery' ? 'bg-blue-100 text-blue-700' :
                      delivery.deliveryStatus === 'Cooking' ? 'bg-amber-100 text-amber-700' :
                      delivery.deliveryStatus === 'Cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {delivery.deliveryStatus}
                    </span>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 rounded-2xl flex items-center justify-center font-black text-xl border border-gray-200 group-hover:from-primary group-hover:to-primary-hover group-hover:text-white transition-all duration-300">
                              {delivery.customerName.charAt(0)}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white shadow-sm ${
                              delivery.mealPreference === 'Veg' ? 'bg-green-500' : 'bg-red-500'
                          }`} title={`Diet: ${delivery.mealPreference}`}>
                             <div className={`w-2 h-2 rounded-full bg-white`}></div>
                          </div>
                      </div>
                      <div>
                          <h3 className="font-black text-gray-900 text-lg leading-tight group-hover:text-primary transition-colors">{delivery.customerName}</h3>
                          <div className="flex items-center flex-wrap gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  isPremium ? 'bg-purple-100 text-purple-700' : 
                                  isStandard ? 'bg-blue-100 text-blue-700' : 
                                  isBasic ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                  {delivery.plan}
                              </span>
                              {delivery.isCustomized ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                  Customized Meal
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                                  Default Menu
                                </span>
                              )}
                              {delivery.phone && delivery.phone !== 'N/A' ? (
                                <a 
                                  href={`tel:${delivery.phone}`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-gray-50 text-gray-600 hover:bg-primary/10 hover:text-primary transition-all"
                                >
                                  <Phone size={10} />
                                  <span>{delivery.phone}</span>
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Phone size={10} />
                                  <span>No Phone</span>
                                </span>
                              )}
                          </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {delivery.phone && delivery.phone !== 'N/A' ? (
                          <a 
                            href={`tel:${delivery.phone}`}
                            className="p-3 bg-gray-50 text-gray-400 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                            title="Call Customer"
                          >
                             <Phone size={20} />
                          </a>
                        ) : (
                          <span 
                            className="p-3 bg-gray-50 text-gray-300 rounded-xl cursor-not-allowed opacity-50"
                            title="No phone number on file"
                          >
                             <Phone size={20} />
                          </span>
                        )}
                    </div>
                  </div>

                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:bg-primary/10 hover:border-primary/20 hover:shadow-sm transition-all duration-300 group/address"
                  >
                      <div className="flex gap-3">
                          <div className="mt-1">
                              <div className="p-2 bg-white rounded-lg text-primary shadow-sm group-hover/address:scale-110 transition-transform">
                                  <MapPin size={18} />
                              </div>
                          </div>
                          <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Delivery Address</p>
                              <p className="text-sm font-bold text-gray-800 leading-relaxed line-clamp-2">
                                  {delivery.address}
                              </p>
                          </div>
                      </div>
                  </a>
                </div>
                
                <div className="px-6 py-4 flex-1">
                  <div className="space-y-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                               <div className="w-1 h-4 bg-primary rounded-full"></div>
                               <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Preferences</p>
                          </div>
                          <button 
                            onClick={() => navigate(`/admin/deliveries/customization/${delivery.subscriptionId}`)}
                            className="text-[10px] text-primary hover:bg-primary/5 px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-colors"
                          >
                            FULL WEEK <ChevronRight size={10} />
                          </button>
                      </div>

                      <div className="pt-2">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Tiffin Contents</p>
                            {delivery.isCustomized ? (
                              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Sparkles size={11} className="text-purple-600" /> Customized
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                Default Menu
                              </span>
                            )}
                          </div>
                          {delivery.todayCustomization && Object.keys(delivery.todayCustomization).length > 0 ? (
                              <div className="grid grid-cols-2 gap-3">
                                  {Object.entries(delivery.todayCustomization).map(([key, value]) => {
                                      const isSideOption = key.toLowerCase() === 'side_option' || key.toLowerCase() === 'side option';
                                      const displayVal = String(value);
                                      let formattedVal = displayVal;
                                      if (isSideOption) {
                                          if (displayVal.toLowerCase() === 'salad') formattedVal = '🥗 Salad';
                                          else if (displayVal.toLowerCase() === 'raita') formattedVal = '🥣 Raita';
                                      }
                                      return (
                                          <div key={key} className={`p-3 rounded-xl border shadow-sm ${
                                              isSideOption 
                                                  ? 'bg-orange-50/65 border-orange-150 text-orange-950 font-black' 
                                                  : 'bg-white border-gray-100'
                                          }`}>
                                              <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">{key.replace('_', ' ')}</p>
                                              <p className={`text-xs font-black ${isSideOption ? 'text-orange-900' : 'text-gray-900'}`}>{formattedVal}</p>
                                          </div>
                                      );
                                  })}
                              </div>
                          ) : (
                              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                 <div className="flex items-center gap-3">
                                     <div className="p-2 bg-white rounded-lg text-emerald-500 shadow-sm">
                                         <ClipboardList size={18} />
                                     </div>
                                     <div>
                                         <span className="text-xs font-bold font-mono uppercase tracking-tight text-emerald-700">DEFAULT {delivery.plan.toUpperCase()} MENU</span>
                                         <p className="text-[10px] text-emerald-600 mt-0.5">Serving standard rotation — no custom overrides</p>
                                     </div>
                                 </div>
                              </div>
                          )}
                      </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between group-hover:bg-primary/5 transition-colors">
                    <span className="text-[11px] font-bold text-gray-400">
                      {delivery.remainingDays !== null && delivery.remainingDays !== undefined ? `${delivery.remainingDays} days remaining` : ''}
                    </span>
                    <button 
                      onClick={() => navigate(`/admin/deliveries/customization/${delivery.subscriptionId}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-xl text-xs font-black hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm"
                    >
                       <User size={14} />
                       PROFILE
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TodayDeliveries;
