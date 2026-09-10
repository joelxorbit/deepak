import { getDb } from '../config/firebase.js';
import {
  getBookingsCollection,
  getCustomersCollection,
  getSlotHoldsCollection,
  getBlockedSlotsCollection
} from '../config/firestoreCollections.js';
import { generateAtomicBookingIdInTransaction } from '../utils/generateBookingId.js';
import {
  BOOKING_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  SLOT_HOLD_STATUS,
  AUDIT_ACTIONS
} from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { parseSlotToDateTime, generateSearchTokens, normalizeSlots, normalizePhone } from '../utils/slotNormalizer.js';
import { createAuditLog } from '../repositories/auditRepository.js';
import {
  findBookingById,
  findBookingsByQuery,
  getBookingsWithFilters,
  populateBookingRelations
} from '../repositories/bookingRepository.js';
import { cacheManager } from '../utils/cacheManager.js';
import { calculateAvailability } from './availabilityService.js';
import { calculateBookingPrice } from './rateService.js';
import { PAYMENT_OPTIONS } from '../utils/constants.js';
import { notifyBookingCreated, notifyPaymentReceived, notifyAdminCancellation } from './notificationService.js';

export const createBookingService = async ({
  customerName,
  mobileNumber: rawMobile,
  customerPhone: rawPhone,
  customerEmail = '',
  sportId = 'football-5v5',
  sportType = 'Football Turf (Main Arena)',
  date,
  slots: rawSlots,
  timeSlots: rawTimeSlots,
  paymentOption = null,
  paymentMethod = PAYMENT_METHODS.PAY_AT_SPOT,
  advancePercentage = null,
  slotPrice = null,
  slotCount = null,
  subtotal = null,
  totalAmount = null,
  paymentStatus: requestedPaymentStatus = null,
  razorpay_payment_id = null,
  holderId = null,
  holdId = null,
  couponCode = null
}) => {
  const mobileNumber = rawMobile || rawPhone;
  const slots = rawSlots || rawTimeSlots;
  const db = getDb();
  const dateObj = new Date(date);
  const dateStr = dateObj.toISOString().split('T')[0];
  const normalizedSlotsList = normalizeSlots(slots);
  const normalizedMobile = normalizePhone(mobileNumber);

  // Authoritative Server-Side Price Calculation (never trust client amounts, strictly GST-free)
  let chosenOption = paymentOption;
  if (!chosenOption) {
    if (paymentMethod === PAYMENT_METHODS.PAY_NOW || paymentMethod === 'Pay Now') {
      chosenOption = PAYMENT_OPTIONS.FULL;
    } else {
      chosenOption = PAYMENT_OPTIONS.CASH;
    }
  }

  const pricing = await calculateBookingPrice({
    sportId,
    date,
    slots: normalizedSlotsList,
    paymentOption: chosenOption,
    couponCode
  });

  const createdBooking = await db.runTransaction(async (transaction) => {
    const transactionNowISO = new Date().toISOString();

    // 1. Conflict Check: Active Bookings for selected date
    const dateQuerySnap = await getBookingsCollection()
      .where('dateStr', '==', dateStr)
      .get();

    const existingActiveBookings = dateQuerySnap.docs
      .map(doc => doc.data())
      .filter(b => b.status !== BOOKING_STATUS.CANCELLED && b.status !== BOOKING_STATUS.REJECTED && !b.isDeleted);

    const alreadyBookedSlots = existingActiveBookings.flatMap(b => b.timeSlots || b.slots || []);
    const bookedConflict = normalizedSlotsList.find(slot => alreadyBookedSlots.includes(slot));

    if (bookedConflict) {
      const error = new Error(`Time slot "${bookedConflict}" is already booked. Please choose different slots.`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Conflict Check: Blocked Slots / Arena Closures
    const blockedSnap = await getBlockedSlotsCollection()
      .where('dateStr', '==', dateStr)
      .get();

    const blockedDocs = blockedSnap.docs.map(d => d.data());
    const isFullDayBlocked = blockedDocs.some(b => b.isFullDay);
    if (isFullDayBlocked) {
      const error = new Error('The arena is closed for the entire selected date.');
      error.statusCode = 409;
      throw error;
    }

    const blockedSlots = blockedDocs.flatMap(b => (b.slot ? [b.slot] : (b.slots || [])));
    const blockedConflict = normalizedSlotsList.find(s => blockedSlots.includes(s));
    if (blockedConflict) {
      const error = new Error(`Time slot "${blockedConflict}" is unavailable due to arena maintenance/blocking.`);
      error.statusCode = 409;
      throw error;
    }

    // 3. Conflict Check: Active Holds by OTHER users
    const holdsSnap = await getSlotHoldsCollection()
      .where('dateStr', '==', dateStr)
      .get();

    const activeOtherHolds = holdsSnap.docs
      .map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
      .filter(h => (
        h.status === SLOT_HOLD_STATUS.ACTIVE &&
        h.expiresAt > transactionNowISO &&
        (!holderId || h.holderId !== holderId)
      ));

    const otherHeldSlots = activeOtherHolds.flatMap(h => h.slots || (h.slot ? [h.slot] : []));
    const holdConflict = normalizedSlotsList.find(s => otherHeldSlots.includes(s));
    if (holdConflict) {
      const error = new Error(`Time slot "${holdConflict}" is currently held by another user. Please select another slot or try again shortly.`);
      error.statusCode = 409;
      throw error;
    }

    // 4. Release / Convert current user's hold if any
    if (holderId || holdId) {
      const ownHolds = holdsSnap.docs.filter(doc => {
        const d = doc.data();
        return (d.holderId === holderId || doc.id === holdId) && d.status === SLOT_HOLD_STATUS.ACTIVE;
      });

      for (const ownDoc of ownHolds) {
        transaction.update(ownDoc.ref, {
          status: SLOT_HOLD_STATUS.CONVERTED,
          convertedAt: transactionNowISO
        });
      }
    }

    // 5. Generate Atomic Sequential Booking ID
    const bookingId = await generateAtomicBookingIdInTransaction(transaction, date);

    // 6. Customer Lookup or Creation
    const phoneQuerySnap = await getCustomersCollection()
      .where('phone', '==', normalizedMobile)
      .limit(1)
      .get();

    let customerId;
    let customerDocRef;
    let masterCustomerName = customerName;
    const customerSearchTokens = generateSearchTokens(customerName, normalizedMobile);

    if (!phoneQuerySnap.empty) {
      customerDocRef = phoneQuerySnap.docs[0].ref;
      customerId = phoneQuerySnap.docs[0].id;
      const existingData = phoneQuerySnap.docs[0].data();
      masterCustomerName = existingData.name || customerName;

      // Update customer updatedAt and tokens without overwriting master customer name
      transaction.update(customerDocRef, {
        searchTokens: Array.from(new Set([...(existingData.searchTokens || []), ...customerSearchTokens])),
        updatedAt: transactionNowISO
      });
    } else {
      customerDocRef = getCustomersCollection().doc();
      customerId = customerDocRef.id;
      transaction.set(customerDocRef, {
        name: customerName,
        phone: normalizedMobile,
        bookingHistory: [],
        searchTokens: customerSearchTokens,
        createdAt: transactionNowISO,
        updatedAt: transactionNowISO
      });
    }

    // 7. Payment State & Breakdown Assembly
    const isPayNow = paymentMethod === PAYMENT_METHODS.PAY_NOW || paymentMethod === 'Pay Now';
    let initialPaymentStatus;
    let initialPaidAt = null;
    let initialPaymentCollectedBy = null;
    let advancePaid = 0;
    let balanceDue = pricing.totalAmount;

    if (isPayNow) {
      initialPaidAt = transactionNowISO;
      if (chosenOption === PAYMENT_OPTIONS.ADVANCE) {
        advancePaid = pricing.advanceRequired;
        balanceDue = pricing.balanceDue;
        initialPaymentStatus = (advancePaid >= pricing.totalAmount && pricing.totalAmount > 0)
          ? PAYMENT_STATUS.FULLY_PAID
          : PAYMENT_STATUS.ADVANCE_PAID;
        initialPaymentCollectedBy = 'Online Payment (Advance)';
      } else {
        // Full Online Payment
        initialPaymentStatus = PAYMENT_STATUS.FULLY_PAID;
        initialPaymentCollectedBy = 'Online Payment';
        advancePaid = pricing.totalAmount;
        balanceDue = 0;
      }
    } else {
      // Cash / Pay at Spot
      initialPaymentStatus = PAYMENT_STATUS.CASH_PENDING;
      initialPaidAt = null;
      initialPaymentCollectedBy = null;
      advancePaid = 0;
      balanceDue = pricing.totalAmount;
    }

    const initialBookingStatus = isPayNow ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.PENDING;

    const bookingDocRef = getBookingsCollection().doc();
    const bookingSearchTokens = generateSearchTokens(bookingId, masterCustomerName, normalizedMobile);

    const bookingPayload = {
      bookingId,
      customerId,
      customerName: masterCustomerName,
      customerPhone: normalizedMobile,
      customerEmail: customerEmail || '',
      sportId,
      sportType,
      date: dateObj.toISOString(),
      dateStr,
      timeSlots: normalizedSlotsList,
      slots: normalizedSlotsList,
      paymentMethod,
      paymentOption: chosenOption,
      paymentStatus: initialPaymentStatus,
      paidAt: initialPaidAt,
      paymentCollectedBy: initialPaymentCollectedBy,
      razorpay_payment_id: razorpay_payment_id || null,
      slotPrice: pricing.effectiveRatePerHour,
      slotCount: pricing.slotCount,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount || 0,
      couponCode: pricing.couponCode || null,
      totalAmount: pricing.totalAmount,
      advancePaid,
      balanceDue,
      pricingSnapshot: pricing.pricingSnapshot,
      slotBreakdowns: pricing.slotBreakdowns || [],
      balancePayment: {
        isPaid: balanceDue === 0,
        paidAt: balanceDue === 0 ? initialPaidAt : null,
        paymentMethod: null,
        collectedBy: null,
        notes: null
      },
      status: initialBookingStatus,
      isReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
      cancellation: {
        isCancelled: false,
        cancelledBy: null,
        reason: null,
        cancelledAt: null,
        adminId: null
      },
      isDeleted: false,
      searchTokens: bookingSearchTokens,
      createdAt: transactionNowISO,
      updatedAt: transactionNowISO
    };

    // 8. Save Booking Document
    transaction.set(bookingDocRef, bookingPayload);

    // 9. Append Booking ID to Customer Booking History
    const updatedHistory = [bookingDocRef.id];
    transaction.update(customerDocRef, {
      bookingHistory: Array.from(new Set(updatedHistory))
    });

    return { id: bookingDocRef.id, _id: bookingDocRef.id, ...bookingPayload };
  });

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[BookingService] Created booking ${createdBooking.bookingId} with paymentStatus ${createdBooking.paymentStatus}`);

  // Asynchronous audit logging (non-blocking)
  createAuditLog({
    action: AUDIT_ACTIONS.BOOKING_CREATE,
    user: customerName,
    details: { bookingId: createdBooking.bookingId, date: dateStr, slots: normalizedSlotsList, totalAmount: createdBooking.totalAmount, paymentStatus: createdBooking.paymentStatus }
  }).catch(err => logger.warn('Audit log write warning:', err));

  // Asynchronous notification triggering (non-blocking)
  notifyBookingCreated(createdBooking).catch(err => logger.warn('Notification booking create warning:', err));
  if (createdBooking.paymentStatus === PAYMENT_STATUS.FULLY_PAID || createdBooking.paymentStatus === PAYMENT_STATUS.ADVANCE_PAID) {
    notifyPaymentReceived(createdBooking, {
      paymentId: createdBooking.razorpay_payment_id || 'initial_payment',
      paymentType: createdBooking.paymentOption === PAYMENT_OPTIONS.ADVANCE ? 'advance' : 'full',
      amount: createdBooking.advancePaid
    }).catch(err => logger.warn('Notification payment receive warning:', err));
  }

  // Construct populated object in memory directly without extra Firestore queries
  return {
    ...createdBooking,
    customer: { id: createdBooking.customerId, _id: createdBooking.customerId, name: createdBooking.customerName, phone: createdBooking.customerPhone }
  };
};

export const trackBookingService = async (query) => {
  if (!query) {
    const error = new Error('Search query is required');
    error.statusCode = 400;
    throw error;
  }
  return await findBookingsByQuery(query);
};

export const cancelBookingService = async (bookingId) => {
  if (!bookingId) {
    const error = new Error('Booking ID is required');
    error.statusCode = 400;
    throw error;
  }

  const booking = await findBookingById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    const error = new Error('Booking is already cancelled');
    error.statusCode = 400;
    throw error;
  }

  // 2-hour cancellation constraint
  const slotsList = booking.timeSlots || booking.slots || [];
  if (slotsList.length > 0) {
    const earliestSlot = slotsList[0];
    const slotStartTime = parseSlotToDateTime(booking.date, earliestSlot);
    const currentTime = new Date();
    const twoHoursInMs = 2 * 60 * 60 * 1000;

    if (slotStartTime.getTime() - currentTime.getTime() < twoHoursInMs) {
      const error = new Error('Cancellations are not allowed within 2 hours of the booking start time.');
      error.statusCode = 400;
      throw error;
    }
  }

  const now = new Date().toISOString();
  await getBookingsCollection().doc(booking.id).update({
    status: BOOKING_STATUS.CANCELLED,
    cancelledAt: now,
    updatedAt: now
  });

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[BookingService] Cancelled booking ${booking.bookingId}`);

  createAuditLog({
    action: AUDIT_ACTIONS.BOOKING_CANCEL,
    user: booking.customerName || 'customer',
    details: { bookingId: booking.bookingId }
  }).catch(err => logger.warn('Audit log write warning:', err));

  return await findBookingById(booking.id);
};

export const markBookingAsPaidService = async (bookingId, adminUser) => {
  const booking = await findBookingById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (
    booking.paymentStatus === PAYMENT_STATUS.FULLY_PAID ||
    booking.paymentStatus === PAYMENT_STATUS.CASH_RECEIVED ||
    booking.paymentStatus === PAYMENT_STATUS.PAID
  ) {
    const error = new Error('Booking payment is already marked as Paid');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const collector = adminUser || 'Admin';
  const isCash = booking.paymentStatus === PAYMENT_STATUS.CASH_PENDING || booking.paymentMethod === 'Pay at Spot';
  const resolvedPaymentStatus = isCash ? PAYMENT_STATUS.CASH_RECEIVED : PAYMENT_STATUS.FULLY_PAID;

  await getBookingsCollection().doc(booking.id).update({
    paymentStatus: resolvedPaymentStatus,
    paidAt: now,
    paymentCollectedBy: collector,
    advancePaid: booking.totalAmount,
    balanceDue: 0,
    balancePayment: {
      isPaid: true,
      paidAt: now,
      paymentMethod: isCash ? 'Cash' : 'Admin Manual',
      collectedBy: collector,
      notes: 'Collected and verified by admin'
    },
    updatedAt: now
  });

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[BookingService] Marked payment as ${resolvedPaymentStatus} for booking ${booking.bookingId} by ${collector}`);

  createAuditLog({
    action: AUDIT_ACTIONS.PAYMENT_MARK_PAID,
    user: collector,
    details: { bookingId: booking.bookingId, totalAmount: booking.totalAmount, paymentStatus: resolvedPaymentStatus }
  }).catch(err => logger.warn('Audit log write warning:', err));

  const updatedBooking = await findBookingById(booking.id);
  notifyPaymentReceived(updatedBooking, {
    paymentId: `admin_collect_${Date.now()}`,
    paymentType: 'full',
    amount: booking.balanceDue || booking.totalAmount
  }).catch(err => logger.warn('Notification payment mark paid warning:', err));

  return updatedBooking;
};

export const getAllBookingsService = async (status, search, filter) => {
  return await getBookingsWithFilters({ status, search, filter });
};


/**
 * Phase 5: Marks a booking as reviewed/acknowledged by an authorized admin.
 * Crucially does NOT mutate booking status, payment status, pricing snapshot, or financial totals.
 */
export const reviewBookingService = async (bookingId, adminUser) => {
  if (!bookingId) {
    const error = new Error('Booking ID is required');
    error.statusCode = 400;
    throw error;
  }

  const booking = await findBookingById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  const reviewer = typeof adminUser === 'object' ? (adminUser.username || adminUser.name || adminUser.id || 'admin') : (adminUser || 'admin');
  const now = new Date().toISOString();

  await getBookingsCollection().doc(booking.id).update({
    isReviewed: true,
    reviewedBy: reviewer,
    reviewedAt: now,
    updatedAt: now
  });

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[BookingService] Acknowledged/Reviewed booking ${booking.bookingId} by ${reviewer}`);

  createAuditLog({
    action: AUDIT_ACTIONS.BOOKING_REVIEW,
    user: reviewer,
    details: { bookingId: booking.bookingId, isReviewed: true }
  }).catch(err => logger.warn('Audit log write warning:', err));

  return await findBookingById(booking.id);
};

/**
 * Phase 5: Authorized admin cancellation of an active booking with mandatory reason.
 * Atomically cancels booking, releases slot availability, and preserves all financial history.
 */
export const adminCancelBookingService = async (bookingId, adminUser, reason) => {
  if (!bookingId) {
    const error = new Error('Booking ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    const error = new Error('Cancellation reason is required for admin cancellation (minimum 3 characters).');
    error.statusCode = 400;
    throw error;
  }

  const booking = await findBookingById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  if (booking.status === BOOKING_STATUS.CANCELLED || booking.cancellation?.isCancelled === true) {
    const error = new Error('Booking is already cancelled');
    error.statusCode = 409;
    throw error;
  }

  const adminName = typeof adminUser === 'object' ? (adminUser.username || adminUser.name || 'admin') : (adminUser || 'admin');
  const adminId = typeof adminUser === 'object' ? (adminUser.id || adminUser._id || adminUser.adminId || 'admin') : (adminUser || 'admin');
  const cleanReason = reason.trim();
  const now = new Date().toISOString();

  const cancellationData = {
    isCancelled: true,
    cancelledBy: 'admin',
    reason: cleanReason,
    cancelledAt: now,
    adminId
  };

  await getBookingsCollection().doc(booking.id).update({
    status: BOOKING_STATUS.CANCELLED,
    cancellation: cancellationData,
    cancelledAt: now,
    updatedAt: now
  });

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[BookingService] Admin cancelled booking ${booking.bookingId} by ${adminName}. Reason: ${cleanReason}`);

  createAuditLog({
    action: AUDIT_ACTIONS.BOOKING_CANCEL_ADMIN,
    user: adminName,
    details: {
      bookingId: booking.bookingId,
      reason: cleanReason,
      totalAmount: booking.totalAmount,
      paymentStatus: booking.paymentStatus,
      advancePaid: booking.advancePaid
    }
  }).catch(err => logger.warn('Audit log write warning:', err));

  notifyAdminCancellation(booking, cleanReason).catch(err => logger.warn('Notification cancel warning:', err));

  return await findBookingById(booking.id);
};

export const approveBookingService = async (bookingId, adminId) => {
  const booking = await findBookingById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date().toISOString();
  const updateData = {
    status: BOOKING_STATUS.CONFIRMED,
    approvedAt: now,
    updatedAt: now
  };
  if (adminId) updateData.approvedBy = adminId;

  await getBookingsCollection().doc(booking.id).update(updateData);
  cacheManager.del('admin_dashboard_stats');
  logger.info(`[BookingService] Approved booking ${booking.bookingId}`);

  createAuditLog({
    action: AUDIT_ACTIONS.BOOKING_APPROVE,
    user: adminId || 'admin',
    details: { bookingId: booking.bookingId }
  }).catch(err => logger.warn('Audit log write warning:', err));

  return await findBookingById(booking.id);
};

export const rejectBookingService = async (bookingId) => {
  const booking = await findBookingById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date().toISOString();
  await getBookingsCollection().doc(booking.id).update({
    status: BOOKING_STATUS.REJECTED,
    updatedAt: now
  });

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[BookingService] Rejected booking ${booking.bookingId}`);

  createAuditLog({
    action: AUDIT_ACTIONS.BOOKING_REJECT,
    user: 'admin',
    details: { bookingId: booking.bookingId }
  }).catch(err => logger.warn('Audit log write warning:', err));

  return await findBookingById(booking.id);
};

export const getBookedSlotsService = async (date, currentHolderId = null) => {
  if (!date) {
    const error = new Error('Date query parameter is required');
    error.statusCode = 400;
    throw error;
  }

  const availability = await calculateAvailability({ date, currentHolderId });
  // Backward compatible format: bookedSlots includes booked, held (by other users), and blocked slots
  const allUnavailable = Array.from(new Set([
    ...availability.bookedSlots,
    ...availability.heldSlots,
    ...availability.blockedSlots
  ]));

  return {
    date,
    bookedSlots: allUnavailable,
    rawBookedSlots: availability.bookedSlots,
    heldSlots: availability.heldSlots,
    blockedSlots: availability.blockedSlots,
    isFullDayBlocked: availability.isFullDayBlocked,
    closureReason: availability.closureReason,
    availableSlots: availability.availableSlots
  };
};

export const getBookingHistoryService = async () => {
  return await getBookingsWithFilters({ status: 'All' });
};
