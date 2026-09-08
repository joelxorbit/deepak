import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  getAdminEventsService,
  createUpcomingEventService,
  updateUpcomingEventService,
  publishEventService,
  unpublishEventService,
  archiveEventService,
  deleteEventService,
  uploadEventBannerService
} from '../../services/eventService';

const CATEGORIES = [
  'Tournament',
  'Friendly',
  'League',
  'Academy',
  'Corporate',
  'COMPLETED'
];

export const AdminEventsPage = () => {
  const { addToast } = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'drafts', 'completed', 'archived'
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Tournament',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    venue: 'Elite Turf Main Arena',
    description: '',
    image: '',
    registrationStatus: 'OPEN',
    registrationDeadline: new Date().toISOString().split('T')[0],
    maxParticipants: 16,
    currentParticipants: 0,
    contactPhone: '9876543210',
    contactEmail: '',
    rules: '',
    isPublished: true,
    status: 'Upcoming'
  });

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminEventsService();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load events.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openAddModal = () => {
    setEditingId(null);
    const todayStr = new Date().toISOString().split('T')[0];
    setFormData({
      title: '',
      category: 'Tournament',
      date: todayStr,
      startTime: '09:00',
      endTime: '18:00',
      venue: 'Elite Turf Main Arena',
      description: '',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200',
      registrationStatus: 'OPEN',
      registrationDeadline: todayStr,
      maxParticipants: 16,
      currentParticipants: 0,
      contactPhone: '9876543210',
      contactEmail: '',
      rules: '',
      isPublished: true,
      status: 'Upcoming'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (evt) => {
    setEditingId(evt.id || evt._id);
    setFormData({
      title: evt.title || '',
      category: evt.category || 'Tournament',
      date: evt.date ? evt.date.split('T')[0] : '',
      startTime: evt.startTime || '09:00',
      endTime: evt.endTime || '18:00',
      venue: evt.venue || 'Elite Turf Main Arena',
      description: evt.description || '',
      image: evt.image || '',
      registrationStatus: evt.registrationStatus || 'OPEN',
      registrationDeadline: evt.registrationDeadline ? evt.registrationDeadline.split('T')[0] : (evt.date ? evt.date.split('T')[0] : ''),
      maxParticipants: evt.maxParticipants || 16,
      currentParticipants: evt.currentParticipants || 0,
      contactPhone: evt.contactPhone || '9876543210',
      contactEmail: evt.contactEmail || '',
      rules: Array.isArray(evt.rules) ? evt.rules.join('\n') : (evt.rules || ''),
      isPublished: Boolean(evt.isPublished),
      status: evt.status || 'Upcoming'
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size exceeds 5MB limit.', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = reader.result;
        try {
          const res = await uploadEventBannerService({
            imageBase64: base64String,
            mimeType: file.type,
            fileName: file.name
          });
          if (res?.url) {
            setFormData(prev => ({ ...prev, image: res.url }));
            addToast('Banner uploaded successfully!', 'success');
          }
        } catch (uploadErr) {
          addToast(uploadErr.response?.data?.message || 'Banner upload failed.', 'error');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadingImage(false);
      addToast('Error reading image file.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      addToast('Title and description are required.', 'error');
      return;
    }

    if (formData.registrationDeadline && formData.date && formData.registrationDeadline > formData.date) {
      addToast('Registration deadline cannot be after the event date.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        category: formData.category,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.venue.trim(),
        description: formData.description.trim(),
        image: formData.image.trim(),
        registrationStatus: formData.registrationStatus,
        registrationDeadline: formData.registrationDeadline,
        maxParticipants: Number(formData.maxParticipants) || 16,
        currentParticipants: Number(formData.currentParticipants) || 0,
        contactPhone: formData.contactPhone.trim(),
        contactEmail: formData.contactEmail.trim() || undefined,
        rules: formData.rules ? formData.rules.split('\n').filter(r => r.trim().length > 0) : [],
        isPublished: formData.isPublished,
        status: formData.status
      };

      if (editingId) {
        await updateUpcomingEventService(editingId, payload);
        addToast('Event updated successfully.', 'success');
      } else {
        await createUpcomingEventService(payload);
        addToast('Event created successfully.', 'success');
      }

      setIsModalOpen(false);
      loadEvents();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save event.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishToggle = async (evt) => {
    const id = evt.id || evt._id;
    try {
      if (evt.isPublished) {
        await unpublishEventService(id);
        addToast('Event unpublished.', 'success');
      } else {
        await publishEventService(id);
        addToast('Event published to public showcase!', 'success');
      }
      loadEvents();
    } catch (err) {
      addToast(err.response?.data?.message || 'Action failed.', 'error');
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this event? It will be removed from public view and reject new enquiries.')) {
      return;
    }
    try {
      await archiveEventService(id);
      addToast('Event archived.', 'success');
      loadEvents();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to archive event.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }
    try {
      await deleteEventService(id);
      addToast('Event deleted.', 'success');
      loadEvents();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete event.', 'error');
    }
  };

  // Filter events based on active tab
  const filteredEvents = events.filter(evt => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = evt.title?.toLowerCase().includes(q);
      const matchCat = evt.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }

    if (activeTab === 'upcoming') {
      return evt.status === 'Upcoming' && evt.isPublished && !evt.isArchived;
    }
    if (activeTab === 'drafts') {
      return !evt.isPublished && !evt.isArchived && evt.status !== 'Archived';
    }
    if (activeTab === 'completed') {
      return evt.status === 'Completed' || evt.category === 'COMPLETED';
    }
    if (activeTab === 'archived') {
      return evt.isArchived || evt.status === 'Archived';
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-on-surface">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-3xl font-extrabold tracking-tight">Events Management Console</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Create, publish, and manage upcoming arena tournaments, leagues, and completed showcases.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-hover text-on-primary font-label-bold px-5 py-3 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          Create New Event
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-3xl border border-black/5 shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'upcoming', label: 'Upcoming Published', icon: 'campaign' },
            { id: 'drafts', label: 'Drafts / Unpublished', icon: 'edit_note' },
            { id: 'completed', label: 'Completed Showcases', icon: 'history_edu' },
            { id: 'archived', label: 'Archived', icon: 'archive' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-body-md focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
          <p className="mt-2 text-sm">Loading events...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-black/5 p-12 text-center text-slate-400">
          <span className="material-symbols-outlined text-4xl">event_busy</span>
          <p className="mt-2 text-sm font-semibold">No events found in this view.</p>
          <p className="text-xs mt-1">Create an event or switch tabs to manage existing records.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => {
            const id = evt.id || evt._id;
            const isClosed = evt.registrationStatus === 'CLOSED';
            return (
              <div key={id} className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden flex flex-col justify-between group">
                <div>
                  <div className="aspect-[16/9] overflow-hidden relative">
                    <img src={evt.image} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                        {evt.category || 'Tournament'}
                      </span>
                      {evt.isPublished ? (
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Published
                        </span>
                      ) : (
                        <span className="bg-slate-800/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Draft
                        </span>
                      )}
                    </div>

                    {isClosed && (
                      <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                        Reg Closed
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-600">
                      <span>{evt.date ? evt.date.split('T')[0] : ''}</span>
                      {evt.startTime && <span className="text-slate-500">{evt.startTime} - {evt.endTime}</span>}
                    </div>

                    <h3 className="font-bold text-base text-slate-900 line-clamp-1">{evt.title}</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2">{evt.description}</p>

                    <div className="pt-2 border-t border-black/5 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                      <div>
                        Capacity: <span className="font-bold text-slate-800">{evt.currentParticipants || 0}/{evt.maxParticipants || 16}</span>
                      </div>
                      <div>
                        Deadline: <span className="font-bold text-slate-800">{evt.registrationDeadline ? evt.registrationDeadline.split('T')[0] : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-black/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePublishToggle(evt)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                        evt.isPublished
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                      title={evt.isPublished ? 'Unpublish event' : 'Publish event'}
                    >
                      {evt.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    {!evt.isArchived && (
                      <button
                        onClick={() => handleArchive(id)}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300"
                        title="Archive Event"
                      >
                        Archive
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(evt)}
                      className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
                      title="Edit Event"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(id)}
                      className="p-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                      title="Delete Event"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-black/10 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-black/5 pb-4">
              <div>
                <h2 className="font-extrabold text-xl text-slate-900">
                  {editingId ? 'Edit Event Console' : 'Create Arena Event'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Upcoming tournaments, leagues, or past completed events</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Elite Monsoon 5v5 Championship"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary font-bold"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Registration Status</label>
                  <select
                    value={formData.registrationStatus}
                    onChange={(e) => setFormData({ ...formData, registrationStatus: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary font-bold"
                  >
                    <option value="OPEN">OPEN (Accepting Enquiries)</option>
                    <option value="CLOSED">CLOSED (Reject New Enquiries)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Registration Deadline</label>
                  <input
                    type="date"
                    value={formData.registrationDeadline}
                    onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed overview of the event, prizes, format, rules, etc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary"
                ></textarea>
              </div>

              {/* Banner Upload / URL */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Event Banner Image (Max 5MB)</label>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="w-full sm:w-1/2 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  />
                  <input
                    type="url"
                    placeholder="Or enter Image URL"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full sm:w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                {uploadingImage && <p className="text-[11px] text-primary animate-pulse font-bold">Uploading banner...</p>}
                {formData.image && (
                  <div className="h-32 rounded-xl overflow-hidden border border-black/10 mt-2">
                    <img src={formData.image} alt="Banner Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Rules / Guidelines */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tournament Rules & Notes (One per line)</label>
                <textarea
                  rows="2"
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  placeholder="1. FIFA standard rules apply&#10;2. Non-marking studs mandatory"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-primary"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPublishedCheckbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="isPublishedCheckbox" className="font-bold text-slate-700 cursor-pointer">
                  Publish immediately to public showcase
                </label>
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
                  disabled={submitting || uploadingImage}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
