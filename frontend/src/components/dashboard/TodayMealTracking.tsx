import React from 'react';
import { Truck, CheckCircle, Utensils, Package } from 'lucide-react';
import { Order } from '../../types/order';

interface TodayMealTrackingProps {
  order: Order;
}

const TodayMealTracking: React.FC<TodayMealTrackingProps> = ({ order }) => {
  const steps = [
    { name: 'Confirmed', icon: CheckCircle, color: 'text-blue-500' },
    { name: 'Cooking', icon: Utensils, color: 'text-amber-500' },
    { name: 'Out for Delivery', icon: Truck, color: 'text-purple-500' },
    { name: 'Delivered', icon: Package, color: 'text-emerald-500' },
  ];

  const currentStepIndex = steps.findIndex(step => step.name === order.status);
  
  return (
    <div className="bg-white border-2 border-primary/10 rounded-3xl p-6 mb-8 shadow-sm overflow-hidden relative group hover:shadow-md transition-shadow">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
        <Truck size={120} />
      </div>

      <div className="relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Today's Meal</span>
              <span className="text-xs text-text-secondary font-bold">Order #{order.orderId.slice(0, 8)}</span>
            </div>
            <h2 className="text-2xl font-black text-text-primary tracking-tight">Track Your Delivery</h2>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <p className="text-sm font-bold text-text-primary">Live Tracking Active</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-gray-100 -z-0">
             <div 
               className="h-full bg-primary transition-all duration-1000 ease-in-out" 
               style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
             ></div>
          </div>

          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const StepIcon = step.icon;

            return (
              <div key={idx} className="flex flex-col items-center relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                  isActive 
                    ? `bg-white ${step.color} border-current shadow-lg scale-110` 
                    : isCompleted 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white text-gray-300 border-gray-100'
                }`}>
                  <StepIcon size={24} />
                </div>
                <div className="text-center mt-3">
                  <p className={`text-xs font-black uppercase tracking-widest leading-none ${
                    isActive ? step.color : isCompleted ? 'text-primary' : 'text-gray-400'
                  }`}>
                    {step.name}
                  </p>
                  {isActive && (
                    <p className="text-[10px] font-bold text-text-secondary mt-1 animate-bounce">Current Status</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="mt-8 pt-6 border-t border-gray-50 flex flex-col sm:flex-row justify-between gap-4">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                <Utensils size={20} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Plan Type</p>
                <p className="text-sm font-black text-text-primary">{order.plan || 'Standard Subscription'}</p>
              </div>
           </div>
           {currentStepIndex === steps.length - 1 ? (
             <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
                <CheckCircle size={20} />
                <span className="text-sm font-black uppercase tracking-tight">Your meal has been delivered! Enjoy!</span>
             </div>
           ) : (
             <p className="text-xs text-text-secondary font-medium self-center max-w-xs text-right">
                Our team is working hard to bring you fresh food. Status is updated in real-time by your delivery partner.
             </p>
           )}
        </div>
      </div>
    </div>
  );
};

export default TodayMealTracking;
