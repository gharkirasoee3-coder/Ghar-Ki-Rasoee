import React, { useState } from 'react';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  CreditCard,
  AlertCircle,
  Trash2,
  CheckCircle,
  User,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Subscription {
  subscriptionId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  paymentMethod: string;
  paymentStatus: string;
  price?: number;
  planDetails?: { price: number };
  cancellationReason?: string;
}

const AdminSubscriptions: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['adminSubscriptions'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const response = await axios.get(`${ENV.API_URL}/admin/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    },
    enabled: !!user,
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const token = await user?.getIdToken();
      await axios.delete(`${ENV.API_URL}/admin/subscriptions/${subscriptionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast.success("Subscription deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete subscription");
    }
  });

  const confirmSubPaymentMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const token = await user?.getIdToken();
      await axios.patch(
        `${ENV.API_URL}/admin/subscriptions/${subscriptionId}/confirm-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast.success("Subscription payment confirmed!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to confirm payment");
    }
  });

  const getPlanPrice = (sub: Subscription) => {
    if (sub.planDetails?.price) return sub.planDetails.price;
    if (sub.price) return sub.price;
    
    const planName = sub.plan || '';
    if (planName.includes('Basic')) return 150;
    if (planName.includes('Standard')) return 190;
    if (planName.includes('Premium')) return 220;
    return 150; // Default
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = searchTerm === '' ||
      sub.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.subscriptionId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'All' || sub.plan.includes(planFilter);

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'Active').length,
    cancelled: subscriptions.filter(s => s.status === 'Cancelled' || s.status === 'Renewed').length,
    revenue: subscriptions
      .filter(s => s.paymentStatus === 'Paid')
      .reduce((acc, sub) => acc + getPlanPrice(sub), 0)
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Renewed': 'bg-blue-100 text-blue-800',
      'Expired': 'bg-gray-150 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) return <div className="p-10 text-center">Loading Subscriptions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions Management</h1>
          <p className="text-gray-500">View and manage all active and past tiffin plans</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Subscriptions', value: stats.total, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Plans', value: stats.active, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Cancelled & Renewed', value: stats.cancelled, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Total Revenue (Est)', value: `$${stats.revenue.toLocaleString()}`, icon: CreditCard, color: 'text-primary', bg: 'bg-primary/5' },
        ].map((stat, i) => (
          <div key={i} className={`p-4 rounded-xl border border-gray-100 ${stat.bg} shadow-sm`}>
            <div className="flex items-center gap-3">
              <stat.icon className={stat.color} size={24} />
              <div>
                <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Professional Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['All', 'Active', 'Cancelled', 'Renewed', 'Expired'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  statusFilter === status
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5"
            >
              <option value="All">All Plans</option>
              <option value="Basic">Basic Plan</option>
              <option value="Standard">Standard Plan</option>
              <option value="Premium">Premium Plan</option>
            </select>

            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search User ID or Name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredSubscriptions.map((sub) => (
          <div key={sub.subscriptionId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
             <div className="flex justify-between items-start mb-3">
                <div>
                   <h3 className="font-semibold text-gray-900">{sub.userName || 'Unknown User'}</h3>
                   {sub.userPhone && sub.userPhone !== "N/A" && (
                      <p className="text-xs text-gray-500 font-medium">{sub.userPhone}</p>
                   )}
                   <span className="text-xs text-gray-400">ID: {sub.subscriptionId.slice(0, 8)}</span>
                </div>
                <StatusBadge status={sub.status} />
             </div>

             <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div className="bg-gray-50 p-2 rounded-lg">
                   <p className="text-xs text-gray-500">Plan</p>
                   <p className="font-medium text-gray-900">{sub.plan}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                   <p className="text-xs text-gray-500">Price</p>
                   <p className="font-bold text-gray-900">${getPlanPrice(sub)}</p>
                </div>
             </div>

             <div className="space-y-1 text-xs text-gray-600 mb-3">
                <div className="flex justify-between">
                   <span>Start:</span>
                   <span className="font-medium">{new Date(sub.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                   <span>End:</span>
                   <span className="font-medium text-primary-dark">{new Date(sub.endDate).toLocaleDateString()}</span>
                </div>
             </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                   <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${sub.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                     {sub.paymentStatus}
                   </span>
                   <span className="text-xs text-gray-500">{sub.paymentMethod}</span>
                </div>
                <div className="flex items-center gap-1">
                  {sub.paymentMethod === 'Cash on Delivery' && sub.paymentStatus !== 'Paid' && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Confirm payment of $${getPlanPrice(sub)} collected for this subscription?`)) {
                          confirmSubPaymentMutation.mutate(sub.subscriptionId);
                        }
                      }}
                      disabled={confirmSubPaymentMutation.isPending}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title="Collect COD Payment"
                    >
                      <DollarSign size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/admin/users/${sub.userId}`)}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="View Profile"
                  >
                    <User size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this subscription?')) {
                        deleteSubscriptionMutation.mutate(sub.subscriptionId);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">User Details</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Plan Type</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Price (CAD)</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Dates</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Payment info</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.subscriptionId} className="hover:bg-gray-50/50 transition">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">{sub.userName || `UID: ${sub.userId.slice(0, 8)}...`}</span>
                      {sub.userPhone && sub.userPhone !== "N/A" && (
                        <span className="text-xs text-gray-500 font-medium">{sub.userPhone}</span>
                      )}
                      <span className="text-xs text-gray-400">ID: {sub.subscriptionId.slice(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-gray-900">{sub.plan}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-bold text-gray-900">${getPlanPrice(sub)}</span>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-10 opacity-60">From:</span>
                        <span className="font-medium">{new Date(sub.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-10 opacity-60">To:</span>
                        <span className="font-medium text-primary-dark">{new Date(sub.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                       <span className="text-xs font-medium text-gray-700">{sub.paymentMethod}</span>
                       <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold w-fit uppercase ${sub.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                         {sub.paymentStatus}
                       </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-1 items-center">
                      {sub.paymentMethod === 'Cash on Delivery' && sub.paymentStatus !== 'Paid' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Confirm payment of $${getPlanPrice(sub)} collected for this subscription?`)) {
                              confirmSubPaymentMutation.mutate(sub.subscriptionId);
                            }
                          }}
                          disabled={confirmSubPaymentMutation.isPending}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-all"
                          title="Confirm COD Payment"
                        >
                          <DollarSign size={14} />
                          Collect $
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/admin/users/${sub.userId}`)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="View User Profile"
                      >
                        <User size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this subscription?')) {
                            deleteSubscriptionMutation.mutate(sub.subscriptionId);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        disabled={deleteSubscriptionMutation.isPending}
                        title="Delete Subscription"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSubscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Search size={48} className="mb-2" />
                      <p className="text-lg font-medium">No results found for your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminSubscriptions;
