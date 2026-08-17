import React, { useState, useEffect } from 'react';
import {
  fetchEnquiriesService,
  updateEnquiryStatusService,
  deleteEnquiryService
} from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export const EnquiriesPage = () => {
  const { addToast } = useToast();
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateEnquiryStatusService(id, newStatus);
      setEnquiries(prev => prev.map(e => (e.id === id || e._id === id) ? { ...e, status: newStatus } : e));
      addToast(`Enquiry status updated to ${newStatus}.`, 'success');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold text-on-surface">Contact Enquiries</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-1">
          Review and respond to customer messages submitted through the Contact Us page.
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
            placeholder="Search by Name, Phone, Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
          />
          <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-xl">search</span>
        </form>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['All', 'Unread', 'Read', 'Replied'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`min-h-[44px] px-5 py-2.5 rounded-2xl text-xs font-label-bold transition-all flex-shrink-0 flex items-center justify-center ${
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
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-label-bold px-3 py-1 rounded-full ${
                        enquiry.status === 'Unread' ? 'bg-error-container text-on-error-container font-bold' :
                        enquiry.status === 'Replied' ? 'bg-primary-container/20 text-on-primary-container' :
                        'bg-secondary-container text-on-secondary-container'
                      }`}>
                        {enquiry.status}
                      </span>
                      <span className="text-xs text-on-surface-variant">{dateStr}</span>
                    </div>
                  </div>

                  <p className="text-sm text-on-surface-variant bg-surface-container-low p-4 rounded-2xl border border-black/5 leading-relaxed">
                    {enquiry.message}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {enquiry.status === 'Unread' && (
                      <button
                        onClick={() => handleUpdateStatus(displayId, 'Read')}
                        className="min-h-[44px] px-4 py-2 bg-secondary-container text-on-secondary-container text-xs font-label-bold rounded-xl hover:shadow-sm"
                      >
                        Mark as Read
                      </button>
                    )}
                    {enquiry.status !== 'Replied' && (
                      <button
                        onClick={() => handleUpdateStatus(displayId, 'Replied')}
                        className="min-h-[44px] px-4 py-2 bg-primary text-white text-xs font-label-bold rounded-xl hover:shadow-md"
                      >
                        Mark as Replied
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(displayId)}
                      className="min-h-[44px] px-4 py-2 bg-error/10 text-error text-xs font-label-bold rounded-xl hover:bg-error/20"
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
    </div>
  );
};
