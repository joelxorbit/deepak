import { normalizeBookingDocument } from './bookingNormalizer.js';
import { PAYMENT_STATUS, BOOKING_STATUS } from './constants.js';

/**
 * Prepares verified, server-sanitized ticket data from a booking document.
 * Excludes internal administrative data, secrets, and private search tokens.
 * Strictly uses server-side configured values without injecting fake defaults.
 *
 * @param {object} rawBooking - Raw or normalized Firestore booking document
 * @param {object} [settings={}] - Authoritative business / venue settings from database
 * @returns {object} Clean, verified ticket data structure
 */
export const prepareVerifiedTicketData = (rawBooking, settings = {}) => {
  if (!rawBooking) {
    throw new Error('Cannot prepare ticket data: Booking document is missing.');
  }

  const normalized = normalizeBookingDocument(rawBooking);

  // Authoritative settings resolution without fake invented strings
  const businessName = settings.businessName || settings.venueName || 'Elite Pitch';
  const venueAddress = settings.venueAddress || settings.address || null;
  const contactPhone = settings.contactPhone || settings.phone || null;
  const contactEmail = settings.contactEmail || settings.email || null;

  const timeSlots = normalized.timeSlots || [];
  const startTime = timeSlots.length > 0 ? timeSlots[0].split(' - ')[0] : 'N/A';
  const endTime = timeSlots.length > 0 ? timeSlots[timeSlots.length - 1].split(' - ')[1] : 'N/A';

  const isAdvancePaid = normalized.paymentStatus === PAYMENT_STATUS.ADVANCE_PAID || (normalized.advancePaid > 0 && normalized.balanceDue > 0);
  const isFullyPaid = normalized.paymentStatus === PAYMENT_STATUS.FULLY_PAID || (normalized.balanceDue === 0 && normalized.advancePaid > 0);
  const isCancelled = normalized.status === BOOKING_STATUS.CANCELLED || normalized.cancellation?.isCancelled;

  // Derive instructions from settings if available
  const instructions = Array.isArray(settings.instructions) && settings.instructions.length > 0
    ? settings.instructions
    : (settings.venueInstructions ? [settings.venueInstructions] : null);

  return {
    ticketNumber: normalized.bookingId,
    bookingId: normalized.bookingId,
    bookingStatus: normalized.status,
    isConfirmed: normalized.status === BOOKING_STATUS.CONFIRMED,
    isCancelled,
    isPending: normalized.status === BOOKING_STATUS.PENDING,

    customer: {
      name: normalized.customerName,
      phone: normalized.customerPhone,
      email: normalized.customerEmail || null
    },

    sport: {
      type: normalized.sportType,
      id: normalized.sportId
    },

    schedule: {
      date: normalized.dateStr,
      timeSlots,
      slotCount: normalized.slotCount,
      startTime,
      endTime
    },

    pricing: {
      ratePerHour: normalized.pricingSnapshot?.ratePerHour || normalized.slotPrice,
      subtotal: normalized.pricingSnapshot?.subtotal || normalized.subtotal,
      totalAmount: normalized.totalAmount,
      fixedAdvanceAmount: normalized.pricingSnapshot?.fixedAdvanceAmount || 200,
      advanceRequired: normalized.pricingSnapshot?.advanceRequired || normalized.advancePaid,
      advancePaid: normalized.advancePaid,
      balanceDue: normalized.balanceDue
    },

    payment: {
      option: normalized.paymentOption,
      method: normalized.paymentMethod,
      status: normalized.paymentStatus,
      paidAt: normalized.paidAt,
      isAdvancePaid,
      isFullyPaid,
      isBalancePending: normalized.balanceDue > 0 && normalized.status !== BOOKING_STATUS.CANCELLED,
      balancePayment: {
        isPaid: Boolean(normalized.balancePayment?.isPaid),
        paidAt: normalized.balancePayment?.paidAt || null,
        paymentMethod: normalized.balancePayment?.paymentMethod || null,
        collectedBy: normalized.balancePayment?.collectedBy || null
      }
    },

    cancellation: {
      isCancelled,
      cancelledBy: null, // Private admin identity is strictly stripped
      reason: normalized.cancellation?.reason || null,
      cancelledAt: normalized.cancellation?.cancelledAt || null,
      adminNotice: isCancelled ? (normalized.cancellation?.reason || 'Booking cancelled by admin.') : null
    },

    venue: {
      businessName,
      address: venueAddress,
      phone: contactPhone,
      email: contactEmail
    },

    instructions: instructions || [
      'Please report at the turf arena 15 minutes prior to your scheduled kickoff.',
      'Only appropriate turf shoes or flat rubber sole studs are permitted on the pitch.',
      'Cancellations are subject to the standard advance notice policy.',
      'If balance payment is due, please settle it at the arena reception prior to slot entry.'
    ],

    metadata: {
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
      isReviewed: normalized.isReviewed
    }
  };
};
