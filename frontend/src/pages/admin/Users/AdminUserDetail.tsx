import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { useAuth } from '../../../context/AuthContext';
import {
  ChevronLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  Crown,
  CreditCard,
  Ban,
  Activity,
  X,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import {
  format,
  parseISO,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  isAfter,
  startOfToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { toast } from 'sonner';

// --- Interfaces ---
interface Subscription {
  subscriptionId: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  paymentMethod: string;
  paymentStatus: string;
  skippedDates?: string[];
  remainingDays?: number;
}

interface ActivityLog {
  activityId: string;
  type: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface Notification {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
}

interface UserDetail {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  area: string;
  role: string;
  picture: string | null;
  lastLoginAt: string | null;
  subscription: Subscription | null;
  customization: any | null;
  activities: ActivityLog[];
  notifications: Notification[];
}

const AdminUserDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchUserDetail = async () => {
      try {
        const token = await user?.getIdToken();
        const response = await axios.get(`${ENV.API_URL}/admin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserDetail(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch user details');
      } finally {
        setLoading(false);
      }
    };

    if (user && userId) {
      fetchUserDetail();
    }
  }, [user, userId]);

  const handleCancelSubscription = async () => {
    if (!cancelReason.trim() || !userDetail?.subscription?.subscriptionId) return;
    
    setIsCancelling(true);
    try {
      const token = await user?.getIdToken();
      await axios.post(
        `${ENV.API_URL}/admin/users/${userId}/cancel-subscription`,
        {
          subscriptionId: userDetail.subscription.subscriptionId,
          reason: cancelReason.trim()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update local state to reflect cancellation
      setUserDetail(prev => {
        if (!prev || !prev.subscription) return prev;
        return {
          ...prev,
          subscription: {
            ...prev.subscription,
            status: 'Cancelled'
          }
        };
      });
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading user profile...</p>
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="p-10 text-center text-red-500">
        <AlertTriangle className="mx-auto mb-4" size={48} />
        <p className="text-lg font-bold">{error || 'User not found'}</p>
        <button onClick={() => navigate('/admin/users')} className="mt-4 text-primary hover:underline">
          Back to Users
        </button>
      </div>
    );
  }

  const { subscription, customization, activities } = userDetail;

  // --- Calendar Logic ---
  const renderCalendar = () => {
    if (!subscription || !subscription.startDate || !subscription.endDate) return null;

    const startDate = parseISO(subscription.startDate);
    const endDate = parseISO(subscription.endDate);
    const today = startOfToday();
    const skippedDates = subscription.skippedDates?.map(d => parseISO(d)) || [];

    const displayMonth = isAfter(today, endDate) ? endDate : (isBefore(today, startDate) ? startDate : today);
    
    const monthStart = startOfMonth(displayMonth);
    const monthEnd = endOfMonth(displayMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-8 overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
        
        <div className="p-8 pb-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-orange-400 text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Subscription Calendar</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{format(displayMonth, 'MMMM yyyy')}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
             <div className="px-3 py-1.5 rounded-xl bg-gray-50 text-xs font-bold text-gray-500 border border-gray-100 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div> Delivered
             </div>
             <div className="px-3 py-1.5 rounded-xl bg-gray-50 text-xs font-bold text-gray-500 border border-gray-100 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div> Upcoming
             </div>
             <div className="px-3 py-1.5 rounded-xl bg-gray-50 text-xs font-bold text-gray-500 border border-gray-100 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div> Skipped
             </div>
          </div>
        </div>
        
        <div className="p-8 relative z-10">
            <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {days.map((day, i) => {
                const isOutsideMonth = isBefore(day, monthStart) || isAfter(day, monthEnd);
                const isBeforeStart = isBefore(day, startDate);
                const isAfterEnd = isAfter(day, endDate);
                const isSkipped = skippedDates.some(skipped => isSameDay(skipped, day));
                const isPastOrToday = isBefore(day, today) || isSameDay(day, today);
                const isToday = isSameDay(day, today);
                
                let baseStyle = 'bg-white border-gray-100 text-gray-900 hover:border-gray-300';
                let dotStyle = null;
                
                if (isOutsideMonth) {
                  baseStyle = 'bg-transparent border-transparent text-gray-300 opacity-50';
                } else if (isBeforeStart || isAfterEnd) {
                   baseStyle = 'bg-gray-50/50 border-gray-100/50 text-gray-300';
                } else if (subscription.status === 'Cancelled' && isAfter(day, parseISO(subscription.endDate))) {
                   baseStyle = 'bg-red-50/50 border-red-100 text-red-300';
                } else if (isSkipped) {
                  baseStyle = 'bg-amber-50 border-amber-200 text-amber-700';
                  dotStyle = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]';
                } else if (isPastOrToday) {
                  baseStyle = 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold';
                  dotStyle = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]';
                } else {
                  baseStyle = 'bg-blue-50 border-blue-200 text-blue-700';
                  dotStyle = 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]';
                }
    
                if (isToday) {
                  baseStyle += ' ring-4 ring-primary/20 ring-offset-2 border-primary';
                }
    
                return (
                  <div 
                    key={i} 
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl md:rounded-3xl text-sm md:text-base font-medium border-2 transition-all duration-300 group cursor-default ${baseStyle}`}
                    title={format(day, 'MMM dd, yyyy')}
                  >
                    <span className="relative z-10">{format(day, 'd')}</span>
                    {dotStyle && (
                        <div className={`absolute bottom-2 md:bottom-3 w-1.5 h-1.5 rounded-full ${dotStyle}`}></div>
                    )}
                    {isToday && (
                        <div className="absolute top-1 right-1 md:top-2 md:right-2 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    )}
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    );
  };

  // --- Customization Logic ---
  const renderCustomizations = () => {
    if (!customization?.preferences) {
      return (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center mt-6">
          <ClipboardList className="mx-auto text-gray-400 mb-3" size={32} />
          <h4 className="text-gray-900 font-bold">No custom meals selected</h4>
          <p className="text-gray-500 text-sm mt-1">User is receiving the standard weekly menu.</p>
        </div>
      );
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return (
      <div className="mt-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ClipboardList className="text-primary" size={20}/>
          Meal Customizations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map(day => {
            const prefs = customization.preferences[day];
            if (!prefs) return null;
            return (
              <div key={day} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 pb-2 border-b border-gray-50">{day}</p>
                <div className="space-y-2">
                  {prefs.sabzi1 && (
                     <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                       <span className="text-gray-500 text-xs">Sabzi 1</span>
                       <span className="font-semibold text-gray-900">{prefs.sabzi1}</span>
                     </div>
                  )}
                  {prefs.sabzi2 && (
                     <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                       <span className="text-gray-500 text-xs">Sabzi 2</span>
                       <span className="font-semibold text-gray-900">{prefs.sabzi2}</span>
                     </div>
                  )}
                  {prefs.specialFood && (
                     <div className="flex justify-between items-center bg-yellow-50 p-2 rounded-lg text-sm border border-yellow-100">
                       <span className="text-yellow-700 text-xs font-bold">Special</span>
                       <span className="font-bold text-yellow-900">{prefs.specialFood}</span>
                     </div>
                  )}
                  {prefs.dessert && (
                     <div className="flex justify-between items-center bg-pink-50 p-2 rounded-lg text-sm border border-pink-100">
                       <span className="text-pink-700 text-xs font-bold">Dessert</span>
                       <span className="font-bold text-pink-900">{prefs.dessert}</span>
                     </div>
                  )}
                  {prefs.sideOption && (
                     <div className="flex justify-between items-center bg-orange-50 p-2 rounded-lg text-sm border border-orange-100">
                       <span className="text-orange-700 text-xs font-bold">Side Option</span>
                       <span className="font-bold text-orange-900">{prefs.sideOption}</span>
                     </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header / Nav */}
      <div className="flex items-center justify-between">
         <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 text-primary hover:underline font-bold text-sm"
          >
            <ChevronLeft size={16} /> Back to Users
          </button>
      </div>

      {/* User Profile Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-[100px] -z-10"></div>
        
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="w-24 h-24 bg-gradient-to-br from-primary to-orange-500 text-white rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-xl shadow-primary/20 flex-shrink-0">
            {userDetail.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{userDetail.name}</h1>
              {userDetail.role === 'admin' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-widest w-fit">Admin</span>
              )}
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 font-medium">
              <div className="flex items-center gap-1.5"><Mail size={16} className="text-gray-400" /> {userDetail.email}</div>
              <div className="flex items-center gap-1.5"><Phone size={16} className="text-gray-400" /> {userDetail.phone}</div>
              <div className="flex items-center gap-1.5"><User size={16} className="text-gray-400" /> UID: {userDetail.uid.slice(0, 8)}...</div>
            </div>
            
            {userDetail.address && (
              <div className="flex items-start gap-1.5 text-sm text-gray-500 pt-2 border-t border-gray-100 mt-2">
                <MapPin size={16} className="text-gray-400 flex-shrink-0 mt-0.5" /> 
                <span>{userDetail.address} {userDetail.area && `(${userDetail.area})`}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Subscription & Customizations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
               <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <Crown className="text-primary" size={20} /> Subscription Details
               </h3>
               {subscription && (
                 <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                   subscription.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                 }`}>
                   {subscription.status}
                 </span>
               )}
            </div>
            
            <div className="p-6">
              {!subscription ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-medium">No subscription found for this user.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl">
                       <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Plan</p>
                       <p className="font-bold text-gray-900">{subscription.plan}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                       <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Payment</p>
                       <div className="flex items-center gap-1">
                         <CreditCard size={14} className="text-gray-500"/>
                         <p className="font-bold text-gray-900 text-sm">{subscription.paymentStatus}</p>
                       </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                       <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Start Date</p>
                       <p className="font-bold text-gray-900 text-sm">{new Date(subscription.startDate).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                       <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">End Date</p>
                       <p className="font-bold text-primary text-sm">{new Date(subscription.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Visual Progress roughly estimated by days */}
                  {subscription.status === 'Active' && subscription.remainingDays !== undefined && (
                     <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                           <span>Progress</span>
                           <span className="text-primary">{subscription.remainingDays} Days Left</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-primary rounded-full transition-all duration-500" 
                             style={{ width: `${Math.max(0, Math.min(100, ((30 - subscription.remainingDays) / 30) * 100))}%` }}
                           ></div>
                        </div>
                     </div>
                  )}

                  {subscription.status === 'Active' && (
                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-sm transition"
                      >
                        <Ban size={16} /> Cancel Subscription
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Calendar & Customizations */}
          {renderCalendar()}
          {renderCustomizations()}

        </div>

        {/* Right Column: Activity Timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
             <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
               <Activity className="text-primary" size={20} /> Recent Activity
             </h3>
             
              {activities.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No activity logs found.</p>
              ) : (
                <div className="space-y-4 max-h-[850px] overflow-y-auto pr-2 custom-scrollbar">
                  {activities.map((act, idx) => {
                    // Determine icon colors and text colors
                    let iconBg = 'bg-gray-50 border-gray-200 text-gray-500';
                    let typeBadgeColor = 'bg-gray-100 text-gray-800';
                    
                    if (act.type === 'subscription') {
                      iconBg = act.action === 'renew' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-blue-50 border-blue-200 text-blue-600';
                      typeBadgeColor = act.action === 'renew' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800';
                    } else if (act.type === 'cancel') {
                      iconBg = 'bg-rose-50 border-rose-200 text-rose-600';
                      typeBadgeColor = 'bg-rose-100 text-rose-800';
                    } else if (act.type === 'customization') {
                      iconBg = 'bg-purple-50 border-purple-200 text-purple-600';
                      typeBadgeColor = 'bg-purple-100 text-purple-800';
                    } else if (act.type === 'skip') {
                      iconBg = 'bg-amber-50 border-amber-200 text-amber-600';
                      typeBadgeColor = 'bg-amber-100 text-amber-800';
                    } else if (act.type === 'order') {
                      iconBg = 'bg-indigo-50 border-indigo-200 text-indigo-600';
                      typeBadgeColor = 'bg-indigo-100 text-indigo-800';
                    }

                    return (
                      <div key={idx} className="flex gap-4 items-stretch group">
                        {/* Left: Bullet & vertical line */}
                        <div className="flex flex-col items-center shrink-0 w-10">
                          {/* Bullet */}
                          <div className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 bg-white shadow-sm z-10 transition-transform group-hover:scale-105 ${iconBg}`}>
                            <Activity size={16} />
                          </div>
                          {/* Vertical Line */}
                          {idx < activities.length - 1 && (
                            <div className="w-0.5 bg-slate-100 grow my-2"></div>
                          )}
                        </div>

                        {/* Right: Card */}
                        <div className="flex-1 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all duration-200 hover:shadow-xs mb-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${typeBadgeColor}`}>
                                {act.type}
                              </span>
                              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg capitalize">
                                {act.action}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-slate-400">
                              {new Date(act.createdAt).toLocaleString('en-CA', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                          
                          <p className="text-slate-800 text-sm font-medium leading-relaxed mt-1">
                            {act.description}
                          </p>

                          {/* Metadata display if present */}
                          {act.metadata && Object.keys(act.metadata).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200/50 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
                              {Object.entries(act.metadata).map(([key, val]) => {
                                if (!val) return null;
                                // Clean key for display (e.g. orderId -> Order ID)
                                const cleanKey = key
                                  .replace(/([A-Z])/g, ' $1')
                                  .replace(/^./, (str) => str.toUpperCase());
                                
                                // Format value if it's a date or long ID
                                let cleanVal = String(val);
                                if (key.toLowerCase().includes('date') && !isNaN(Date.parse(cleanVal))) {
                                  cleanVal = new Date(cleanVal).toLocaleDateString();
                                } else if (key.toLowerCase().includes('id') && cleanVal.length > 15) {
                                  cleanVal = `${cleanVal.substring(0, 8)}...`;
                                }

                                return (
                                  <div key={key} className="flex flex-col bg-white border border-slate-100 rounded-xl p-2 shadow-2xs">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{cleanKey}</span>
                                    <span className="text-slate-800 font-bold mt-0.5 truncate">{cleanVal}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => !isCancelling && setShowCancelModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"
              disabled={isCancelling}
            >
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-2">Cancel Subscription</h2>
            <p className="text-sm text-gray-600 mb-6">
              This action will immediately cancel the user's active subscription. 
              <strong> They will receive a notification with the reason you provide below.</strong>
            </p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Cancellation Reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g., Requested via support, Non-payment, etc."
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm min-h-[100px] resize-none"
                  disabled={isCancelling}
                ></textarea>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 px-4 font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                disabled={isCancelling}
              >
                Keep Active
              </button>
              <button 
                onClick={handleCancelSubscription}
                disabled={!cancelReason.trim() || isCancelling}
                className="flex-1 py-3 px-4 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Processing...</>
                ) : (
                  'Confirm Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetail;
