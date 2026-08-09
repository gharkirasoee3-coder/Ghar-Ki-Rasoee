import React, { useState } from 'react';
import axios from 'axios';
import { ENV } from '../../../config/env.config';
import { useAuth } from '../../../context/AuthContext';
import {
  Ticket,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Percent,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface CouponItem {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  expiresAt: string;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  duration?: 'once' | 'repeating' | 'forever';
  durationInMonths?: number | null;
  createdAt: string;
}

const AdminCoupons: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirm states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [duration, setDuration] = useState<'once' | 'repeating' | 'forever'>('once');
  const [durationInMonths, setDurationInMonths] = useState('');

  // Load all coupons
  const { data: coupons = [], isLoading } = useQuery<CouponItem[]>({
    queryKey: ['adminCoupons'],
    queryFn: async () => {
      const token = await user?.getIdToken();
      const response = await axios.get(`${ENV.API_URL}/admin/coupons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    },
    enabled: !!user,
  });

  const openCreateModal = () => {
    setModalMode('create');
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinOrderAmount('');
    setMaxDiscountAmount('');
    // Default expiration date to 30 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setExpiresAt(defaultDate.toISOString().split('T')[0]);
    setMaxUses('');
    setIsActive(true);
    setDuration('once');
    setDurationInMonths('');
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: CouponItem) => {
    setModalMode('edit');
    setCode(coupon.code);
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountValue.toString());
    setMinOrderAmount(coupon.minOrderAmount.toString());
    setMaxDiscountAmount(coupon.maxDiscountAmount?.toString() || '');
    setExpiresAt(coupon.expiresAt);
    setMaxUses(coupon.maxUses?.toString() || '');
    setIsActive(coupon.isActive);
    setDuration(coupon.duration || 'once');
    setDurationInMonths((coupon.durationInMonths || '').toString());
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const token = await user?.getIdToken();
      const payload = {
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        expiresAt,
        maxUses: maxUses ? Number(maxUses) : null,
        isActive,
        duration,
        durationInMonths: duration === 'repeating' ? Number(durationInMonths) : null,
      };

      if (modalMode === 'create') {
        await axios.post(
          `${ENV.API_URL}/admin/coupons`,
          { ...payload, code: code.toUpperCase().trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccessMsg(`Coupon ${code.toUpperCase().trim()} created successfully!`);
      } else {
        await axios.put(
          `${ENV.API_URL}/admin/coupons/${code}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccessMsg(`Coupon ${code} updated successfully!`);
      }

      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Something went wrong. Please check fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: CouponItem) => {
    try {
      const token = await user?.getIdToken();
      await axios.put(
        `${ENV.API_URL}/admin/coupons/${coupon.code}`,
        { isActive: !coupon.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
    } catch (err) {
      console.error('Failed to toggle coupon status:', err);
    }
  };

  const handleDeleteClick = (couponCode: string) => {
    setCouponToDelete(couponCode);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!couponToDelete) return;
    try {
      const token = await user?.getIdToken();
      await axios.delete(`${ENV.API_URL}/admin/coupons/${couponToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      queryClient.invalidateQueries({ queryKey: ['adminCoupons'] });
      setDeleteConfirmOpen(false);
      setCouponToDelete(null);
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading coupons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons & Promo Codes</h1>
          <p className="text-gray-500">Manage, create, and customize customer checkout discounts</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-orange-500 text-white rounded-xl font-semibold shadow-md hover:from-primary/95 hover:to-orange-500/95 transition transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={18} />
          Create Coupon
        </button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Coupon Code</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Discount</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Requirements</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Expiry</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Uses</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold text-gray-700 text-xs uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map((coupon) => {
                const isExpired = coupon.expiresAt && coupon.expiresAt < new Date().toISOString().split('T')[0];
                return (
                  <tr key={coupon.code} className="hover:bg-gray-50/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <Ticket size={18} />
                        </div>
                        <span className="font-bold text-gray-900 text-sm tracking-wider uppercase bg-gray-100 px-2 py-1 rounded border border-gray-200">
                          {coupon.code}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          {coupon.discountType === 'percentage' ? (
                            <span className="text-sm font-semibold text-gray-800 flex items-center">
                              {coupon.discountValue}% Off
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-gray-800 flex items-center">
                              ${coupon.discountValue.toFixed(2)} CAD Off
                            </span>
                          )}
                          {coupon.maxDiscountAmount !== null && (
                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-1">
                              Max ${coupon.maxDiscountAmount} CAD
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                          {coupon.duration === 'repeating'
                            ? `Repeating (${coupon.durationInMonths} mo)`
                            : coupon.duration || 'once'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-600">
                        {coupon.minOrderAmount > 0 ? (
                          <>Min. Order: <strong className="text-gray-900">${coupon.minOrderAmount.toFixed(2)} CAD</strong></>
                        ) : (
                          <span className="text-gray-400 italic">No minimum</span>
                        )}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className={`flex items-center gap-1.5 text-sm ${isExpired ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                        <Calendar size={14} className="opacity-70" />
                        <span>{new Date(coupon.expiresAt).toLocaleDateString()}</span>
                        {isExpired && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase">Expired</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{coupon.usedCount}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-gray-500">{coupon.maxUses ?? '∞'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        title="Click to toggle status"
                        className="focus:outline-none transition transform hover:scale-105"
                      >
                        {coupon.isActive && !isExpired ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full uppercase tracking-wider">
                            <CheckCircle size={12} /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full uppercase tracking-wider">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEditModal(coupon)}
                          className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition"
                          title="Edit coupon"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(coupon.code)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete coupon"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <Ticket size={48} className="mb-2 text-gray-400" />
                      <p className="text-lg font-medium text-gray-600">No coupons created yet</p>
                      <p className="text-sm text-gray-400 mt-1">Get started by creating your first promotional discount code.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-primary/10 to-orange-500/10 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Ticket className="text-primary" />
                {modalMode === 'create' ? 'Create Promotional Coupon' : 'Edit Coupon Settings'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-lg"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WELCOME10"
                    disabled={modalMode === 'edit'}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-bold uppercase tracking-wider disabled:bg-gray-100 disabled:text-gray-500"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Discount Type
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Flat Rate ($ CAD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Discount Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">
                      {discountType === 'percentage' ? <Percent size={14} /> : <DollarSign size={14} />}
                    </span>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      placeholder={discountType === 'percentage' ? '15' : '10.00'}
                      className="w-full pl-8 pr-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Min Purchase ($ CAD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Max Discount ($ CAD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={discountType === 'fixed'}
                    placeholder="Unlimited"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-semibold disabled:bg-gray-50 disabled:opacity-50"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                 <div>
                   <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                     Max Usage Limit
                   </label>
                   <input
                     type="number"
                     min="1"
                     placeholder="Unlimited"
                     className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                     value={maxUses}
                     onChange={(e) => setMaxUses(e.target.value)}
                   />
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                     Discount Duration
                   </label>
                   <select
                     className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-semibold"
                     value={duration}
                     onChange={(e) => setDuration(e.target.value as 'once' | 'repeating' | 'forever')}
                   >
                     <option value="once">Apply Once (First Month)</option>
                     <option value="repeating">Repeating (Multi-Month)</option>
                     <option value="forever">Forever (Every Month)</option>
                   </select>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                     Duration in Months
                   </label>
                   <input
                     type="number"
                     min="1"
                     disabled={duration !== 'repeating'}
                     placeholder="e.g. 2 months"
                     className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-semibold disabled:bg-gray-50 disabled:opacity-50"
                     value={durationInMonths}
                     onChange={(e) => setDurationInMonths(e.target.value)}
                   />
                 </div>
               </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label htmlFor="isActiveToggle" className="text-sm font-bold text-gray-700 select-none">
                    Status Active
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/95 transition shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Coupon'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && couponToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 transform transition-all animate-in fade-in zoom-in duration-200 p-6 space-y-6">
            <div className="flex items-center gap-4 text-red-600">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Coupon</h3>
                <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Are you sure you want to permanently delete the promo code <strong className="text-gray-900 uppercase font-black px-2 py-1 bg-gray-100 rounded border border-gray-200">{couponToDelete}</strong>? This coupon will no longer be valid for checkouts.
            </p>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setCouponToDelete(null);
                }}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition shadow-sm"
              >
                Delete Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;
