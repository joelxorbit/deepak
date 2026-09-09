import React, { useState, useEffect } from 'react';
import { useBooking } from '../../context/BookingContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useToast } from '../../context/ToastContext';
import { submitEnquiryService } from '../../services/enquiryService';
import { getPublicEventsService } from '../../services/eventService';

export const EventsPage = () => {
  const { customer } = useCustomerAuth();
  const { addToast } = useToast();

  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    preferredDate: '',
    participantCount: '',
    contactPreference: 'any',
    message: ''
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const data = await getPublicEventsService();
        if (Array.isArray(data)) {
          setAllEvents(data);
        }
      } catch (err) {
        console.warn('Could not fetch events from server, using empty list.');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Separate upcoming published events from past completed showcase events
  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingEvents = allEvents.filter(e => {
    if (e.isArchived) return false;
    if (e.status === 'Upcoming' && e.isPublished !== false) return true;
    if (e.category !== 'COMPLETED' && e.status !== 'Completed' && e.date >= todayStr) return true;
    return false;
  });

  const completedEvents = allEvents.filter(e => {
    if (e.isArchived) return false;
    return e.status === 'Completed' || e.category === 'COMPLETED' || (e.date < todayStr && e.status !== 'Upcoming');
  });

  const featuredCompleted = completedEvents.length > 0 ? completedEvents[0] : null;
  const secondaryCompleted = completedEvents.length > 1 ? completedEvents.slice(1) : [];

  const handleOpenModal = (event) => {
    // Check if event registration is explicitly closed
    if (event.registrationStatus === 'CLOSED') {
      addToast('Registration is closed for this event.', 'error');
      return;
    }

    setSelectedEvent(event);
    setFormData({
      name: customer?.name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      preferredDate: event?.date ? event.date.split('T')[0] : '',
      participantCount: '',
      contactPreference: 'any',
      message: `I would like to register/enquire for "${event.title}".`
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.message) {
      addToast('Name, Phone, and Message are required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await submitEnquiryService({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        eventId: selectedEvent?.id || selectedEvent?._id,
        eventTitle: selectedEvent?.title,
        preferredDate: formData.preferredDate || undefined,
        participantCount: formData.participantCount ? Number(formData.participantCount) : undefined,
        contactPreference: formData.contactPreference,
        message: formData.message.trim(),
        customerId: customer?.id || customer?.customerId || undefined
      });

      addToast('Event enquiry submitted successfully! Our team will contact you.', 'success');
      handleCloseModal();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit enquiry.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-16 pb-20 animate-fade-in text-on-surface">
      
      {/* 1. EDITORIAL HERO HEADLINE */}
      <section className="bg-slate-950 text-white py-20 -mt-20 pt-28 border-b border-white/10 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
            ARENA EVENTS & SHOWCASE
          </span>
          <h1 className="font-extrabold text-4xl sm:text-6xl uppercase tracking-tight">
            EVENTS THAT BRING THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">ARENA ALIVE</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Upcoming tournaments, championship leagues, academy tryouts, and highlights from past battles hosted on our FIFA-grade turf.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* 2. UPCOMING PUBLISHED EVENTS SECTION */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Upcoming Battles
                </span>
                <h2 className="font-extrabold text-3xl uppercase tracking-tight text-slate-900 mt-1">
                  Tournaments & Open Leagues
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.map((event) => {
                const id = event.id || event._id;
                const isClosed = event.registrationStatus === 'CLOSED';
                const deadlinePassed = event.registrationDeadline && event.registrationDeadline < todayStr;
                const isRegDisabled = isClosed || deadlinePassed;

                return (
                  <div 
                    key={id} 
                    className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img 
                        src={event.image || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'} 
                        alt={event.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-95"
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'; }}
                      />
                      <div className="absolute top-4 left-4 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                        {event.category || 'Tournament'}
                      </div>

                      {isRegDisabled && (
                        <div className="absolute top-4 right-4 bg-red-600/90 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                          {isClosed ? 'Registration Closed' : 'Deadline Passed'}
                        </div>
                      )}
                    </div>

                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-xs font-mono font-bold text-emerald-600">
                          <span className="material-symbols-outlined text-base">calendar_month</span>
                          <span>{event.date ? event.date.split('T')[0] : ''}</span>
                          {event.startTime && (
                            <>
                              <span className="text-black/20">•</span>
                              <span className="text-slate-500 font-sans">{event.startTime} - {event.endTime}</span>
                            </>
                          )}
                        </div>

                        <h3 className="font-extrabold text-xl text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {event.title}
                        </h3>

                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. VISUALLY DOMINANT SPOTLIGHT FEATURED PAST EVENT */}
        {featuredCompleted && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-2xl uppercase tracking-tight text-on-surface border-l-4 border-emerald-600 pl-4">
              Past Tournament Highlights
            </h3>

            <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-0 group">
              <div className="lg:col-span-7 relative min-h-[300px] lg:min-h-[420px] overflow-hidden">
                <img 
                  src={featuredCompleted.image} 
                  alt={featuredCompleted.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-95"
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'; }}
                />
                <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg">
                  Showcase Match
                </div>
              </div>

              <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-mono font-bold text-emerald-600">
                    <span className="material-symbols-outlined text-base">calendar_month</span>
                    <span>{featuredCompleted.date ? featuredCompleted.date.split('T')[0] : ''}</span>
                    <span className="text-black/20">•</span>
                    <span className="uppercase text-slate-500">{featuredCompleted.category || 'Tournament'}</span>
                  </div>

                  <h2 className="font-extrabold text-2xl sm:text-3xl text-on-surface uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                    {featuredCompleted.title}
                  </h2>

                  <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
                    {featuredCompleted.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-black/5 flex items-center justify-between gap-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                    Status: Completed
                  </span>
                  <button
                    onClick={() => handleOpenModal(featuredCompleted)}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl shadow transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">mail</span>
                    Enquire Similar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. SUPPORTING COMPLETED EVENTS GRID */}
        {secondaryCompleted.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {secondaryCompleted.map((event) => (
              <div 
                key={event.id || event._id} 
                className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="relative h-52 overflow-hidden">
                  <img 
                    src={event.image} 
                    alt={event.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'; }}
                  />
                  <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                    Completed
                  </div>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-600">
                      <span className="material-symbols-outlined text-base">calendar_month</span>
                      <span>{event.date ? event.date.split('T')[0] : ''}</span>
                    </div>
                    <h4 className="font-bold text-lg text-on-surface group-hover:text-emerald-600 transition-colors">{event.title}</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{event.description}</p>
                  </div>

                  <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase">{event.category || 'Event'}</span>
                    <button
                      onClick={() => handleOpenModal(event)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                    >
                      Enquire
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 5. EMPTY STATE FALLBACK */}
        {upcomingEvents.length === 0 && !featuredCompleted && secondaryCompleted.length === 0 && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-slate-300">event_busy</span>
            <h3 className="text-2xl font-extrabold text-slate-800">No Events Scheduled</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              We currently don't have any upcoming tournaments or showcases listed. Please check back later or contact us to organize your own private event.
            </p>
          </div>
        )}
      </div>

      {/* EVENT ENQUIRY / REGISTRATION MODAL */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-black/10 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-black/5 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Event Registration / Enquiry
                </span>
                <h3 className="font-extrabold text-xl text-slate-900 mt-1">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    pattern="[6-9][0-9]{9}"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="optional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Team / Participant Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={formData.participantCount}
                    onChange={(e) => setFormData({ ...formData, participantCount: e.target.value })}
                    placeholder="e.g. 8"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Message / Requirements *
                </label>
                <textarea
                  required
                  rows="3"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us your team name, preferred slot timings, or specific questions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
