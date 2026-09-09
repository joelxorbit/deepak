import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  fetchRateRulesService,
  createRateRuleService,
  updateRateRuleService,
  toggleRateRuleActiveService,
  deleteRateRuleService
} from '../../services/rateService';
import { TIME_SLOTS } from '../../utils/bookingUtils';

const SPORT_OPTIONS = [
  { value: 'all', label: 'All Sports (Universal)' },
  { value: 'football-5v5', label: 'Football 5v5' },
  { value: 'football-7v7', label: 'Football 7v7' },
  { value: 'cricket', label: 'Box Cricket' },
  { value: 'badminton', label: 'Badminton' }
];

const DAY_OPTIONS = [
  { value: 'ALL', label: 'All Days (Universal)' },
  { value: 'WEEKDAY', label: 'Weekdays (Mon-Fri)' },
  { value: 'WEEKEND', label: 'Weekends (Sat-Sun)' },
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' }
];

export const RatesPage = () => {
  const { addToast } = useToast();

  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [companionEditingId, setCompanionEditingId] = useState(null);
  const [editingIsPeak, setEditingIsPeak] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    ruleName: '',
    sportId: 'all',
    ratePerHour: '',
    peakRatePerHour: '',
    effectiveFrom: '',
    effectiveTo: '',
    status: 'active',
    isPeak: false,
    priority: 0,
    notes: ''
  });

  const loadRates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRateRulesService();
      setRates(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load rate rules.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const toInputDate = (str) => {
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const [d, m, y] = str.split('-');
      return `${y}-${m}-${d}`;
    }
    return str;
  };

  const openAddModal = () => {
    setEditingId(null);
    setCompanionEditingId(null);
    setEditingIsPeak(false);
    setFormData({
      ruleName: '',
      sportId: 'all',
      ratePerHour: '',
      peakRatePerHour: '',
      effectiveFrom: '',
      effectiveTo: '',
      status: 'active',
      isPeak: false,
      priority: 0,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rule) => {
    const ruleId = rule.id || rule._id;
    setEditingId(ruleId);
    setCompanionEditingId(rule.companionId || null);

    const normalRate = rule.ratePerHour || '';
    const peakRate = rule.peakRatePerHour || rule.ratePerHour || '';

    setFormData({
      ruleName: rule.ruleName || '',
      sportId: rule.sportId || 'all',
      ratePerHour: normalRate,
      peakRatePerHour: peakRate,
      effectiveFrom: toInputDate(rule.effectiveFrom),
      effectiveTo: toInputDate(rule.effectiveTo),
      status: rule.status || 'active',
      isPeak: false,
      priority: rule.priority || 20,
      notes: rule.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.ratePerHour || Number(formData.ratePerHour) <= 0) {
      addToast('Normal Rate must be greater than ₹0.', 'error');
      return;
    }
    if (!formData.peakRatePerHour || Number(formData.peakRatePerHour) <= 0) {
      addToast('Peak Rate must be greater than ₹0.', 'error');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ruleName: formData.ruleName?.trim() || `Price Rule - ₹${formData.ratePerHour} (Normal) / ₹${formData.peakRatePerHour} (Peak)`,
        sportId: 'all',
        ratePerHour: Number(formData.ratePerHour),
        peakRatePerHour: Number(formData.peakRatePerHour),
        weekendRatePerHour: Number(formData.peakRatePerHour),
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        effectiveFrom: formData.effectiveFrom || undefined,
        effectiveTo: formData.effectiveTo || undefined,
        status: formData.status || 'active',
        isPeak: false,
        priority: (formData.effectiveFrom || formData.effectiveTo) ? 50 : 20,
        notes: formData.notes || `Normal: ₹${formData.ratePerHour}/hr (10 AM - 4 PM) & Peak: ₹${formData.peakRatePerHour}/hr (All other times)`
      };

      if (!editingId) {
        // Create ONE single rule
        await createRateRuleService(payload);
        addToast('Dynamic rate rule created successfully.', 'success');
      } else {
        // Update the single rule
        await updateRateRuleService(editingId, payload);
        if (companionEditingId) {
          try {
            await deleteRateRuleService(companionEditingId);
          } catch {}
        }
        addToast('Rate rule updated successfully.', 'success');
      }
      
      setIsModalOpen(false);
      await loadRates();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save rate rule.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rule) => {
    const id = rule.id || rule._id;
    const isCurrentlyActive = rule.status === 'active' || rule.isActive === true;
    const nextState = !isCurrentlyActive;

    try {
      await toggleRateRuleActiveService(id, nextState);
      if (rule.companionId) {
        try {
          await toggleRateRuleActiveService(rule.companionId, nextState);
        } catch {}
      }
      addToast(`Rate rule ${nextState ? 'activated' : 'deactivated'}.`, 'success');
      setRates(prev => prev.map(r => (r.id === id || r._id === id || r.id === rule.companionId || r._id === rule.companionId ? { ...r, status: nextState ? 'active' : 'inactive', isActive: nextState } : r)));
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update rate status.', 'error');
    }
  };

  const handleDelete = async (rule) => {
    const id = rule.id || rule._id;
    if (!window.confirm('Are you sure you want to delete this rate rule? Past booking pricing snapshots will not be affected.')) {
      return;
    }

    try {
      await deleteRateRuleService(id);
      if (rule.companionId) {
        try {
          await deleteRateRuleService(rule.companionId);
        } catch {}
      }
      addToast('Rate rule deleted successfully.', 'success');
      await loadRates();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete rate rule.', 'error');
    }
  };

  // Helper to determine precedence tier label
  const getPrecedenceBadge = (rule) => {
    const hasDate = Boolean(rule.effectiveFrom || rule.date);
    const hasSpecificSlots = rule.timeSlots && !rule.timeSlots.includes('ALL') && rule.timeSlots.length > 0;
    const hasSpecificDays = rule.daysOfWeek && !rule.daysOfWeek.includes('ALL') && rule.daysOfWeek.length > 0;

    if (hasDate && hasSpecificSlots) {
      return <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Tier 1: Date + Slot</span>;
    }
    if (hasSpecificDays && hasSpecificSlots) {
      return <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Tier 2: Day + Slot</span>;
    }
    if (hasDate) {
      return <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Tier 3: Date (All Slots)</span>;
    }
    if (hasSpecificDays) {
      return <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Tier 4: Day (All Slots)</span>;
    }
    return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">Tier 5: Sport Baseline</span>;
  };

  // Group legacy split companion rules into a single row, or display single rules
  const displayRates = React.useMemo(() => {
    const list = [];
    const seenCompanionIds = new Set();

    for (const rule of rates) {
      const id = rule.id || rule._id;
      if (seenCompanionIds.has(id)) continue;

      // Check if there is an old legacy companion rule
      const companion = rates.find(r => {
        const rId = r.id || r._id;
        if (rId === id || seenCompanionIds.has(rId)) return false;
        const isOppositePeak = Boolean(r.isPeak) !== Boolean(rule.isPeak);
        const matchDates = (r.effectiveFrom || '') === (rule.effectiveFrom || '') && 
                           (r.effectiveTo || '') === (rule.effectiveTo || '');
        return isOppositePeak && matchDates;
      });

      if (companion) {
        const companionId = companion.id || companion._id;
        seenCompanionIds.add(companionId);

        const normalRule = !rule.isPeak ? rule : companion;
        const peakRule = rule.isPeak ? rule : companion;

        list.push({
          ...normalRule,
          id: normalRule.id || normalRule._id,
          ratePerHour: normalRule.ratePerHour,
          peakRatePerHour: peakRule.ratePerHour,
          companionId: companionId,
          ruleName: `Price Rule - ₹${normalRule.ratePerHour} (Normal) / ₹${peakRule.ratePerHour} (Peak)`
        });
      } else {
        list.push({
          ...rule,
          id: rule.id || rule._id,
          ratePerHour: rule.ratePerHour,
          peakRatePerHour: rule.peakRatePerHour || rule.ratePerHour
        });
      }
    }
    return list;
  }, [rates]);

  return (
    <div className="space-y-6 animate-fade-in text-on-surface">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold tracking-tight">Dynamic Rates & Pricing</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Configure authoritative slot pricing rules. Server evaluates with strict 5-tier precedence. Future bookings only.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-hover text-on-primary font-label-bold px-5 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Create Rate Rule
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
            <p className="mt-2 text-sm">Loading rate rules...</p>
          </div>
        ) : displayRates.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl">currency_rupee</span>
            <p className="mt-2 text-sm font-semibold">No dynamic rate rules found.</p>
            <p className="text-xs mt-1">Create rules to dynamically override baseline slot rates.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-body-md">
              <thead>
                <tr className="bg-surface-container-low border-b border-black/5 text-slate-600 font-label-bold uppercase text-[11px] tracking-wider">
                  <th className="p-4 pl-6">Price Rule</th>
                  <th className="p-4">Rate / Hour</th>
                  <th className="p-4">Booking Dates</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {displayRates.map((rule) => {
                  const id = rule.id || rule._id;
                  const isActive = rule.status === 'active' || rule.isActive === true;
                  return (
                    <tr key={id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 pl-6 space-y-1">
                        <div className="font-bold text-slate-900 text-sm">
                          {rule.ruleName || `Price Rule - ₹${rule.ratePerHour} / ₹${rule.peakRatePerHour || rule.ratePerHour}`}
                        </div>
                        {rule.notes && <p className="text-[11px] text-slate-400 italic line-clamp-1">{rule.notes}</p>}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-emerald-600 font-mono">
                              ₹{rule.ratePerHour}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                              Normal (10 AM - 4 PM)
                            </span>
                          </div>
                          {rule.peakRatePerHour && Number(rule.peakRatePerHour) !== Number(rule.ratePerHour) ? (
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-amber-600 font-mono">
                                ₹{rule.peakRatePerHour}
                              </span>
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                                Peak (Other times)
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">per hour (GST-free)</span>
                      </td>

                      <td className="p-4 text-[11px] text-slate-600">
                        {rule.effectiveFrom || rule.effectiveTo ? (
                          <div className="font-mono space-y-0.5">
                            <div>From: <span className="font-semibold text-slate-800">{rule.effectiveFrom || 'Ever'}</span></div>
                            <div>To: <span className="font-semibold text-slate-800">{rule.effectiveTo || 'Indefinite'}</span></div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Always effective</span>
                        )}
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(rule)}
                            className="p-1.5 rounded-lg bg-surface-container border border-outline-variant hover:bg-slate-200 text-slate-700 transition-colors"
                            title="Edit Rule"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                            title="Delete Rule"
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

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-black/10 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-black/5 pb-4">
              <div>
                <h2 className="font-extrabold text-xl text-slate-900">
                  {editingId ? 'Edit Rate Rule' : 'Create Dynamic Rate Rule'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Authoritative pricing rule for future bookings</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Normal Rate / Hour (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={formData.ratePerHour}
                    onChange={(e) => setFormData({ ...formData, ratePerHour: e.target.value })}
                    placeholder="e.g. 600"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Applies to 10:00 AM – 04:00 PM</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Peak Rate / Hour (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={formData.peakRatePerHour}
                    onChange={(e) => setFormData({ ...formData, peakRatePerHour: e.target.value })}
                    placeholder="e.g. 800"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Applies to all other times</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Start Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {submitting ? 'Saving Rule...' : editingId ? 'UPDATE RULE' : 'CREATE RULE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
