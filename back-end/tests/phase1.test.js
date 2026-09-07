import {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_OPTIONS,
  ENQUIRY_STATUS,
  FIRESTORE_COLLECTIONS,
  isValidBookingStatus,
  isValidPaymentStatus,
  isValidEnquiryStatus,
  DEFAULT_FALLBACK_SLOT_PRICE,
  DEFAULT_FALLBACK_ADVANCE_PERCENTAGE
} from '../utils/constants.js';
import {
  isValidAmount,
  roundToCurrency,
  calculateFixedAdvanceAndBalance,
  calculateAdvanceAndBalance,
  calculatePricingBreakdown,
  calculateRemainingBalance
} from '../utils/pricingUtils.js';
import { normalizeBookingDocument } from '../utils/bookingNormalizer.js';
import { isCustomerOwner, isAdminOrSuperAdmin, canAccessBooking } from '../utils/authUtils.js';
import { prepareVerifiedTicketData } from '../utils/ticketDataPreparer.js';
import { validateEnv, isWhatsAppConfigured, isRazorpayConfigured, getMaskedEnvConfig } from '../utils/envValidation.js';
import * as firestoreCollections from '../config/firestoreCollections.js';

describe('Phase 1 Core Utilities & Foundation Test Suite', () => {

  // ==========================================
  // 1. Constants & Status Enum Validation
  // ==========================================
  describe('1. Constants & Status Enums', () => {
    it('should have all 9 canonical payment statuses defined', () => {
      expect(PAYMENT_STATUS.UNPAID).toBe('Unpaid');
      expect(PAYMENT_STATUS.ADVANCE_PENDING).toBe('Advance Pending');
      expect(PAYMENT_STATUS.ADVANCE_PAID).toBe('Advance Paid');
      expect(PAYMENT_STATUS.PARTIALLY_PAID).toBe('Partially Paid');
      expect(PAYMENT_STATUS.FULLY_PAID).toBe('Fully Paid');
      expect(PAYMENT_STATUS.CASH_PENDING).toBe('Cash Pending');
      expect(PAYMENT_STATUS.CASH_RECEIVED).toBe('Cash Received');
      expect(PAYMENT_STATUS.PAYMENT_FAILED).toBe('Payment Failed');
      expect(PAYMENT_STATUS.PAYMENT_REFUNDED).toBe('Payment Refunded');
    });

    it('isValidBookingStatus should strictly validate booking statuses', () => {
      expect(isValidBookingStatus(BOOKING_STATUS.PENDING)).toBe(true);
      expect(isValidBookingStatus(BOOKING_STATUS.CONFIRMED)).toBe(true);
      expect(isValidBookingStatus(BOOKING_STATUS.CANCELLED)).toBe(true);
      expect(isValidBookingStatus(BOOKING_STATUS.REJECTED)).toBe(true);
      expect(isValidBookingStatus('InvalidStatus')).toBe(false);
      expect(isValidBookingStatus('')).toBe(false);
      expect(isValidBookingStatus(null)).toBe(false);
      expect(isValidBookingStatus(undefined)).toBe(false);
    });

    it('isValidPaymentStatus should strictly validate payment statuses', () => {
      expect(isValidPaymentStatus(PAYMENT_STATUS.FULLY_PAID)).toBe(true);
      expect(isValidPaymentStatus(PAYMENT_STATUS.ADVANCE_PAID)).toBe(true);
      expect(isValidPaymentStatus(PAYMENT_STATUS.CASH_PENDING)).toBe(true);
      expect(isValidPaymentStatus('UnknownStatus')).toBe(false);
      expect(isValidPaymentStatus(null)).toBe(false);
    });

    it('isValidEnquiryStatus should validate enquiry statuses', () => {
      expect(isValidEnquiryStatus(ENQUIRY_STATUS.NEW)).toBe(true);
      expect(isValidEnquiryStatus(ENQUIRY_STATUS.CONTACTED)).toBe(true);
      expect(isValidEnquiryStatus('NotAStatus')).toBe(false);
    });
  });

  // ==========================================
  // 2. Server-Side Pricing & Financial Utilities
  // ==========================================
  describe('2. Pricing & Currency Utilities (pricingUtils.js)', () => {
    it('isValidAmount should validate non-negative finite numbers and numeric strings', () => {
      expect(isValidAmount(0)).toBe(true);
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount('250.50')).toBe(true);
      expect(isValidAmount(-1)).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount('abc')).toBe(false);
      expect(isValidAmount(null)).toBe(false);
      expect(isValidAmount(undefined)).toBe(false);
    });

    it('roundToCurrency should eliminate floating point inaccuracies', () => {
      expect(roundToCurrency(0.1 + 0.2, 2)).toBe(0.3);
      expect(roundToCurrency(708.00000001, 0)).toBe(708);
      expect(roundToCurrency('354')).toBe(354);
      expect(() => roundToCurrency('invalid')).toThrow('Invalid monetary amount');
    });

    it('calculateFixedAdvanceAndBalance should calculate fixed ₹200 advance and balance accurately', () => {
      // Fixed ₹200 advance on 1000
      const calc1000 = calculateFixedAdvanceAndBalance(1000, 200);
      expect(calc1000.advanceRequired).toBe(200);
      expect(calc1000.balanceDue).toBe(800);

      // Capped advance on 150 (total < 200)
      const calc150 = calculateFixedAdvanceAndBalance(150, 200);
      expect(calc150.advanceRequired).toBe(150);
      expect(calc150.balanceDue).toBe(0);

      // 0 total amount
      const calcZero = calculateFixedAdvanceAndBalance(0, 200);
      expect(calcZero.advanceRequired).toBe(0);
      expect(calcZero.balanceDue).toBe(0);
    });

    it('calculatePricingBreakdown should calculate full server-verified price breakdown with fixed advance', () => {
      const breakdown = calculatePricingBreakdown({
        ratePerHour: 300,
        slotCount: 2,
        fixedAdvanceAmount: 200
      });

      expect(breakdown.ratePerHour).toBe(300);
      expect(breakdown.slotCount).toBe(2);
      expect(breakdown.subtotal).toBe(600);
      expect(breakdown.totalAmount).toBe(600);
      expect(breakdown.fixedAdvanceAmount).toBe(200);
      expect(breakdown.advanceRequired).toBe(200);
      expect(breakdown.balanceDue).toBe(400); // 600 - 200 = 400
    });

    it('calculateRemainingBalance should return zero when paid >= total', () => {
      expect(calculateRemainingBalance(708, 708)).toBe(0);
      expect(calculateRemainingBalance(708, 800)).toBe(0);
      expect(calculateRemainingBalance(708, 200)).toBe(508);
    });

    it('pricing calculations should throw error on invalid inputs', () => {
      expect(() => calculatePricingBreakdown({ ratePerHour: -100, slotCount: 2 })).toThrow();
      expect(() => calculatePricingBreakdown({ ratePerHour: 300, slotCount: 0 })).toThrow();
      expect(() => calculateFixedAdvanceAndBalance(-500, 200)).toThrow();
      expect(() => calculateFixedAdvanceAndBalance(500, -50)).toThrow();
    });
  });

  // ==========================================
  // 3. Booking Normalizer
  // ==========================================
  describe('3. Booking Normalizer (bookingNormalizer.js)', () => {
    it('should normalize a legacy booking document without throwing and without mutating input', () => {
      const legacyDoc = {
        bookingId: 'EP-2026-LEGACY1',
        customerName: 'Old Customer',
        mobileNumber: '9876543210',
        date: '2026-04-10',
        slots: ['06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM'],
        slotPrice: 300,
        slotCount: 2,
        subtotal: 600,
        gstAmount: 108,
        totalAmount: 708,
        paymentStatus: 'Paid',
        paymentMethod: 'Pay Now',
        status: 'Confirmed'
      };

      const copy = JSON.parse(JSON.stringify(legacyDoc));
      const normalized = normalizeBookingDocument(legacyDoc);

      // Input must not be mutated
      expect(legacyDoc).toEqual(copy);

      // Normalized shape checks
      expect(normalized.bookingId).toBe('EP-2026-LEGACY1');
      expect(normalized.customerName).toBe('Old Customer');
      expect(normalized.customerPhone).toBe('9876543210');
      expect(normalized.totalAmount).toBe(708);
      expect(normalized.paymentStatus).toBe(PAYMENT_STATUS.FULLY_PAID);
      expect(normalized.advancePaid).toBe(708);
      expect(normalized.balanceDue).toBe(0);
      expect(normalized.timeSlots).toEqual(['06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM']);
      expect(normalized.slots).toEqual(['06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM']);
      expect(normalized.isReviewed).toBe(true); // Historical default
      expect(normalized.cancellation.isCancelled).toBe(false);
      expect(normalized.pricingSnapshot).toBeDefined();
      expect(normalized.pricingSnapshot.ratePerHour).toBe(300);
    });

    it('should map legacy Pay at Spot Pending to Cash Pending', () => {
      const legacySpot = {
        bookingId: 'EP-2026-SPOT1',
        customerName: 'Spot User',
        mobileNumber: '9876543210',
        date: '2026-04-15',
        slots: ['09:00 AM - 10:00 AM'],
        slotPrice: 300,
        totalAmount: 354,
        paymentMethod: 'Pay at Spot',
        paymentStatus: 'Pending',
        status: 'Pending'
      };

      const normalized = normalizeBookingDocument(legacySpot);
      expect(normalized.paymentStatus).toBe(PAYMENT_STATUS.CASH_PENDING);
      expect(normalized.paymentOption).toBe(PAYMENT_OPTIONS.CASH);
      expect(normalized.advancePaid).toBe(0);
      expect(normalized.balanceDue).toBe(354);
    });

    it('should map modern partial advance booking correctly', () => {
      const modernDoc = {
        bookingId: 'EP-2026-MODERN1',
        customerId: 'cust_123',
        customerName: 'Modern User',
        customerPhone: '9876543210',
        customerEmail: 'modern@example.com',
        sportType: 'Football 5v5',
        sportId: 'football-5v5',
        date: '2026-05-01',
        dateStr: '2026-05-01',
        timeSlots: ['06:00 PM - 07:00 PM'],
        slotCount: 1,
        slotPrice: 300,
        subtotal: 300,
        gstAmount: 54,
        totalAmount: 354,
        advancePaid: 106,
        balanceDue: 248,
        pricingSnapshot: {
          ratePerHour: 300,
          slotCount: 1,
          subtotal: 300,
          gstPercentage: 18,
          gstAmount: 54,
          totalAmount: 354,
          advancePercentage: 30,
          advanceRequired: 106,
          balanceDue: 248
        },
        paymentOption: PAYMENT_OPTIONS.ADVANCE,
        paymentMethod: 'UPI',
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        paidAt: '2026-05-01T10:00:00.000Z',
        status: BOOKING_STATUS.CONFIRMED,
        isReviewed: false
      };

      const normalized = normalizeBookingDocument(modernDoc);
      expect(normalized.paymentStatus).toBe(PAYMENT_STATUS.ADVANCE_PAID);
      expect(normalized.advancePaid).toBe(106);
      expect(normalized.balanceDue).toBe(248);
      expect(normalized.isReviewed).toBe(false);
      expect(normalized.pricingSnapshot.ratePerHour).toBe(300);
      expect(normalized.pricingSnapshot.balanceDue).toBe(248);
    });

    it('should return null for null or non-object rawDoc', () => {
      expect(normalizeBookingDocument(null)).toBeNull();
      expect(normalizeBookingDocument(undefined)).toBeNull();
      expect(normalizeBookingDocument('string')).toBeNull();
    });
  });

  // ==========================================
  // 4. Customer Ownership & Admin Authorization
  // ==========================================
  describe('4. Authorization & Ownership (authUtils.js)', () => {
    const sampleBooking = {
      bookingId: 'EP-2026-AUTH1',
      customerId: 'cust_abc_123',
      customerPhone: '9876543210',
      customerEmail: 'user@example.com'
    };

    it('isCustomerOwner should authorize matching customerId', () => {
      expect(isCustomerOwner({ id: 'cust_abc_123' }, sampleBooking)).toBe(true);
      expect(isCustomerOwner({ customerId: 'cust_abc_123' }, sampleBooking)).toBe(true);
      expect(isCustomerOwner({ _id: 'cust_abc_123' }, sampleBooking)).toBe(true);
    });

    it('isCustomerOwner should authorize matching normalized phone number', () => {
      expect(isCustomerOwner({ phone: '9876543210' }, sampleBooking)).toBe(true);
      expect(isCustomerOwner({ mobileNumber: '+919876543210' }, sampleBooking)).toBe(true);
      expect(isCustomerOwner({ phone: '91-9876543210' }, sampleBooking)).toBe(true);
    });

    it('isCustomerOwner should reject non-matching user', () => {
      expect(isCustomerOwner({ id: 'cust_diff', phone: '9111111111' }, sampleBooking)).toBe(false);
      expect(isCustomerOwner(null, sampleBooking)).toBe(false);
      expect(isCustomerOwner({}, sampleBooking)).toBe(false);
    });

    it('isAdminOrSuperAdmin should authorize admin and superadmin roles', () => {
      expect(isAdminOrSuperAdmin({ role: 'admin' })).toBe(true);
      expect(isAdminOrSuperAdmin({ role: 'superadmin' })).toBe(true);
      expect(isAdminOrSuperAdmin({ role: 'user' })).toBe(false);
      expect(isAdminOrSuperAdmin({ role: 'customer' })).toBe(false);
      expect(isAdminOrSuperAdmin(null)).toBe(false);
    });

    it('canAccessBooking should grant access to admin and customer owner, and deny others', () => {
      // 1. Admin access
      const adminAccess = canAccessBooking({ admin: { role: 'admin' } }, sampleBooking);
      expect(adminAccess.allowed).toBe(true);

      // 2. Owner customer access
      const ownerAccess = canAccessBooking({ user: { id: 'cust_abc_123' } }, sampleBooking);
      expect(ownerAccess.allowed).toBe(true);

      // 3. Unauthenticated access
      const unauthAccess = canAccessBooking(null, sampleBooking);
      expect(unauthAccess.allowed).toBe(false);
      expect(unauthAccess.statusCode).toBe(401);

      // 4. Unauthorized non-owner customer access
      const wrongUserAccess = canAccessBooking({ user: { id: 'cust_wrong', phone: '9000000000' } }, sampleBooking);
      expect(wrongUserAccess.allowed).toBe(false);
      expect(wrongUserAccess.statusCode).toBe(403);

      // 5. Missing booking record
      const notFoundAccess = canAccessBooking({ user: { id: 'cust_abc_123' } }, null);
      expect(notFoundAccess.allowed).toBe(false);
      expect(notFoundAccess.statusCode).toBe(404);
    });
  });

  // ==========================================
  // 5. Ticket Data Preparation & Sanitization
  // ==========================================
  describe('5. Ticket Data Preparer (ticketDataPreparer.js)', () => {
    it('should prepare clean, sanitized ticket structure without exposing internal secrets', () => {
      const rawBooking = {
        bookingId: 'EP-2026-TICKET1',
        customerName: 'Ticket Holder',
        mobileNumber: '9876543210',
        date: '2026-06-01',
        slots: ['06:00 PM - 07:00 PM'],
        slotPrice: 300,
        subtotal: 300,
        gstAmount: 54,
        totalAmount: 354,
        paymentStatus: 'Paid',
        paymentMethod: 'Pay Now',
        status: 'Confirmed',
        searchTokens: ['token1', 'token2'],
        _internalSecret: 'DO_NOT_EXPOSE'
      };

      const ticket = prepareVerifiedTicketData(rawBooking);

      expect(ticket.ticketNumber).toBe('EP-2026-TICKET1');
      expect(ticket.bookingId).toBe('EP-2026-TICKET1');
      expect(ticket.bookingStatus).toBe('Confirmed');
      expect(ticket.isConfirmed).toBe(true);
      expect(ticket.isCancelled).toBe(false);
      expect(ticket.customer.name).toBe('Ticket Holder');
      expect(ticket.customer.phone).toBe('9876543210');
      expect(ticket.schedule.timeSlots).toEqual(['06:00 PM - 07:00 PM']);
      expect(ticket.schedule.startTime).toBe('06:00 PM');
      expect(ticket.schedule.endTime).toBe('07:00 PM');
      expect(ticket.pricing.totalAmount).toBe(354);
      expect(ticket.venue.businessName).toBeDefined();
      expect(Array.isArray(ticket.instructions)).toBe(true);
      expect(ticket.instructions.length).toBeGreaterThan(0);

      // Ensure internal properties and searchTokens are not leaked on ticket root
      expect(ticket._internalSecret).toBeUndefined();
      expect(ticket.searchTokens).toBeUndefined();
    });

    it('should throw error when rawBooking is missing', () => {
      expect(() => prepareVerifiedTicketData(null)).toThrow('Cannot prepare ticket data');
    });
  });

  // ==========================================
  // 6. Environment Validation & Diagnostics
  // ==========================================
  describe('6. Environment Validation (envValidation.js)', () => {
    it('validateEnv should pass with valid JWT_SECRET and fail when missing', () => {
      expect(() => validateEnv({ JWT_SECRET: 'supersecret_key_123', FIREBASE_PROJECT_ID: 'p1', FIREBASE_PRIVATE_KEY: 'k1', FIREBASE_CLIENT_EMAIL: 'e1' })).not.toThrow();
      expect(() => validateEnv({ JWT_SECRET: '' })).toThrow('[Fatal] Startup validation failed');
      expect(() => validateEnv({})).toThrow('[Fatal] Startup validation failed');
    });

    it('isWhatsAppConfigured should return true only when all three WhatsApp credentials exist', () => {
      expect(isWhatsAppConfigured({
        WHATSAPP_API_TOKEN: 'token123',
        WHATSAPP_PHONE_NUMBER_ID: 'phone_id_123',
        WHATSAPP_BUSINESS_ACCOUNT_ID: 'acct_id_123'
      })).toBe(true);

      expect(isWhatsAppConfigured({
        WHATSAPP_API_TOKEN: 'token123'
      })).toBe(false);

      expect(isWhatsAppConfigured({})).toBe(false);
    });

    it('getMaskedEnvConfig should safely mask secrets without exposing values', () => {
      const masked = getMaskedEnvConfig({
        NODE_ENV: 'test',
        PORT: 5000,
        JWT_SECRET: 'supersecret_long_key_elite_pitch',
        RAZORPAY_KEY_ID: 'rzp_test_1234567890',
        RAZORPAY_KEY_SECRET: 'secret_key_value_9999',
        WHATSAPP_PHONE_NUMBER_ID: '123456789012'
      });

      expect(masked.NODE_ENV).toBe('test');
      expect(masked.PORT).toBe(5000);
      expect(masked.JWT_SECRET_SET).toBe(true);
      expect(masked.RAZORPAY_CONFIGURED).toBe(true);
      expect(masked.RAZORPAY_KEY_ID).toContain('...');
      expect(masked.RAZORPAY_KEY_ID).not.toBe('rzp_test_1234567890');
    });
  });

  // ==========================================
  // 7. Firestore Collections Definition
  // ==========================================
  describe('7. Firestore Collection Getters (firestoreCollections.js)', () => {
    it('should have all collection getters defined as functions', () => {
      expect(typeof firestoreCollections.getAdminsCollection).toBe('function');
      expect(typeof firestoreCollections.getBookingsCollection).toBe('function');
      expect(typeof firestoreCollections.getCustomersCollection).toBe('function');
      expect(typeof firestoreCollections.getEventsCollection).toBe('function');
      expect(typeof firestoreCollections.getCountersCollection).toBe('function');
      expect(typeof firestoreCollections.getAuditLogsCollection).toBe('function');
      expect(typeof firestoreCollections.getIdempotencyKeysCollection).toBe('function');
      expect(typeof firestoreCollections.getEnquiriesCollection).toBe('function');
      expect(typeof firestoreCollections.getSettingsCollection).toBe('function');
      expect(typeof firestoreCollections.getRatesCollection).toBe('function');
      expect(typeof firestoreCollections.getSlotHoldsCollection).toBe('function');
      expect(typeof firestoreCollections.getBlockedSlotsCollection).toBe('function');
      expect(typeof firestoreCollections.getNotificationsCollection).toBe('function');
      expect(typeof firestoreCollections.getMessageDeliveriesCollection).toBe('function');
    });
  });

});
