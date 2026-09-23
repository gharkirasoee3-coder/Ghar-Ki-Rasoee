import React from 'react';
import PageContainer from '../../../components/layout/PageContainer';
import { ShieldCheck, MessageCircle, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const RefundPolicy: React.FC = () => {
  const lastUpdated = 'September 2026';

  return (
    <PageContainer className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary transition"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>

        {/* Header Header & Meta */}
        <header className="border-b border-gray-100 pb-10 mb-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary mb-3">
            <ShieldCheck size={16} />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-950 tracking-tight mb-4">
            Refund & Cancellation Policy
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed font-normal">
            Please read this policy carefully before placing an order or subscribing to Ghar Ki Rasoee. By finalizing an order or payment on our platform, you acknowledge and agree to these terms.
          </p>
          <div className="mt-6 flex items-center gap-3 text-xs text-gray-400 font-medium">
            <span>Effective: {lastUpdated}</span>
            <span>•</span>
            <span>Applies to all online orders & subscriptions</span>
          </div>
        </header>

        {/* Quick Summary / Navigation Bar */}
        <div className="mb-12 p-4 bg-gray-50 rounded-xl border border-gray-100/80">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sections Summary</div>
          <nav className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs font-medium text-gray-700">
            <a href="#section-1" className="hover:text-primary transition">1. Final Sales & Accidental Orders</a>
            <span className="hidden sm:inline text-gray-300">•</span>
            <a href="#section-2" className="hover:text-primary transition">2. In-Progress Cancellations</a>
            <span className="hidden sm:inline text-gray-300">•</span>
            <a href="#section-3" className="hover:text-primary transition">3. Delivery Failure & Errors</a>
          </nav>
        </div>

        {/* Policy Body - Editorial Prose Style */}
        <article className="space-y-12 text-gray-800 leading-relaxed">
          
          {/* Section 1 */}
          <section id="section-1" className="scroll-mt-24 border-b border-gray-100 pb-12">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-xs font-black text-primary font-mono tracking-widest">01</span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Final Sales and Accidental Orders
              </h2>
            </div>
            <div className="pl-0 sm:pl-7 text-sm sm:text-base text-gray-600 space-y-3 font-normal leading-relaxed">
              <p>
                All orders placed through our website or platform are{' '}
                <mark className="bg-amber-100/90 text-gray-950 font-semibold px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(245,158,11,0.12)]">
                  considered final
                </mark>
                . We do{' '}
                <mark className="bg-amber-100/90 text-gray-950 font-semibold px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(245,158,11,0.12)]">
                  not offer refunds, credits, or cancellations
                </mark>{' '}
                for accidental orders, changes of mind, or if a customer decides they no longer want the food after the order has been submitted.
              </p>
              <p>
                It is the{' '}
                <mark className="bg-amber-100/90 text-gray-950 font-semibold px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(245,158,11,0.12)]">
                  user's sole responsibility to review
                </mark>{' '}
                their cart, selected meals, portions, delivery preferences, and delivery address before finalizing payment.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="scroll-mt-24 border-b border-gray-100 pb-12">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-xs font-black text-primary font-mono tracking-widest">02</span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                In-Progress Order Cancellations
              </h2>
            </div>
            <div className="pl-0 sm:pl-7 text-sm sm:text-base text-gray-600 space-y-3 font-normal leading-relaxed">
              <p>
                Once an order is sent to the restaurant partner,{' '}
                <mark className="bg-amber-100/90 text-gray-950 font-semibold px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(245,158,11,0.12)]">
                  preparation begins immediately
                </mark>{' '}
                to ensure fresh, timely meal delivery.
              </p>
              <p>
                If you attempt to cancel an order after it has been accepted by the restaurant,{' '}
                <mark className="bg-amber-100/90 text-gray-950 font-semibold px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(245,158,11,0.12)]">
                  no refund or platform credit will be issued under any circumstances
                </mark>
                .
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="scroll-mt-24 border-b border-gray-100 pb-12">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-xs font-black text-primary font-mono tracking-widest">03</span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Exceptions for Delivery Failure or Errors
              </h2>
            </div>
            <div className="pl-0 sm:pl-7 text-sm sm:text-base text-gray-600 space-y-4 font-normal leading-relaxed">
              <p>
                Refunds or platform credits are{' '}
                <mark className="bg-amber-100/90 text-gray-950 font-semibold px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(245,158,11,0.12)]">
                  strictly limited to verified system errors or complete failure of delivery
                </mark>
                .
              </p>
              <p>
                If your order contains incorrect or missing items, you must contact our customer support and provide{' '}
                <mark className="bg-amber-100/90 text-gray-950 font-semibold px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(245,158,11,0.12)]">
                  photographic evidence
                </mark>{' '}
                of the delivered items{' '}
                <mark className="bg-amber-100/90 text-gray-950 font-semibold px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(245,158,11,0.12)]">
                  within fifteen (15) minutes
                </mark>{' '}
                of the recorded delivery time.
              </p>
              
              {/* Clean minimal verification requirement note */}
              <div className="mt-4 p-4 rounded-xl bg-gray-50 border-l-2 border-primary space-y-2">
                <div className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-primary" />
                  Submission Protocol for Verified Claims
                </div>
                <ul className="text-xs sm:text-sm text-gray-600 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Report submitted within <strong>15 minutes</strong> of recorded delivery time.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span>Clear photos of packaging and delivered items included.</span>
                  </li>
                </ul>
              </div>

              <p className="text-xs sm:text-sm text-gray-500 pt-2 italic">
                We reserve the right to deny refund requests if evidence is not provided or if a pattern of platform abuse or fraud is detected.
              </p>
            </div>
          </section>

        </article>

        {/* Contact & Inquiries Footer Section (Clean Editorial) */}
        <footer className="pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">Need assistance with an order?</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Reach out to our customer care team on WhatsApp for quick support.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://wa.me/17788615964"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition"
            >
              <MessageCircle size={15} />
              Contact Support
            </a>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-primary hover:underline"
            >
              View Meal Plans
            </Link>
          </div>
        </footer>

      </div>
    </PageContainer>
  );
};

export default RefundPolicy;
