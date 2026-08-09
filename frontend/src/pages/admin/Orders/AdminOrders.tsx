import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { useAuth } from '../../../context/AuthContext';
import { Order } from '../../../types/order';
import { Search, MapPin, Trash2, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const AdminOrders: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['adminOrders'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const response = await axios.get(`${ENV.API_URL}/orders/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    },
    enabled: !!user,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string, newStatus: string }) => {
      const token = await user?.getIdToken();
      await axios.patch(`${ENV.API_URL}/orders/${orderId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onMutate: async ({ orderId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['adminOrders'] });
      const previousOrders = queryClient.getQueryData<Order[]>(['adminOrders']);
      queryClient.setQueryData<Order[]>(['adminOrders'], old => 
        old?.map(order => 
          order.orderId === orderId ? { ...order, status: newStatus as Order['status'] } : order
        )
      );
      return { previousOrders };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['adminOrders'], context.previousOrders);
      }
      toast.error("Failed to update status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminDeliveries'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
  });

  // COD Payment Confirmation Mutation
  const confirmCODPaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const token = await user?.getIdToken();
      await axios.patch(
        `${ENV.API_URL}/admin/orders/${orderId}/confirm-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminDeliveries'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast.success("COD payment confirmed!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to confirm payment");
    }
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  }, []);

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const token = await user?.getIdToken();
      await axios.delete(`${ENV.API_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminDeliveries'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      toast.success("Order deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete order");
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-blue-100 text-blue-700';
      case 'Cooking': return 'bg-yellow-100 text-yellow-700';
      case 'Out for Delivery': return 'bg-purple-100 text-purple-700';
      case 'Delivered': return 'bg-green-100 text-green-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPlanStyles = (plan?: string) => {
    if (!plan) return 'text-gray-500';
    if (plan.includes('Basic')) return 'text-[#6d28d9] font-bold'; // Deep Violet
    if (plan.includes('Standard')) return 'text-[#be185d] font-bold'; // Vivid Pink
    if (plan.includes('Premium')) return 'text-[#1d4ed8] font-bold'; // High-Contrast Blue
    return 'text-[#115e59] font-bold'; // Dark Teal
  };

  const isCODPending = (order: Order) => {
    if (!order) return false;
    const method = (order.paymentMethod || '').toLowerCase();
    // COD orders have "Cash on Delivery" as paymentMethod and "Pending" as paymentStatus
    return (method.includes('cash') || method.includes('cod')) && order.paymentStatus !== 'Paid';
  };

  const isCODPaid = (order: Order) => {
    if (!order) return false;
    const method = (order.paymentMethod || '').toLowerCase();
    return (method.includes('cash') || method.includes('cod')) && order.paymentStatus === 'Paid';
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
    const matchesSearch = order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.orderType?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Confirmation Modal Component
  const ConfirmModal = () => {
    if (!confirmModal.isOpen) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-gray-100" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
          <p className="text-sm text-gray-600 mb-6">{confirmModal.message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                confirmModal.onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
              }}
              className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-xl transition"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="flex justify-center p-10">Loading orders...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500">Manage and track all customer orders</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search Order ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none w-64"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cooking">Cooking</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredOrders.map((order) => (
          <div key={order.orderId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-medium text-gray-500">Order #{order.orderId?.slice(0, 8)}</span>
                <h3 className="font-semibold text-gray-900">{order.customerName || `User ${order.userId?.slice(0,5)}`}</h3>
                {order.customerPhone && (
                  <p className="text-xs text-gray-400">{order.customerPhone}</p>
                )}
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-4">📅</span>
                <span>{new Date(order.createdAt || '').toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-4">📍</span>
                <span className="truncate">{order.deliveryAddress || 'No address'}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-4 mt-0.5">🥗</span>
                <div className="flex flex-col">
                    <span className={getPlanStyles(order.plan)}>
                        {order.plan || (Array.isArray(order.items) ? order.items.length + ' items' : 'Items')}
                    </span>
                    {order.items && !Array.isArray(order.items) && (
                        <span className="text-xs text-gray-400 mt-0.5">
                            {Object.values(order.items).join(', ')}
                        </span>
                    )}
                    {Array.isArray(order.items) && order.items[0]?.name && order.items[0]?.name !== 'Daily Meal' && (
                        <span className="text-xs text-gray-400 mt-0.5">
                            {order.items.map((i: any) => i.name).join(', ')}
                        </span>
                    )}
                </div>
              </div>
              {/* Payment status badge */}
              <div className="pt-1">
                {isCODPending(order) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700">
                    <Clock size={10} />
                    COD - Payment Pending
                  </span>
                )}
                {isCODPaid(order) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-100 text-green-700">
                    <CheckCircle size={10} />
                    COD - Paid
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <select
                  value={order.status}
                  onChange={(e) => updateStatusMutation.mutate({ orderId: order.orderId!, newStatus: e.target.value })}
                  className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-primary/20 outline-none w-32"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Cooking">Cooking</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <div className="flex items-center gap-1">
                  {isCODPending(order) && (
                    <button
                      onClick={() => showConfirm(
                        'Collect COD Payment',
                        `Confirm cash payment received for order #${order.orderId?.slice(0, 8)}?`,
                        () => confirmCODPaymentMutation.mutate(order.orderId!)
                      )}
                      disabled={confirmCODPaymentMutation.isPending}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Collect COD Payment"
                    >
                      <DollarSign size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => showConfirm(
                      'Delete Order',
                      `Are you sure you want to delete order #${order.orderId?.slice(0, 8)}?`,
                      () => deleteOrderMutation.mutate(order.orderId!)
                    )}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    #{order.orderId?.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(order.createdAt || '').toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-gray-900 text-sm">{order.customerName || `User ${order.userId?.slice(0,5)}...`}</p>
                      {order.customerPhone && (
                        <p className="text-xs text-gray-400 font-normal">{order.customerPhone}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate" title={order.deliveryAddress || 'No address'}>
                    {order.deliveryAddress && order.deliveryAddress !== 'No Address Provided' ? (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary transition-colors group"
                        >
                            <MapPin size={14} className="text-gray-400 group-hover:text-primary" />
                            <span className="truncate">
                               {order.deliveryAddress.length > 20 ? order.deliveryAddress.substring(0, 20) + '...' : order.deliveryAddress}
                            </span>
                        </a>
                    ) : (
                        <span className="italic text-gray-400">Address not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm max-w-[200px] truncate" title={order.orderType === 'Subscription' && order.items && !Array.isArray(order.items) ? Object.values(order.items).join(', ') : ''}>
                    <div className="flex flex-col">
                        <span className={getPlanStyles(order.plan)}>
                            {order.plan || (Array.isArray(order.items) ? order.items.length + ' items' : 'Items')}
                        </span>
                        {order.items && !Array.isArray(order.items) && (
                            <span className="text-xs text-gray-400 mt-1 truncate">
                                {Object.values(order.items).join(', ')}
                            </span>
                        )}
                        {Array.isArray(order.items) && order.items[0]?.name && order.items[0]?.name !== 'Daily Meal' && (
                            <span className="text-xs text-gray-400 mt-1 truncate">
                                {order.items.map((i: any) => i.name).join(', ')}
                            </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatusMutation.mutate({ orderId: order.orderId!, newStatus: e.target.value })}
                      className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer hover:border-gray-300 min-w-[140px]"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Cooking">Cooking</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {isCODPending(order) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                        <Clock size={12} />
                        Pending
                      </span>
                    )}
                    {isCODPaid(order) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle size={12} />
                        Paid
                      </span>
                    )}
                    {!isCODPending(order) && !isCODPaid(order) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        <CheckCircle size={12} />
                        {order.paymentStatus || 'Online'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {isCODPending(order) && (
                        <button
                          onClick={() => showConfirm(
                            'Collect COD Payment',
                            `Confirm cash payment received for order #${order.orderId?.slice(0, 8)}?`,
                            () => confirmCODPaymentMutation.mutate(order.orderId!)
                          )}
                          disabled={confirmCODPaymentMutation.isPending}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-all disabled:opacity-50"
                          title="Collect COD Payment"
                        >
                          <DollarSign size={14} />
                          Collect $
                        </button>
                      )}
                      <button
                        onClick={() => showConfirm(
                          'Delete Order',
                          `Are you sure you want to delete order #${order.orderId?.slice(0, 8)}?`,
                          () => deleteOrderMutation.mutate(order.orderId!)
                        )}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Order"
                        disabled={deleteOrderMutation.isPending}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No orders found based on current filters.
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
};

export default AdminOrders;
