import React, { useState } from 'react';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Eye,
  Crown,
  Phone,
  Mail,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface UserSubscriptionSummary {
  subscriptionId: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  skippedDatesCount: number;
  remainingDays: number;
  paymentStatus: string;
}

interface UserItem {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  picture: string | null;
  lastLoginAt: string | null;
  subscription: UserSubscriptionSummary | null;
}

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Cancelled' | 'NoSub'>('All');

  const { data: users = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const response = await axios.get(`${ENV.API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    },
    enabled: !!user,
  });

  const filteredUsers = users.filter(u => {
    // Exclude admin users
    if (u.role === 'admin') return false;

    const matchesSearch = searchTerm === '' ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.uid.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesFilter = true;
    if (filter === 'Active') matchesFilter = u.subscription?.status === 'Active';
    else if (filter === 'Cancelled') matchesFilter = u.subscription?.status === 'Cancelled';
    else if (filter === 'NoSub') matchesFilter = !u.subscription;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: users.filter(u => u.role !== 'admin').length,
    active: users.filter(u => u.subscription?.status === 'Active').length,
    cancelled: users.filter(u => u.subscription?.status === 'Cancelled').length,
    noSub: users.filter(u => !u.subscription && u.role !== 'admin').length,
  };

  const StatusBadge = ({ status }: { status: string | undefined }) => {
    if (!status) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
          No Plan
        </span>
      );
    }
    const styles: Record<string, string> = {
      'Active': 'bg-green-100 text-green-700',
      'Cancelled': 'bg-red-100 text-red-700',
      'Expired': 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500">View and manage all registered users</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Subscribers', value: stats.active, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Cancelled', value: stats.cancelled, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'No Subscription', value: stats.noSub, icon: UserMinus, color: 'text-gray-600', bg: 'bg-gray-50' },
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

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['All', 'Active', 'Cancelled', 'NoSub'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  filter === f
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'NoSub' ? 'No Sub' : f}
              </button>
            ))}
          </div>

          <div className="relative flex-1 md:w-72 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, phone, UID..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map((u) => (
          <div
            key={u.uid}
            onClick={() => navigate(`/admin/users/${u.uid}`)}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-500 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md flex-shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 truncate">{u.name}</h3>
                  <StatusBadge status={u.subscription?.status} />
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                  <Mail size={10} /> {u.email}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Phone size={10} /> {u.phone}
                </p>
              </div>
            </div>

            {u.subscription && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Plan</p>
                  <p className="text-xs font-bold text-gray-800">{u.subscription.plan}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Days Left</p>
                  <p className="text-xs font-bold text-gray-800">{u.subscription.remainingDays}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Skipped</p>
                  <p className="text-xs font-bold text-yellow-700">{u.subscription.skippedDatesCount}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">User</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Contact</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Plan</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Dates</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Skipped</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-gray-50/50 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-500 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.uid.slice(0, 12)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-700 flex items-center gap-1.5"><Mail size={12} className="text-gray-400" /> {u.email}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={12} className="text-gray-400" /> {u.phone}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    {u.subscription ? (
                      <div className="flex items-center gap-1.5">
                        <Crown size={14} className="text-primary" />
                        <span className="text-sm font-medium text-gray-900">{u.subscription.plan}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">None</span>
                    )}
                  </td>
                  <td className="p-4">
                    <StatusBadge status={u.subscription?.status} />
                  </td>
                  <td className="p-4">
                    {u.subscription ? (
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="w-10 opacity-60">From:</span>
                          <span className="font-medium">{new Date(u.subscription.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-10 opacity-60">To:</span>
                          <span className="font-medium">{new Date(u.subscription.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {u.subscription ? (
                      <span className={`text-sm font-bold ${u.subscription.skippedDatesCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                        {u.subscription.skippedDatesCount}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <button
                        onClick={() => navigate(`/admin/users/${u.uid}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium text-sm hover:bg-primary/20 transition"
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Search size={48} className="mb-2" />
                      <p className="text-lg font-medium">No users found for your filters</p>
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

export default AdminUsers;
