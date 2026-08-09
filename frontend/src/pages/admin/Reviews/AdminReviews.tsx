import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { ENV } from '../../../config/env.config';
import { toast } from 'sonner';
import { Star, Trash2, ShieldCheck, Search, Filter, MessageSquare, Plus, Edit, X } from 'lucide-react';

interface Review {
  reviewId: string;
  userId: string;
  userName: string;
  userEmail: string;
  subscriptionId: string;
  plan: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  avatar: string;
}

const AdminReviews: React.FC = () => {
  const { user } = useAuth();
  
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'reviews' | 'testimonials'>('reviews');

  // Customer Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');

  // Testimonials State
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [deletingTestiId, setDeletingTestiId] = useState<string | null>(null);
  
  // Testimonial Modal/Form State
  const [isTestiModalOpen, setIsTestiModalOpen] = useState(false);
  const [editingTesti, setEditingTesti] = useState<Testimonial | null>(null);
  const [testiName, setTestiName] = useState('');
  const [testiRole, setTestiRole] = useState('');
  const [testiText, setTestiText] = useState('');
  const [testiRating, setTestiRating] = useState(5);
  const [testiAvatar, setTestiAvatar] = useState('');
  const [savingTesti, setSavingTesti] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const token = await user?.getIdToken();
      const res = await axios.get(`${ENV.API_URL}/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setReviews(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      toast.error("Failed to load reviews.");
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchTestimonials = async () => {
    try {
      setTestimonialsLoading(true);
      const res = await axios.get(`${ENV.API_URL}/testimonials`);
      if (res.data.success) {
        setTestimonials(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch testimonials:", error);
      toast.error("Failed to load testimonials.");
    } finally {
      setTestimonialsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReviews();
      fetchTestimonials();
    }
  }, [user]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingReviewId(reviewId);
      const token = await user?.getIdToken();
      const res = await axios.delete(`${ENV.API_URL}/admin/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success("Review deleted successfully.");
        setReviews(prev => prev.filter(r => r.reviewId !== reviewId));
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
      toast.error("Failed to delete review.");
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this testimonial?")) {
      return;
    }

    try {
      setDeletingTestiId(id);
      const token = await user?.getIdToken();
      const res = await axios.delete(`${ENV.API_URL}/admin/testimonials/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success("Testimonial deleted successfully.");
        setTestimonials(prev => prev.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete testimonial:", error);
      toast.error("Failed to delete testimonial.");
    } finally {
      setDeletingTestiId(null);
    }
  };

  const openAddTestiModal = () => {
    setEditingTesti(null);
    setTestiName('');
    setTestiRole('');
    setTestiText('');
    setTestiRating(5);
    setTestiAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face');
    setIsTestiModalOpen(true);
  };

  const openEditTestiModal = (t: Testimonial) => {
    setEditingTesti(t);
    setTestiName(t.name);
    setTestiRole(t.role);
    setTestiText(t.text);
    setTestiRating(t.rating);
    setTestiAvatar(t.avatar);
    setIsTestiModalOpen(true);
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testiName || !testiRole || !testiText) {
      toast.error("Please fill out all required fields.");
      return;
    }

    try {
      setSavingTesti(true);
      const token = await user?.getIdToken();
      const payload = {
        id: editingTesti?.id || undefined,
        name: testiName,
        role: testiRole,
        text: testiText,
        rating: testiRating,
        avatar: testiAvatar
      };

      const res = await axios.post(`${ENV.API_URL}/admin/testimonials`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast.success(editingTesti ? "Testimonial updated." : "Testimonial created.");
        setIsTestiModalOpen(false);
        fetchTestimonials();
      }
    } catch (error) {
      console.error("Failed to save testimonial:", error);
      toast.error("Failed to save testimonial.");
    } finally {
      setSavingTesti(false);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.plan.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating = ratingFilter === 'all' || review.rating === ratingFilter;

    return matchesSearch && matchesRating;
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={`${
              star <= rating 
                ? 'text-yellow-500 fill-yellow-500' 
                : 'text-slate-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="text-primary" size={28} />
            Customer Reviews & Feedback
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-semibold mt-1">
            Configure customer-submitted reviews and update landing page featured testimonials.
          </p>
        </div>
        
        {/* Tab Selector */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1.5 self-start lg:self-auto shadow-inner border border-slate-200/40">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'reviews'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Reviews
          </button>
          <button
            onClick={() => setActiveTab('testimonials')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'testimonials'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Testimonials
          </button>
        </div>
      </div>

      {activeTab === 'reviews' && (
        <>
          {/* Stats Counters Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow duration-300">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Reviews</p>
                <p className="text-3xl font-black text-slate-900 mt-2">{reviews.length}</p>
              </div>
              <div className="p-3.5 bg-primary/10 text-primary rounded-2xl">
                <MessageSquare size={24} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow duration-300">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Rating</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-3xl font-black text-slate-900">
                    {reviews.length > 0 
                      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                      : '0.0'}
                  </p>
                  <div className="flex text-yellow-500">
                    <Star size={18} className="fill-current" />
                  </div>
                </div>
              </div>
              <div className="p-3.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100">
                <Star size={24} className="fill-current" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow duration-300">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matching Filters</p>
                <p className="text-3xl font-black text-slate-900 mt-2">{filteredReviews.length}</p>
              </div>
              <div className="p-3.5 bg-green-50 text-green-600 rounded-2xl border border-green-100">
                <Filter size={24} />
              </div>
            </div>
          </div>

          {/* Control Bar: Beautiful Search & Filter Pills */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-md shadow-slate-100/40">
            <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
              
              {/* Search Box */}
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors duration-300" size={18} />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-10 py-3 w-full border border-slate-200 rounded-2xl font-semibold text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none bg-slate-50/50 hover:bg-slate-50 transition-all duration-300 shadow-inner"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 font-bold transition-all text-xs bg-slate-200/60 hover:bg-slate-200 p-1.5 rounded-full"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Rating Filter Pills */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Filter size={12} className="text-slate-400" />
                  Rating
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setRatingFilter('all')}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-300 border ${
                      ratingFilter === 'all'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    All
                  </button>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setRatingFilter(rating)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all duration-300 border flex items-center gap-1.5 ${
                        ratingFilter === rating
                          ? 'bg-yellow-50 text-yellow-800 border-yellow-400/60 shadow-sm shadow-yellow-500/10'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {rating}
                      <Star size={12} className="fill-yellow-500 text-yellow-500" />
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Reviews Table/Grid */}
          {reviewsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <MessageSquare className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-lg font-bold text-slate-800 mb-1">No reviews found</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                {reviews.length === 0 
                  ? "Customers haven't submitted any reviews yet." 
                  : "No reviews match your active filters."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subscription Plan</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rating</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Review</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReviews.map((review) => (
                      <tr key={review.reviewId} className="hover:bg-slate-50/50 transition">
                        <td className="p-5">
                          <div className="font-extrabold text-slate-850 text-sm">{review.userName}</div>
                          <div className="text-[11px] font-semibold text-slate-400">{review.userEmail}</div>
                        </td>
                        <td className="p-5">
                          <span className="px-3 py-1 rounded-xl text-xs font-black capitalize bg-primary/10 text-primary border border-primary/20">
                            {review.plan} Plan
                          </span>
                        </td>
                        <td className="p-5">
                          {renderStars(review.rating)}
                        </td>
                        <td className="p-5 max-w-sm">
                          <div className="font-bold text-slate-800 text-sm mb-1">{review.title}</div>
                          <p className="text-slate-500 text-xs font-medium leading-relaxed break-words">{review.comment}</p>
                        </td>
                        <td className="p-5 text-xs font-bold text-slate-400">
                          {new Date(review.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-5 text-right">
                          <button
                            onClick={() => handleDeleteReview(review.reviewId)}
                            disabled={deletingReviewId === review.reviewId}
                            className="text-slate-400 hover:text-red-650 hover:bg-red-50 p-2 rounded-xl transition-all"
                            title="Delete Review"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'testimonials' && (
        <>
          <div className="flex justify-between items-center bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Homepage Testimonials ({testimonials.length})</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Control the active testimonials shown on the landing page.</p>
            </div>
            <button
              onClick={openAddTestiModal}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-2xl font-bold text-xs transition shadow-md shadow-primary/10"
            >
              <Plus size={14} />
              Add Testimonial
            </button>
          </div>

          {testimonialsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium">Loading testimonials...</p>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <MessageSquare className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-lg font-bold text-slate-800 mb-1">No testimonials found</h3>
              <p className="text-slate-400 text-xs">Click Add Testimonial above to populate the landing page slider.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testi) => (
                <div key={testi.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between relative group">
                  <div>
                    {/* User profile card */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <img
                        src={testi.avatar}
                        alt={testi.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                      />
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{testi.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{testi.role}</span>
                      </div>
                    </div>
                    {/* Rating stars */}
                    <div className="flex gap-0.5 mb-3">
                      {renderStars(testi.rating)}
                    </div>
                    {/* Feedback quote */}
                    <p className="text-slate-600 text-xs font-semibold leading-relaxed mb-6 italic">
                      "{testi.text}"
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex justify-end gap-2 border-t border-slate-50 pt-4 mt-auto">
                    <button
                      onClick={() => openEditTestiModal(testi)}
                      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                      title="Edit Testimonial"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTestimonial(testi.id)}
                      disabled={deletingTestiId === testi.id}
                      className="p-2 text-slate-400 hover:text-red-655 hover:bg-red-50 rounded-xl transition"
                      title="Delete Testimonial"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* SECURED CONSOLE INDICATOR FOOTER */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white flex gap-4 items-center">
        <ShieldCheck className="text-primary shrink-0" size={32} />
        <div>
          <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-400">Secured Operational Console</h4>
          <p className="text-xs text-slate-300 mt-1">
            All reviews and homepage customer highlights are processed securely using Admin IDOR token validation.
          </p>
        </div>
      </div>

      {/* Testimonial Edit/Add Modal */}
      {isTestiModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsTestiModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 p-1.5 rounded-full hover:bg-slate-100 transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              {editingTesti ? "Edit Testimonial" : "Create Testimonial"}
            </h3>
            <p className="text-slate-500 text-xs mb-6">
              Write a customer review to display on the landing page testimonials slider.
            </p>

            <form onSubmit={handleSaveTestimonial} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={testiName}
                  onChange={(e) => setTestiName(e.target.value)}
                  className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="e.g. Priya Patel"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Customer Role/Subtitle *</label>
                <input
                  type="text"
                  required
                  value={testiRole}
                  onChange={(e) => setTestiRole(e.target.value)}
                  className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="e.g. SFU Student / Software Engineer"
                />
              </div>

              {/* Avatar URL & Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Avatar Image</label>
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {testiAvatar ? (
                      <img src={testiAvatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 text-[10px] font-bold">No Image</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={testiAvatar}
                      onChange={(e) => setTestiAvatar(e.target.value)}
                      className="px-4 py-2 w-full border border-slate-200 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      placeholder="Paste image URL or upload file"
                    />
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 hover:bg-slate-100 transition">
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setUploadingAvatar(true);
                              const token = await user?.getIdToken();
                              const formData = new FormData();
                              formData.append('image', file);
                              const res = await axios.post(`${ENV.API_URL}/admin/menu/upload`, formData, {
                                headers: {
                                  'Content-Type': 'multipart/form-data',
                                  Authorization: `Bearer ${token}`
                                }
                              });
                              if (res.data.success && res.data.data.url) {
                                setTestiAvatar(res.data.data.url);
                                toast.success("Avatar image uploaded successfully!");
                              }
                            } catch (err) {
                              console.error("Failed to upload avatar:", err);
                              toast.error("Failed to upload avatar image.");
                            } finally {
                              setUploadingAvatar(false);
                            }
                          }}
                        />
                      </label>
                      {uploadingAvatar && (
                        <span className="text-[10px] text-slate-400 font-bold animate-pulse">Uploading...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Rating</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTestiRating(star)}
                      className="transition transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        size={24}
                        className={`${
                          star <= testiRating 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-slate-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Text */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Testimonial Text *</label>
                <textarea
                  required
                  value={testiText}
                  onChange={(e) => setTestiText(e.target.value)}
                  className="px-4 py-2.5 w-full border border-slate-200 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="What did they say about the food?"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsTestiModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTesti}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 transition text-xs shadow-sm"
                >
                  {savingTesti && (
                    <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
