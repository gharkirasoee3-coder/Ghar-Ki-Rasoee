import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import PageContainer from '../../../components/layout/PageContainer';
import { Clock, ShoppingBag, LogOut, X, AlertCircle } from 'lucide-react';
import { Order } from '../../../types/order';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../../config/firebase.config';
import ActivityTimeline from '../../../components/dashboard/ActivityTimeline';
import TodayMealTracking from '../../../components/dashboard/TodayMealTracking';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'activity'>('active');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        const ordersRes = await axios.get(`${ENV.API_URL}/orders`, { headers });
        setOrders(ordersRes.data.data || []);

        try {
          const notifRes = await axios.get(`${ENV.API_URL}/auth/notifications`, { headers });
          setNotifications(notifRes.data.data || []);
        } catch (e) {
          console.error("Failed to fetch notifications", e);
        }

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const activeOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status));
  const pastOrders = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.status));

  // Find today's meal order
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMealOrder = orders.find(o => 
    o.deliveryDate === todayStr && 
    o.orderType === 'Subscription'
  );

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const token = await user?.getIdToken();
      await axios.patch(`${ENV.API_URL}/auth/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.notificationId !== notificationId));
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      'Confirmed': 'bg-blue-100 text-blue-800',
      'Cooking': 'bg-yellow-100 text-yellow-800',
      'Out for Delivery': 'bg-purple-100 text-purple-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'active': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <PageContainer className="py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Hello, {user?.displayName || 'Foodie'}! 👋</h1>
          <p className="text-text-secondary">{user?.email}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      {/* Notifications */}
      {notifications.filter(n => !n.read).map(n => (
        <div key={n.notificationId} className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-red-500"><AlertCircle size={20} /></div>
            <div>
              <h3 className="font-bold text-red-800">{n.title}</h3>
              <p className="text-sm text-red-700 mt-1">{n.message}</p>
            </div>
          </div>
          <button onClick={() => handleMarkAsRead(n.notificationId)} className="text-red-400 hover:text-red-600 transition">
            <X size={20} />
          </button>
        </div>
      ))}

      {todayMealOrder && <TodayMealTracking order={todayMealOrder} />}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-4 px-6 font-medium text-sm transition relative whitespace-nowrap ${
            activeTab === 'active' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Active Orders ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-6 font-medium text-sm transition relative whitespace-nowrap ${
            activeTab === 'history' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Order History
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-4 px-6 font-medium text-sm transition relative whitespace-nowrap ${
            activeTab === 'activity' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Activity Timeline
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading your dashboard...</p>
        </div>
      ) : activeTab === 'activity' ? (
        <ActivityTimeline />
      ) : (activeTab === 'active' ? activeOrders : pastOrders).length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-card">
          <ShoppingBag className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No orders found</h3>
          <p className="text-text-secondary mb-6">Looks like you haven't placed any orders yet.</p>
          <button 
            onClick={() => navigate('/menu')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-hover transition"
          >
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'active' ? activeOrders : pastOrders).map((order) => (
            <div key={order.orderId} className="bg-white border border-gray-100 rounded-card p-6 shadow-sm hover:shadow-md transition">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-gray-50 pb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-lg text-text-primary">Order #{order.orderId.slice(0, 8)}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-text-secondary flex items-center gap-2">
                    <Clock size={14} /> Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">{order.items.length} items</p>
                </div>
              </div>

              <div className="space-y-2">
                {Array.isArray(order.items) ? (
                  order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                       <span className="text-text-primary flex items-center gap-2">
                         <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">{item.quantity}x</span>
                         {item.name}
                       </span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-primary">Package Items</span>
                    <span className="text-text-secondary">Subscription Plan</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default Dashboard;
