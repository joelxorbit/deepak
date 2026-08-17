import React, { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { submitEnquiryService } from '../../services/adminService';

// Code-split Google Map component to prevent bundle inflation
const LazyGoogleMap = lazy(() => import('../../components/common/LazyGoogleMap'));

export const ContactPage = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !mobileNumber.trim() || !message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      await submitEnquiryService({
        name: fullName.trim(),
        phone: mobileNumber.trim(),
        message: message.trim()
      });
      setSubmitted(true);
      setFullName('');
      setMobileNumber('');
      setMessage('');
    } catch (err) {
      setError('Failed to submit enquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-16 animate-fade-in text-slate-900">
      
      {/* 1. EDITORIAL HERO HEADLINE */}
      <section className="bg-slate-950 text-white py-16 -mt-20 pt-28 border-b border-white/10 relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
            CONNECT WITH US
          </span>
          <h1 className="font-bold text-3xl sm:text-5xl uppercase tracking-tight">
            CONTACT <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">ELITE PITCH</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto font-normal">
            Have questions regarding slot reservations, tournament hosting, or corporate events? Get in touch with our team.
          </p>
        </div>
      </section>

      {/* 2. BALANCED 2-COLUMN WORKSPACE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Contact Enquiry Form + Preferred Quick Booking CTA (6 Columns) */}
          <div className="lg:col-span-6 space-y-5 flex flex-col justify-between h-full">
            
            {/* Contact Form Container */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">GET IN TOUCH</span>
                <h2 className="font-semibold text-lg text-slate-900">Send a Message</h2>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-medium flex items-center gap-2 border border-rose-200">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </div>
              )}

              {submitted ? (
                <div className="p-6 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl space-y-3 text-center animate-fade-in">
                  <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                  <h3 className="font-semibold text-base">Message Sent Successfully!</h3>
                  <p className="text-xs text-emerald-800 leading-relaxed font-normal">
                    Thank you for reaching out. Our support team will review your inquiry and respond shortly.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-1 text-xs font-medium uppercase tracking-wider text-emerald-700 hover:text-emerald-900 underline"
                  >
                    Send Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs transition-all font-normal text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 mb-1.5">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="Enter 10-digit mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs transition-all font-normal text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 mb-1.5">Message *</label>
                    <textarea
                      rows="4"
                      required
                      placeholder="How can we help you with your match or event?"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs transition-all resize-none font-normal text-slate-900"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    {loading ? 'Submitting Message...' : 'Submit Inquiry'}
                  </button>
                </form>
              )}
            </div>

            {/* PREFERRED QUICK BOOKING CTA BANNER (PLACED DIRECTLY BELOW CONTACT FORM ON LEFT) */}
            <div className="bg-slate-950 text-white rounded-3xl p-5 border border-white/10 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="font-semibold text-xs uppercase tracking-tight text-white">PREFER QUICK BOOKING?</h3>
                <p className="text-slate-400 text-[11px] font-normal">Check real-time turf slot availability online now.</p>
              </div>
              <button
                onClick={() => navigate(ROUTES.BOOKING)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow transition-all shrink-0 flex items-center gap-1"
              >
                <span>Book Slot</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: Venue Location Details & Google Map (6 Columns) */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">VENUE LOCATION</span>
              <h2 className="font-semibold text-lg text-slate-900">Location & Hours</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                  <span className="material-symbols-outlined text-xl">location_on</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">Arena Address</h4>
                  <p className="text-slate-500 text-xs mt-0.5 font-normal">123 Sports Complex Way, Stadium District, Metro City, 400001</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                  <span className="material-symbols-outlined text-xl">schedule</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">Operating Hours</h4>
                  <p className="text-slate-500 text-xs mt-0.5 font-normal">Open 24 hours a day, 7 days a week including public holidays.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                  <span className="material-symbols-outlined text-xl">call</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900">Phone & WhatsApp Support</h4>
                  <p className="text-slate-500 text-xs font-mono mt-0.5 font-normal">+91 98765 43210 / +91 98765 43211</p>
                </div>
              </div>
            </div>

            {/* Code-Split Lazy Loaded Google Map Component */}
            <div className="pt-3 border-t border-slate-100">
              <Suspense fallback={
                <div className="w-full h-56 rounded-2xl bg-slate-50 animate-pulse flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <span className="material-symbols-outlined text-2xl text-emerald-600">map</span>
                  <div className="h-2.5 w-24 bg-slate-200 rounded"></div>
                </div>
              }>
                <LazyGoogleMap />
              </Suspense>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
