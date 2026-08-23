import React, { useState, useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { useCity } from '../../../context/CityContext';

interface Plan {
  key: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
  badge?: string;
  roti?: number;
  sabziChoices?: number;
}

const staticFallbackPlans: Plan[] = [
  {
    key: 'basic',
    name: 'Basic', 
    price: 150,
    features: ['4 Tawa Roti', '1 Sabzi (Choose from daily options)', 'Raita or Salad 3 times a week', '6 Days delivery', '100% Fresh Ingredients'],
    popular: false,
    badge: ''
  },
  {
    key: 'standard',
    name: 'Standard',
    price: 190,
    features: ['8 Tawa Roti', '2 Sabzi (Choose from daily options)', 'Raita or Salad 3 times a week', '6 Days delivery', '100% Fresh Ingredients'],
    popular: false,
    badge: 'Recommended'
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 220,
    features: ['8 Tawa Roti', '2 Sabzi (Choose from daily options)', 'Daily Raita or Salad', 'Wednesday Dessert', 'Saturday: Special Food + Dessert', '6 Days delivery'],
    popular: true,
    badge: 'Most Popular'
  },
  {
    key: 'customizable',
    name: 'Build Your Own Plan',
    price: 200,
    features: ['Fully customizable daily meal choices', 'Customize Roti Count (0 to 12)', 'Choose Sabzi quantity (1 to 3)', 'Configure Raita and Desserts', 'Real-time dynamic pricing'],
    popular: false,
    badge: 'Highly Flexible'
  }
];

const PlansSection: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedCity } = useCity();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${ENV.API_URL}/menu/plans`, {
          params: { city: selectedCity }
        });
        const plansObj = res.data.data.plans;
        const plansArray = Object.keys(plansObj).map(key => {
          const plan = plansObj[key];
          // Map popular/badge properties for visual hierarchy
          let popular = false;
          let badge = '';
          if (key === 'premium') {
            popular = true;
            badge = 'Most Popular';
          } else if (key === 'standard') {
            badge = 'Recommended';
          } else if (key === 'customizable') {
            badge = 'Highly Flexible';
          }
          return {
            key,
            name: plan.name,
            price: plan.price,
            features: plan.features || [],
            popular,
            badge,
            roti: plan.roti,
            sabziChoices: plan.sabziChoices
          };
        });

        // Ensure customizable is the last item
        plansArray.sort((a, b) => {
          if (a.key === 'customizable') return 1;
          if (b.key === 'customizable') return -1;
          return a.price - b.price;
        });

        setPlans(plansArray);
      } catch (error) {
        console.error("Failed to fetch plans from backend, using fallback:", error);
        setPlans(staticFallbackPlans);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [selectedCity]);

  if (loading) {
    return (
      <section className="py-24 bg-white text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-secondary">Loading pricing plans...</p>
      </section>
    );
  }

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-primary tracking-widest uppercase mb-3">Pricing Plans</h2>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-text-primary mb-6">Simple, Transparent Pricing</h3>
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed px-2">
            Select a plan that fits your lifestyle. Pause or cancel anytime. No hidden fees, just great food delivered to you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isCustom = plan.key === 'customizable';
            return (
              <div 
                key={plan.key}
                className={`relative rounded-[2.2rem] p-6 sm:p-8 transition-all duration-500 flex flex-col justify-between border-2 hover:-translate-y-2
                  ${plan.popular 
                    ? 'border-primary shadow-2xl scale-[1.02] lg:scale-105 z-10 ring-4 ring-primary/10 bg-gradient-to-br from-white via-red-50/5 to-red-50/15' 
                    : isCustom
                    ? 'border-amber-400 shadow-2xl scale-[1.02] lg:scale-105 z-10 ring-4 ring-amber-500/10 bg-gradient-to-br from-white via-amber-50/5 to-amber-50/15'
                    : plan.key === 'standard'
                    ? 'border-blue-100 shadow-[0_8px_30px_rgba(59,130,246,0.03)] hover:shadow-blue-200/30 hover:border-blue-300 bg-gradient-to-br from-white to-blue-50/10'
                    : 'border-emerald-100 shadow-[0_8px_30px_rgba(16,185,129,0.03)] hover:shadow-emerald-200/30 hover:border-emerald-300 bg-gradient-to-br from-white to-emerald-50/10'
                  }
                `}
              >
                {/* Custom/Popular Badge */}
                {plan.badge && (
                  <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md whitespace-nowrap z-20
                    ${plan.popular 
                      ? 'bg-gradient-to-r from-primary to-primary-hover text-white shadow-red-200' 
                      : isCustom 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-200' 
                      : plan.key === 'standard'
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-600 text-white'}`}>
                    {plan.badge}
                  </div>
                )}
                
                <div>
                  <div className="text-center mb-6 mt-4">
                    <h4 className={`text-xl font-black mb-2 flex items-center justify-center gap-1.5 ${
                      plan.popular ? 'text-primary' : isCustom ? 'text-amber-600' : 'text-text-primary'
                    }`}>
                      {isCustom && <Sparkles size={18} className="text-amber-500 animate-bounce" />}
                      {plan.name}
                    </h4>
                    {isCustom ? (
                      <div className="h-[52px] flex items-center justify-center">
                        <span className="text-sm font-extrabold uppercase text-amber-600 tracking-wider bg-amber-50 border-2 border-amber-300 px-4 py-1.5 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          Flexible Price
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-end justify-center gap-1">
                        <span className="text-xl font-bold text-text-secondary mb-1">$</span>
                        <span className={`text-5xl font-black tracking-tight ${
                          plan.popular ? 'text-primary' : plan.key === 'standard' ? 'text-blue-650' : 'text-emerald-650'
                        }`}>
                          {plan.price}
                        </span>
                        <span className="text-sm text-text-secondary font-semibold mb-1.5">/mo</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6"></div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-text-secondary font-medium">
                        <div className={`mt-0.5 mr-3 shrink-0 rounded-full p-0.5 
                          ${plan.popular 
                            ? 'bg-primary/10 text-primary' 
                            : isCustom 
                            ? 'bg-amber-100 text-amber-650' 
                            : plan.key === 'standard'
                            ? 'bg-blue-105 text-blue-600'
                            : 'bg-emerald-105 text-emerald-605'}`}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span className="leading-snug text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={() => {
                    if (isCustom) {
                      navigate('/subscription/customize-plan');
                    } else {
                      navigate('/subscription-checkout', { state: { plan } });
                    }
                  }}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wide uppercase transition-all duration-300 shadow-md flex justify-center items-center gap-2 mt-auto
                    ${plan.popular 
                      ? 'bg-gradient-to-r from-primary to-primary-hover text-white hover:shadow-lg hover:shadow-primary/30 hover:brightness-110' 
                      : isCustom
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30 hover:brightness-110'
                      : plan.key === 'standard'
                      ? 'bg-white text-blue-650 border-2 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                      : 'bg-white text-emerald-650 border-2 border-emerald-200 hover:bg-emerald-650 hover:text-white hover:border-emerald-655'
                    }
                  `}
                >
                  {isCustom ? 'Configure Plan' : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PlansSection;
