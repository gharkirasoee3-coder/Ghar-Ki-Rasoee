import React from 'react';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { useAuth } from '../../../context/AuthContext';
import { 
  Users, 
  ShoppingBag, 
  DollarSign, 
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Order } from '../../../types/order';

interface DashboardStats {
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  paymentMethods: { name: string; value: number }[];
  recentOrders: Order[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const response = await axios.get(`${ENV.API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="p-10 flex justify-center">Loading Dashboard...</div>;
  if (error || !stats) return <div className="p-10 flex justify-center text-red-500">Failed to load stats.</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500">Welcome back, Admin</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl flex items-center gap-4" style={{ border: 'none !important', outline: 'none !important', boxShadow: 'none !important' } as React.CSSProperties}>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <h3 className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl flex items-center gap-4" style={{ border: 'none !important', outline: 'none !important', boxShadow: 'none !important' } as React.CSSProperties}>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl flex items-center gap-4" style={{ border: 'none !important', outline: 'none !important', boxShadow: 'none !important' } as React.CSSProperties}>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Users</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsers}</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Payment Methods Chart */}
        <div className="bg-white p-4 md:p-6 rounded-xl min-h-[400px] md:min-h-[450px] flex flex-col" style={{ border: 'none !important', outline: 'none !important', boxShadow: 'none !important' } as React.CSSProperties}>
           <style>
             {`
               .recharts-default-tooltip { border: none !important; box-shadow: none !important; outline: none !important; }
               .recharts-legend-item { border: none !important; outline: none !important; }
               .recharts-layer:focus { outline: none !important; border: none !important; }
               path.recharts-sector:focus { outline: none !important; border: none !important; }
               .recharts-surface { outline: none !important; }
             `}
           </style>
          <h3 className="text-lg font-semibold mb-6">Payment Methods</h3>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart style={{ outline: 'none' }}>
                <Pie
                  data={stats.paymentMethods}
                  cx="40%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  strokeWidth={0}
                  isAnimationActive={false}
                  style={{ outline: 'none' }}
                >
                  {stats.paymentMethods.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" style={{ outline: 'none' }} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ border: 'none', boxShadow: 'none', outline: 'none' }} />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  wrapperStyle={{ paddingLeft: '20px', border: 'none', outline: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl" style={{ border: 'none !important', outline: 'none !important', boxShadow: 'none !important' } as React.CSSProperties}>
          <h3 className="text-lg font-semibold mb-6">Recent Orders</h3>
          <div className="space-y-4">
            {stats.recentOrders.map((order: Order) => (
              <div key={order.orderId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full text-primary">
                        <ShoppingBag size={16} />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">Order #{order.orderId.slice(0, 6)}</p>
                        <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-xs font-medium ${
                        order.status === 'Delivered' ? 'text-green-600' : 
                        order.status === 'Cancelled' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                        {order.status}
                    </p>
                </div>
              </div>
            ))}
            {stats.recentOrders.length === 0 && (
                <p className="text-center text-gray-500 py-10">No recent orders</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
