import React from 'react';
import MonthlyMenu from './MonthlyMenu';

const WeeklyMenu: React.FC = () => {
  return (
    <div>
      <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg mb-6 text-sm text-yellow-800">
        Showing menu for <strong>Feb 12 - Feb 18</strong>. Next week's menu will be published on Sunday.
      </div>
      <MonthlyMenu />
    </div>
  );
};

export default WeeklyMenu;
