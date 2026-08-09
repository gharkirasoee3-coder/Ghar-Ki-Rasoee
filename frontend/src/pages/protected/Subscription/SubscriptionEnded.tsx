import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarX, RefreshCw, Search, MapPin, Crown } from 'lucide-react';
import PageContainer from '../../../components/layout/PageContainer';

interface SubscriptionEndedProps {
  subscription: any;
}

const SubscriptionEnded: React.FC<SubscriptionEndedProps> = ({ subscription }) => {
  const navigate = useNavigate();

  const handleRenew = () => {
    navigate('/subscription-checkout', { 
      state: { 
        plan: subscription.planDetails,
        address: subscription.deliveryAddress 
      } 
    });
  };

  const handleViewOtherPlans = () => {
    navigate('/pricing');
  };

  const isCancelled = subscription.status === 'Cancelled';
  const title = isCancelled ? 'Subscription Cancelled' : 'Subscription Expired';
  const message = isCancelled 
    ? 'Your subscription has been cancelled. You can easily reactivate it to continue receiving delicious meals.' 
    : 'Your subscription period has ended. Renew now to avoid missing your daily meals!';

  return (
    <PageContainer className="py-16">
      <div className="max-w-2xl mx-auto bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100 text-center relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-bl-full -z-10 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-50 rounded-tr-full -z-10 opacity-50"></div>

        <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-200">
          <CalendarX size={48} strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{title}</h1>
        <p className="text-gray-600 mb-10 max-w-md mx-auto leading-relaxed">{message}</p>

        {/* Previous Plan Details */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-left mb-10">
          <h3 className="font-bold text-gray-400 uppercase tracking-wider text-xs mb-4 text-center">Previous Plan Details</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-50">
               <div className="flex items-center gap-2 mb-1">
                 <Crown size={16} className="text-primary" />
                 <p className="font-bold text-gray-900 text-sm">Plan</p>
               </div>
               <p className="text-gray-600 text-sm">{subscription.plan}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-50">
               <div className="flex items-start gap-2 mb-1">
                 <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                 <div className="flex-1 min-w-0">
                   <p className="font-bold text-gray-900 text-sm">Delivery Location</p>
                   <p className="text-gray-600 text-xs mt-1 break-words line-clamp-3" title={subscription.deliveryAddress}>
                     {subscription.deliveryAddress || 'Not specified'}
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={handleRenew}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <RefreshCw size={20} />
            Renew Instantly
          </button>
          
          <button 
            onClick={handleViewOtherPlans}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 px-8 py-4 rounded-xl font-bold transition-all active:scale-[0.98]"
          >
            <Search size={20} />
            View Other Plans
          </button>
        </div>
      </div>
    </PageContainer>
  );
};

export default SubscriptionEnded;
