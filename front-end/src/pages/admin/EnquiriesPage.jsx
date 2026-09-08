import React, { useState, useEffect } from 'react';
import {
  fetchEnquiriesService,
  updateEnquiryStatusService,
  deleteEnquiryService
} from '../../services/enquiryService';
import { useToast } from '../../context/ToastContext';

export const EnquiriesPage = () => {
  const { addToast } = useToast();
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Status update modal / notes dialog state
  const [activeEnquiryForNote, setActiveEnquiryForNote] = useState(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEnquiriesService(statusFilter, search);
      setEnquiries(data || []);
    } catch (err) {
      setError('Failed to load enquiries.');
      addToast('Failed to load enquiries.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadEnquiries();
  };

  const handleOpenStatusModal = (enquiry, targetStatus) => {
    setActiveEnquiryForNote(enquiry);
    setSelectedNewStatus(targetStatus);
    setStatusNote(enquiry.notes || '');
  };

  const handleConfirmStatusUpdate = async () => {
    if (!activeEnquiryForNote || !selectedNewStatus) return;
    const enquiryId = activeEnquiryForNote.id || activeEnquiryForNote._id;

    try {
      await updateEnquiryStatusService(enquiryId, selectedNewStatus, statusNote.trim());
      setEnquiries(prev => prev.map(e => (e.id === enquiryId || e._id === enquiryId) ? { ...e, status: selectedNewStatus, notes: statusNote.trim() } : e));
      addToast(`Enquiry status updated to ${selectedNewStatus}.`, 'success');
      setActiveEnquiryForNote(null);
      setSelectedNewStatus('');
      setStatusNote('');
    } catch (err) {
      addToast('Failed to update enquiry status.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
    try {
      await deleteEnquiryService(id);
      setEnquiries(prev => prev.filter(e => e.id !== id && e._id !== id));
      addToast('Enquiry deleted successfully.', 'info');
    } catch (err) {
      addToast('Failed to delete enquiry.', 'error');
    }
  };

  const filterOptions = ['All', 'New', 'Contacted', 'In Progress', 'Converted', 'Closed'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Enquiries & Leads</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-1">
          Review and respond to general contact messages and event booking enquiries.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container font-label-bold text-sm">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Search by Name, Phone, Event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
          />
          <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-xl">search</span>
        </form>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {filterOptions.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs font-label-bold transition-all flex-shrink-0 flex items-center justify-center ${
                statusFilter === status
                  ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden p-6 space-y-4">
        {loading ? (
          <div className="text-center py-12 text-on-surface-variant font-body-md">
            Loading enquiries...
          </div>
        ) : enquiries.length > 0 ? (
          <div className="divide-y divide-black/5">
            {enquiries.map((enquiry) => {
              const displayId = enquiry.id || enquiry._id;
              const dateStr = typeof enquiry.createdAt === 'string' ? enquiry.createdAt.split('T')[0] : 'N/A';

              const isNew = enquiry.status === 'New' || enquiry.status === 'Unread';
              const isContacted = enquiry.status === 'Contacted' || enquiry.status === 'Read';
              const isConverted = enquiry.status === 'Converted' || enquiry.status === 'Replied';
              const isClosed = enquiry.status === 'Closed';

              return (
                <div key={displayId} className="py-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-bold text-on-surface text-base">{enquiry.name}</span>
                      <span className="text-xs text-on-surface-variant font-mono bg-surface-container px-2.5 py-1 rounded-lg">
                        {enquiry.phone}
                      </span>
                      {enquiry.email && (
                        <span className="text-xs text-on-surface-variant">
                          {enquiry.email}
                        </span>
                      )}
                      {enquiry.eventTitle && (
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">event</span>
                          {enquiry.eventTitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-label-bold px-3 py-1 rounded-full ${
                        isNew ? 'bg-error-container text-on-error-container font-bold' :
                        isConverted ? 'bg-primary-container/30 text-on-primary-container font-bold' :
                        isClosed ? 'bg-surface-container-highest text-on-surface-variant' :
                        'bg-secondary-container text-on-secondary-container'
                      }`}>
                        {enquiry.status}
                      </span>
                      <span className="text-xs text-on-surface-variant">{dateStr}</span>
                    </div>
                  </div>

                  {/* Event Specific Lead Details */}
                  {(enquiry.preferredDate || enquiry.participantCount || enquiry.contactPreference) && (
                    <div className="flex flex-wrap gap-4 text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-slate-700">
                      {enquiry.preferredDate && <div><strong>Preferred Date:</strong> {enquiry.preferredDate}</div>}
                      {enquiry.participantCount && <div><strong>Participants:</strong> {enquiry.participantCount}</div>}
                      {enquiry.contactPreference && <div><strong>Preference:</strong> {enquiry.contactPreference}</div>}
                    </div>
                  )}

                  <p className="text-sm text-on-surface-variant bg-surface-container-low p-4 rounded-2xl border border-black/5 leading-relaxed">
                    {enquiry.message}
                  </p>

                  {enquiry.notes && (
                    <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-amber-700">note</span>
                      <div>
                        <strong>Internal Admin Notes:</strong> {enquiry.notes}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    {isNew && (
                      <button
                        onClick={() => handleOpenStatusModal(enquiry, 'Contacted')}
                        className="min-h-[38px] px-3.5 py-1.5 bg-secondary-container text-on-secondary-container text-xs font-label-bold rounded-xl hover:shadow-sm"
                      >
                        Mark Contacted
                      </button>
                    )}
                    {enquiry.status !== 'In Progress' && (
                      <button
                        onClick={() => handleOpenStatusModal(enquiry, 'In Progress')}
                        className="min-h-[38px] px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-label-bold rounded-xl hover:bg-blue-100"
                      >
                        In Progress
                      </button>
                    )}
                    {enquiry.status !== 'Converted' && (
                      <button
                        onClick={() => handleOpenStatusModal(enquiry, 'Converted')}
                        className="min-h-[38px] px-3.5 py-1.5 bg-primary text-white text-xs font-label-bold rounded-xl hover:shadow-md"
                      >
                        Mark Converted
                      </button>
                    )}
                    {enquiry.status !== 'Closed' && (
                      <button
                        onClick={() => handleOpenStatusModal(enquiry, 'Closed')}
                        className="min-h-[38px] px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-label-bold rounded-xl hover:bg-slate-200"
                      >
                        Close
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(displayId)}
                      className="min-h-[38px] px-3.5 py-1.5 bg-error/10 text-error text-xs font-label-bold rounded-xl hover:bg-error/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-on-surface-variant font-body-md space-y-2">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">mark_email_read</span>
            <p>No enquiries found matching your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Status Update with Optional Notes Dialog */}
      {activeEnquiryForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-black/10">
            <h3 className="font-extrabold text-lg text-slate-900">
              Update Status to "{selectedNewStatus}"
            </h3>
            <p className="text-xs text-slate-600">
              You can optionally append notes or remarks for this lead.
            </p>
            <textarea
              rows="3"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="e.g. Discussed pricing for 30 players tournament on Saturday..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setActiveEnquiryForNote(null); setSelectedNewStatus(''); setStatusNote(''); }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusUpdate}
                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:shadow-md"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
