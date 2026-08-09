
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/public/Login/Login';
import Register from '../pages/public/Register/Register';
import Home from '../pages/public/Home/Home';
import Menu from '../pages/public/Menu/Menu';
import Pricing from '../pages/public/Pricing/Pricing';
import OrderSuccess from '../pages/protected/Checkout/OrderSuccess';
import SubscriptionCheckout from '../pages/protected/Checkout/SubscriptionCheckout';
import PaymentSuccess from '../pages/protected/Checkout/PaymentSuccess';
import PaymentCancelled from '../pages/protected/Checkout/PaymentCancelled';
import MySubscription from '../pages/protected/Subscription/MySubscription';
import CustomizeSubscription from '../pages/protected/Subscription/CustomizeSubscription';

import Dashboard from '../pages/protected/Dashboard/Dashboard';
import AdminRoute from './AdminRoute';
import AdminLayout from '../components/layout/AdminLayout';
import MainLayout from '../components/layout/MainLayout';
import AdminOrders from '../pages/admin/Orders/AdminOrders';
import AdminDashboard from '../pages/admin/Dashboard/AdminDashboard';
import AdminSubscriptions from '../pages/admin/Subscription/AdminSubscriptions';
import TodayDeliveries from '../pages/admin/Subscription/TodayDeliveries';
import ViewCustomerCustomization from '../pages/admin/Subscription/ViewCustomerCustomization';
import AdminUsers from '../pages/admin/Users/AdminUsers';
import AdminUserDetail from '../pages/admin/Users/AdminUserDetail';
import AdminCoupons from '../pages/admin/Coupons/AdminCoupons';
import CustomizePlan from '../pages/public/Pricing/CustomizePlan';
import AdminMenu from '../pages/admin/Menu/AdminMenu';
import AdminReviews from '../pages/admin/Reviews/AdminReviews';
import AdminHolidays from '../pages/admin/Holidays/AdminHolidays';
import { useAuth } from '../context/AuthContext';

const NotFound = () => <div className="p-10 text-3xl font-center">404 Not Found</div>;

// Wrapper to redirect admins to admin dashboard
const AdminRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public & User Routes wrapped in MainLayout and AdminRedirect */}
      <Route element={<AdminRedirect><MainLayout /></AdminRedirect>}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Cart Checkout Removed */}
        <Route path="/order-success" element={
          <ProtectedRoute>
            <OrderSuccess />
          </ProtectedRoute>
        } />
        <Route path="/subscription-checkout" element={
          <ProtectedRoute>
            <SubscriptionCheckout />
          </ProtectedRoute>
        } />
        <Route path="/payment-success" element={
          <ProtectedRoute>
            <PaymentSuccess />
          </ProtectedRoute>
        } />
        <Route path="/payment-cancelled" element={
          <ProtectedRoute>
            <PaymentCancelled />
          </ProtectedRoute>
        } />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/my-subscription" element={
          <ProtectedRoute>
            <MySubscription />
          </ProtectedRoute>
        } />
        <Route path="/subscription/customize" element={
          <ProtectedRoute>
            <CustomizeSubscription />
          </ProtectedRoute>
        } />
        <Route path="/subscription/customize-plan" element={
          <ProtectedRoute>
            <CustomizePlan />
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="holidays" element={<AdminHolidays />} />
        <Route path="deliveries" element={<TodayDeliveries />} />
        <Route path="deliveries/customization/:subscriptionId" element={<ViewCustomerCustomization />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
