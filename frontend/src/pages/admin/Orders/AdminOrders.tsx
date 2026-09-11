import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { useAuth } from '../../../context/AuthContext';
import { Order } from '../../../types/order';
import { 
  Search, MapPin, Trash2, DollarSign, CheckCircle2, Clock, 
  ChevronDown, Phone, MessageSquare, UtensilsCrossed,
  Calendar, Package, CreditCard, X,
  AlertCircle, Check, ArrowUpRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type TabFilter = 'all' | 'pending_cod' | 'paid' | 'one_time' | 'subscription';

const AdminOrders: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

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
      toast.success("Payment confirmed as collected!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to confirm payment");
    }
  });

  // Delete Order Mutation
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

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = useCallback((
    title: string, 
    message: string, 
    onConfirm: () => void,
    confirmText = 'Confirm',
    confirmVariant: 'primary' | 'danger' = 'primary'
  ) => {
    setConfirmModal({ isOpen: true, title, message, confirmText, confirmVariant, onConfirm });
  }, []);

  const isCODPending = useCallback((order: Order) => {
    if (!order) return false;
    const method = (order.paymentMethod || '').toLowerCase();
    return (method.includes('cash') || method.includes('cod')) && order.paymentStatus !== 'Paid';
  }, []);

  const isOneTimeOrder = useCallback((order: Order) => {
    return order.orderType?.toLowerCase() === 'one-time';
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  // KPI Calculations
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let pendingCODCount = 0;
    let pendingCODAmount = 0;
    let paidCount = 0;
    let oneTimeCount = 0;
    let subscriptionCount = 0;

    orders.forEach(o => {
      const price = typeof o.price === 'number' ? o.price : parseFloat(o.price) || 0;
      if (o.paymentStatus === 'Paid') {
        totalRevenue += price;
        paidCount++;
      }
      if (isCODPending(o)) {
        pendingCODCount++;
        pendingCODAmount += price;
      }
      if (isOneTimeOrder(o)) {
        oneTimeCount++;
      } else {
        subscriptionCount++;
      }
    });

    return {
      totalOrders: orders.length,
      totalRevenue,
      paidCount,
      pendingCODCount,
      pendingCODAmount,
      oneTimeCount,
      subscriptionCount
    };
  }, [orders, isCODPending, isOneTimeOrder]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Tab filter
      if (activeTab === 'pending_cod' && !isCODPending(order)) return false;
      if (activeTab === 'paid' && order.paymentStatus !== 'Paid') return false;
      if (activeTab === 'one_time' && !isOneTimeOrder(order)) return false;
      if (activeTab === 'subscription' && isOneTimeOrder(order)) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesId = order.orderId?.toLowerCase().includes(query);
        const matchesName = order.customerName?.toLowerCase().includes(query);
        const matchesPhone = order.customerPhone?.toLowerCase().includes(query);
        const matchesAddress = order.deliveryAddress?.toLowerCase().includes(query);
        const matchesCity = order.city?.toLowerCase().includes(query);
        const matchesSabzi1 = order.customDetails?.sabziSet1?.toLowerCase().includes(query);
        const matchesSabzi2 = order.customDetails?.sabziSet2?.toLowerCase().includes(query);
        const matchesPlan = order.plan?.toLowerCase().includes(query);
        
        return matchesId || matchesName || matchesPhone || matchesAddress || matchesCity || matchesSabzi1 || matchesSabzi2 || matchesPlan;
      }

      return true;
    });
  }, [orders, activeTab, searchTerm, isCODPending, isOneTimeOrder]);

  // Helper for Payment Badge
  const renderPaymentBadge = (order: Order) => {
    const isPending = isCODPending(order);
    const isPaid = order.paymentStatus === 'Paid';
    const isCash = (order.paymentMethod || '').toLowerCase().includes('cash') || (order.paymentMethod || '').toLowerCase().includes('cod');

    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
          <Clock size={12} className="text-amber-600" />
          COD PENDING
        </span>
      );
    }

    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 size={12} className="text-emerald-600" />
          PAID ({isCash ? 'CASH' : 'STRIPE'})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
        {order.paymentStatus || 'UNPAID'}
      </span>
    );
  };

  // Confirmation Modal Component
  const ConfirmModal = () => {
    if (!confirmModal.isOpen) return null;
    return (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" 
        onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-fade-in" 
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${confirmModal.confirmVariant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {confirmModal.confirmVariant === 'danger' ? <AlertCircle size={24} /> : <DollarSign size={24} />}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{confirmModal.title}</h3>
              <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{confirmModal.message}</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                confirmModal.onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
              }}
              className={`px-5 py-2 text-sm font-bold text-white rounded-xl transition shadow-sm ${
                confirmModal.confirmVariant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              {confirmModal.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Order Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track deliveries, meal choices, and collect cash payments</p>
        </div>

        {metrics.pendingCODCount > 0 && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border border-amber-300 px-4 py-2.5 rounded-2xl shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-900">Awaiting Cash Collection</div>
              <div className="text-sm font-bold text-amber-800">
                {metrics.pendingCODCount} order{metrics.pendingCODCount > 1 ? 's' : ''} • ${metrics.pendingCODAmount.toFixed(2)} CAD
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 truncate">Total Orders</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{metrics.totalOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 truncate">Revenue Collected</p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">${metrics.totalRevenue.toFixed(2)}</h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 truncate">Pending COD</p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{metrics.pendingCODCount} <span className="text-xs font-bold text-amber-800">(${metrics.pendingCODAmount.toFixed(2)})</span></h3>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <UtensilsCrossed size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-500 truncate">One-Time / Sub</p>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{metrics.oneTimeCount} <span className="text-xs font-normal text-gray-400">/ {metrics.subscriptionCount}</span></h3>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('pending_cod')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'pending_cod'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              <Clock size={12} />
              Pending Payment ({metrics.pendingCODCount})
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'paid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <Check size={12} />
              Paid ({metrics.paidCount})
            </button>
            <button
              onClick={() => setActiveTab('one_time')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'one_time'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              One-Time ({metrics.oneTimeCount})
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'subscription'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
              }`}
            >
              Subscriptions ({metrics.subscriptionCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search name, phone, sabzi, address..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs sm:text-sm transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-400 font-medium px-1 flex items-center justify-between">
          <span>Showing {filteredOrders.length} of {orders.length} orders</span>
          {activeTab !== 'all' && (
            <button 
              onClick={() => setActiveTab('all')} 
              className="text-primary hover:underline font-semibold"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const isExpanded = expandedOrderId === order.orderId;
          const isPendingCOD = isCODPending(order);
          const isOneTime = isOneTimeOrder(order);
          const cd = order.customDetails;
          const hasCustomDetails = cd && (cd.sabziSet1 || cd.sabziSet2 || cd.rotiCount);
          const orderDateFormatted = order.createdAt 
            ? new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Recent';

          return (
            <div 
              key={order.orderId}
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
                isPendingCOD && isOneTime 
                  ? 'border-amber-300 ring-2 ring-amber-400/20' 
                  : isExpanded 
                    ? 'border-gray-300 ring-1 ring-black/5' 
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Order Header Row — Spatially Optimized */}
              <div 
                className={`p-4 sm:p-5 cursor-pointer transition-colors select-none ${
                  isPendingCOD ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/70'
                }`}
                onClick={() => toggleExpand(order.orderId!)}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Icon + Primary Identifiers */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    {/* Icon badge */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isOneTime 
                        ? (isPendingCOD ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600')
                        : 'bg-purple-50 text-purple-600'
                    }`}>
                      {isOneTime ? <UtensilsCrossed size={20} /> : <Package size={20} />}
                    </div>

                    {/* Customer & ID info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          #{order.orderId?.slice(0, 8)}
                        </span>
                        
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-wide ${
                          isOneTime ? 'bg-blue-100/70 text-blue-700' : 'bg-purple-100/70 text-purple-700'
                        }`}>
                          {isOneTime ? 'ONE-TIME MEAL' : 'SUBSCRIPTION'}
                        </span>

                        {renderPaymentBadge(order)}
                      </div>

                      {/* Customer Name & Phone */}
                      <div className="flex items-center gap-2 text-sm text-gray-900 font-semibold flex-wrap">
                        <span className="truncate">{order.customerName || 'Customer'}</span>
                        {order.customerPhone && order.customerPhone !== 'N/A' && (
                          <span className="text-xs font-normal text-gray-500 flex items-center gap-1">
                            • <Phone size={11} className="text-gray-400" /> {order.customerPhone}
                          </span>
                        )}
                        {order.city && (
                          <span className="text-xs font-normal text-gray-400 hidden sm:inline">
                            • {order.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Sabzi / Meal Summary Badges (utilize desktop space) */}
                  <div className="hidden xl:flex items-center gap-2 flex-wrap max-w-md">
                    {isOneTime && cd ? (
                      <>
                        {cd.sabziSet1 && (
                          <span className="text-xs font-medium bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg truncate max-w-[160px]" title={cd.sabziSet1}>
                            🥘 {cd.sabziSet1}
                          </span>
                        )}
                        {cd.sabziSet2 && (
                          <span className="text-xs font-medium bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg truncate max-w-[160px]" title={cd.sabziSet2}>
                            🍲 {cd.sabziSet2}
                          </span>
                        )}
                        {cd.rotiCount && (
                          <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                            🫓 {cd.rotiCount}
                          </span>
                        )}
                        {(cd.extraRaita || cd.extraSweet) && (
                          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                            +{cd.extraRaita ? 'Raita' : ''}{cd.extraRaita && cd.extraSweet ? ' & ' : ''}{cd.extraSweet ? 'Sweet' : ''}
                          </span>
                        )}
                      </>
                    ) : (
                      order.plan && (
                        <span className="text-xs font-semibold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg">
                          📋 {order.plan}
                        </span>
                      )
                    )}
                  </div>

                  {/* Right Column: Amount, Date & Chevron (No order status like 'Confirmed' beside amount!) */}
                  <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t border-gray-100 lg:border-none">
                    <div className="text-left lg:text-right">
                      <div className="text-base sm:text-lg font-black text-gray-900">
                        ${typeof order.price === 'number' ? order.price.toFixed(2) : order.price}
                        <span className="text-xs font-semibold text-gray-400 ml-1">CAD</span>
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium">
                        {orderDateFormatted}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                        title={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        <ChevronDown 
                          size={18} 
                          className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile / Tablet meal badges preview when collapsed */}
                {!isExpanded && isOneTime && cd && (cd.sabziSet1 || cd.sabziSet2) && (
                  <div className="mt-3 flex xl:hidden flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                    {cd.sabziSet1 && (
                      <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        🥘 {cd.sabziSet1}
                      </span>
                    )}
                    {cd.sabziSet2 && (
                      <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        🍲 {cd.sabziSet2}
                      </span>
                    )}
                    {cd.rotiCount && (
                      <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        🫓 {cd.rotiCount} rotis
                      </span>
                    )}
                    {cd.extraRaita && (
                      <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">+Raita</span>
                    )}
                    {cd.extraSweet && (
                      <span className="text-[11px] font-semibold bg-pink-50 text-pink-700 px-2 py-0.5 rounded">+Sweet</span>
                    )}
                  </div>
                )}
              </div>

              {/* Expandable Order Detail Panel */}
              {isExpanded && (
                <div className="bg-gradient-to-b from-gray-50/80 to-white border-t border-gray-200 p-4 sm:p-6 space-y-5 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">

                    {/* Card 1: Meal Selections & Items */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <UtensilsCrossed size={15} className="text-primary" />
                          Meal Configuration
                        </h4>
                        <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {isOneTime ? 'One-Time' : 'Subscription'}
                        </span>
                      </div>

                      {hasCustomDetails ? (
                        <div className="space-y-3">
                          {cd.day !== undefined && cd.day !== null && (
                            <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-gray-50 rounded-lg">
                              <span className="text-gray-500 font-medium flex items-center gap-1.5">
                                <Calendar size={13} className="text-gray-400" /> Scheduled Day
                              </span>
                              <span className="font-bold text-gray-900">{DAY_NAMES[cd.day] || `Day ${cd.day}`}</span>
                            </div>
                          )}

                          {cd.sabziSet1 && (
                            <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                              <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block">Sabzi Choice 1</span>
                              <span className="text-sm font-bold text-gray-900 mt-0.5 block">{cd.sabziSet1}</span>
                            </div>
                          )}

                          {cd.sabziSet2 && (
                            <div className="p-2.5 bg-orange-50/50 rounded-xl border border-orange-100">
                              <span className="text-[10px] font-extrabold text-orange-700 uppercase tracking-wider block">Sabzi Choice 2</span>
                              <span className="text-sm font-bold text-gray-900 mt-0.5 block">{cd.sabziSet2}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 font-medium">Rotis Included</span>
                            <span className="font-black text-gray-900 text-sm">{cd.rotiCount || 4} pcs</span>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {cd.extraRaita && (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                                🥗 Extra Raita ($2.00)
                              </span>
                            )}
                            {cd.extraSweet && (
                              <span className="px-2.5 py-1 bg-pink-50 text-pink-700 text-xs font-bold rounded-lg border border-pink-200">
                                🍮 Extra Sweet ($3.00)
                              </span>
                            )}
                            {!cd.extraRaita && !cd.extraSweet && (
                              <span className="text-xs text-gray-400 italic">No extra add-ons</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {order.plan && (
                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                              <span className="text-[10px] font-bold text-purple-700 uppercase block">Meal Plan</span>
                              <span className="text-sm font-bold text-gray-900 mt-0.5 block">{order.plan}</span>
                            </div>
                          )}
                          {Array.isArray(order.items) && order.items.length > 0 ? (
                            <div className="space-y-1.5">
                              {order.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs p-2 bg-gray-50 rounded-lg">
                                  <span className="font-medium text-gray-700">{item.quantity || 1}x {item.name}</span>
                                  <span className="font-bold text-gray-900">${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 italic">Standard subscription order</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card 2: Customer & Delivery Info */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Phone size={15} className="text-primary" />
                          Customer & Delivery
                        </h4>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Customer Name</span>
                          <span className="text-sm font-bold text-gray-900">{order.customerName || 'Unknown Customer'}</span>
                        </div>

                        <div>
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Contact Phone</span>
                          {order.customerPhone && order.customerPhone !== 'N/A' ? (
                            <a 
                              href={`tel:${order.customerPhone}`} 
                              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline mt-0.5 bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10"
                            >
                              <Phone size={13} /> {order.customerPhone}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No phone provided</span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">Delivery Destination</span>
                          {order.deliveryAddress && order.deliveryAddress !== 'No Address Provided' ? (
                            <div className="mt-1">
                              <p className="text-xs font-medium text-gray-800 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                {order.deliveryAddress}
                              </p>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mt-1.5"
                              >
                                <MapPin size={12} /> Open in Google Maps <ArrowUpRight size={12} />
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No address provided</span>
                          )}
                        </div>

                        {order.notes && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80">
                            <span className="text-[10px] font-extrabold text-amber-800 uppercase flex items-center gap-1 mb-1">
                              <MessageSquare size={12} /> Special Delivery Instructions
                            </span>
                            <p className="text-xs text-amber-950 font-medium leading-relaxed">
                              {order.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 3: Payment & Summary */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <CreditCard size={15} className="text-primary" />
                          Payment & Billing
                        </h4>
                        {renderPaymentBadge(order)}
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between text-gray-600">
                          <span>Payment Method</span>
                          <span className="font-bold text-gray-900 capitalize">
                            {(order.paymentMethod || 'Online').toLowerCase().includes('cash') || (order.paymentMethod || '').toLowerCase().includes('cod')
                              ? 'Cash on Delivery (COD)' 
                              : order.paymentMethod || 'Stripe'}
                          </span>
                        </div>

                        {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
                          <div className="flex justify-between text-gray-600">
                            <span>Delivery Fee</span>
                            <span className="font-semibold text-orange-600">+${order.deliveryFee.toFixed(2)}</span>
                          </div>
                        )}

                        {order.couponCode && (
                          <div className="flex justify-between text-gray-600">
                            <span>Coupon Applied</span>
                            <span className="font-bold text-emerald-600">{order.couponCode}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <span className="text-sm font-bold text-gray-900">Total Amount</span>
                          <span className="text-base font-black text-gray-900">
                            ${typeof order.price === 'number' ? order.price.toFixed(2) : order.price} CAD
                          </span>
                        </div>

                        <div className="pt-2 text-[11px] text-gray-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Order Created:</span>
                            <span className="text-gray-600">{orderDateFormatted}</span>
                          </div>
                          {order.deliveryDate && order.deliveryDate !== 'N/A' && (
                            <div className="flex justify-between">
                              <span>Delivery Target:</span>
                              <span className="text-gray-600">{new Date(order.deliveryDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Action Bar & Payment Collection Flow */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-200">
                    {/* Payment Status Banner */}
                    <div className="flex-1">
                      {order.paymentStatus === 'Paid' ? (
                        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl w-full sm:w-auto">
                          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-emerald-800 block">
                              Payment Collected (${typeof order.price === 'number' ? order.price.toFixed(2) : order.price} CAD)
                            </span>
                            <span className="text-[10px] text-emerald-600 font-medium">
                              Verified via {order.paymentMethod || 'Stripe / COD'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-xl w-full sm:w-auto">
                          <Clock size={20} className="text-amber-600 shrink-0 animate-spin-slow" />
                          <div>
                            <span className="text-xs sm:text-sm font-bold text-amber-900 block">
                              Payment Not Collected (${typeof order.price === 'number' ? order.price.toFixed(2) : order.price} CAD)
                            </span>
                            <span className="text-[10px] text-amber-700 font-medium">
                              Collect cash when delivering meal to customer
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Admin Action Buttons */}
                    <div className="flex items-center gap-2.5 justify-end">
                      {order.paymentStatus !== 'Paid' && (
                        <button
                          onClick={() => showConfirm(
                            'Confirm Cash Payment Collected',
                            `Confirm that you have received $${typeof order.price === 'number' ? order.price.toFixed(2) : order.price} CAD cash from ${order.customerName || 'the customer'} for order #${order.orderId?.slice(0, 8)}?`,
                            () => confirmCODPaymentMutation.mutate(order.orderId!),
                            'Mark as Paid',
                            'primary'
                          )}
                          disabled={confirmCODPaymentMutation.isPending}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <DollarSign size={16} />
                          Mark as Paid (${typeof order.price === 'number' ? order.price.toFixed(2) : order.price})
                        </button>
                      )}

                      <button
                        onClick={() => showConfirm(
                          'Delete Order',
                          `Are you sure you want to permanently delete order #${order.orderId?.slice(0, 8)}? This action cannot be undone.`,
                          () => deleteOrderMutation.mutate(order.orderId!),
                          'Delete',
                          'danger'
                        )}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition text-xs font-bold border border-gray-200 hover:border-red-200"
                        title="Delete Order"
                        disabled={deleteOrderMutation.isPending}
                      >
                        <Trash2 size={15} />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
            <Package size={28} />
          </div>
          <h3 className="text-base font-bold text-gray-800">No matching orders found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchTerm ? `No orders matched "${searchTerm}". Try a different search term.` : 'There are currently no orders in this category.'}
          </p>
          {(searchTerm || activeTab !== 'all') && (
            <button
              onClick={() => { setActiveTab('all'); setSearchTerm(''); }}
              className="mt-2 text-xs font-bold text-primary hover:underline"
            >
              Clear filters and search
            </button>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal />
    </div>
  );
};

export default AdminOrders;
