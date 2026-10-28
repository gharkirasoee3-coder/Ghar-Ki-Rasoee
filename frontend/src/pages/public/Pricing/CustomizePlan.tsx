import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Info, Minus, Plus, ShoppingCart, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { ENV } from '../../../config/env.config';
import PageContainer from '../../../components/layout/PageContainer';
import { useCity } from '../../../context/CityContext';

type Frequency = 'none' | 'threePerWeek' | 'daily';
type SweetFrequency = 'none' | 'twicePerWeek';
type BasePlanKey = 'basic' | 'standard' | 'premium' | 'scratch';

interface Selections {
  roti: number;
  sabji: number;
  dal: number;
  rice: number;
  raitaFrequency: Frequency;
  saladFrequency: Frequency;
  sweetDishFrequency: SweetFrequency;
  saturdaySpecial: boolean;
}

interface PlanDetails {
  name: string;
  price: number;
  features: string[];
  components?: Partial<Selections>;
}

interface Adjustment {
  item: string;
  quantity?: number;
  total: number;
  frequency?: string;
}

interface Quote {
  pricingVersion: number;
  currency: string;
  basePackagePrice: number;
  basePlan?: string;
  removals: Adjustment[];
  additions: Adjustment[];
  removalTotal: number;
  additionTotal: number;
  customizedSubtotal: number;
  selectedComponents: Selections;
}

const FALLBACK: Record<BasePlanKey, Selections> = {
  basic: { roti: 4, sabji: 1, dal: 0, rice: 0, raitaFrequency: 'threePerWeek', saladFrequency: 'none', sweetDishFrequency: 'none', saturdaySpecial: false },
  standard: { roti: 8, sabji: 2, dal: 0, rice: 0, raitaFrequency: 'threePerWeek', saladFrequency: 'none', sweetDishFrequency: 'none', saturdaySpecial: false },
  premium: { roti: 8, sabji: 2, dal: 0, rice: 0, raitaFrequency: 'daily', saladFrequency: 'none', sweetDishFrequency: 'twicePerWeek', saturdaySpecial: true },
  scratch: { roti: 8, sabji: 0, dal: 0, rice: 0, raitaFrequency: 'none', saladFrequency: 'none', sweetDishFrequency: 'none', saturdaySpecial: false }
};

const money = (value: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value || 0);

const itemLabel = (value: string) =>
  ({ roti: 'Roti', sabji: 'Sabji', dal: 'Dal', rice: 'Rice', raita: 'Raita', salad: 'Salad', sweetDish: 'Sweet Dish', saturdaySpecial: 'Saturday Special' }[value] || value);

const frequencyLabel = (value?: string) =>
  value === 'threePerWeek' ? ' · 3x/week' : value === 'daily' ? ' · Daily' : value === 'twicePerWeek' ? ' · 2x/week' : '';

