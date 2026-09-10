import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  fetchCouponsService,
  createCouponService,
  toggleCouponStatusService,
  deleteCouponService
} from '../../services/couponService';

export const CouponsPage = () => {
  const { addToast } = useToast();

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountAmount: '',
    validUntil: '',
    notes: ''
  });

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCouponsService();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load coupons.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const openCreateModal = () => {
    // Default validUntil to 30 days from now
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const defaultDate = nextMonth.toISOString().split('T')[0];

    setFormData({
      code: '',
      discountAmount: '',
      validUntil: defaultDate,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const updated = await toggleCouponStatusService(coupon.id);
      addToast(`Coupon "${coupon.code}" ${updated.status === 'active' ? 'activated' : 'deactivated'}.`, 'success');
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, status: updated.status } : c));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update coupon status.', 'error');
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.code}"? Existing bookings will keep their recorded discount.`)) {
      return;
    }

    try {
      await deleteCouponService(coupon.id);
      addToast(`Coupon "${coupon.code}" deleted successfully.`, 'success');
      setCoupons(prev => prev.filter(c => c.id !== coupon.id));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete coupon.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanCode = formData.code.trim().toUpperCase();
    if (!cleanCode) {
      addToast('Coupon code is required.', 'error');
      return;
    }

    const numDiscount = Number(formData.discountAmount);
    if (!numDiscount || numDiscount <= 0) {
      addToast('Please enter a valid discount amount greater than ₹0.', 'error');
      return;
    }

    if (!formData.validUntil) {
      addToast('Please select a valid until date.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await createCouponService({
        code: cleanCode,
        discountAmount: numDiscount,
        validUntil: formData.validUntil,
        notes: formData.notes?.trim() || ''
      });

      addToast(`Coupon "${cleanCode}" created successfully!`, 'success');
      setIsModalOpen(false);
      await loadCoupons();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create coupon.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.status === 'active' && (!c.validUntil || c.validUntil >= todayStr)).length;
  const expiredCoupons = coupons.filter(c => c.validUntil && c.validUntil < todayStr).length;

  return (
    <div className="space-y-6 animate-fade-in text-on-surface">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold tracking-tight">Coupon Management</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Create simple discount coupons with flat rupee savings and validity dates for customer bookings.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary-hover text-on-primary font-label-bold px-5 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Create Coupon
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Coupons</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalCoupons}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
            <span className="material-symbols-outlined text-2xl">confirmation_number</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Coupons</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeCoupons}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expired</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{expiredCoupons}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <span className="material-symbols-outlined text-2xl">event_busy</span>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
            <p className="mt-2 text-sm font-semibold">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl text-slate-300">confirmation_number</span>
            <p className="mt-2 text-sm font-semibold text-slate-700">No coupons created yet.</p>
            <p className="text-xs mt-1 text-slate-400">Click &ldquo;Create Coupon&rdquo; to add promotional discounts for your turf.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-body-md">
              <thead>
                <tr className="bg-surface-container-low border-b border-black/5 text-slate-600 font-label-bold uppercase text-[11px] tracking-wider">
                  <th className="p-4 pl-6">Coupon Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Valid Until</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {coupons.map((coupon) => {
                  const isExpired = Boolean(coupon.validUntil && coupon.validUntil < todayStr);
                  const isActive = coupon.status === 'active' && !isExpired;

                  return (
                    <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                      {/* Code */}
                      <td className="p-4 pl-6 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
                            {coupon.code}
                          </span>
                        </div>
                        {coupon.notes && (
                          <p className="text-[11px] text-slate-400 italic line-clamp-1">{coupon.notes}</p>
                        )}
                      </td>

                      {/* Discount Amount */}
                      <td className="p-4">
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-base text-emerald-600 font-mono">
                            ₹{coupon.discountAmount}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">flat off</span>
                        </div>
                      </td>

                      {/* Valid Until */}
                      <td className="p-4">
                        <div className="font-mono text-slate-700 font-medium">
                          {coupon.validUntil ? (
                            <span>{coupon.validUntil}</span>
                          ) : (
                            <span className="text-slate-400 italic">No expiry</span>
                          )}
                        </div>
                        {isExpired && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Status Toggle Button */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(coupon)}
                          disabled={isExpired}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            isExpired
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 cursor-not-allowed opacity-75'
                              : isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title={isExpired ? 'Coupon has expired' : 'Click to toggle active status'}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            isExpired ? 'bg-amber-500' : isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}></span>
                          {isExpired ? 'Expired' : isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDelete(coupon)}
                            className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                            title="Delete Coupon"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE COUPON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-black/10 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-black/5 pb-4">
              <div>
                <h2 className="font-extrabold text-xl text-slate-900">Create New Coupon</h2>
                <p className="text-xs text-slate-500 mt-0.5">Simple flat discount code for customer checkout</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Coupon Code / Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Coupon Name / Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME100, SUMMER50"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-primary uppercase font-mono font-semibold"
                />
                <p className="text-[11px] text-slate-400 mt-1">Code entered by customer during booking (auto-capitalized).</p>
              </div>

              {/* Discount Amount */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Discount Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 100"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-primary font-mono font-semibold"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Amount reduced from the booking subtotal.</p>
              </div>

              {/* Valid Until */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Valid Until Date *</label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-primary font-mono font-semibold"
                />
                <p className="text-[11px] text-slate-400 mt-1">The date until which this coupon can be redeemed.</p>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Inaugural promotion"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary-hover text-on-primary font-bold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                      Saving...
                    </>
                  ) : (
                    'Create Coupon'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsPage;
