import {
  createNotificationDoc,
  getNotificationsForRecipientDoc,
  getUnreadNotificationCountDoc,
  findNotificationByIdDoc,
  markNotificationAsReadDoc,
  markAllNotificationsAsReadDoc
} from '../repositories/notificationRepository.js';
import { NOTIFICATION_TYPES, NOTIFICATION_RECIPIENT_TYPE, AUDIT_ACTIONS } from '../utils/constants.js';
import { createAuditLog } from '../repositories/auditRepository.js';
import { logger } from '../utils/logger.js';

/**
 * Retrieves notifications for an authenticated user/admin.
 */
export const getUserNotificationsService = async ({
  recipientType,
  recipientId = null,
  recipientPhone = null,
  recipientEmail = null,
  isRead = null,
  limit = 50
}) => {
  return await getNotificationsForRecipientDoc({
    recipientType,
    recipientId,
    recipientPhone,
    recipientEmail,
    isRead,
    limit
  });
};

/**
 * Retrieves unread notification count.
 */
export const getUnreadCountService = async ({
  recipientType,
  recipientId = null,
  recipientPhone = null,
  recipientEmail = null
}) => {
  const count = await getUnreadNotificationCountDoc({
    recipientType,
    recipientId,
    recipientPhone,
    recipientEmail
  });
  return { unreadCount: count };
};

/**
 * Marks a single notification as read, enforcing recipient authorization.
 */
