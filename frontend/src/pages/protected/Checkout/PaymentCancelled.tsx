import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import PageContainer from '../../../components/layout/PageContainer';

const PaymentCancelled: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer className="py-20 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl text-center relative overflow-hidden">
        {/* Glow red background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <XCircle className="w-16 h-16 text-red-500" strokeWidth={1.5} />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
            Checkout Cancelled
          </h1>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
            Your payment was cancelled and no charges were made. If you faced any issues, please feel free to try again.
          </p>

          <div className="bg-amber-50 rounded-2xl p-4 mb-8 text-left flex gap-3 border border-amber-200/60">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              We process all transactions securely using Stripe. Your data is encrypted and completely private.
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-hover transition shadow-md shadow-primary/10 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-5 h-5" /> Back to Subscription Plans
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-50 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-100 transition border border-gray-200"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default PaymentCancelled;
