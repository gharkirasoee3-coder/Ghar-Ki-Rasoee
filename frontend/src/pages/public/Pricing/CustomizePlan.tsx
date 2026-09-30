import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Info, ShoppingCart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ENV } from '../../../config/env.config';
import PageContainer from '../../../components/layout/PageContainer';
import { useCity } from '../../../context/CityContext';

type Frequency = 'none' | 'threePerWeek' | 'daily';
type SweetFrequency = 'none' | 'twicePerWeek';
interface Selections { roti:number; sabji:number; dal:number; rice:number; raitaFrequency:Frequency; saladFrequency:Frequency; sweetDishFrequency:SweetFrequency; saturdaySpecial:boolean }
interface PlanDetails { name:string; price:number; features:string[]; components?:Partial<Selections> }
interface Adjustment { item:string; quantity?:number; total:number; frequency?:string }
interface Quote { pricingVersion:number; currency:string; basePackagePrice:number; removals:Adjustment[]; additions:Adjustment[]; removalTotal:number; additionTotal:number; customizedSubtotal:number; selectedComponents:Selections }

const FALLBACK: Record<string, Selections> = {
  basic:{roti:4,sabji:1,dal:0,rice:0,raitaFrequency:'threePerWeek',saladFrequency:'none',sweetDishFrequency:'none',saturdaySpecial:false},
  standard:{roti:8,sabji:2,dal:0,rice:0,raitaFrequency:'threePerWeek',saladFrequency:'none',sweetDishFrequency:'none',saturdaySpecial:false},
  premium:{roti:8,sabji:2,dal:0,rice:0,raitaFrequency:'daily',saladFrequency:'none',sweetDishFrequency:'twicePerWeek',saturdaySpecial:true}
};
const money=(value:number,currency='CAD')=>new Intl.NumberFormat('en-CA',{style:'currency',currency}).format(value||0);
const itemLabel=(value:string)=>({roti:'Roti',sabji:'Sabji',dal:'Dal',rice:'Rice',raita:'Raita',salad:'Salad',sweetDish:'Sweet Dish',saturdaySpecial:'Saturday Special'}[value]||value);
const frequencyLabel=(value?:string)=>value==='threePerWeek'?' · 3 times/week':value==='daily'?' · Daily':value==='twicePerWeek'?' · 2 times/week':'';

