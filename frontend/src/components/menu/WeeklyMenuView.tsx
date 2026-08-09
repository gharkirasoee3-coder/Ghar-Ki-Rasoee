import React, { useState } from 'react';
import { menuData, DayMenu } from '../../data/menuData';
import { ChevronRight, Utensils, Star } from 'lucide-react';

interface WeeklyMenuViewProps {
  planType: 'basic' | 'standard' | 'premium';
}

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const dayNames: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday', 
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday'
};

const WeeklyMenuView: React.FC<WeeklyMenuViewProps> = ({ planType }) => {
  const [selectedDay, setSelectedDay] = useState<string>('monday');
  const weeklyMenu = menuData.weeklyMenus[planType];
  const plan = menuData.plans[planType];

  if (!weeklyMenu) return <div>Menu not available</div>;

  const currentDayMenu = weeklyMenu[selectedDay as keyof typeof weeklyMenu] as DayMenu;

  const renderDayMenu = (dayMenu: DayMenu) => {
    if (dayMenu.isSaturdaySpecial && planType === 'premium') {
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="text-yellow-600" size={24} fill="currentColor" />
              <h4 className="text-xl font-bold text-text-primary">Saturday Special!</h4>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-semibold text-lg mb-3 text-orange-700">Choose 1 Special Food:</h5>
                <div className="space-y-2">
                  {dayMenu.specialFoodOptions?.map((food, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg">
                      <ChevronRight size={16} className="text-orange-500" />
                      <span className="text-gray-700">{food}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-lg mb-3 text-pink-700">Choose 1 Dessert:</h5>
                <div className="space-y-2">
                  {dayMenu.dessertOptions?.map((dessert, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-3 rounded-lg">
                      <ChevronRight size={16} className="text-pink-500" />
                      <span className="text-gray-700">{dessert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Basic Plan: Sabzi Options */}
        {planType === 'basic' && dayMenu.sabziOptions && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-lg mb-3 text-primary">Choose 1 Sabzi:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dayMenu.sabziOptions.map((sabzi, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 p-3 rounded-md">
                  <Utensils size={16} className="text-primary" />
                  <span>{sabzi}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Standard/Premium: 2 Sabzi Sets */}
        {(planType === 'standard' || planType === 'premium') && dayMenu.sabziSet1 && dayMenu.sabziSet2 && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3 text-primary">Choose 1 from Set 1:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dayMenu.sabziSet1.map((sabzi, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-blue-50 p-3 rounded-md">
                    <Utensils size={16} className="text-blue-600" />
                    <span>{sabzi}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-lg mb-3 text-secondary">Choose 1 from Set 2:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dayMenu.sabziSet2.map((sabzi, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-green-50 p-3 rounded-md">
                    <Utensils size={16} className="text-green-600" />
                    <span>{sabzi}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Roti & Raita Info */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
          <div className="flex flex-wrap gap-6 items-center justify-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🫓</span>
              <span className="font-medium">{dayMenu.roti} Tawa Roti</span>
            </div>

            {planType === 'premium' && dayMenu.raitaType && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥗</span>
                <span className="font-medium">{dayMenu.raitaType}</span>
              </div>
            )}

            {(planType === 'basic' || planType === 'standard') && dayMenu.raita && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">🥗</span>
                <span className="font-medium">Raita or Salad</span>
              </div>
            )}

            {dayMenu.dessert && planType === 'premium' && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍮</span>
                <span className="font-medium text-pink-600">Dessert Included!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-6 border-2 border-primary/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-2">{plan.name} Plan</h2>
            <p className="text-text-secondary">6 Days Weekly Rotation • 100% Fresh Ingredients</p>
          </div>
          <div className="text-4xl font-bold text-primary">${plan.price}<span className="text-lg text-text-secondary">/month</span></div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex flex-wrap gap-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedDay === day
                ? 'bg-primary text-white shadow-md scale-105'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
            }`}
          >
            {dayNames[day]}
          </button>
        ))}
      </div>

      {/* Menu Content */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-text-primary mb-6">{dayNames[selectedDay]}'s Menu</h3>
        {renderDayMenu(currentDayMenu)}
      </div>
    </div>
  );
};

export default WeeklyMenuView;
