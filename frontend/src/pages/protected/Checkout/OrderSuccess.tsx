import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import PageContainer from '../../../components/layout/PageContainer';

const OrderSuccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer className="py-20 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce-short">
        <CheckCircle size={40} className="text-green-600" />
      </div>
      
      <h1 className="text-3xl font-bold text-text-primary mb-4">Order Confirmed!</h1>
      <p className="text-text-secondary max-w-md mb-8">
        Thank you for your order. Your delicious home-style meal is being prepared with love.
      </p>

      <div className="flex gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition"
        >
          Track Order
        </button>
        <button 
          onClick={() => navigate('/menu')}
          className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
        >
          Order More
        </button>
      </div>
    </PageContainer>
  );
};

export default OrderSuccess;
