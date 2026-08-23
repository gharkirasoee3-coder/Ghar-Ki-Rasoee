import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import PageContainer from '../../../components/layout/PageContainer';
import { Calendar, Edit, Crown, ShoppingBag, Utensils, Star, Coffee } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Subscription {
  subscriptionId: string;
  userId: string;
  plan: string;
  planDetails: any;
  status: string;
  startDate: string;
  endDate: string;
  remainingDays: number;
  skippedDates?: string[];
  deliveryAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  isRecurring: boolean;
  couponCode?: string | null;
  deliveryDays?: string[];
  deliveryFee?: number;
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'Active': 'bg-green-100 text-green-800',
    'Cancelled': 'bg-red-100 text-red-800',
    'Expired': 'bg-gray-150 text-gray-700',
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${styles[status] || 'bg-gray-105 text-gray-800'}`}>
      {status}
    </span>
  );
};

const MySubscription: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOtherReason, setCancelOtherReason] = useState('');

  // Review states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  // Mutation for submitting Review
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("No subscription selected");
      const token = await user?.getIdToken();
      await axios.post(`${ENV.API_URL}/subscriptions/reviews`, { 
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
        subscriptionId: subscription.subscriptionId 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      setIsReviewModalOpen(false);
      setReviewRating(5);
      setReviewTitle('');
      setReviewComment('');
      toast.success("Thank you for your feedback! Review submitted successfully.");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit review");
    }
  });

  // Fetch all subscriptions for the user
  const { data: subscriptions = [], isLoading: isSubLoading } = useQuery<Subscription[]>({
    queryKey: ['mySubscriptions'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await axios.get(`${ENV.API_URL}/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data;
    },
    enabled: !!user,
  });

  // Fetch scheduled holidays
  const { data: holidays = [] } = useQuery<any[]>({
    queryKey: ['holidays'],
    queryFn: async () => {
      const res = await axios.get(`${ENV.API_URL}/holidays`);
      return res.data.data || [];
    }
  });

  // Derived selected subscription
  const subscription = subscriptions[selectedSubIndex] || subscriptions[0] || null;

  // Fetch customizations for this selected subscription
  const { data: customizations, isLoading: isCustomLoading } = useQuery({
    queryKey: ['myCustomization', subscription?.subscriptionId],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const res = await axios.get(
        `${ENV.API_URL}/menu/customizations/${subscription.subscriptionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data.data?.customization;
    },
    enabled: !!user && !!subscription?.subscriptionId,
  });

  // Mutation for Skipping Date
  const skipDateMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("No subscription selected");
      const token = await user?.getIdToken();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      await axios.post(
        `${ENV.API_URL}/subscriptions/skip`,
        { date: dateStr, subscriptionId: subscription.subscriptionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return tomorrow;
    },
    onSuccess: (tomorrow) => {
      setIsSkipModalOpen(false);
      toast.success(`Successfully skipped delivery for ${tomorrow.toLocaleDateString()}. Your subscription has been extended by 1 day.`);
      queryClient.invalidateQueries({ queryKey: ['mySubscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['myCustomization', subscription?.subscriptionId] });
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to skip delivery. Please try again.");
    }
  });

  // Mutation for Cancelling Subscription
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!subscription) throw new Error("No subscription selected");
      const token = await user?.getIdToken();
      const reason = cancelReason === 'Other' ? cancelOtherReason : cancelReason;
      await axios.post(`${ENV.API_URL}/subscriptions/cancel`, { 
        reason, 
        subscriptionId: subscription.subscriptionId 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      setIsCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['mySubscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['myCustomization', subscription?.subscriptionId] });
      toast.success("Subscription cancelled successfully.");
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to cancel subscription");
    }
  });

  const handleRenew = () => {
    if (!subscription) return;
    navigate('/subscription-checkout', { 
      state: { 
        plan: subscription.planDetails || { name: subscription.plan, price: 0 },
        address: subscription.deliveryAddress 
      } 
    });
  };

  if (isSubLoading) {
    return (
      <PageContainer className="py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading subscriptions...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-10">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">My Subscriptions</h1>
          <p className="text-text-secondary">Manage your tiffin service subscription plans</p>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition w-full sm:w-auto shadow-sm"
        >
          Buy Additional Plan
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="text-center bg-gray-50 rounded-xl p-12">
          <ShoppingBag className="mx-auto text-gray-300 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-text-primary mb-3">No Active Subscription</h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto font-medium">
            Subscribe to a monthly plan for regular home-cooked meals and enjoy consistent savings.
          </p>
          <button 
            onClick={() => navigate('/pricing')}
            className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary-hover transition font-medium"
          >
            View Plans
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Holidays Alerts */}
          {holidays.length > 0 && (
            <div className="space-y-4">
              {holidays
                .filter((h: any) => {
                  const todayStr = new Date().toLocaleDateString('sv-SE');
                  return h.endDate >= todayStr;
                })
                .map((holiday: any) => (
                  <div 
                    key={holiday.id} 
                    className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm"
                  >
                    <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                      <Coffee size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-amber-900 uppercase tracking-wide">
                        Kitchen Holiday Notice: {holiday.description}
                      </h4>
                      <p className="text-xs font-semibold text-amber-700 leading-relaxed">
                        No food deliveries will be made between <span className="font-bold underline">{new Date(holiday.startDate + "T00:00:00").toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span> and <span className="font-bold underline">{new Date(holiday.endDate + "T00:00:00").toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>.
                      </p>
                      <p className="text-[11px] font-black text-amber-800 bg-amber-200/50 px-2 py-0.5 rounded-lg inline-block mt-1">
                        ✓ Subscription Automatically Extended by {holiday.numDays} Days
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Plan switcher */}
          {subscriptions.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-sm font-bold text-text-secondary flex items-center gap-1.5">
                <span>👥</span> You have {subscriptions.length} active plans. Switch to view:
              </span>
              <div className="flex flex-wrap gap-2">
                {subscriptions.map((sub, idx) => (
                  <button
                    key={sub.subscriptionId}
                    onClick={() => setSelectedSubIndex(idx)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                      selectedSubIndex === idx 
                        ? 'bg-primary text-white border-primary shadow-sm' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                    }`}
                  >
                    {sub.plan} Plan ({sub.subscriptionId.slice(-8).toUpperCase()})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2-Column dashboard layout */}
          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Main Plan Card column */}
            <div className="md:col-span-2 space-y-6">
              
              {subscription.status === 'Cancelled' || subscription.status === 'Expired' ? (
                /* Ended subscription card */
                <div className="bg-white rounded-xl p-8 border border-gray-200 text-center relative overflow-hidden">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                    <Calendar size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-2">
                    {subscription.status === 'Cancelled' ? 'Subscription Cancelled' : 'Subscription Expired'}
                  </h2>
                  <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
                    {subscription.status === 'Cancelled' 
                      ? 'This subscription has been cancelled. You can easily reactivate it to continue receiving meals.' 
                      : 'This subscription period has ended. Renew now to avoid missing your daily meals!'}
                  </p>
                  
                  {/* Previous Plan details inside the ended card */}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6 text-left">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-text-secondary mb-1">Plan</p>
                      <p className="font-bold text-sm text-text-primary">{subscription.plan}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-text-secondary mb-1">Payment Method</p>
                      <p className="font-bold text-sm text-text-primary">{subscription.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                      onClick={handleRenew}
                      className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition"
                    >
                      Renew Instantly
                    </button>
                    <button 
                      onClick={() => navigate('/pricing')}
                      className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                      View Other Plans
                    </button>
                  </div>
                </div>
              ) : (
                /* Active subscription card */
                <>
                  <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 rounded-xl p-8">
                    {/* Header: Name, ID, badge */}
                    <div className="flex flex-col md:flex-row md:justify-between items-start gap-4 mb-6">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                          <Crown className="text-primary" size={32} />
                          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{subscription.plan} Plan</h2>
                        </div>
                        <p className="text-text-secondary text-sm font-medium">
                          ID: {subscription.subscriptionId.slice(-8).toUpperCase()} • {subscription.paymentMethod}
                        </p>
                      </div>
                      <StatusBadge status={subscription.status} />
                    </div>

                    {/* Dates grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-text-secondary mb-1">Started On</p>
                        <p className="font-bold text-lg text-text-primary">
                          {new Date(subscription.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-text-secondary mb-1">Next Delivery/Renewal</p>
                        <p className="font-bold text-lg text-text-primary">
                          {new Date(subscription.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Address Block */}
                    <div className="bg-white rounded-lg p-4 mb-6">
                      <p className="text-sm text-text-secondary mb-2">Delivery Address</p>
                      <p className="text-text-primary break-words font-medium">{subscription.deliveryAddress || 'Not specified'}</p>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                      <button 
                        onClick={() => navigate(`/subscription/customize?subscriptionId=${subscription.subscriptionId}`)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition w-full sm:w-auto"
                      >
                        <Edit size={18} />
                        Customize Meals
                      </button>
                      <button 
                        onClick={() => setIsSkipModalOpen(true)}
                        className="flex items-center justify-center px-5 py-2.5 bg-yellow-50 border-2 border-yellow-400 text-yellow-700 rounded-lg font-medium hover:bg-yellow-100 transition w-full sm:w-auto"
                      >
                        Skip Tomorrow
                      </button>
                      <button 
                        onClick={() => setIsReviewModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-50 border-2 border-green-400 text-green-700 rounded-lg font-medium hover:bg-green-100 transition w-full sm:w-auto"
                      >
                        <Star size={18} />
                        Write Review
                      </button>
                      <button 
                        onClick={() => setIsCancelModalOpen(true)}
                        className="flex items-center justify-center px-5 py-2.5 border-2 border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition w-full sm:w-auto"
                      >
                        Cancel Plan
                      </button>
                    </div>
                  </div>

                  {/* Customizations Block */}
                  <div>
                    {isCustomLoading ? (
                      <div className="py-6 text-center bg-white rounded-lg border border-gray-200">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-[1.5rem] p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                          <h3 className="text-xl font-extrabold text-text-primary flex items-center gap-2">
                            <Utensils className="text-green-600" size={24} />
                            Your Weekly Menu Selections
                          </h3>
                          {!customizations?.preferences && (
                            <span className="px-3 py-1 bg-amber-100/80 text-amber-900 rounded-xl text-[10px] font-black uppercase tracking-wider border border-amber-200/85 w-fit">
                              Default Menu Rotation Active
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
                            const prefs = customizations?.preferences?.[day] || {};
                            const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                            const hasPrefs = !!(prefs.sabzi1 || prefs.sabzi2 || prefs.specialFood || prefs.dessert || prefs.sideOption);
                            
                            return (
                              <div key={day} className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                  <h4 className="font-extrabold text-primary text-sm mb-3">{dayName}</h4>
                                  <div className="space-y-2 text-xs font-semibold">
                                    {prefs.sabzi1 && (
                                      <p className="text-gray-700 flex items-center gap-1.5">
                                        <span className="text-gray-400">•</span> {prefs.sabzi1}
                                      </p>
                                    )}
                                    {prefs.sabzi2 && (
                                      <p className="text-gray-700 flex items-center gap-1.5">
                                        <span className="text-gray-400">•</span> {prefs.sabzi2}
                                      </p>
                                    )}
                                    {prefs.specialFood && (
                                      <p className="text-orange-700 font-bold flex items-center gap-1.5">
                                        <span>🌟</span> {prefs.specialFood}
                                      </p>
                                    )}
                                    {prefs.dessert && (
                                      <p className="text-pink-700 font-bold flex items-center gap-1.5">
                                        <span>🍮</span> {prefs.dessert}
                                      </p>
                                    )}
                                    {!hasPrefs && (
                                      <p className="text-gray-400 italic font-medium">Chef's Selection Rotation</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Side Dish</span>
                                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${
                                    prefs.sideOption === 'Salad' 
                                      ? 'bg-orange-50 text-orange-700 border-orange-200' 
                                      : 'bg-teal-50/50 text-teal-700 border-teal-150'
                                  }`}>
                                    {prefs.sideOption === 'Salad' ? '🥗 Salad' : '🥣 Raita'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  Weekly Schedule
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-text-secondary">Days</span>
                    <span className="font-medium">Mon - Sat</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-text-secondary">Delivery Time</span>
                    <span className="font-medium">6:00 PM</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-text-secondary">Exclusions</span>
                    <span className="font-medium">Sundays & Holidays</span>
                  </div>
                </div>
              </div>

              {/* Skipped Dates History (Tied to the selected plan) */}
              {subscription.skippedDates && subscription.skippedDates.length > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-yellow-800">
                    📅 Skipped Dates History
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {subscription.skippedDates
                      .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())
                      .map((date: string, idx: number) => {
                        const dateObj = new Date(date);
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-yellow-100 rounded-lg">
                            <p className="font-medium text-sm">
                              {dateObj.toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <span className="text-xs px-2 py-1 rounded bg-yellow-300 text-yellow-850 font-bold">
                              Skipped
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-900 mb-2">👥 Family & Multi-Plans</h4>
                <p className="text-sm text-blue-800 leading-relaxed font-medium">
                  You can now purchase and run multiple active subscription plans concurrently! Click "Buy Additional Plan" at the top to add plans for family or coworkers.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">We're sorry to see you go 😢</h3>
            <p className="text-gray-600 mb-4">Please tell us why you are cancelling so we can improve.</p>
            
            <div className="space-y-3 mb-6">
              {['Too expensive', 'Not satisfied with food quality', 'Moving out of area', 'Cooking myself', 'Other'].map(reason => (
                <label key={reason} className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="cancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="text-primary focus:ring-primary"
                  />
                  <span>{reason}</span>
                </label>
              ))}
              
              {cancelReason === 'Other' && (
                <textarea 
                  placeholder="Please specify..."
                  value={cancelOtherReason}
                  onChange={(e) => setCancelOtherReason(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm mt-2"
                  rows={2}
                />
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
              >
                Keep Subscription
              </button>
              <button 
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={!cancelReason || (cancelReason === 'Other' && !cancelOtherReason) || cancelSubscriptionMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {cancelSubscriptionMutation.isPending && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Tomorrow Modal */}
      {isSkipModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-2xl font-bold mb-4 text-yellow-700 flex items-center gap-2">
              ⚠️ Skip Tomorrow's Delivery?
            </h3>
            
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                📋 Important Guidelines:
              </h4>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span><strong>Cutoff Time:</strong> You can skip tomorrow's delivery if you request before 11:59 PM today.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span><strong>Subscription Extension:</strong> Your subscription will automatically be extended by 1 day to compensate for the skipped delivery.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span><strong>No Refunds:</strong> This feature pauses your delivery, not refunds. The skipped day extends your plan duration.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span><strong>Cannot Undo:</strong> Once confirmed, you cannot undo this action for tomorrow's date.</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 font-bold">
                <strong>📅 Skipping Date:</strong> {new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsSkipModalOpen(false)}
                className="px-6 py-2.5 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => skipDateMutation.mutate()}
                disabled={skipDateMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition"
              >
                {skipDateMutation.isPending && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                Yes, Skip Tomorrow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
            <h3 className="text-xl font-extrabold text-slate-900 mb-2 flex items-center gap-2">
              <Star className="text-yellow-500 fill-yellow-500" size={24} />
              Share Your Feedback
            </h3>
            <p className="text-slate-500 text-xs mb-6">
              Your feedback helps us improve our meal quality and service. Tell us about your experience!
            </p>
            
            <div className="space-y-4 mb-6">
              {/* Star Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="transition transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        size={32}
                        className={`${
                          star <= reviewRating 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Review Title</label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="e.g. Delicious food, Great delivery!"
                />
              </div>

              {/* Comment */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Review Comments</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="Tell us what you liked or how we can improve..."
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button 
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setReviewTitle('');
                  setReviewComment('');
                  setReviewRating(5);
                }}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => submitReviewMutation.mutate()}
                disabled={!reviewTitle || !reviewComment || submitReviewMutation.isPending}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition text-sm shadow-sm"
              >
                {submitReviewMutation.isPending && (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                )}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default MySubscription;
