import React, { useState } from 'react';
import WeeklyMenuView from '../../../components/menu/WeeklyMenuView';

const MonthlyMenu: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard' | 'premium'>('standard');

  return (
    <div className="py-8 space-y-8">
      {/* Plan Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-text-primary mb-4 text-center">
          Select a plan to view the weekly menu
        </h3>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setSelectedPlan('basic')}
            className={`px-8 py-4 rounded-lg font-bold transition-all ${
              selectedPlan === 'basic'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100'
            }`}
          >
            Basic - $150
          </button>
          <button
            onClick={() => setSelectedPlan('standard')}
            className={`px-8 py-4 rounded-lg font-bold transition-all ${
              selectedPlan === 'standard'
                ? 'bg-primary text-white shadow-lg scale-105'
                : 'bg-primary/5 text-primary border-2 border-primary/20 hover:bg-primary/10'
            }`}
          >
            Standard - $190 <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">Popular</span>
          </button>
          <button
            onClick={() => setSelectedPlan('premium')}
            className={`px-8 py-4 rounded-lg font-bold transition-all ${
              selectedPlan === 'premium'
                ? 'bg-yellow-600 text-white shadow-lg scale-105'
                : 'bg-yellow-50 text-yellow-700 border-2 border-yellow-200 hover:bg-yellow-100'
            }`}
          >
            Premium - $220
          </button>
        </div>
      </div>

      {/* Weekly Menu */}
      <WeeklyMenuView planType={selectedPlan} />

      {/* Important Note */}
      <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-lg">
        <p className="text-orange-800 font-medium">
          <strong>Note:</strong> Sabji will not be repeated in 3-4 weeks. All meals are prepared using 100% fresh ingredients.
        </p>
      </div>
    </div>
  );
};

export default MonthlyMenu;
