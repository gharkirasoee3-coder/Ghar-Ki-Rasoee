import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, Calendar, MapPin, DollarSign } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import PageContainer from '../../../components/layout/PageContainer';
import axios from 'axios';
import { ENV } from '../../../config/env.config';

interface SessionStatus {
  status: string;
  customerEmail: string;
  amount: number;
  metadata: {
    userId: string;
    type: 'subscription' | 'one-time';
    planName?: string;
    deliveryAddress: string;
    deliveryDate?: string;
  };
}

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusData, setStatusData] = useState<SessionStatus | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No session ID found. Invalid checkout redirect.');
        setLoading(false);
        return;
      }

      if (!user) {
        // Wait for user auth to load
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await axios.get(
          `${ENV.API_URL}/payments/session-status/${sessionId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = response.data.data;
        setStatusData(data);

        // Redirect automatically after 5 seconds to dashboard or subscription page
        const redirectTimer = setTimeout(() => {
          if (data.metadata.type === 'subscription') {
            navigate('/my-subscription');
          } else {
            navigate('/dashboard');
          }
        }, 6000);

        return () => clearTimeout(redirectTimer);
      } catch (err: any) {
        console.error('Error verifying Stripe session:', err);
        setError(err.response?.data?.message || 'Failed to verify payment with Stripe.');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, user, navigate]);

  if (loading) {
    return (
      <PageContainer className="py-24 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-16 h-16 text-primary animate-spin" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold text-gray-800 animate-pulse">Verifying Payment...</h2>
          <p className="text-gray-500 text-sm">Please do not close this window or refresh the page.</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !statusData) {
    return (
      <PageContainer className="py-20 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border-2 border-red-100 shadow-xl text-center">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error || 'Unable to confirm payment status.'}</p>
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition shadow-md"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-50 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-100 transition border border-gray-200"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  const { metadata, amount } = statusData;
  const isSubscription = metadata.type === 'subscription';

  return (
    <PageContainer className="py-16 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="max-w-xl w-full bg-white p-8 sm:p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        {/* Confetti & Glow backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center relative z-10">
          <div className="bg-green-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-short">
            <CheckCircle2 className="w-16 h-16 text-green-500" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
            Payment Successful!
          </h1>
          <p className="text-gray-500 max-w-sm mx-auto mb-8">
            Thank you! Your transaction was completed successfully and your order has been placed.
          </p>

          {/* Details Card */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-4 border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-200/60 pb-3">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Plan / Item</span>
              <span className="font-bold text-gray-800">
                {isSubscription ? `${metadata.planName} Subscription` : 'One-Time Meal Order'}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-200/60 pb-3">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" /> Amount Paid
              </span>
              <span className="font-bold text-lg text-primary">
                ${amount.toFixed(2)} CAD
              </span>
            </div>

            <div className="flex justify-between items-start border-b border-gray-200/60 pb-3">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 pt-0.5">
                <MapPin className="w-4 h-4" /> Delivery Address
              </span>
              <span className="font-medium text-gray-700 text-right max-w-[240px] break-words">
                {metadata.deliveryAddress}
              </span>
            </div>

            {metadata.deliveryDate && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Delivery Date
                </span>
                <span className="font-medium text-gray-700">
                  {new Date(metadata.deliveryDate).toLocaleDateString('en-CA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate(isSubscription ? '/my-subscription' : '/dashboard')}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition shadow-lg shadow-primary/20 hover:-translate-y-0.5"
            >
              {isSubscription ? 'Go to My Subscription' : 'Track on Dashboard'}
            </button>
            <button
              onClick={() => navigate('/menu')}
              className="w-full sm:w-auto px-8 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
            >
              View Menu
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6 animate-pulse">
            Redirecting in a few seconds...
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default PaymentSuccess;