const CustomizePlan:React.FC=()=>{
  const navigate=useNavigate();
  const {selectedCity,selectedCategory,cityCategories,openCityModal}=useCity();
  const [basePlan,setBasePlan]=useState<'basic'|'standard'|'premium'>('standard');
  const [plans,setPlans]=useState<Record<string,PlanDetails>>({});
  const [selections,setSelections]=useState<Selections>(FALLBACK.standard);
  const [quote,setQuote]=useState<Quote|null>(null);
  const [loading,setLoading]=useState(true);
  const [quoting,setQuoting]=useState(false);
  const [quoteError,setQuoteError]=useState('');
  const [quoteRefreshTick,setQuoteRefreshTick]=useState(0);

  useEffect(()=>{let active=true;setLoading(true);axios.get(`${ENV.API_URL}/menu/plans`,{params:{city:selectedCity}}).then(({data})=>{if(active)setPlans(data?.data?.plans||{});}).catch(()=>toast.error('Unable to load current plan pricing.')).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[selectedCity]);
  useEffect(()=>{setSelections({...FALLBACK[basePlan],...(plans[basePlan]?.components||{})});},[basePlan,plans]);
  const requestBody=useMemo(()=>({basePlan,selections,city:selectedCity}),[basePlan,selections,selectedCity]);
  const includedComponents={...FALLBACK[basePlan],...(plans[basePlan]?.components||{})};
  useEffect(()=>{const controller=new AbortController();const timer=window.setTimeout(async()=>{setQuoting(true);setQuoteError('');try{const res=await axios.post(`${ENV.API_URL}/menu/custom-plan/quote`,requestBody,{signal:controller.signal});setQuote(res.data?.data?.quote||res.data?.data||null);}catch(error){if(!axios.isCancel(error)){setQuote(null);setQuoteError(axios.isAxiosError(error)?error.response?.data?.message||'Could not calculate this plan.':'Could not calculate this plan.');}}finally{if(!controller.signal.aborted)setQuoting(false);}},300);return()=>{window.clearTimeout(timer);controller.abort();};},[requestBody,quoteRefreshTick]);
  useEffect(()=>{const timer=window.setInterval(()=>setQuoteRefreshTick(tick=>tick+1),30000);return()=>window.clearInterval(timer);},[]);
  const setCount=(key:'roti'|'sabji'|'dal'|'rice',value:number)=>setSelections(prev=>({...prev,[key]:Math.max(0,Math.floor(value||0))}));
  const checkout=()=>{if(!quote||quoteError||quoting)return;const selected=quote.selectedComponents||selections;const customDetails={isCustomPlan:true,custom:true,basePlan,selections:selected,...selected,pricingVersion:quote.pricingVersion,quote};navigate('/subscription-checkout',{state:{plan:{name:'Custom Plan',key:'custom_plan',custom:true,price:quote.customizedSubtotal,features:[`${selected.roti} Roti`,`${selected.sabji} Sabji`,`${selected.dal} Dal`,`${selected.rice} Rice`,`Raita: ${selected.raitaFrequency}`,`Salad: ${selected.saladFrequency}`],customDetails}}});};
  if(loading)return <PageContainer className="py-20 text-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"/><p>Loading live pricing…</p></PageContainer>;
  return <PageContainer className="py-10 max-w-6xl">
    <button onClick={()=>navigate('/pricing')} className="flex items-center gap-2 text-text-secondary hover:text-primary mb-4"><ChevronLeft size={20}/>Back to Pricing Plans</button>
    <div className="flex flex-wrap justify-between gap-4 mb-8"><div><h1 className="text-3xl font-extrabold flex items-center gap-2"><Sparkles className="text-primary"/>Customize Your Subscription</h1><p className="text-text-secondary mt-1">Your total uses the latest prices set by our team.</p></div>{selectedCity&&<button onClick={openCityModal} className="border rounded-full px-4 py-2 text-sm font-semibold">Pricing for {selectedCity}{selectedCategory&&cityCategories[selectedCategory]?` · ${cityCategories[selectedCategory].name||selectedCategory}`:''} · Change</button>}</div>
    <div className="grid lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-7 bg-white rounded-2xl border p-6 md:p-8 space-y-8">
        <section><label className="block text-sm font-bold uppercase tracking-wider mb-3">Base plan</label><div className="grid grid-cols-3 gap-3">{(['basic','standard','premium'] as const).map(key=><button key={key} onClick={()=>setBasePlan(key)} className={`p-4 rounded-xl border-2 capitalize font-bold ${basePlan===key?'border-primary bg-primary/5 text-primary':'border-gray-200'}`}>{plans[key]?.name||key}<span className="block text-xs font-normal mt-1">{money(plans[key]?.price||0)}</span></button>)}</div></section>
        <section className="grid sm:grid-cols-2 gap-4">{([['roti','Roti'],['sabji','Sabji'],['dal','Dal'],['rice','Rice']] as const).map(([key,label])=><label key={key} className="border rounded-xl p-4"><span className="block font-bold mb-2">{label} per delivery</span><input type="number" min="0" max="40" value={selections[key]} onChange={e=>setCount(key,Number(e.target.value))} className="w-full rounded-lg border px-3 py-2 font-bold focus:ring-2 focus:ring-primary/20"/></label>)}</section>
        {(['raitaFrequency','saladFrequency'] as const).map(key=><section key={key}><label className="block font-bold mb-3">{key==='raitaFrequency'?'Raita':'Salad'} frequency</label><div className="grid grid-cols-3 gap-3">{(['none','threePerWeek','daily'] as Frequency[]).map(value=><button key={value} onClick={()=>setSelections(prev=>({...prev,[key]:value}))} className={`py-3 rounded-xl border-2 font-semibold ${selections[key]===value?'border-primary bg-primary/5 text-primary':'border-gray-200'}`}>{value==='none'?'None':value==='threePerWeek'?'3 times/week':'Daily'}</button>)}</div></section>)}
        <section><label className="block font-bold mb-3">Sweet dish</label>{includedComponents.sweetDishFrequency==='twicePerWeek'?<div className="grid grid-cols-2 gap-3">{(['none','twicePerWeek'] as SweetFrequency[]).map(value=><button key={value} onClick={()=>setSelections(prev=>({...prev,sweetDishFrequency:value}))} className={`py-3 rounded-xl border-2 font-semibold ${selections.sweetDishFrequency===value?'border-primary bg-primary/5 text-primary':'border-gray-200'}`}>{value==='none'?'Remove':'Keep · 2 times/week'}</button>)}</div>:<p className="rounded-xl border bg-gray-50 p-3 text-sm text-text-secondary">Not included in this package; adding Sweet Dish is currently unavailable.</p>}</section>
        {includedComponents.saturdaySpecial?<label className="flex items-center justify-between border border-orange-200 bg-orange-50 rounded-xl p-5"><span><strong>Saturday Special</strong><span className="block text-xs text-orange-800">Remove it to receive the configured deduction.</span></span><input type="checkbox" checked={selections.saturdaySpecial} onChange={e=>setSelections(prev=>({...prev,saturdaySpecial:e.target.checked}))} className="w-5 h-5 accent-primary"/></label>:<div className="border rounded-xl bg-gray-50 p-4"><strong>Saturday Special</strong><span className="block text-xs text-text-secondary">Not included in this package; adding it is currently unavailable.</span></div>}
      </div>
      <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white rounded-3xl border-2 p-6 md:p-8 shadow-xl space-y-5"><h2 className="text-xl font-extrabold">Price breakdown</h2>{quoting&&<p className="text-sm text-text-secondary">Updating price…</p>}{quoteError&&<div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-sm">{quoteError}</div>}{quote&&<><div className="space-y-3 border-y py-4 text-sm"><div className="flex justify-between"><span>Base package</span><strong>{money(quote.basePackagePrice,quote.currency)}</strong></div>{quote.removals.map((line,i)=><div key={`r-${i}`} className="flex justify-between text-green-700"><span>Remove {itemLabel(line.item)}{frequencyLabel(line.frequency)}{line.quantity?` × ${line.quantity}`:''}</span><strong>−{money(line.total,quote.currency)}</strong></div>)}{quote.additions.map((line,i)=><div key={`a-${i}`} className="flex justify-between"><span>Add {itemLabel(line.item)}{frequencyLabel(line.frequency)}{line.quantity?` × ${line.quantity}`:''}</span><strong>+{money(line.total,quote.currency)}</strong></div>)}<div className="flex justify-between pt-2 border-t"><span>Base − removals + additions</span><strong>{money(quote.basePackagePrice,quote.currency)} − {money(quote.removalTotal,quote.currency)} + {money(quote.additionTotal,quote.currency)}</strong></div></div><div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex justify-between items-center"><span className="font-bold">Monthly subtotal</span><span className="text-3xl font-black text-primary">{money(quote.customizedSubtotal,quote.currency)}</span></div></>}
        <button onClick={checkout} disabled={!quote||!!quoteError||quoting} className="w-full py-4 bg-primary text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><ShoppingCart size={20}/>Proceed to Checkout</button><div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs flex gap-2"><Info size={16} className="shrink-0"/>Final pricing is recalculated securely at checkout whenever your city or delivery days change.</div></aside>
    </div>
  </PageContainer>;
};
export default CustomizePlan;
