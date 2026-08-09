import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { ENV } from '../../../config/env.config';
import { toast } from 'sonner';
import { Trash2, ShieldCheck, Plus, X, Calendar, Coffee } from 'lucide-react';

interface Holiday {
  id: string;
  startDate: string;
  endDate: string;
  description: string;
  numDays: number;
  createdAt: string;
}

const AdminHolidays: React.FC = () => {
  const { user } = useAuth();
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null);

  // Holiday Modal/Form State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayStartDate, setHolidayStartDate] = useState('');
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');
  const [savingHoliday, setSavingHoliday] = useState(false);

  const fetchHolidays = async () => {
    try {
      setHolidaysLoading(true);
      const res = await axios.get(`${ENV.API_URL}/holidays`);
      if (res.data.success) {
        setHolidays(res.data.data);
      }
    } catch (error: any) {
      console.error("Failed to fetch holidays:", error);
      toast.error("Failed to load holidays.");
    } finally {
      setHolidaysLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHolidays();
    }
  }, [user]);

  const handleDeleteHoliday = async (id: string) => {
    if (!window.confirm("Are you sure you want to cancel this holiday? Note: Extensions already processed for user subscriptions will remain.")) {
      return;
    }

    try {
      setDeletingHolidayId(id);
      const token = await user?.getIdToken();
      const res = await axios.delete(`${ENV.API_URL}/admin/holidays/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success("Holiday cancelled successfully.");
        setHolidays(prev => prev.filter(h => h.id !== id));
      }
    } catch (error: any) {
      console.error("Failed to delete holiday:", error);
      toast.error("Failed to cancel holiday.");
    } finally {
      setDeletingHolidayId(null);
    }
  };

  const openAddHolidayModal = () => {
    setHolidayStartDate('');
    setHolidayEndDate('');
    setHolidayDescription('');
    setIsHolidayModalOpen(true);
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayStartDate || !holidayEndDate || !holidayDescription) {
      toast.error("Please fill out all required fields.");
      return;
    }

    try {
      setSavingHoliday(true);
      const token = await user?.getIdToken();
      const payload = {
        startDate: holidayStartDate,
        endDate: holidayEndDate,
        description: holidayDescription
      };

      const res = await axios.post(`${ENV.API_URL}/admin/holidays`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success(res.data.message || "Holiday scheduled and subscriptions extended!");
        setIsHolidayModalOpen(false);
        fetchHolidays();
      }
    } catch (error: any) {
      console.error("Failed to save holiday:", error);
      toast.error(error.response?.data?.message || "Failed to schedule holiday.");
    } finally {
      setSavingHoliday(false);
    }
  };

  const getHolidayStatus = (startStr: string, endStr: string) => {
    const today = new Date().toLocaleDateString('sv-SE');
    if (endStr < today) {
      return { label: 'Completed', style: 'bg-slate-100 text-slate-500 border-slate-200' };
    } else if (startStr <= today && endStr >= today) {
      return { label: 'Active', style: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' };
    } else {
      return { label: 'Upcoming', style: 'bg-green-50 text-green-700 border-green-200' };
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="text-amber-500" size={28} />
            Kitchen Holidays Schedule
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">
            Schedule tiffin kitchen closures. Active customer subscriptions automatically extend to ensure zero meal losses.
          </p>
        </div>
        <button
          onClick={openAddHolidayModal}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold text-xs transition shadow-md shadow-amber-500/10 self-start lg:self-auto"
        >
          <Plus size={14} />
          Schedule Holiday
        </button>
      </div>

      {holidaysLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Loading holiday schedules...</p>
        </div>
      ) : holidays.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Coffee className="mx-auto text-slate-300 mb-4 animate-[wiggle_4s_ease-in-out_infinite]" size={48} />
          <h3 className="text-lg font-bold text-slate-800 mb-1">No holidays scheduled</h3>
          <p className="text-slate-400 text-xs">The kitchen is currently running 7 days a week. Click Schedule Holiday above to add closures.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-250 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Holiday Description</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holidays.map((h) => {
                  const status = getHolidayStatus(h.startDate, h.endDate);
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-5 font-bold text-slate-800 text-sm">
                        {h.description}
                      </td>
                      <td className="p-5 text-xs font-bold text-slate-600">
                        {new Date(h.startDate + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-5 text-xs font-bold text-slate-600">
                        {new Date(h.endDate + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 text-amber-700 border border-amber-100">
                          {h.numDays} {h.numDays === 1 ? 'Day' : 'Days'}
                        </span>
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${status.style}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          disabled={deletingHolidayId === h.id}
                          className="text-slate-400 hover:text-red-655 hover:bg-red-50 p-2 rounded-xl transition-all"
                          title="Cancel Holiday"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECURED CONSOLE INDICATOR FOOTER */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white flex gap-4 items-center">
        <ShieldCheck className="text-primary shrink-0" size={32} />
        <div>
          <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">Secured Operational Console</h4>
          <p className="text-xs text-slate-300 mt-1">
            All reviews, homepage customer highlights, and kitchen schedule extensions are processed securely using Admin IDOR token validation.
          </p>
        </div>
      </div>

      {/* Holiday Edit/Add Modal */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsHolidayModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 p-1.5 rounded-full hover:bg-slate-100 transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-2 flex items-center gap-2">
              <Calendar className="text-amber-500" size={22} />
              Schedule Holiday
            </h3>
            <p className="text-slate-500 text-xs mb-6">
              Subscribers will be alerted on their dashboard, and active plans will automatically extend.
            </p>

            <form onSubmit={handleSaveHoliday} className="space-y-4">
              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Holiday Description *</label>
                <input
                  type="text"
                  required
                  value={holidayDescription}
                  onChange={(e) => setHolidayDescription(e.target.value)}
                  className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                  placeholder="e.g. Christmas Kitchen Break"
                />
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Start Date *</label>
                <input
                  type="date"
                  required
                  value={holidayStartDate}
                  onChange={(e) => setHolidayStartDate(e.target.value)}
                  className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">End Date *</label>
                <input
                  type="date"
                  required
                  value={holidayEndDate}
                  onChange={(e) => setHolidayEndDate(e.target.value)}
                  className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHoliday}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition text-xs shadow-sm"
                >
                  {savingHoliday && (
                    <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  )}
                  Process Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHolidays;
