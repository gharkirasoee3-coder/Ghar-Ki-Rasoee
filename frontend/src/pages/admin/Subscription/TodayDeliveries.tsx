import React, { useState } from 'react';
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
  ClipboardList
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

  const deliveries = data?.deliveries || [];
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



  const filteredDeliveries = deliveries.filter(del => {
    const matchesSearch = del.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         del.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         del.phone.includes(searchTerm);
    const matchesPlan = planFilter === 'All' || del.plan.includes(planFilter);
    return matchesSearch && matchesPlan;
  });

  if (isLoading && deliveries.length === 0) return (
    <div className="p-10 text-center animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Daily Deliveries</h1>
          <div className="flex items-center gap-2 text-gray-500 mt-1 font-medium">
            <Calendar size={18} className="text-primary" />
            <span className="capitalize">{dateInfo.day}, {dateInfo.date ? new Date(dateInfo.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Loading...'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
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

      {/* Search & Filters */}
      <div className="bg-gray-200/50 p-6 rounded-3xl border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Search by name, address or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 text-sm font-medium shadow-sm transition-all"
            />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <select 
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="flex-1 md:w-48 px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 text-sm font-bold text-gray-700 shadow-sm transition-all appearance-none cursor-pointer"
            >
                <option value="All">All Delivery Plans</option>
                <option value="Basic">Basic Plan</option>
                <option value="Standard">Standard Plan</option>
                <option value="Premium">Premium Plan</option>
            </select>
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
                <p className="text-sm mt-2 font-medium">Try adjusting your search filters or check back later.</p>
                <button 
                    onClick={() => {setSearchTerm(''); setPlanFilter('All');}}
                    className="mt-6 text-primary font-bold text-sm hover:underline"
                >
                    Clear all filters
                </button>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {filteredDeliveries.map((delivery) => (
            <div 
              key={delivery.subscriptionId} 
              className={`group bg-white rounded-3xl shadow-sm border-t-4 overflow-hidden hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col ${
                delivery.plan.includes('Premium') ? 'border-purple-500' : 
                delivery.plan.includes('Standard') ? 'border-blue-500' : 'border-emerald-500'
              }`}
            >
              <div className="p-6 pb-2">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 rounded-2xl flex items-center justify-center font-black text-xl border border-gray-200 group-hover:from-primary group-hover:to-primary-hover group-hover:text-white transition-all duration-300">
                            {delivery.customerName.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white shadow-sm ${
                            delivery.mealPreference === 'Veg' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                           <div className={`w-2 h-2 rounded-full bg-white`}></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-black text-gray-900 text-lg leading-tight group-hover:text-primary transition-colors">{delivery.customerName}</h3>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                delivery.plan.includes('Premium') ? 'bg-purple-100 text-purple-700' : 
                                delivery.plan.includes('Standard') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                                {delivery.plan}
                            </span>
                            {delivery.phone && (
                              <a 
                                href={`tel:${delivery.phone}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-gray-50 text-gray-600 hover:bg-primary/10 hover:text-primary transition-all"
                              >
                                <Phone size={10} />
                                <span>{delivery.phone}</span>
                              </a>
                            )}
                        </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                      <a 
                        href={`tel:${delivery.phone}`}
                        className="p-3 bg-gray-50 text-gray-400 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                      >
                         <Phone size={20} />
                      </a>
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
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 px-1">Tiffin Contents</p>
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

              <div className="p-4 border-t border-gray-50 bg-gray-50/50 flex items-center justify-end group-hover:bg-primary/5 transition-colors">
                  <button 
                    onClick={() => navigate(`/admin/deliveries/customization/${delivery.subscriptionId}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 border border-gray-200 rounded-xl text-xs font-black hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all shadow-sm"
                  >
                     <User size={14} />
                     PROFILE
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TodayDeliveries;
