import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
// import CartDrawer from '../cart/CartDrawer';
import { Outlet } from 'react-router-dom';

const MainLayout: React.FC = () => {
  return (
    <>
      <Navbar />
      {/* CartDrawer Removed */}
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default MainLayout;
