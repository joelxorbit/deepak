import { getDb } from '../config/firebase.js';
import { getBookingsCollection, getCustomersCollection } from '../config/firestoreCollections.js';
import { generateAtomicBookingIdInTransaction } from '../utils/generateBookingId.js';
import { BOOKING_STATUS, PAYMENT_METHODS, PAYMENT_STATUS, AUDIT_ACTIONS, SLOT_PRICE_PER_HOUR, GST_PERCENTAGE } from '../utils/constants.js';
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

export const createBookingService = async ({ customerName, mobileNumber, date, slots, paymentMethod, slotPrice, slotCount, subtotal, gstAmount, totalAmount }) => {
  const db = getDb();
  const dateObj = new Date(date);
  const dateStr = dateObj.toISOString().split('T')[0];
  const normalizedSlotsList = normalizeSlots(slots);
  const normalizedMobile = normalizePhone(mobileNumber);

  // Compute pricing automatically if not provided or to ensure backend integrity
  const pricePerSlot = slotPrice || SLOT_PRICE_PER_HOUR;
  const count = slotCount || normalizedSlotsList.length;
  const computedSubtotal = subtotal || (count * pricePerSlot);
  const computedGst = gstAmount || Math.round(computedSubtotal * GST_PERCENTAGE);
  const computedTotal = totalAmount || (computedSubtotal + computedGst);

  const createdBooking = await db.runTransaction(async (transaction) => {
    // 1. Conflict Check for selected date
    const dateQuerySnap = await getBookingsCollection()
      .where('dateStr', '==', dateStr)
      .get();

    const existingActiveBookings = dateQuerySnap.docs
      .map(doc => doc.data())
      .filter(b => b.status !== BOOKING_STATUS.CANCELLED && b.status !== BOOKING_STATUS.REJECTED && !b.isDeleted);

    const alreadyBookedSlots = existingActiveBookings.flatMap(b => b.timeSlots || []);
    const hasConflict = normalizedSlotsList.some(slot => alreadyBookedSlots.includes(slot));

    if (hasConflict) {
      const error = new Error('One or more selected time slots are already booked. Please choose different slots.');
      error.statusCode = 409;
      throw error;
    }

    // 2. Generate Atomic Sequential Booking ID
    const bookingId = await generateAtomicBookingIdInTransaction(transaction, date);

    // 3. Customer Lookup or Creation
    const phoneQuerySnap = await getCustomersCollection()
      .where('phone', '==', normalizedMobile)
      .limit(1)
      .get();

    let customerId;
    let customerDocRef;
    let masterCustomerName = customerName;
    const nowISO = new Date().toISOString();
    const customerSearchTokens = generateSearchTokens(customerName, normalizedMobile);

    if (!phoneQuerySnap.empty) {
      customerDocRef = phoneQuerySnap.docs[0].ref;
      customerId = phoneQuerySnap.docs[0].id;
      const existingData = phoneQuerySnap.docs[0].data();
      masterCustomerName = existingData.name || customerName;

      // Update customer updatedAt and tokens without overwriting master customer name
      transaction.update(customerDocRef, {
        searchTokens: Array.from(new Set([...(existingData.searchTokens || []), ...customerSearchTokens])),
        updatedAt: nowISO
      });
    } else {
      customerDocRef = getCustomersCollection().doc();
      customerId = customerDocRef.id;
      transaction.set(customerDocRef, {
        name: customerName,
        phone: normalizedMobile,
        bookingHistory: [],
        searchTokens: customerSearchTokens,
        createdAt: nowISO,
        updatedAt: nowISO
      });
    }

    const initialBookingStatus = paymentMethod === PAYMENT_METHODS.PAY_NOW ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.PENDING;
    const isPayNow = paymentMethod === PAYMENT_METHODS.PAY_NOW;

    const initialPaymentStatus = isPayNow ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING;
    const initialPaidAt = isPayNow ? nowISO : null;
    const initialPaymentCollectedBy = isPayNow ? 'Online Payment' : null;

    const bookingDocRef = getBookingsCollection().doc();
    const bookingSearchTokens = generateSearchTokens(bookingId, masterCustomerName, normalizedMobile);

    const bookingPayload = {
      bookingId,
      customerId,
      customerName: masterCustomerName,
      customerPhone: normalizedMobile,
      date: dateObj.toISOString(),
      dateStr,
      timeSlots: normalizedSlotsList,
      slots: normalizedSlotsList,
      paymentMethod,
      paymentStatus: initialPaymentStatus,
      paidAt: initialPaidAt,
      paymentCollectedBy: initialPaymentCollectedBy,
      slotPrice: pricePerSlot,
      slotCount: count,
      subtotal: computedSubtotal,
      gstAmount: computedGst,
      totalAmount: computedTotal,
      status: initialBookingStatus,
      isDeleted: false,
      searchTokens: bookingSearchTokens,
      createdAt: nowISO,
      updatedAt: nowISO
    };

    // 4. Save Booking Document
    transaction.set(bookingDocRef, bookingPayload);

    // 5. Append Booking ID to Customer Booking History
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
    details: { bookingId: createdBooking.bookingId, date: dateStr, slots: normalizedSlotsList, totalAmount: computedTotal, paymentStatus: createdBooking.paymentStatus }
  }).catch(err => logger.warn('Audit log write warning:', err));

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

  if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
    const error = new Error('Booking payment is already marked as Paid');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const collector = adminUser || 'Admin';

  await getBookingsCollection().doc(booking.id).update({
    paymentStatus: PAYMENT_STATUS.PAID,
    paidAt: now,
    paymentCollectedBy: collector,
    updatedAt: now
  });

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[BookingService] Marked payment as Paid for booking ${booking.bookingId} by ${collector}`);

  createAuditLog({
    action: AUDIT_ACTIONS.PAYMENT_MARK_PAID,
    user: collector,
    details: { bookingId: booking.bookingId, totalAmount: booking.totalAmount }
  }).catch(err => logger.warn('Audit log write warning:', err));

  return await findBookingById(booking.id);
};

export const getAllBookingsService = async (status, search) => {
  return await getBookingsWithFilters({ status, search });
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

export const getBookedSlotsService = async (date) => {
  if (!date) {
    const error = new Error('Date query parameter is required');
    error.statusCode = 400;
    throw error;
  }

  const dateStr = new Date(date).toISOString().split('T')[0];
  const snapshot = await getBookingsCollection()
    .where('dateStr', '==', dateStr)
    .get();

  const activeBookings = snapshot.docs
    .map(doc => doc.data())
    .filter(b => b.status !== BOOKING_STATUS.CANCELLED && b.status !== BOOKING_STATUS.REJECTED && !b.isDeleted);

  const bookedSlots = activeBookings.flatMap(b => b.timeSlots || b.slots || []);
  return { date, bookedSlots };
};

export const getBookingHistoryService = async () => {
  return await getBookingsWithFilters({ status: 'All' });
};
