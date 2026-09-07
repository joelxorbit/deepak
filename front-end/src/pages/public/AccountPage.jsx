import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { getCustomerBookingsApi } from '../../services/authService';
import { fetchCustomerEnquiriesService } from '../../services/enquiryService';
import { downloadTicketPdfService } from '../../services/bookingService';
import { ROUTES } from '../../constants/routes';

export const AccountPage = () => {
  const navigate = useNavigate();
  const { customer, isAuthenticated, isLoading: isAuthLoading, loginCustomer, loginWithGoogle, updateProfile, logoutCustomer, authError } = useCustomerAuth();

  // Login form state (for unauthenticated users)
  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Bookings state
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'upcoming', 'past', 'cancelled', 'enquiries'
  const [bookings, setBookings] = useState([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');

  // Enquiries state
  const [enquiries, setEnquiries] = useState([]);
  const [isEnquiriesLoading, setIsEnquiriesLoading] = useState(false);

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Booking Details Modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  const handleDownloadPdf = async (bookingId) => {
    if (!bookingId) return;
    try {
      setDownloadingPdfId(bookingId);
      await downloadTicketPdfService(bookingId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download ticket PDF.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Fetch bookings whenever activeTab or authentication changes
  const fetchBookings = useCallback(async (filter) => {
    if (!isAuthenticated) return;
    if (filter === 'enquiries') {
      try {
        setIsEnquiriesLoading(true);
        const data = await fetchCustomerEnquiriesService();
        setEnquiries(Array.isArray(data) ? data : []);
      } catch (err) {
        setEnquiries([]);
      } finally {
        setIsEnquiriesLoading(false);
      }
      return;
    }

    try {
      setIsBookingsLoading(true);
      setBookingsError('');
      const data = await getCustomerBookingsApi(filter);
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load booking history.';
      setBookingsError(msg);
      setBookings([]);
    } finally {
      setIsBookingsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings(activeTab);
    }
  }, [isAuthenticated, activeTab, fetchBookings]);

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    try {
      setLoginError('');
      setIsLoggingIn(true);
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      } else {
        // Safe staging / browser fallback
        const mockGoogleUser = {
          idToken: 'mock_google_token_' + Date.now(),
          googleId: 'g_' + Math.random().toString(36).substring(2, 10),
          email: 'player.' + Math.random().toString(36).substring(2, 6) + '@gmail.com',
          name: 'Google Player',
          avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGjlSY3ZH4Gg-wF0ZcHm93JeUDmZ8rd3X7blHWi5o64Z1TXN_1dTfFDvFZ46uvSYO1cu04G9DjwVQYWlc4lK8GRQ2oOPs32xxpxPHoT6WXIkVFQNMyIZlZz2GuT_DWM2867zkjkSt7d-6e6PonetgcZ0ZX3aDsszDdKVqleCv-iNwnEv8zQzPrmf1zuuvMXiKxQwYLpmQM-iOGvqZQFIl0nwefbF0VE_mPQ0OY_a7xbduKVZzlgQvNbQ'
        };
        await loginWithGoogle(mockGoogleUser);
      }
    } catch (err) {
      setLoginError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Customer Phone Login (Staging / Development)
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    const cleanedPhone = loginPhone.replace(/\D/g, '').slice(0, 10);
    if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
      setLoginError('Please enter a valid 10-digit Indian Mobile Number starting with 6, 7, 8, or 9.');
      return;
    }

    try {
      setIsLoggingIn(true);
      await loginCustomer({ phone: cleanedPhone, name: loginName.trim() });
      setLoginPhone('');
      setLoginName('');
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Open Edit Profile Modal with existing customer values
  const handleOpenEditModal = () => {
    if (!customer) return;
    setEditName(customer.name || '');
    setEditPhone(customer.phone || '');
    setEditEmail(customer.email || '');
    setEditAvatar(customer.avatar || '');
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
  };

  // Handle Profile Update Submission
  const handleProfileUpdateSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    if (!editName.trim() || editName.trim().length < 2) {
      setEditError('Full Name must be at least 2 characters long.');
      return;
    }

    const cleanedPhone = editPhone.replace(/\D/g, '').slice(0, 10);
    if (cleanedPhone && !/^[6-9]\d{9}$/.test(cleanedPhone)) {
      setEditError('Please enter a valid 10-digit Indian Mobile Number.');
      return;
    }

    try {
      setIsUpdatingProfile(true);
      await updateProfile({
        name: editName.trim(),
        phone: cleanedPhone,
        email: editEmail.trim(),
        avatar: editAvatar.trim()
      });
      setEditSuccess('Profile updated successfully!');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditSuccess('');
      }, 1000);
    } catch (err) {
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Confirmed</span>;
      case 'Pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Review</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">{status}</span>;
    }
  };

  // Render Payment Status Badge
  const renderPaymentBadge = (status, balanceDue) => {
    if (status === 'Fully Paid' || status === 'Paid' || (balanceDue === 0 && status !== 'Cash Pending')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Fully Paid</span>;
    }
    if (status === 'Advance Paid' || status === 'Partially Paid') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">Advance Paid</span>;
    }
    if (status === 'Cash Pending') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pay at Turf</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">{status || 'Unpaid'}</span>;
  };

  // If user is not authenticated, render Login / Sign-in form
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-center">
        <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-fade-in">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center space-y-2 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <span className="material-symbols-outlined text-2xl">account_circle</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Player Account</h1>
            <p className="text-xs text-slate-400">Sign in to manage your profile and view your match bookings.</p>
          </div>

          {(loginError || authError) && (
            <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{loginError || authError}</span>
            </div>
          )}

          {/* PRIMARY GOOGLE SIGN-IN BUTTON */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-white/10 transition-all flex items-center justify-center gap-3 border border-white/20 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>

            {import.meta.env.MODE !== 'production' && (
              <>
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink mx-4 text-[10px] uppercase font-bold tracking-wider text-slate-500">Or Staging / Dev Only Mobile Login</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Mobile Number (Staging / Dev Only)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-xs font-semibold text-slate-400">+91</span>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Player Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Deepak Jose"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn || !loginPhone}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>Sign in with Mobile (Staging / Dev Only)</span>
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <button
              onClick={() => navigate(ROUTES.BOOKING)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1 font-medium"
            >
              <span>Ready to book a slot? Book now</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* PROFILE HEADER CARD */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            {customer?.avatar ? (
              <img
                src={customer.avatar}
                alt={customer.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-md uppercase">
                {customer?.name ? customer.name.substring(0, 2) : 'PL'}
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{customer?.name || 'Guest Player'}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  Player
                </span>
                {customer?.isGoogleConnected && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Google
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-slate-500">call</span>
                  {customer?.phone ? `+91 ${customer.phone}` : 'No phone linked'}
                </span>
                {customer?.email && (
                  <span className="flex items-center gap-1 font-sans">
                    <span className="material-symbols-outlined text-sm text-slate-500">mail</span>
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleOpenEditModal}
              className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit Profile
            </button>
            <button
              onClick={logoutCustomer}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-rose-500/20 transition-all flex items-center justify-center gap-1"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOOKING HISTORY SECTION */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">confirmation_number</span>
              My Turf Bookings
            </h2>
            <p className="text-xs text-slate-400">View your active reservations, payment breakdowns, and booking history.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10 overflow-x-auto">
            {[
              { id: 'all', label: 'All Bookings' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'past', label: 'Past' },
              { id: 'cancelled', label: 'Cancelled' },
              { id: 'enquiries', label: 'My Enquiries' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Display Content based on tab */}
        {activeTab === 'enquiries' ? (
          isEnquiriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((n) => (
                <div key={n} className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-4 animate-pulse">
                  <div className="h-4 w-32 bg-slate-800 rounded" />
                  <div className="h-6 w-48 bg-slate-800 rounded" />
                  <div className="h-4 w-full bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : enquiries.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/5 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                <span className="material-symbols-outlined text-2xl">mark_email_read</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No enquiries submitted yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Have questions or want to organize a tournament? Contact us or enquire from the Events page.
                </p>
              </div>
              <button
                onClick={() => navigate(ROUTES.EVENTS)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">event</span>
                Browse Events
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enquiries.map((enquiry) => {
                const isNew = enquiry.status === 'New' || enquiry.status === 'Unread';
                const isConverted = enquiry.status === 'Converted' || enquiry.status === 'Replied';

                return (
                  <div
                    key={enquiry.id || enquiry._id}
                    className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">mail</span>
                        {enquiry.eventTitle || enquiry.subject || 'Enquiry'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isNew ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        isConverted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-slate-700/50 text-slate-300 border border-slate-600'
                      }`}>
                        {enquiry.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                      {enquiry.message}
                    </p>

                    {(enquiry.preferredDate || enquiry.participantCount) && (
                      <div className="flex gap-3 text-[11px] font-mono text-slate-400">
                        {enquiry.preferredDate && <span>Date: {enquiry.preferredDate}</span>}
                        {enquiry.participantCount && <span>Participants: {enquiry.participantCount}</span>}
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Submitted: {typeof enquiry.createdAt === 'string' ? enquiry.createdAt.split('T')[0] : 'Recently'}</span>
                      {enquiry.notes && (
                        <span className="text-emerald-400 font-medium">Response note attached</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : isBookingsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-4 animate-pulse">
                <div className="h-4 w-32 bg-slate-800 rounded" />
                <div className="h-6 w-48 bg-slate-800 rounded" />
                <div className="h-4 w-full bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : bookingsError ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
            <span className="material-symbols-outlined text-rose-400 text-3xl">error</span>
            <p className="text-xs text-rose-300">{bookingsError}</p>
            <button
              onClick={() => fetchBookings(activeTab)}
              className="px-4 py-1.5 bg-rose-500/20 text-rose-200 text-xs rounded-lg hover:bg-rose-500/30 transition-all font-medium"
            >
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/5 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
              <span className="material-symbols-outlined text-2xl">event_busy</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No {activeTab !== 'all' ? activeTab : ''} bookings found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {activeTab === 'upcoming' 
                  ? "You don't have any upcoming slot reservations scheduled."
                  : activeTab === 'cancelled'
                  ? "You have zero cancelled reservations."
                  : "You haven't reserved any turf slots yet. Book your match today!"}
              </p>
            </div>
            <button
              onClick={() => navigate(ROUTES.BOOKING)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full shadow-md transition-all inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">sports_soccer</span>
              Book a Turf Slot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map((booking) => (
              <div
                key={booking.id || booking.bookingId}
                className="bg-slate-900 border border-white/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all space-y-4 shadow-lg relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Booking ID & Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {booking.bookingId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {renderStatusBadge(booking.status)}
                      {renderPaymentBadge(booking.paymentStatus, booking.balanceDue)}
                    </div>
                  </div>

                  {/* Sport & Date / Time */}
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-400 text-lg">sports_soccer</span>
                      {booking.sportType || 'Football Arena'}
                    </h3>
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-slate-500 text-sm">calendar_today</span>
                        {booking.dateStr || (booking.date ? booking.date.split('T')[0] : 'N/A')}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-300">
                        <span className="material-symbols-outlined text-slate-500 text-sm">schedule</span>
                        {Array.isArray(booking.timeSlots) ? booking.timeSlots.join(', ') : (booking.slots || []).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Financial Snapshot Grid */}
                  <div className="bg-slate-950/80 rounded-xl p-3 border border-white/5 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-medium">Total</span>
                      <span className="font-bold text-white">₹{booking.totalAmount}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-medium">Paid</span>
                      <span className="font-bold text-emerald-400">₹{booking.advancePaid || 0}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-medium">Balance</span>
                      <span className={`font-bold ${booking.balanceDue > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        ₹{booking.balanceDue || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action: View Ticket Details & Download PDF */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleDownloadPdf(booking.bookingId)}
                    disabled={downloadingPdfId === booking.bookingId}
                    className="text-xs text-slate-300 hover:text-emerald-400 font-medium inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-white/5 disabled:opacity-50"
                    title="Download Official Ticket (PDF)"
                  >
                    <span className="material-symbols-outlined text-sm text-emerald-400">
                      {downloadingPdfId === booking.bookingId ? 'progress_activity' : 'picture_as_pdf'}
                    </span>
                    <span>{downloadingPdfId === booking.bookingId ? 'PDF...' : 'PDF'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedBooking(booking)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
                  >
                    <span>View Ticket Details</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">edit</span>
                Edit Profile
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Mobile Number *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-mono font-semibold">+91</span>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-11 pr-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="player@example.com"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Profile Avatar URL (Optional)</label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOKING DETAILS MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Booking Receipt</span>
                <h3 className="text-lg font-bold font-mono text-emerald-400">{selectedBooking.bookingId}</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Status overview */}
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-white/5">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Status</span>
                <div className="mt-0.5">{renderStatusBadge(selectedBooking.status)}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-medium">Payment State</span>
                <div className="mt-0.5">{renderPaymentBadge(selectedBooking.paymentStatus, selectedBooking.balanceDue)}</div>
              </div>
            </div>

            {/* Match Information */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-emerald-400">Match Reservation</h4>
              <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-3.5 rounded-xl border border-white/5">
                <div>
                  <span className="text-slate-500 block text-[10px]">Turf / Sport</span>
                  <span className="font-bold text-white">{selectedBooking.sportType || 'Football (5v5)'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Date</span>
                  <span className="font-bold text-white">{selectedBooking.dateStr || selectedBooking.date?.split('T')[0]}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">Reserved Hours</span>
                  <span className="font-bold font-mono text-slate-200">
                    {Array.isArray(selectedBooking.timeSlots) ? selectedBooking.timeSlots.join(', ') : selectedBooking.slots?.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment & Financial Breakdown (Strictly GST-Free) */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] text-emerald-400">Financial Breakdown</h4>
              <div className="bg-slate-950 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Total Amount</span>
                  <span className="font-bold text-white">₹{selectedBooking.totalAmount}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Advance Paid</span>
                  <span className="font-bold text-emerald-400">₹{selectedBooking.advancePaid || 0}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-2 border-t border-white/5">
                  <span>Balance Due at Turf</span>
                  <span className={`font-bold ${selectedBooking.balanceDue > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    ₹{selectedBooking.balanceDue || 0}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 text-[11px]">
                  <span>Payment Method</span>
                  <span>{selectedBooking.paymentMethod || 'Online'}</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[11px] text-slate-300 space-y-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span>
                Venue Instructions
              </span>
              <p>Please arrive at the arena 10 minutes prior to your reserved slot. Clean turf boots or trainers are recommended.</p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => handleDownloadPdf(selectedBooking.bookingId)}
                disabled={downloadingPdfId === selectedBooking.bookingId}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">
                  {downloadingPdfId === selectedBooking.bookingId ? 'progress_activity' : 'picture_as_pdf'}
                </span>
                <span>{downloadingPdfId === selectedBooking.bookingId ? 'Generating Ticket PDF...' : 'Download Official Ticket (PDF)'}</span>
              </button>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
