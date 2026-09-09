import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { TIME_SLOTS, areSlotsConsecutive } from '../../utils/bookingUtils';
import { getTodayString } from '../../utils/dateUtils';
import { ROUTES } from '../../constants/routes';
import { TimeSlotPicker } from './TimeSlotPicker';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/paymentService';
import { previewBookingPriceService } from '../../services/bookingService';

export const BookingForm = ({ navigate: navigateProp }) => {
  const navigateRouter = useNavigate();
  const navigate = navigateProp || navigateRouter;

  const { createBooking, getBookedSlotsForDate, getAvailabilityForDate, setIsTrackModalOpen, setIsCancelModalOpen } = useBooking();

  const todayStr = getTodayString();

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [bookingDate, setBookingDate] = useState(todayStr);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [isFullDayBlocked, setIsFullDayBlocked] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [paymentOption, setPaymentOption] = useState('ADVANCE');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Server-authoritative live pricing state
  const [serverPricing, setServerPricing] = useState(null);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingConfigError, setPricingConfigError] = useState('');

  // Fetch server pricing breakdown dynamically whenever slots, date, or payment option change
  useEffect(() => {
    let isMounted = true;
    if (!bookingDate || selectedSlots.length === 0) {
      setServerPricing(null);
      setPricingConfigError('');
      setIsPricingLoading(false);
      return;
    }

    const fetchPrice = async () => {
      try {
        setIsPricingLoading(true);
        setPricingConfigError('');
        const priceData = await previewBookingPriceService({
          date: bookingDate,
          slots: selectedSlots,
          sportId: 'football-5v5',
          paymentOption
        });
        if (isMounted) {
          setServerPricing(priceData);
          setPricingConfigError('');
        }
      } catch (err) {
        if (isMounted) {
          const msg = err.response?.data?.message || 'Unable to calculate server pricing.';
          setPricingConfigError(msg);
          setServerPricing(null);
        }
      } finally {
        if (isMounted) {
          setIsPricingLoading(false);
        }
      }
    };

    fetchPrice();

    return () => {
      isMounted = false;
    };
  }, [bookingDate, selectedSlots, paymentOption]);

  const pricing = useMemo(() => {
    if (serverPricing) {
      return {
        ...serverPricing,
        slotPrice: serverPricing.effectiveRatePerHour || 0,
        payableNow: serverPricing.payableNow || 0,
        balanceDue: serverPricing.balanceDue || 0
      };
    }
    return {
      slotPrice: 0,
      slotCount: selectedSlots.length,
      subtotal: 0,
      totalAmount: 0,
      fixedAdvanceAmount: 0,
      advanceRequired: 0,
      balanceDue: 0,
      payableNow: 0
    };
  }, [serverPricing, selectedSlots.length]);

  // Fetch booked + blocked slots whenever bookingDate changes
  useEffect(() => {
    let isMounted = true;
    const fetchSlots = async () => {
      if (!bookingDate) return;
      try {
        const avail = await getAvailabilityForDate(bookingDate);
        if (isMounted && avail) {
          setBookedSlots(Array.isArray(avail.bookedSlots) ? avail.bookedSlots : []);
          setBlockedSlots(Array.isArray(avail.blockedSlots) ? avail.blockedSlots : []);
          setIsFullDayBlocked(Boolean(avail.isFullDayBlocked));
          setClosureReason(avail.closureReason || '');
        }
      } catch (err) {
        if (isMounted) {
          // Fallback to just booked slots
          try {
            const slots = await getBookedSlotsForDate(bookingDate);
            setBookedSlots(Array.isArray(slots) ? slots : []);
          } catch {
            setBookedSlots([]);
          }
          setBlockedSlots([]);
          setIsFullDayBlocked(false);
        }
      }
    };
    fetchSlots();
    return () => { isMounted = false; };
  }, [bookingDate, getAvailabilityForDate, getBookedSlotsForDate]);

  // Restrict mobile input to numbers only up to 10 digits
  const handleMobileChange = useCallback((e) => {
    const rawVal = e.target.value;
    const cleaned = rawVal.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(cleaned);
  }, []);

  const handleSlotToggle = useCallback((slot) => {
    setErrorMsg('');
    if (bookedSlots.includes(slot)) return;

    setSelectedSlots((prevSelected) => {
      if (prevSelected.includes(slot)) {
        const updated = prevSelected.filter(s => s !== slot);
        if (areSlotsConsecutive(updated)) {
          return updated;
        } else {
          return [slot];
        }
      } else {
        const newSelected = [...prevSelected, slot];
        const sorted = newSelected.sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));

        if (areSlotsConsecutive(sorted)) {
          return sorted;
        } else {
          setErrorMsg('Note: Time slots must be consecutive hours. Reset to your latest choice.');
          return [slot];
        }
      }
    });
  }, [bookedSlots]);

  const handleReset = useCallback(() => {
    setFullName('');
    setMobileNumber('');
    setBookingDate(todayStr);
    setSelectedSlots([]);
    setPaymentOption('ADVANCE');
    setErrorMsg('');
    setIsSubmitting(false);
  }, [todayStr]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Please enter your Full Name.');
      return;
    }

    const indianMobileRegex = /^[6-9]\d{9}$/;
    const cleanedMobile = mobileNumber.replace(/\D/g, '');
    if (!indianMobileRegex.test(cleanedMobile)) {
      setErrorMsg('Please enter a valid 10-digit Indian Mobile Number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!bookingDate) {
      setErrorMsg('Please select a Booking Date.');
      return;
    }

    if (bookingDate < todayStr) {
      setErrorMsg('Past dates are not allowed. Please select today or a future date.');
      return;
    }

    if (selectedSlots.length === 0) {
      setErrorMsg('Please select at least one available Time Slot.');
      return;
    }

    if (!areSlotsConsecutive(selectedSlots)) {
      setErrorMsg('Selected time slots must be consecutive hours.');
      return;
    }

    if (pricingConfigError) {
      setErrorMsg(pricingConfigError);
      return;
    }

    if (!serverPricing || isPricingLoading) {
      setErrorMsg('Please wait for server pricing calculation to complete.');
      return;
    }

    const isOnline = paymentOption === 'ADVANCE' || paymentOption === 'FULL';
    const effectivePaymentMethod = isOnline ? 'Pay Now' : 'Pay at Spot';

    try {
      setIsSubmitting(true);
      const bookingDetails = {
        customerName: fullName.trim(),
        mobileNumber: cleanedMobile,
        date: bookingDate,
        slots: selectedSlots,
        paymentOption,
        paymentMethod: effectivePaymentMethod,
        slotPrice: serverPricing.effectiveRatePerHour,
        slotCount: serverPricing.slotCount,
        subtotal: serverPricing.subtotal,
        totalAmount: serverPricing.totalAmount
      };

      if (isOnline) {
        const orderData = await createRazorpayOrder({
          amount: serverPricing.payableNow,
          receipt: `rcpt_${Date.now()}`,
          date: bookingDate,
          slots: selectedSlots,
          sportId: 'football-5v5',
          paymentOption
        });
        
        const options = {
          key: 'rzp_test_SyHdQL7pK1tlnG',
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Elite Pitch',
          description: paymentOption === 'ADVANCE' ? `Fixed ₹${serverPricing.fixedAdvanceAmount} Advance Turf Booking` : 'Full Turf Booking Payment',
          order_id: orderData.id,
          handler: async (response) => {
            try {
              setIsSubmitting(true);
              await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              
              const booking = await createBooking({
                ...bookingDetails,
                paymentStatus: 'Paid',
                razorpay_payment_id: response.razorpay_payment_id
              });
              if (booking) navigate(ROUTES.BOOKING_SUCCESS);
            } catch (verificationError) {
              setErrorMsg('Payment verification failed. If amount was deducted, please contact support.');
              setIsSubmitting(false);
            }
          },
          prefill: {
            name: fullName.trim(),
            contact: cleanedMobile
          },
          theme: { color: '#059669' },
          modal: {
            ondismiss: () => setIsSubmitting(false)
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setErrorMsg('Payment failed: ' + response.error.description);
          setIsSubmitting(false);
        });
        rzp.open();
      } else {
        const booking = await createBooking(bookingDetails);
        if (booking) navigate(ROUTES.BOOKING_SUCCESS);
      }
    } catch (err) {
      setErrorMsg('Failed to process booking. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-800 font-medium text-xs flex items-center gap-2 border border-rose-200 animate-fade-in">
          <span className="material-symbols-outlined text-base">error</span>
          {errorMsg}
        </div>
      )}

      {/* ONE SCREEN DESKTOP WORKSPACE (Left: 5 Cols, Right: 7 Cols) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT PANEL: Player Details & Match Date */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col h-fit">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">PLAYER DETAILS</span>
              <h2 className="font-semibold text-lg text-slate-900">Customer Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deepak Jose"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 mb-1.5">
                  Mobile Number * <span className="text-slate-500 font-normal lowercase">(10-digit Indian mobile)</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  maxLength={10}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-700 mb-1.5">
                  Booking Date *
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={bookingDate}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setSelectedSlots([]);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-normal"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-normal flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
            <span>Instant booking confirmation & WhatsApp invoice</span>
          </div>
        </div>

        {/* RIGHT PANEL: Time Slot Picker, Payment Choice & Summary */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          
          <div className="space-y-4">
            {/* Full Day Freeze Banner */}
            {isFullDayBlocked && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 animate-fade-in">
                <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">lock</span>
                <div>
                  <p className="font-bold text-amber-800 text-sm">Arena Unavailable</p>
                  <p className="text-amber-700 text-xs mt-0.5">{closureReason || 'This date is fully reserved for maintenance or a private event.'}</p>
                </div>
              </div>
            )}

            {/* Controlled Internal Slot Scroll Only */}
            <TimeSlotPicker
              bookedSlots={bookedSlots}
              blockedSlots={blockedSlots}
              selectedSlots={selectedSlots}
              handleSlotToggle={handleSlotToggle}
              bookingDate={bookingDate}
            />



            {/* Pricing Configuration Error Alert */}
            {pricingConfigError && (
              <div className="p-3 bg-rose-900/30 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-center gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-rose-400 text-base">error</span>
                <span>{pricingConfigError}</span>
              </div>
            )}


            {/* Payment Option Selector */}
            {selectedSlots.length > 0 && !pricingConfigError && (
              <div className="bg-slate-100 p-1 rounded-xl flex items-center animate-fade-in border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setPaymentOption('ADVANCE')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${paymentOption === 'ADVANCE' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="material-symbols-outlined text-[15px]">payments</span>
                  Pay Advance
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentOption('FULL')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${paymentOption === 'FULL' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                  Pay Full Amount
                </button>
              </div>
            )}

            {/* Compact Pricing Summary */}
            {selectedSlots.length > 0 && !pricingConfigError && (
              <div className="p-3.5 rounded-2xl bg-slate-950 text-white border border-white/10 space-y-1.5 animate-fade-in text-xs">
                {isPricingLoading ? (
                  <div className="flex items-center justify-center py-2 text-slate-400 gap-2">
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    <span>Calculating server rates...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-[11px] font-medium text-emerald-400">
                      <span>BOOKING SUMMARY</span>
                      <span>{pricing.slotCount} hour(s)</span>
                    </div>
                    {pricing.slotBreakdowns && pricing.slotBreakdowns.length > 0 && (
                      <div className="flex justify-between text-slate-300 text-[10px]">
                        <span>Rate Breakdown</span>
                        <span className="text-slate-300">
                          {(() => {
                            const rateCounts = {};
                            pricing.slotBreakdowns.forEach(b => {
                              rateCounts[b.ratePerHour] = (rateCounts[b.ratePerHour] || 0) + 1;
                            });
                            const parts = Object.entries(rateCounts).map(([rate, count]) => {
                              if (count === 1) return `₹${rate}`;
                              return `₹(${rate})*${count}`;
                            });
                            return parts.join(' + ');
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-300">
                      <span>Total Amount</span>
                      <span className="font-semibold text-white">₹{pricing.totalAmount}</span>
                    </div>
                    {paymentOption === 'ADVANCE' && (
                      <>
                        <div className="flex justify-between text-slate-300">
                          <span>Fixed Advance ({pricing.fixedAdvanceAmount ? `₹${pricing.fixedAdvanceAmount}` : 'Server'})</span>
                          <span className="font-semibold text-emerald-400">₹{pricing.payableNow}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Balance due at turf</span>
                          <span>₹{pricing.balanceDue}</span>
                        </div>
                      </>
                    )}
                    {paymentOption === 'FULL' && (
                      <div className="flex justify-between text-slate-300">
                        <span>Pay full amount</span>
                        <span className="font-semibold text-emerald-400">₹{pricing.totalAmount}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ACTION BUTTON HIERARCHY */}
          <div className="space-y-2 pt-2">
            {/* Primary Action */}
            <button 
              type="submit" 
              disabled={isSubmitting || isPricingLoading || !!pricingConfigError || (selectedSlots.length > 0 && !serverPricing)}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">
                {isSubmitting || isPricingLoading ? 'sync' : 'check_circle'}
              </span>
              {isSubmitting 
                ? 'Processing Reservation...' 
                : (isPricingLoading 
                    ? 'Evaluating Pricing...' 
                    : `Pay & Confirm Booking (${selectedSlots.length > 0 && serverPricing ? `₹${pricing.payableNow || pricing.totalAmount}` : 'Select Slot'})`)}
            </button>

            {/* Secondary, Tertiary, & Danger Controls */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIsTrackModalOpen(true)}
                className="bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px] uppercase tracking-wider py-2 rounded-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">search</span>
                Track
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="bg-slate-100 border border-slate-200 text-slate-600 font-medium text-[11px] uppercase tracking-wider py-2 rounded-lg hover:bg-slate-200 transition-all"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="bg-rose-50 border border-rose-200 text-rose-700 font-medium text-[11px] uppercase tracking-wider py-2 rounded-lg hover:bg-rose-100 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
                Cancel
              </button>
            </div>
          </div>

        </div>

      </form>

    </div>
  );
};
