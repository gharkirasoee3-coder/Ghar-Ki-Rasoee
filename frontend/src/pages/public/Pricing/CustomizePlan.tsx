import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Info, Sparkles, RefreshCw, ShoppingCart, Sliders } from 'lucide-react';
import { ENV } from '../../../config/env.config';
import PageContainer from '../../../components/layout/PageContainer';
import { toast } from 'sonner';

interface CustomPricingConfig {
  basePrice: number;
  pricePerRoti: number;
  pricePerSabzi: number;
  raitaPrice3Days: number;
  raitaPriceDaily: number;
  dessertPriceWeekly: number;
  dessertPriceDaily: number;
  saturdaySpecialPrice: number;
}

interface PlanDetails {
  name: string;
  price: number;
  features: string[];
}

const CustomizePlan: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'existing' | 'scratch'>('existing');
  const [basePlan, setBasePlan] = useState<'basic' | 'standard' | 'premium'>('standard');
  const [plans, setPlans] = useState<Record<string, PlanDetails>>({});
  
  // Custom Plan State
  const [roti, setRoti] = useState(8);
  const [sabziChoices, setSabziChoices] = useState(2);
  const [raitaOption, setRaitaOption] = useState<'none' | '3days' | 'daily'>('3days');
  const [dessertOption, setDessertOption] = useState<'none' | 'weekly' | 'daily'>('none');
  const [saturdaySpecial, setSaturdaySpecial] = useState(false);

  // Pricing rules
  const [pricingConfig, setPricingConfig] = useState<CustomPricingConfig>({
    basePrice: 100,
    pricePerRoti: 5,
    pricePerSabzi: 20,
    raitaPrice3Days: 10,
    raitaPriceDaily: 20,
    dessertPriceWeekly: 10,
    dessertPriceDaily: 30,
    saturdaySpecialPrice: 15
  });

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await axios.get(`${ENV.API_URL}/menu/plans`);
        if (res.data.data.customPricingConfig) {
          setPricingConfig(res.data.data.customPricingConfig);
        }
        if (res.data.data.plans) {
          setPlans(res.data.data.plans);
        }
      } catch (error) {
        console.error("Failed to fetch plan config:", error);
        toast.error("Failed to load live pricing rules. Using default guidelines.");
      } finally {
        setLoading(false);
      }
    };
    fetchPricing();
  }, []);

  // Set default specifications when switching modes or base plan
  useEffect(() => {
    if (mode === 'existing') {
      if (basePlan === 'basic') {
        setRoti(4);
        setSabziChoices(1);
        setRaitaOption('3days');
        setDessertOption('none');
        setSaturdaySpecial(false);
      } else if (basePlan === 'standard') {
        setRoti(8);
        setSabziChoices(2);
        setRaitaOption('3days');
        setDessertOption('none');
        setSaturdaySpecial(false);
      } else if (basePlan === 'premium') {
        setRoti(8);
        setSabziChoices(2);
        setRaitaOption('daily');
        setDessertOption('weekly');
        setSaturdaySpecial(true);
      }
    } else {
      // From Scratch Defaults
      setRoti(6);
      setSabziChoices(2);
      setRaitaOption('3days');
      setDessertOption('none');
      setSaturdaySpecial(false);
    }
  }, [mode, basePlan]);

  const getRaitaPrice = (opt: 'none' | '3days' | 'daily') => {
    if (opt === 'daily') return pricingConfig.raitaPriceDaily;
    if (opt === '3days') return pricingConfig.raitaPrice3Days;
    return 0;
  };

  const getDessertPrice = (opt: 'none' | 'weekly' | 'daily') => {
    if (opt === 'daily') return pricingConfig.dessertPriceDaily;
    if (opt === 'weekly') return pricingConfig.dessertPriceWeekly;
    return 0;
  };

  // Price Calculation Logic (matches backend exactly)
  const calculatePrice = () => {
    if (mode === 'scratch') {
      const base = pricingConfig.basePrice;
      const rotiPrice = roti * pricingConfig.pricePerRoti;
      const sabziPrice = sabziChoices * pricingConfig.pricePerSabzi;
      const raitaPrice = getRaitaPrice(raitaOption);
      const dessertPrice = getDessertPrice(dessertOption);
      const satSpecialPrice = saturdaySpecial ? pricingConfig.saturdaySpecialPrice : 0;
      return base + rotiPrice + sabziPrice + raitaPrice + dessertPrice + satSpecialPrice;
    } else {
      const planKey = basePlan;
      const planInfo = plans[planKey];
      if (!planInfo) return 190; // Fallback default

      let baseRoti = 8;
      let baseSabzi = 2;
      let baseRaita: 'none' | '3days' | 'daily' = '3days';
      let baseDessert: 'none' | 'weekly' | 'daily' = 'none';
      let baseSaturday = false;

      if (planKey === 'basic') {
        baseRoti = 4;
        baseSabzi = 1;
        baseRaita = '3days';
        baseDessert = 'none';
        baseSaturday = false;
      } else if (planKey === 'standard') {
        baseRoti = 8;
        baseSabzi = 2;
        baseRaita = '3days';
        baseDessert = 'none';
        baseSaturday = false;
      } else if (planKey === 'premium') {
        baseRoti = 8;
        baseSabzi = 2;
        baseRaita = 'daily';
        baseDessert = 'weekly';
        baseSaturday = true;
      }

      const planBasePrice = planInfo.price;
      const rotiDiff = (roti - baseRoti) * pricingConfig.pricePerRoti;
      const sabziDiff = (sabziChoices - baseSabzi) * pricingConfig.pricePerSabzi;
      const raitaDiff = getRaitaPrice(raitaOption) - getRaitaPrice(baseRaita);
      const dessertDiff = getDessertPrice(dessertOption) - getDessertPrice(baseDessert);
      const satSpecialDiff = (saturdaySpecial ? pricingConfig.saturdaySpecialPrice : 0) - (baseSaturday ? pricingConfig.saturdaySpecialPrice : 0);

      return planBasePrice + rotiDiff + sabziDiff + raitaDiff + dessertDiff + satSpecialDiff;
    }
  };

  const totalPrice = calculatePrice();

  const handleCheckout = () => {
    const formattedRaita = raitaOption === 'none' ? 'No Raita or Salad' : raitaOption === '3days' ? 'Raita or Salad 3 Days/Week' : 'Daily Raita or Salad';
    const formattedDessert = dessertOption === 'none' ? 'No Dessert' : dessertOption === 'weekly' ? 'Weekly Dessert (Wed)' : 'Daily Dessert';

    const customPlan = {
      name: 'Custom Plan',
      price: totalPrice,
      features: [
        `${roti} Tawa Roti per delivery`,
        `${sabziChoices} Sabzi choice(s) per delivery`,
        formattedRaita,
        formattedDessert,
        saturdaySpecial ? 'Saturday Special Food + Dessert' : 'No Saturday Special',
        '6 Days delivery (Mon - Sat)',
        '100% fresh ingredients'
      ],
      customDetails: {
        basePlan: mode === 'existing' ? basePlan : 'scratch',
        roti,
        sabziChoices,
        raitaOption,
        dessertOption,
        saturdaySpecial
      }
    };

    navigate('/subscription-checkout', { state: { plan: customPlan } });
  };

  if (loading) {
    return (
      <PageContainer className="py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading customizer engine...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-10 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/pricing')}
          className="flex items-center gap-2 text-text-secondary hover:text-primary mb-4 transition font-medium"
        >
          <ChevronLeft size={20} />
          Back to Pricing Plans
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-text-primary flex items-center gap-2">
              <Sparkles className="text-primary animate-pulse" />
              Customize Your Subscription
            </h1>
            <p className="text-text-secondary mt-1">Configure your tiffin exactly how you want it, with instant price adjustments.</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Configuration Controls */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Mode Selector Tab */}
          <div className="bg-white rounded-2xl border border-gray-200 p-2 flex gap-2">
            <button
              onClick={() => setMode('existing')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                mode === 'existing'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-secondary hover:bg-gray-50'
              }`}
            >
              <Sliders size={18} />
              Modify Existing Plan
            </button>
            <button
              onClick={() => setMode('scratch')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                mode === 'scratch'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-secondary hover:bg-gray-50'
              }`}
            >
              <RefreshCw size={18} />
              Build From Scratch
            </button>
          </div>

          {/* Configuration Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-8 shadow-sm">
            {mode === 'existing' && (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-text-primary uppercase tracking-wider">Select Base Plan</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['basic', 'standard', 'premium'] as const).map((planKey) => {
                    const planInfo = plans[planKey];
                    return (
                      <button
                        key={planKey}
                        onClick={() => setBasePlan(planKey)}
                        className={`p-4 rounded-xl border-2 transition text-center flex flex-col items-center justify-center ${
                          basePlan === planKey
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="font-bold capitalize">{planKey}</span>
                        <span className="text-xs text-text-secondary mt-1">${planInfo?.price || 0}/mo</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Roti Count */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-base font-bold text-text-primary">Daily Roti Quantity</label>
                  <span className="text-xs text-text-secondary">Fresh wheat tawa roti made fresh daily</span>
                </div>
                <span className="text-2xl font-black text-primary bg-primary/10 px-4 py-1.5 rounded-full">{roti} Roti</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setRoti(prev => Math.max(0, prev - 2))}
                  disabled={roti <= 0}
                  className="w-12 h-12 rounded-xl border border-gray-300 flex items-center justify-center font-bold text-xl hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="2"
                  value={roti}
                  onChange={(e) => setRoti(Number(e.target.value))}
                  className="flex-1 accent-primary h-2 bg-gray-200 rounded-lg cursor-pointer"
                />
                <button
                  onClick={() => setRoti(prev => Math.min(12, prev + 2))}
                  disabled={roti >= 12}
                  className="w-12 h-12 rounded-xl border border-gray-300 flex items-center justify-center font-bold text-xl hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>

            {/* Sabzi Choices */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-base font-bold text-text-primary">Daily Sabzi Selection</label>
                  <span className="text-xs text-text-secondary">Choose how many distinct dishes you receive daily</span>
                </div>
                <span className="text-2xl font-black text-primary bg-primary/10 px-4 py-1.5 rounded-full">{sabziChoices} Choices</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((choice) => (
                  <button
                    key={choice}
                    onClick={() => setSabziChoices(choice)}
                    className={`py-3.5 rounded-xl border-2 transition text-center font-bold text-sm md:text-base ${
                      sabziChoices === choice
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:border-gray-300 text-text-secondary'
                    }`}
                  >
                    {choice} Sabzi{choice > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Raita or Salad Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-base font-bold text-text-primary">Raita or Salad Option</label>
                <span className="text-xs text-text-secondary">Select Raita or Salad option as your daily side dish</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['none', '3days', 'daily'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setRaitaOption(opt)}
                    className={`py-3.5 rounded-xl border-2 transition text-center font-bold text-sm md:text-base capitalize ${
                      raitaOption === opt
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:border-gray-300 text-text-secondary'
                    }`}
                  >
                    {opt === 'none' ? 'None' : opt === '3days' ? '3 Days/Wk' : 'Daily'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dessert Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-base font-bold text-text-primary">Dessert Option</label>
                <span className="text-xs text-text-secondary">Sweet Indian desserts (Kheer, Gulab Jamun, Halwa, etc.)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['none', 'weekly', 'daily'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDessertOption(opt)}
                    className={`py-3.5 rounded-xl border-2 transition text-center font-bold text-sm md:text-base capitalize ${
                      dessertOption === opt
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 hover:border-gray-300 text-text-secondary'
                    }`}
                  >
                    {opt === 'none' ? 'None' : opt === 'weekly' ? 'Weekly (Wed)' : 'Daily'}
                  </button>
                ))}
              </div>
            </div>

            {/* Saturday Special Toggle */}
            <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-200 flex items-center justify-between">
              <div className="flex gap-3">
                <span className="text-3xl">🎉</span>
                <div>
                  <h4 className="font-bold text-orange-950 text-base">Saturday Chef's Special</h4>
                  <p className="text-xs text-orange-800">Includes specialty meals (Paneer tikka, Chole bhature) + sweet</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={saturdaySpecial}
                  onChange={(e) => setSaturdaySpecial(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Side: Price Summary and Breakdown */}
        <div className="col-span-12 lg:col-span-5 lg:sticky lg:top-24">
          <div className="bg-white rounded-3xl border-2 border-gray-200 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
            {/* Header backdrop gradient */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-orange-400"></div>

            <h3 className="font-extrabold text-xl text-text-primary">Plan Price Summary</h3>

            {/* Cost Breakdown */}
            <div className="space-y-4 py-2 border-y border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">
                  {mode === 'existing' ? `Base Plan (${basePlan})` : 'Base Customizable Price'}
                </span>
                <span className="font-bold text-text-primary">
                  ${mode === 'existing' ? plans[basePlan]?.price : pricingConfig.basePrice} CAD
                </span>
              </div>

              {/* Roti Calc */}
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">Roti Configuration ({roti} rotis)</span>
                {mode === 'scratch' ? (
                  <span className="font-bold text-text-primary">+${roti * pricingConfig.pricePerRoti} CAD</span>
                ) : (
                  (() => {
                    const baseRoti = basePlan === 'basic' ? 4 : 8;
                    const diff = (roti - baseRoti) * pricingConfig.pricePerRoti;
                    return (
                      <span className={`font-bold ${diff >= 0 ? 'text-text-primary' : 'text-green-600'}`}>
                        {diff >= 0 ? '+' : '-'}${Math.abs(diff)} CAD
                      </span>
                    );
                  })()
                )}
              </div>

              {/* Sabzi Choices Calc */}
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">Daily Sabzi ({sabziChoices} choice{sabziChoices > 1 ? 's' : ''})</span>
                {mode === 'scratch' ? (
                  <span className="font-bold text-text-primary">+${sabziChoices * pricingConfig.pricePerSabzi} CAD</span>
                ) : (
                  (() => {
                    const baseSabzi = basePlan === 'basic' ? 1 : 2;
                    const diff = (sabziChoices - baseSabzi) * pricingConfig.pricePerSabzi;
                    return (
                      <span className={`font-bold ${diff >= 0 ? 'text-text-primary' : 'text-green-600'}`}>
                        {diff >= 0 ? '+' : '-'}${Math.abs(diff)} CAD
                      </span>
                    );
                  })()
                )}
              </div>

              {/* Raita or Salad Calc */}
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">Raita or Salad ({raitaOption === 'none' ? 'None' : raitaOption === '3days' ? '3 Days' : 'Daily'})</span>
                {mode === 'scratch' ? (
                  <span className="font-bold text-text-primary">+${getRaitaPrice(raitaOption)} CAD</span>
                ) : (
                  (() => {
                    const baseRaita = basePlan === 'premium' ? 'daily' : '3days';
                    const diff = getRaitaPrice(raitaOption) - getRaitaPrice(baseRaita);
                    return (
                      <span className={`font-bold ${diff >= 0 ? 'text-text-primary' : 'text-green-600'}`}>
                        {diff >= 0 ? '+' : '-'}${Math.abs(diff)} CAD
                      </span>
                    );
                  })()
                )}
              </div>

              {/* Dessert Calc */}
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">Dessert Option ({dessertOption === 'none' ? 'None' : dessertOption === 'weekly' ? 'Weekly' : 'Daily'})</span>
                {mode === 'scratch' ? (
                  <span className="font-bold text-text-primary">+${getDessertPrice(dessertOption)} CAD</span>
                ) : (
                  (() => {
                    const baseDessert = basePlan === 'premium' ? 'weekly' : 'none';
                    const diff = getDessertPrice(dessertOption) - getDessertPrice(baseDessert);
                    return (
                      <span className={`font-bold ${diff >= 0 ? 'text-text-primary' : 'text-green-600'}`}>
                        {diff >= 0 ? '+' : '-'}${Math.abs(diff)} CAD
                      </span>
                    );
                  })()
                )}
              </div>

              {/* Saturday Special Calc */}
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">Saturday Special ({saturdaySpecial ? 'Yes' : 'No'})</span>
                {mode === 'scratch' ? (
                  <span className="font-bold text-text-primary">
                    +{saturdaySpecial ? pricingConfig.saturdaySpecialPrice : 0} CAD
                  </span>
                ) : (
                  (() => {
                    const baseSaturday = basePlan === 'premium';
                    const diff = (saturdaySpecial ? pricingConfig.saturdaySpecialPrice : 0) - (baseSaturday ? pricingConfig.saturdaySpecialPrice : 0);
                    return (
                      <span className={`font-bold ${diff >= 0 ? 'text-text-primary' : 'text-green-600'}`}>
                        {diff >= 0 ? '+' : '-'}${Math.abs(diff)} CAD
                      </span>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Total Price display */}
            <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary uppercase font-bold tracking-wider">Total Monthly Price</p>
                <p className="text-sm text-text-secondary font-medium mt-0.5">Pause/Cancel anytime</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-primary">${totalPrice}</span>
                <span className="text-xs text-text-secondary block font-bold mt-0.5">CAD / month</span>
              </div>
            </div>

            {/* Call to action */}
            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-primary text-white hover:bg-primary-hover rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              <ShoppingCart size={20} />
              Proceed to Checkout
            </button>

            {/* Policy Notes */}
            <div className="flex gap-2.5 text-xs text-text-secondary bg-gray-50 p-4 rounded-xl">
              <Info size={16} className="text-primary shrink-0 mt-0.5" />
              <p className="leading-normal">
                This custom price represents your monthly tiffin plan. Custom choices are configured daily by you. You can adjust your roti/sabzi selections for each day of the week after checkout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default CustomizePlan;