export const markAsReadService = async (id, { recipientType, recipientId, recipientPhone, recipientEmail, user = 'user' }) => {
  const notification = await findNotificationByIdDoc(id);
  if (!notification) {
    const error = new Error('Notification not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  if (notification.recipientType !== recipientType) {
    const error = new Error('Unauthorized to modify this notification');
    error.statusCode = 403;
    throw error;
  }

  if (recipientType === NOTIFICATION_RECIPIENT_TYPE.CUSTOMER) {
    const matchId = recipientId && notification.recipientId === recipientId;
    const matchPhone = recipientPhone && notification.recipientPhone === recipientPhone;
    const matchEmail = recipientEmail && notification.recipientEmail && (notification.recipientEmail.toLowerCase() === recipientEmail.toLowerCase());

    if (!matchId && !matchPhone && !matchEmail) {
      const error = new Error('Unauthorized to modify this notification');
      error.statusCode = 403;
      throw error;
    }
  }

  const updated = await markNotificationAsReadDoc(id);
  return updated;
};

/**
 * Marks all notifications for a recipient as read.
 */
export const markAllAsReadService = async ({ recipientType, recipientId, recipientPhone, recipientEmail, user = 'user' }) => {
  const result = await markAllNotificationsAsReadDoc({
    recipientType,
    recipientId,
    recipientPhone,
    recipientEmail
  });

  if (recipientType === NOTIFICATION_RECIPIENT_TYPE.ADMIN) {
    await createAuditLog({
      action: AUDIT_ACTIONS.NOTIFICATION_READ_ALL,
      user: user || 'admin',
      details: { count: result.updatedCount }
    });
  }

  return result;
};

/* ==========================================================================
   TRIGGER METHODS (Safe, Idempotent, and Non-blocking)
   ========================================================================== */

/**
 * Triggers notifications on booking creation for customer and admin.
 */
export const notifyBookingCreated = async (booking) => {
  try {
    const bId = booking.bookingId || booking.id;

    // Customer Notification
    await createNotificationDoc({
      recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
      recipientId: booking.customerId || null,
      recipientPhone: booking.phone || null,
      recipientEmail: booking.email || null,
      type: NOTIFICATION_TYPES.BOOKING_CREATED,
      title: 'Booking Confirmed',
      message: `Your booking #${bId} for ${booking.sport} on ${booking.date} (${(booking.slots || []).join(', ')}) has been received.`,
      bookingId: bId,
      idempotencyKey: `BOOKING_CREATED:${bId}:customer`,
      metadata: {
        sport: booking.sport,
        date: booking.date,
        slots: booking.slots,
        totalAmount: booking.totalAmount,
        advanceAmount: booking.advanceAmount,
        balanceAmount: booking.balanceAmount
      }
    });

    // Admin Notification
    await createNotificationDoc({
      recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN,
      recipientId: 'admin',
      type: NOTIFICATION_TYPES.BOOKING_CREATED,
      title: 'New Booking Received',
      message: `New booking #${bId} for ${booking.sport} on ${booking.date} by ${booking.fullName || booking.customerName || 'Customer'}.`,
      bookingId: bId,
      idempotencyKey: `BOOKING_CREATED:${bId}:admin`,
      metadata: {
        customerName: booking.fullName || booking.customerName,
        phone: booking.phone,
        sport: booking.sport,
        date: booking.date,
        totalAmount: booking.totalAmount
      }
    });
  } catch (err) {
    logger.error(`[NotificationService] Error triggering booking creation notification: ${err.message}`);
  }
};

/**
 * Triggers notifications when payment is verified.
 */
export const notifyPaymentReceived = async (booking, paymentDetails = {}) => {
  try {
    const bId = booking.bookingId || booking.id;
    const paymentId = paymentDetails.paymentId || paymentDetails.razorpay_payment_id || 'verified';
    const isFull = booking.paymentStatus === 'Paid' || paymentDetails.paymentType === 'full';
    const notifType = isFull ? NOTIFICATION_TYPES.FULL_PAYMENT_RECEIVED : NOTIFICATION_TYPES.ADVANCE_PAYMENT_RECEIVED;
    const title = isFull ? 'Payment Completed' : 'Advance Payment Received';
    const amount = paymentDetails.amount || (isFull ? booking.totalAmount : booking.advancePaid || booking.advanceAmount);

    // Customer Notification
    await createNotificationDoc({
      recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
      recipientId: booking.customerId || null,
      recipientPhone: booking.phone || null,
      recipientEmail: booking.email || null,
      type: notifType,
      title,
      message: `Payment of ₹${amount} for booking #${bId} has been successfully verified.`,
      bookingId: bId,
      idempotencyKey: `${notifType}:${bId}:${paymentId}:customer`,
      metadata: {
        amount,
        paymentId,
        paymentStatus: booking.paymentStatus,
        balanceAmount: booking.balanceAmount
      }
    });

    // Admin Notification
    await createNotificationDoc({
      recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN,
      recipientId: 'admin',
      type: notifType,
      title: `Payment Verified: #${bId}`,
      message: `Payment of ₹${amount} received for booking #${bId} (${booking.fullName || booking.customerName || 'Customer'}).`,
      bookingId: bId,
      idempotencyKey: `${notifType}:${bId}:${paymentId}:admin`,
      metadata: {
        amount,
        paymentId,
        bookingId: bId,
        paymentStatus: booking.paymentStatus
      }
    });
  } catch (err) {
    logger.error(`[NotificationService] Error triggering payment notification: ${err.message}`);
  }
};

/**
 * Triggers notification when an admin cancels a booking.
 */
export const notifyAdminCancellation = async (booking, reason) => {
  try {
    const bId = booking.bookingId || booking.id;
    const cancelReason = reason || 'Administrative decision';

    await createNotificationDoc({
      recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
      recipientId: booking.customerId || null,
      recipientPhone: booking.phone || null,
      recipientEmail: booking.email || null,
      type: NOTIFICATION_TYPES.BOOKING_CANCELLED_BY_ADMIN,
      title: 'Booking Cancelled',
      message: `Your booking #${bId} for ${booking.sport} on ${booking.date} has been cancelled by administration. Reason: ${cancelReason}`,
      bookingId: bId,
      idempotencyKey: `BOOKING_CANCELLED_BY_ADMIN:${bId}:customer`,
      metadata: {
        reason: cancelReason,
        sport: booking.sport,
        date: booking.date
      }
    });
  } catch (err) {
    logger.error(`[NotificationService] Error triggering cancellation notification: ${err.message}`);
  }
};

/**
 * Triggers notification when an event/general enquiry is received.
 */
export const notifyEnquiryReceived = async (enquiry) => {
  try {
    const enquiryId = enquiry.id || enquiry._id;

    // Admin Notification
    const adminTitle = enquiry.eventId ? `Event Enquiry: ${enquiry.eventTitle || 'Event'}` : 'New Customer Enquiry';
    await createNotificationDoc({
      recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN,
      recipientId: 'admin',
      type: NOTIFICATION_TYPES.ENQUIRY_RECEIVED,
      title: adminTitle,
      message: `Enquiry from ${enquiry.name} (${enquiry.phone}): "${enquiry.subject || enquiry.eventTitle || enquiry.message.slice(0, 40)}"`,
      enquiryId,
      eventId: enquiry.eventId || null,
      idempotencyKey: `ENQUIRY_RECEIVED:${enquiryId}:admin`,
      metadata: {
        name: enquiry.name,
        phone: enquiry.phone,
        email: enquiry.email,
        eventId: enquiry.eventId,
        eventTitle: enquiry.eventTitle
      }
    });

    // Customer Notification (Acknowledgement)
    if (enquiry.phone || enquiry.email || enquiry.customerId) {
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: enquiry.customerId || null,
        recipientPhone: enquiry.phone || null,
        recipientEmail: enquiry.email || null,
        type: NOTIFICATION_TYPES.ENQUIRY_RECEIVED,
        title: 'Enquiry Received',
        message: `Thank you for contacting Elite Turf! We have received your enquiry regarding ${enquiry.eventTitle || enquiry.subject || 'our services'} and will get back to you shortly.`,
        enquiryId,
        eventId: enquiry.eventId || null,
        idempotencyKey: `ENQUIRY_RECEIVED:${enquiryId}:customer`,
        metadata: {
          eventTitle: enquiry.eventTitle,
          subject: enquiry.subject
        }
      });
    }
  } catch (err) {
    logger.error(`[NotificationService] Error triggering enquiry notification: ${err.message}`);
  }
};

/**
 * Triggers notification when an enquiry status is updated by admin.
 */
export const notifyEnquiryStatusUpdated = async (enquiry, newStatus, notes = null) => {
  try {
    const enquiryId = enquiry.id || enquiry._id;
    if (enquiry.phone || enquiry.email || enquiry.customerId) {
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: enquiry.customerId || null,
        recipientPhone: enquiry.phone || null,
        recipientEmail: enquiry.email || null,
        type: NOTIFICATION_TYPES.ENQUIRY_STATUS_UPDATED,
        title: 'Enquiry Update',
        message: `Your enquiry "${enquiry.subject || enquiry.eventTitle || 'General Enquiry'}" is now marked as "${newStatus}".${notes ? ` Note: ${notes}` : ''}`,
        enquiryId,
        eventId: enquiry.eventId || null,
        idempotencyKey: `ENQUIRY_STATUS_UPDATED:${enquiryId}:${newStatus}:customer`,
        metadata: {
          newStatus,
          notes,
          eventTitle: enquiry.eventTitle
        }
      });
    }
  } catch (err) {
    logger.error(`[NotificationService] Error triggering enquiry status update notification: ${err.message}`);
  }
};