const CustomizePlan: React.FC = () => {
  const navigate = useNavigate();
  const { selectedCity, selectedCategory, cityCategories, openCityModal } = useCity();
  const [basePlan, setBasePlan] = useState<BasePlanKey>('standard');
  const [plans, setPlans] = useState<Record<string, PlanDetails>>({});
  const [selections, setSelections] = useState<Selections>(FALLBACK.standard);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteRefreshTick, setQuoteRefreshTick] = useState(0);

  const isScratch = basePlan === 'scratch';

  useEffect(() => {
    let active = true;
    setLoading(true);
    axios.get(`${ENV.API_URL}/menu/plans`, { params: { city: selectedCity } })
      .then(({ data }) => {
        if (active) setPlans(data?.data?.plans || {});
      })
      .catch(() => toast.error('Unable to load current plan pricing.'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedCity]);

  useEffect(() => {
    if (basePlan === 'scratch') {
      setSelections(prev => ({
        roti: Math.max(1, prev.roti || 8),
        sabji: 0,
        dal: 0,
        rice: 0,
        raitaFrequency: 'none',
        saladFrequency: 'none',
        sweetDishFrequency: 'none',
        saturdaySpecial: false
      }));
    } else {
      setSelections({
        ...FALLBACK[basePlan],
        ...(plans[basePlan]?.components || {})
      });
    }
  }, [basePlan, plans]);

  const requestBody = useMemo(() => ({ basePlan, selections, city: selectedCity }), [basePlan, selections, selectedCity]);

  const includedComponents = basePlan === 'scratch'
    ? FALLBACK.scratch
    : { ...FALLBACK[basePlan], ...(plans[basePlan]?.components || {}) };

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoting(true);
      setQuoteError('');
      try {
        const res = await axios.post(`${ENV.API_URL}/menu/custom-plan/quote`, requestBody, { signal: controller.signal });
        setQuote(res.data?.data?.quote || res.data?.data || null);
      } catch (error) {
        if (!axios.isCancel(error)) {
          setQuote(null);
          setQuoteError(axios.isAxiosError(error) ? error.response?.data?.message || 'Could not calculate this plan.' : 'Could not calculate this plan.');
        }
      } finally {
        if (!controller.signal.aborted) setQuoting(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [requestBody, quoteRefreshTick]);

  useEffect(() => {
    const timer = window.setInterval(() => setQuoteRefreshTick(tick => tick + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const setCount = (key: 'roti' | 'sabji' | 'dal' | 'rice', value: number) => {
    const minVal = key === 'roti' && isScratch ? 1 : 0;
    const maxVal = key === 'roti' ? Number.MAX_SAFE_INTEGER : 40;
    setSelections(prev => ({ ...prev, [key]: Math.max(minVal, Math.min(maxVal, Math.floor(value || 0))) }));
  };

  const adjustCount = (key: 'roti' | 'sabji' | 'dal' | 'rice', delta: number) => {
    const minVal = key === 'roti' && isScratch ? 1 : 0;
    const maxVal = key === 'roti' ? Number.MAX_SAFE_INTEGER : 40;
    setSelections(prev => ({ ...prev, [key]: Math.max(minVal, Math.min(maxVal, (prev[key] || 0) + delta)) }));
  };

  const checkout = () => {
    if (!quote || quoteError || quoting) return;
    const selected = quote.selectedComponents || selections;
    const planName = isScratch ? 'Custom Roti Plan (Build from Scratch)' : `Customized ${plans[basePlan]?.name || basePlan} Plan`;

    const customDetails = {
      isCustomPlan: true,
      custom: true,
      basePlan,
      selections: selected,
      ...selected,
      pricingVersion: quote.pricingVersion,
      quote
    };

    navigate('/subscription-checkout', {
      state: {
        plan: {
          name: planName,
          key: isScratch ? 'custom_scratch_plan' : 'custom_plan',
          custom: true,
          price: quote.customizedSubtotal,
          features: isScratch
            ? [
                `${selected.roti} Tawa Roti per delivery`,
                'Build from Scratch (Roti-Only Plan)',
                'Freshly prepared handmade rotis'
              ]
            : [
                `${selected.roti} Roti`,
                `${selected.sabji} Sabji`,
                ...(selected.dal > 0 ? [`${selected.dal} Dal`] : []),
                ...(selected.rice > 0 ? [`${selected.rice} Rice`] : []),
                `Raita: ${selected.raitaFrequency === 'none' ? 'None' : selected.raitaFrequency === 'threePerWeek' ? '3x / week' : 'Daily'}`,
                `Salad: ${selected.saladFrequency === 'none' ? 'None' : selected.saladFrequency === 'threePerWeek' ? '3x / week' : 'Daily'}`
              ],
          customDetails
        }
      }
    });
  };

  const totalItemCount = selections.roti + selections.sabji + selections.dal + selections.rice;

  if (loading) {
    return (
      <PageContainer className="py-12 sm:py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary text-sm sm:text-base">Loading live pricing…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-6 sm:py-10 max-w-6xl">
      <button
        onClick={() => navigate('/pricing')}
        className="flex items-center gap-2 text-text-secondary hover:text-primary mb-4 text-sm sm:text-base font-medium transition"
      >
        <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
        Back to Pricing Plans
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
            <Sparkles className="text-primary shrink-0" />
            <span>Customize Your Subscription</span>
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Choose a starting base plan or build your exact meal package completely from scratch.
          </p>
        </div>
        {selectedCity && (
          <button
            onClick={openCityModal}
            className="border border-gray-300 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold hover:border-primary transition w-fit"
          >
            Pricing for {selectedCity}
            {selectedCategory && cityCategories[selectedCategory] ? ` · ${cityCategories[selectedCategory].name || selectedCategory}` : ''} · Change
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Plan and Item Customization */}
        <div className="lg:col-span-7 bg-white rounded-2xl border p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 shadow-sm">
          
          {/* Base Plan Selection Grid: Basic, Standard, Premium, Build from Scratch */}
          <section>
            <div className="flex items-center justify-between mb-2.5 sm:mb-3">
              <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">
                Choose Plan Starting Point
              </label>
              {isScratch && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <Wand2 size={12} /> Pure Custom · No Base Plan
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {(['basic', 'standard', 'premium'] as const).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBasePlan(key)}
                  className={`p-3 sm:p-4 rounded-xl border-2 capitalize font-bold text-xs sm:text-sm transition-all text-left flex flex-col justify-between ${
                    basePlan === key
                      ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <span className="truncate">{plans[key]?.name || key}</span>
                  <span className="block text-[11px] sm:text-xs font-normal text-text-secondary mt-1">
                    {money(plans[key]?.price || 0)}
                  </span>
                </button>
              ))}

              {/* Build from Scratch Option */}
              <button
                type="button"
                onClick={() => setBasePlan('scratch')}
                className={`p-3 sm:p-4 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all text-left flex flex-col justify-between relative overflow-hidden ${
                  basePlan === 'scratch'
                    ? 'border-amber-500 bg-amber-50/50 text-amber-900 shadow-sm ring-1 ring-amber-500/30'
                    : 'border-gray-200 hover:border-amber-300 bg-white text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="truncate font-extrabold">Build from Scratch</span>
                </div>
                <span className="block text-[11px] sm:text-xs font-semibold text-amber-700 mt-1">
                  Roti Only Plan
                </span>
              </button>
            </div>

            {isScratch && (
              <div className="mt-3 p-3.5 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 shadow-xs">
                <Sparkles size={17} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-900 font-bold mb-0.5">Build from Scratch — Roti Only Plan</strong>
                  <span>Order fresh handmade Tawa Rotis directly with no upper limit. Order any quantity you need per delivery!</span>
                </div>
              </div>
            )}
          </section>

          {/* Roti-Only Dedicated Section for Build from Scratch */}
          {isScratch ? (
            <section className="border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/20 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-gray-900">
                      Roti per delivery
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      Unlimited
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Fresh handmade tawa rotis delivered with your schedule. No order limit!
                  </p>
                </div>
                <div>
                  <span className="inline-block text-xs font-bold text-amber-900 bg-amber-100/80 border border-amber-300/60 px-3 py-1 rounded-full">
                    {selections.roti} Rotis / Delivery
                  </span>
                </div>
              </div>

              {/* Main Stepper & Direct Input */}
              <div className="flex items-center gap-3 max-w-sm">
                <button
                  type="button"
                  onClick={() => adjustCount('roti', -1)}
                  disabled={selections.roti <= 1}
                  className="w-11 h-11 rounded-xl border-2 border-gray-200 bg-white flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95 shrink-0 shadow-xs"
                  aria-label="Decrease Roti"
                >
                  <Minus size={20} />
                </button>

                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    value={selections.roti}
                    onChange={e => setCount('roti', Number(e.target.value))}
                    className="w-full text-center rounded-xl border-2 border-amber-300 bg-white py-2.5 text-lg sm:text-xl font-extrabold text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none shadow-inner"
                  />
                  <span className="absolute right-3 top-3.5 text-xs text-gray-400 font-medium pointer-events-none">
                    rotis
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustCount('roti', 1)}
                  className="w-11 h-11 rounded-xl border-2 border-amber-300 bg-amber-500 text-white flex items-center justify-center font-bold hover:bg-amber-600 transition active:scale-95 shrink-0 shadow-xs"
                  aria-label="Increase Roti"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* Quick increment chips */}
              <div className="mt-4 pt-4 border-t border-amber-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-500 mr-1">Quick add:</span>
                {[+1, +2, +5, +10, +20, +50].map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => adjustCount('roti', amount)}
                    className="px-3 py-1 rounded-lg border border-amber-200 bg-white text-xs font-bold text-amber-900 hover:bg-amber-100/60 active:scale-95 transition shadow-2xs"
                  >
                    +{amount}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCount('roti', 8)}
                  className="ml-auto text-xs text-text-secondary hover:text-amber-800 underline font-medium"
                >
                  Reset to 8
                </button>
              </div>
            </section>
          ) : (
            /* Regular packages meal items grid */
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {([
                  ['roti', 'Roti'],
                  ['sabji', 'Sabji'],
                  ['dal', 'Dal'],
                  ['rice', 'Rice']
                ] as const).map(([key, label]) => (
                  <div key={key} className="border rounded-xl p-3.5 sm:p-4 bg-gray-50/50">
                    <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                      <span className="block font-bold text-xs sm:text-sm text-gray-800">{label} per delivery</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustCount(key, -1)}
                        disabled={selections[key] <= 0}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border bg-white flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 shrink-0"
                        aria-label={`Decrease ${label}`}
                      >
                        <Minus size={16} />
                      </button>

                      <input
                        type="number"
                        min="0"
                        max={key === 'roti' ? undefined : 40}
                        value={selections[key]}
                        onChange={e => setCount(key, Number(e.target.value))}
                        className="w-full text-center rounded-lg border bg-white py-2 text-sm sm:text-base font-bold focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => adjustCount(key, 1)}
                        disabled={key !== 'roti' && selections[key] >= 40}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border bg-white flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 shrink-0"
                        aria-label={`Increase ${label}`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </section>

              {/* Raita and Salad Frequencies */}
              {(['raitaFrequency', 'saladFrequency'] as const).map(key => (
                <section key={key}>
                  <label className="block font-bold text-xs sm:text-sm mb-2.5 sm:mb-3 text-gray-800">
                    {key === 'raitaFrequency' ? 'Raita' : 'Salad'} frequency
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {(['none', 'threePerWeek', 'daily'] as Frequency[]).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelections(prev => ({ ...prev, [key]: value }))}
                        className={`py-2.5 sm:py-3 px-1 rounded-xl border-2 font-semibold text-xs sm:text-sm transition-all ${
                          selections[key] === value
                            ? 'border-primary bg-primary/5 text-primary shadow-sm font-bold'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        }`}
                      >
                        {value === 'none' ? 'None' : value === 'threePerWeek' ? '3x / week' : 'Daily'}
                      </button>
                    ))}
                  </div>
                </section>
              ))}

              {/* Sweet Dish Frequency */}
              <section>
                <label className="block font-bold text-xs sm:text-sm mb-2.5 sm:mb-3 text-gray-800">
                  Sweet dish
                </label>
                {includedComponents.sweetDishFrequency === 'twicePerWeek' ? (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {(['none', 'twicePerWeek'] as SweetFrequency[]).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelections(prev => ({ ...prev, sweetDishFrequency: value }))}
                        className={`py-2.5 sm:py-3 px-2 rounded-xl border-2 font-semibold text-xs sm:text-sm transition-all ${
                          selections.sweetDishFrequency === value
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        }`}
                      >
                        {value === 'none' ? 'Remove' : 'Keep · 2x / week'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border bg-gray-50 p-3 text-xs sm:text-sm text-text-secondary">
                    Not included in this package; adding Sweet Dish is currently unavailable.
                  </p>
                )}
              </section>

              {/* Saturday Special */}
              <section>
                {includedComponents.saturdaySpecial ? (
                  <label className="flex items-center justify-between border border-orange-200 bg-orange-50 rounded-xl p-4 sm:p-5 cursor-pointer">
                    <span>
                      <strong className="text-xs sm:text-sm text-orange-950">Saturday Special</strong>
                      <span className="block text-[11px] sm:text-xs text-orange-800 mt-0.5">
                        Remove it to receive the configured deduction.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selections.saturdaySpecial}
                      onChange={e => setSelections(prev => ({ ...prev, saturdaySpecial: e.target.checked }))}
                      className="w-5 h-5 accent-primary shrink-0 ml-3"
                    />
                  </label>
                ) : (
                  <div className="border rounded-xl bg-gray-50 p-3.5 sm:p-4">
                    <strong className="text-xs sm:text-sm text-gray-800">Saturday Special</strong>
                    <span className="block text-[11px] sm:text-xs text-text-secondary mt-0.5">
                      Not included in this package; adding it is currently unavailable.
                    </span>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Right Column: Price Breakdown Sidebar */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white rounded-3xl border-2 p-5 sm:p-6 md:p-8 shadow-xl space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Price breakdown</h2>
            {isScratch && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Roti Only
              </span>
            )}
          </div>

          {quoting && (
            <p className="text-xs sm:text-sm text-text-secondary flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Updating price…
            </p>
          )}

          {quoteError && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-xs sm:text-sm">
              {quoteError}
            </div>
          )}

          {/* Conditional Breakdown Receipt Display */}
          {quote && (
            <>
              {isScratch ? (
                /* Scratch Breakdown: Clean Itemized Receipt */
                <div className="space-y-2.5 sm:space-y-3 border-y py-3 sm:py-4 text-xs sm:text-sm">
                  <div className="flex justify-between items-center text-xs font-semibold text-text-secondary bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                    <span className="text-amber-900 font-bold">Selected Plan</span>
                    <strong className="text-amber-950 font-bold">Build from Scratch (Roti Only)</strong>
                  </div>

                  {quote.basePackagePrice > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>Kitchen Base Service ({selectedCity || 'City Tier'})</span>
                      <strong>{money(quote.basePackagePrice, quote.currency)}</strong>
                    </div>
                  )}

                  {quote.additions.map((line, i) => (
                    <div key={`a-${i}`} className="flex justify-between text-gray-800 font-medium">
                      <span>
                        {itemLabel(line.item)}
                        {line.quantity ? ` × ${line.quantity} per delivery` : ''}
                      </span>
                      <strong className="text-primary font-bold">
                        +{money(line.total, quote.currency)}
                      </strong>
                    </div>
                  ))}

                  <div className="flex justify-between pt-2 border-t text-[11px] sm:text-xs text-gray-500">
                    <span>Total Rotis per Delivery</span>
                    <strong>{selections.roti} Rotis</strong>
                  </div>
                </div>
              ) : (
                /* Preset Plan Breakdown: Delta-based Formula */
                <div className="space-y-2.5 sm:space-y-3 border-y py-3 sm:py-4 text-xs sm:text-sm">
                  <div className="flex justify-between text-gray-800">
                    <span>Base package ({plans[basePlan]?.name || basePlan})</span>
                    <strong>{money(quote.basePackagePrice, quote.currency)}</strong>
                  </div>

                  {quote.removals.map((line, i) => (
                    <div key={`r-${i}`} className="flex justify-between text-green-700">
                      <span>
                        Remove {itemLabel(line.item)}
                        {frequencyLabel(line.frequency)}
                        {line.quantity ? ` × ${line.quantity}` : ''}
                      </span>
                      <strong>−{money(line.total, quote.currency)}</strong>
                    </div>
                  ))}

                  {quote.additions.map((line, i) => (
                    <div key={`a-${i}`} className="flex justify-between text-primary">
                      <span>
                        Add {itemLabel(line.item)}
                        {frequencyLabel(line.frequency)}
                        {line.quantity ? ` × ${line.quantity}` : ''}
                      </span>
                      <strong>+{money(line.total, quote.currency)}</strong>
                    </div>
                  ))}

                  <div className="flex justify-between pt-2 border-t text-[11px] sm:text-xs text-gray-500">
                    <span>Formula total</span>
                    <strong>
                      {money(quote.basePackagePrice, quote.currency)} − {money(quote.removalTotal, quote.currency)} + {money(quote.additionTotal, quote.currency)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Subtotal Display */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex justify-between items-center">
                <span className="font-bold text-xs sm:text-base text-gray-900">Monthly subtotal</span>
                <span className="text-2xl sm:text-3xl font-black text-primary">
                  {money(quote.customizedSubtotal, quote.currency)}
                </span>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={checkout}
            disabled={!quote || !!quoteError || quoting || (isScratch && totalItemCount === 0)}
            className="w-full py-3.5 sm:py-4 bg-primary text-white rounded-xl font-bold flex justify-center items-center gap-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover shadow-lg transition active:scale-[0.99]"
          >
            <ShoppingCart size={18} className="sm:w-5 sm:h-5" />
            Proceed to Checkout
          </button>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] sm:text-xs flex gap-2 text-amber-900">
            <Info size={16} className="shrink-0 text-amber-700" />
            <span>
              Final pricing is recalculated securely at checkout whenever your city or delivery days change.
            </span>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
};

export default CustomizePlan;
