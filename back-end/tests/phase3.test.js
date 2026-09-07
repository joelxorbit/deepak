import request from 'supertest';
import crypto from 'crypto';
import { jest } from '@jest/globals';
import app from '../app.js';
import { getDb } from '../config/firebase.js';
import { ENV } from '../config/env.js';
import {
  evaluateRateRule,
  calculateBookingPrice,
  getDayOfWeekCode,
  isWeekend
} from '../services/rateService.js';
import {
  createPaymentOrderService,
  verifyPaymentSignatureService,
  setRazorpayInstance
} from '../services/paymentService.js';
import {
  PAYMENT_OPTIONS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  BOOKING_STATUS
} from '../utils/constants.js';
import { normalizeBookingDocument } from '../utils/bookingNormalizer.js';

describe('Phase 3 Hardened: Dynamic Rates, Immutable Snapshots, Advance & Payment Flow Suite', () => {

  const testSecret = 'test_razorpay_secret_key_12345';
  const testKeyId = 'rzp_test_mockKeyId';
  const testDateStr = '2028-11-20'; // Monday
  const testSaturdayStr = '2028-11-25'; // Saturday
  const testSlot1 = '06:00 AM - 07:00 AM';
  const testSlot2 = '07:00 AM - 08:00 AM';
  const testPeakSlot = '06:00 PM - 07:00 PM';

  // Mock Razorpay instance for deterministic testing
  const mockRazorpay = {
    orders: {
      create: jest.fn(async (options) => ({
        id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency || 'INR',
        receipt: options.receipt,
        status: 'created',
        attempts: 0,
        created_at: Math.floor(Date.now() / 1000)
      }))
    }
  };

  beforeAll(() => {
    ENV.RAZORPAY_KEY_ID = testKeyId;
    ENV.RAZORPAY_KEY_SECRET = testSecret;
    setRazorpayInstance(mockRazorpay);
  });

  afterEach(async () => {
    // Clean up test documents in MockDb
    try {
      const db = getDb();
      const ratesSnap = await db.collection('rates').get();
      ratesSnap.docs.forEach(doc => doc.ref.delete());

      const settingsSnap = await db.collection('settings').get();
      settingsSnap.docs.forEach(doc => doc.ref.delete());

      const bookingsSnap = await db.collection('bookings').where('dateStr', '==', testDateStr).get();
      bookingsSnap.docs.forEach(doc => doc.ref.delete());

      const satBookingsSnap = await db.collection('bookings').where('dateStr', '==', testSaturdayStr).get();
      satBookingsSnap.docs.forEach(doc => doc.ref.delete());
    } catch (e) {
      // Cleanup fallback
    }
  });

  // ==========================================
  // 1. Dynamic Rate Rules & Precedence
  // ==========================================
  describe('1. Dynamic Rate Rules & Precedence (rateService.js)', () => {
    it('should correctly determine day of week and weekend flags', () => {
      expect(getDayOfWeekCode('2028-11-20')).toBe('MON');
      expect(isWeekend('MON')).toBe(false);
      expect(getDayOfWeekCode('2028-11-25')).toBe('SAT');
      expect(isWeekend('SAT')).toBe(true);
      expect(getDayOfWeekCode('2028-11-26')).toBe('SUN');
      expect(isWeekend('SUN')).toBe(true);
    });

    it('should return null when no database rate rules match and NEVER silently use 300', async () => {
      // Database has no rate rules
      const result = await evaluateRateRule({
        sportId: 'football-5v5',
        date: testDateStr,
        slot: testSlot1
      });

      expect(result).toBeNull();
    });

    it('calculateBookingPrice should throw HTTP 422 when no rate rule is configured in database', async () => {
      // Ensure rates collection is empty
      await expect(
        calculateBookingPrice({
          sportId: 'football-5v5',
          date: testDateStr,
          slots: [testSlot1]
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining('No active rate rule is configured in the database')
      });
    });

    it('should match a specific date + specific slot rule with highest precedence', async () => {
      const db = getDb();
      await db.collection('rates').add({
        sportId: 'football-5v5',
        dateStr: testDateStr,
        timeSlots: [testSlot1],
        ratePerHour: 550,
        isPeak: true,
        daysOfWeek: ['ALL']
      });

      const result = await evaluateRateRule({
        sportId: 'football-5v5',
        date: testDateStr,
        slot: testSlot1
      });

      expect(result).not.toBeNull();
      expect(result.ratePerHour).toBe(550);
      expect(result.ruleType).toBe('SPECIFIC_DATE_SLOT');
      expect(result.isPeak).toBe(true);
    });

    it('should match a day-of-week + slot rule when date-specific rule does not match', async () => {
      const db = getDb();
      await db.collection('rates').add({
        sportId: 'football-5v5',
        daysOfWeek: ['MON'],
        timeSlots: [testSlot2],
        ratePerHour: 450,
        isPeak: false
      });

      const result = await evaluateRateRule({
        sportId: 'football-5v5',
        date: testDateStr, // Monday
        slot: testSlot2
      });

      expect(result).not.toBeNull();
      expect(result.ratePerHour).toBe(450);
      expect(result.ruleType).toBe('DAY_SLOT');
    });

    it('should match a weekend rule when evaluated on Saturday or Sunday', async () => {
      const db = getDb();
      await db.collection('rates').add({
        sportId: 'football-5v5',
        daysOfWeek: ['WEEKEND'],
        timeSlots: [testPeakSlot],
        ratePerHour: 600,
        isPeak: true
      });

      const result = await evaluateRateRule({
        sportId: 'football-5v5',
        date: testSaturdayStr, // Saturday
        slot: testPeakSlot
      });

      expect(result).not.toBeNull();
      expect(result.ratePerHour).toBe(600);
      expect(result.ruleType).toBe('DAY_SLOT');
      expect(result.isPeak).toBe(true);
    });
  });

  // ==========================================
  // 2. Authoritative Price Calculation & Snapshots (Fixed ₹200 Advance)
  // ==========================================
  describe('2. Authoritative Price Calculation & Immutable Snapshots (calculateBookingPrice)', () => {
    beforeEach(async () => {
      const db = getDb();
      await db.collection('rates').add({
        sportId: 'football-5v5',
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        ratePerHour: 300,
        isPeak: false
      });
      await db.collection('rates').add({
        sportId: 'badminton',
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        ratePerHour: 400,
        isPeak: false
      });
      await db.collection('rates').add({
        sportId: 'cricket',
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        ratePerHour: 150,
        isPeak: false
      });
      await db.collection('rates').add({
        sportId: 'football-5v5',
        daysOfWeek: ['WEEKEND'],
        timeSlots: [testPeakSlot],
        ratePerHour: 600,
        isPeak: true
      });
      await db.collection('settings').doc('general').set({
        fixedAdvanceAmount: 200
      });
    });

    it('1. One-slot booking with total above ₹200 requires exactly ₹200 advance', async () => {
      const result = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: testDateStr,
        slots: [testSlot1],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(result.slotCount).toBe(1);
      expect(result.subtotal).toBe(300);
      expect(result.totalAmount).toBe(300);
      expect(result.fixedAdvanceAmount).toBe(200);
      expect(result.advanceRequired).toBe(200);
      expect(result.payableNow).toBe(200);
      expect(result.balanceDue).toBe(100);

      // Verify immutable pricing snapshot structure
      expect(result.pricingSnapshot).toBeDefined();
      expect(result.pricingSnapshot.subtotal).toBe(300);
      expect(result.pricingSnapshot.totalAmount).toBe(300);
      expect(result.pricingSnapshot.fixedAdvanceAmount).toBe(200);
      expect(result.pricingSnapshot.advanceRequired).toBe(200);
      expect(result.pricingSnapshot.balanceDue).toBe(100);
      expect(result.pricingSnapshot.currency).toBe('INR');
      expect(result.pricingSnapshot.calculatedAt).toBeDefined();
      expect(result.pricingSnapshot.gstAmount).toBeUndefined();
      expect(result.pricingSnapshot.advancePercentage).toBeUndefined();
    });

    it('calculateBookingPrice should throw HTTP 422 if fixedAdvanceAmount setting is missing from database', async () => {
      const db = getDb();
      const settingsSnap = await db.collection('settings').get();
      settingsSnap.docs.forEach(d => d.ref.delete());

      await expect(
        calculateBookingPrice({
          sportId: 'football-5v5',
          date: testDateStr,
          slots: [testSlot1]
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining('fixed advance amount is missing or invalid in server settings')
      });
    });

    it('calculateBookingPrice should throw HTTP 422 if fixedAdvanceAmount setting is invalid or non-positive', async () => {
      const db = getDb();
      await db.collection('settings').doc('paymentSettings').set({
        fixedAdvanceAmount: -50
      });

      await expect(
        calculateBookingPrice({
          sportId: 'football-5v5',
          date: testDateStr,
          slots: [testSlot1]
        })
      ).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining('fixed advance amount is missing or invalid in server settings')
      });
    });

    it('calculateBookingPrice should load fixedAdvanceAmount dynamically from Firestore settings document', async () => {
      const db = getDb();
      await db.collection('settings').doc('paymentSettings').set({
        fixedAdvanceAmount: 250
      });

      const result = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: testDateStr,
        slots: [testSlot1, testSlot2],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(result.fixedAdvanceAmount).toBe(250);
      expect(result.advanceRequired).toBe(250);
      expect(result.balanceDue).toBe(350); // 600 - 250 = 350
    });

    it('2. Multi-slot booking with total above ₹200 requires exactly ₹200 advance', async () => {
      const result = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: testDateStr,
        slots: [testSlot1, testSlot2],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(result.slotCount).toBe(2);
      expect(result.subtotal).toBe(600);
      expect(result.totalAmount).toBe(600);
      expect(result.advanceRequired).toBe(200);
      expect(result.payableNow).toBe(200);
      expect(result.balanceDue).toBe(400); // 600 - 200 = 400
    });

    it('3. Different sports still require exactly ₹200 advance', async () => {
      const result = await calculateBookingPrice({
        sportId: 'badminton',
        date: testDateStr,
        slots: [testSlot1],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(result.subtotal).toBe(400);
      expect(result.totalAmount).toBe(400);
      expect(result.advanceRequired).toBe(200);
      expect(result.payableNow).toBe(200);
      expect(result.balanceDue).toBe(200);
    });

    it('4. Different dates still require exactly ₹200 advance', async () => {
      const result = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: '2028-12-25',
        slots: [testSlot1],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(result.totalAmount).toBe(300);
      expect(result.advanceRequired).toBe(200);
      expect(result.balanceDue).toBe(100);
    });

    it('5. Peak and off-peak slots still require exactly ₹200 advance', async () => {
      const result = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: testSaturdayStr,
        slots: [testPeakSlot],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(result.subtotal).toBe(600);
      expect(result.totalAmount).toBe(600);
      expect(result.advanceRequired).toBe(200);
      expect(result.balanceDue).toBe(400);
    });

    it('6. Weekend and weekday slots still require exactly ₹200 advance', async () => {
      const weekdayResult = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: testDateStr, // Monday
        slots: [testSlot1],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });
      const weekendResult = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: testSaturdayStr, // Saturday
        slots: [testSlot1],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(weekdayResult.advanceRequired).toBe(200);
      expect(weekendResult.advanceRequired).toBe(200);
    });

    it('7. Multiple slots do not multiply the advance amount', async () => {
      // 4 hours booking
      const result = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: testDateStr,
        slots: ['06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM', '08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM'],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(result.subtotal).toBe(1200);
      expect(result.totalAmount).toBe(1200);
      expect(result.advanceRequired).toBe(200); // FIXED ₹200, not 4x ₹200
      expect(result.payableNow).toBe(200);
      expect(result.balanceDue).toBe(1000);
    });

    it('8. Total amount below ₹200 caps advance at totalAmount and prevents negative balance', async () => {
      const result = await calculateBookingPrice({
        sportId: 'cricket', // Rate: 150/hr
        date: testDateStr,
        slots: [testSlot1],
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(result.subtotal).toBe(150);
      expect(result.totalAmount).toBe(150);
      expect(result.advanceRequired).toBe(150); // Capped at totalAmount (150 <= 200)
      expect(result.payableNow).toBe(150);
      expect(result.balanceDue).toBe(0); // Never negative!
    });

    it('10. Full payment has zero balance after verification', async () => {
      const result = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: testDateStr,
        slots: [testSlot1, testSlot2],
        paymentOption: PAYMENT_OPTIONS.FULL
      });

      expect(result.slotCount).toBe(2);
      expect(result.subtotal).toBe(600);
      expect(result.totalAmount).toBe(600);
      expect(result.payableNow).toBe(600);
      expect(result.balanceDue).toBe(0);
    });

    it('11. Pay at Spot has zero online advance and full balance due', async () => {
      const result = await calculateBookingPrice({
        sportId: 'football-5v5',
        date: testDateStr,
        slots: [testSlot1, testSlot2],
        paymentOption: PAYMENT_OPTIONS.CASH
      });

      expect(result.subtotal).toBe(600);
      expect(result.totalAmount).toBe(600);
      expect(result.payableNow).toBe(0);
      expect(result.balanceDue).toBe(600);
    });
  });

  // ==========================================
  // 3. Razorpay Order Creation & Hardening
  // ==========================================
  describe('3. Razorpay Order Creation & Amount Hardening (paymentService.js)', () => {
    beforeEach(async () => {
      const db = getDb();
      await db.collection('rates').add({
        sportId: 'football-5v5',
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        ratePerHour: 300,
        isPeak: false
      });
      await db.collection('rates').add({
        sportId: 'cricket',
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        ratePerHour: 150,
        isPeak: false
      });
      await db.collection('settings').doc('general').set({
        fixedAdvanceAmount: 200
      });
    });

    it('12. Razorpay advance order is exactly 20000 paise (₹200) when totalAmount > ₹200', async () => {
      const order = await createPaymentOrderService({
        date: testDateStr,
        slots: [testSlot1, testSlot2], // Total 600, fixed advance = 200
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(order.amount).toBe(200);
      expect(order.amountInPaise).toBe(20000); // 200 * 100 paise
      expect(order.paymentOption).toBe(PAYMENT_OPTIONS.ADVANCE);
      expect(mockRazorpay.orders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 20000,
          currency: 'INR'
        })
      );
    });

    it('13. Razorpay advance order is capped correctly when totalAmount <= ₹200 (15000 paise for ₹150 total)', async () => {
      const order = await createPaymentOrderService({
        sportId: 'cricket',
        date: testDateStr,
        slots: [testSlot1], // Total 150, fixed advance capped at 150
        paymentOption: PAYMENT_OPTIONS.ADVANCE
      });

      expect(order.amount).toBe(150);
      expect(order.amountInPaise).toBe(15000); // 150 * 100 paise
      expect(order.paymentOption).toBe(PAYMENT_OPTIONS.ADVANCE);
    });

    it('should create an order with authoritative full amount in paise for Full payment', async () => {
      const order = await createPaymentOrderService({
        date: testDateStr,
        slots: [testSlot1, testSlot2], // Total 600
        paymentOption: PAYMENT_OPTIONS.FULL
      });

      expect(order.amount).toBe(600);
      expect(order.amountInPaise).toBe(60000); // 600 * 100 paise
      expect(order.paymentOption).toBe(PAYMENT_OPTIONS.FULL);
    });

    it('14. Client-supplied advance amount mismatch is rejected (tamper protection)', async () => {
      // Client claims amount is ₹50, but server calculation for Advance is ₹200
      await expect(
        createPaymentOrderService({
          date: testDateStr,
          slots: [testSlot1, testSlot2],
          paymentOption: PAYMENT_OPTIONS.ADVANCE,
          rawAmount: 50
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Payment amount mismatch')
      });
    });

    it('should reject arbitrary client amount when no booking params or bookingId are provided', async () => {
      await expect(
        createPaymentOrderService({
          rawAmount: 100
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Valid booking parameters (date and slots) or a valid bookingId are required')
      });
    });

    it('should reject order creation for Cash / Pay at Spot', async () => {
      await expect(
        createPaymentOrderService({
          date: testDateStr,
          slots: [testSlot1],
          paymentOption: PAYMENT_OPTIONS.CASH
        })
      ).rejects.toThrow('Cash / Pay at Spot bookings do not require an online payment order.');
    });
  });

  // ==========================================
  // 4. Razorpay Signature Verification & Replay Protection
  // ==========================================
  describe('4. Signature Verification & Replay Attack Prevention', () => {
    const orderId = 'order_test_123456';
    const paymentId = 'pay_test_789012';

    it('should verify a valid cryptographic HMAC SHA256 signature', async () => {
      const text = `${orderId}|${paymentId}`;
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(text)
        .digest('hex');

      const result = await verifyPaymentSignatureService({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature
      });

      expect(result.verified).toBe(true);
      expect(result.paymentId).toBe(paymentId);
      expect(result.orderId).toBe(orderId);
    });

    it('should reject an invalid or tampered signature with 400 error', async () => {
      const invalidSignature = 'invalid_tampered_signature_hex';

      await expect(
        verifyPaymentSignatureService({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: invalidSignature
        })
      ).rejects.toThrow('Invalid payment signature');
    });

    it('should reject incomplete verification payload', async () => {
      await expect(
        verifyPaymentSignatureService({
          razorpay_order_id: orderId,
          razorpay_payment_id: ''
        })
      ).rejects.toThrow('Incomplete payment verification payload');
    });

    it('19. Duplicate payment is not counted twice (replay attack prevention)', async () => {
      const db = getDb();
      const replayPaymentId = 'pay_already_used_9999';

      // Insert existing booking with this payment ID
      await db.collection('bookings').add({
        bookingId: 'BK-20281120-001',
        dateStr: testDateStr,
        razorpay_payment_id: replayPaymentId,
        status: BOOKING_STATUS.CONFIRMED
      });

      const text = `${orderId}|${replayPaymentId}`;
      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(text)
        .digest('hex');

      await expect(
        verifyPaymentSignatureService({
          razorpay_order_id: orderId,
          razorpay_payment_id: replayPaymentId,
          razorpay_signature: validSignature
        })
      ).rejects.toThrow('This payment transaction has already been applied to another booking');
    });
  });

  // ==========================================
  // 5. Price Preview Endpoints (HTTP APIs)
  // ==========================================
  describe('5. Price Preview API Endpoints', () => {
    beforeEach(async () => {
      const db = getDb();
      await db.collection('rates').add({
        sportId: 'football-5v5',
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        ratePerHour: 300,
        isPeak: false
      });
      await db.collection('settings').doc('general').set({
        fixedAdvanceAmount: 200
      });
    });

    it('POST /api/bookings/price-preview should calculate authoritative pricing (Fixed ₹200 Advance)', async () => {
      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: testDateStr,
          slots: [testSlot1, testSlot2],
          paymentOption: PAYMENT_OPTIONS.ADVANCE
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subtotal).toBe(600);
      expect(res.body.data.totalAmount).toBe(600);
      expect(res.body.data.fixedAdvanceAmount).toBe(200);
      expect(res.body.data.advanceRequired).toBe(200);
      expect(res.body.data.payableNow).toBe(200);
      expect(res.body.data.balanceDue).toBe(400); // 600 - 200 = 400
      expect(res.body.data.pricingSnapshot).toBeDefined();
    });

    it('POST /api/payments/price-preview should calculate matching authoritative pricing', async () => {
      const res = await request(app)
        .post('/api/payments/price-preview')
        .send({
          date: testDateStr,
          slots: [testSlot1],
          paymentOption: PAYMENT_OPTIONS.FULL
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalAmount).toBe(300);
      expect(res.body.data.payableNow).toBe(300);
      expect(res.body.data.balanceDue).toBe(0);
    });

    it('POST /api/bookings/price-preview should return 400 for missing date or empty slots', async () => {
      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: '',
          slots: []
        });

      expect(res.status).toBe(400);
    });

    it('POST /api/bookings/price-preview should return 422 if fixedAdvanceAmount setting is missing in database', async () => {
      const db = getDb();
      const settingsSnap = await db.collection('settings').get();
      settingsSnap.docs.forEach(d => d.ref.delete());

      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: testDateStr,
          slots: [testSlot1]
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('fixed advance amount is missing or invalid in server settings');
    });
  });

  // ==========================================
  // 6. Booking Creation Integration & State Verification
  // ==========================================
  describe('6. End-to-End Booking Creation & State Persistence', () => {
    beforeEach(async () => {
      const db = getDb();
      await db.collection('rates').add({
        sportId: 'football-5v5',
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        ratePerHour: 300,
        isPeak: false
      });
      await db.collection('rates').add({
        sportId: 'cricket',
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        ratePerHour: 150,
        isPeak: false
      });
      await db.collection('settings').doc('general').set({
        fixedAdvanceAmount: 200
      });
    });

    it('9. should create an Advance Paid booking with exact advance (₹200) and balance due (₹400) recorded', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Rahul Dravid',
          customerPhone: '9876543210',
          customerEmail: 'rahul@example.com',
          sportId: 'football-5v5',
          sportType: 'Football (5v5)',
          date: testDateStr,
          timeSlots: [testSlot1, testSlot2],
          paymentMethod: PAYMENT_METHODS.PAY_NOW,
          paymentOption: PAYMENT_OPTIONS.ADVANCE,
          razorpay_payment_id: 'pay_advance_succ_111',
          // 14, 15, 16. Client attempts to send tampered low values
          totalAmount: 50,
          subtotal: 50,
          advancePercentage: 50,
          advanceAmount: 10,
          balanceDue: 10
        });

      expect(res.status).toBe(201);
      const booking = res.body.data;

      // Server must override client-tampered values with authoritative ₹600 total, ₹200 advance, ₹400 balance
      expect(booking.subtotal).toBe(600);
      expect(booking.totalAmount).toBe(600);
      expect(booking.advancePaid).toBe(200);
      expect(booking.balanceDue).toBe(400);
      expect(booking.paymentStatus).toBe(PAYMENT_STATUS.ADVANCE_PAID);
      expect(booking.status).toBe(BOOKING_STATUS.CONFIRMED);
      expect(booking.balancePayment.isPaid).toBe(false);

      // Verify immutable pricing snapshot is embedded
      expect(booking.pricingSnapshot).toBeDefined();
      expect(booking.pricingSnapshot.subtotal).toBe(600);
      expect(booking.pricingSnapshot.totalAmount).toBe(600);
      expect(booking.pricingSnapshot.fixedAdvanceAmount).toBe(200);
      expect(booking.pricingSnapshot.advanceRequired).toBe(200);
      expect(booking.pricingSnapshot.balanceDue).toBe(400);
      expect(booking.pricingSnapshot.advancePercentage).toBeUndefined();
      expect(booking.pricingSnapshot.gstAmount).toBeUndefined();
    });

    it('should create a Full Paid booking for total <= ₹200 when paying advance (Example 4)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Sachin Tendulkar',
          customerPhone: '9876543214',
          sportId: 'cricket', // ₹150 total
          date: testDateStr,
          timeSlots: [testSlot1],
          paymentMethod: PAYMENT_METHODS.PAY_NOW,
          paymentOption: PAYMENT_OPTIONS.ADVANCE,
          razorpay_payment_id: 'pay_cricket_adv_150'
        });

      expect(res.status).toBe(201);
      const booking = res.body.data;

      expect(booking.totalAmount).toBe(150);
      expect(booking.advancePaid).toBe(150);
      expect(booking.balanceDue).toBe(0);
      expect(booking.paymentStatus).toBe(PAYMENT_STATUS.FULLY_PAID); // Advance equal to total marks as fully paid
      expect(booking.status).toBe(BOOKING_STATUS.CONFIRMED);
      expect(booking.balancePayment.isPaid).toBe(true);
    });

    it('should create a Full Paid booking with balanceDue = 0 and balancePayment.isPaid = true', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'MS Dhoni',
          customerPhone: '9876543211',
          customerEmail: 'dhoni@example.com',
          sportId: 'football-5v5',
          date: testDateStr,
          timeSlots: [testPeakSlot],
          paymentMethod: PAYMENT_METHODS.PAY_NOW,
          paymentOption: PAYMENT_OPTIONS.FULL,
          razorpay_payment_id: 'pay_full_succ_222'
        });

      expect(res.status).toBe(201);
      const booking = res.body.data;

      expect(booking.totalAmount).toBe(300);
      expect(booking.advancePaid).toBe(300);
      expect(booking.balanceDue).toBe(0);
      expect(booking.paymentStatus).toBe(PAYMENT_STATUS.FULLY_PAID);
      expect(booking.status).toBe(BOOKING_STATUS.CONFIRMED);
      expect(booking.balancePayment.isPaid).toBe(true);
    });

    it('should create a Pay at Spot booking with Cash Pending status and full balance due', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Rohit Sharma',
          customerPhone: '9876543212',
          date: testDateStr,
          timeSlots: ['08:00 AM - 09:00 AM'],
          paymentMethod: PAYMENT_METHODS.PAY_AT_SPOT,
          paymentOption: PAYMENT_OPTIONS.CASH
        });

      expect(res.status).toBe(201);
      const booking = res.body.data;

      expect(booking.totalAmount).toBe(300);
      expect(booking.advancePaid).toBe(0);
      expect(booking.balanceDue).toBe(300);
      expect(booking.paymentStatus).toBe(PAYMENT_STATUS.CASH_PENDING);
      expect(booking.status).toBe(BOOKING_STATUS.PENDING);
      expect(booking.balancePayment.isPaid).toBe(false);
    });

    it('should preserve immutable pricing snapshot even if rate rules change in the future', async () => {
      const db = getDb();

      // Create booking under initial rate (300 INR)
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Virat Kohli',
          customerPhone: '9876543213',
          date: testDateStr,
          timeSlots: ['09:00 AM - 10:00 AM'],
          paymentMethod: PAYMENT_METHODS.PAY_NOW,
          paymentOption: PAYMENT_OPTIONS.FULL,
          razorpay_payment_id: 'pay_vk_333'
        });

      expect(res.status).toBe(201);
      const bookingId = res.body.data.bookingId;
      const originalTotal = res.body.data.totalAmount;
      expect(originalTotal).toBe(300);

      // Now admin changes rates to 1000 INR
      await db.collection('rates').add({
        sportId: 'football-5v5',
        dateStr: testDateStr,
        timeSlots: ['09:00 AM - 10:00 AM'],
        ratePerHour: 1000
      });

      // Retrieve booking via track API
      const trackRes = await request(app)
        .get(`/api/bookings/track?query=${bookingId}`);

      expect(trackRes.status).toBe(200);
      const retrieved = trackRes.body.data[0];

      // Stored booking amounts and pricing snapshot must remain completely unchanged!
      expect(retrieved.totalAmount).toBe(300);
      expect(retrieved.subtotal).toBe(300);
      expect(retrieved.pricingSnapshot.subtotal).toBe(300);
      expect(retrieved.pricingSnapshot.totalAmount).toBe(300);
      expect(retrieved.pricingSnapshot.fixedAdvanceAmount).toBe(200);
    });

    it('POST /api/bookings should return 422 if fixedAdvanceAmount setting is missing in database', async () => {
      const db = getDb();
      const settingsSnap = await db.collection('settings').get();
      settingsSnap.docs.forEach(d => d.ref.delete());

      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'No Settings Test',
          customerPhone: '9876543210',
          sportId: 'football-5v5',
          date: testDateStr,
          timeSlots: [testSlot1],
          paymentMethod: PAYMENT_METHODS.PAY_NOW,
          paymentOption: PAYMENT_OPTIONS.ADVANCE
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('fixed advance amount is missing or invalid in server settings');
    });

    it('POST /api/payments/create-order should return 422 if fixedAdvanceAmount setting is missing in database', async () => {
      const db = getDb();
      const settingsSnap = await db.collection('settings').get();
      settingsSnap.docs.forEach(d => d.ref.delete());

      const res = await request(app)
        .post('/api/payments/create-order')
        .send({
          date: testDateStr,
          slots: [testSlot1],
          sportId: 'football-5v5',
          paymentOption: PAYMENT_OPTIONS.ADVANCE
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('fixed advance amount is missing or invalid in server settings');
    });

    it('Client tampering of advanceAmount, advanceRequired, balanceDue, and totalAmount is discarded in favor of server calculation', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Tamper Tester',
          customerPhone: '9876543219',
          sportId: 'football-5v5',
          date: testDateStr,
          timeSlots: [testSlot1, testSlot2], // 2 slots = 600
          paymentMethod: PAYMENT_METHODS.PAY_NOW,
          paymentOption: PAYMENT_OPTIONS.ADVANCE,
          razorpay_payment_id: 'pay_tamper_444',
          advanceAmount: 5,
          advanceRequired: 5,
          balanceDue: 0,
          totalAmount: 5,
          slotPrice: 2.5,
          subtotal: 5
        });

      expect(res.status).toBe(201);
      const booking = res.body.data;

      expect(booking.subtotal).toBe(600);
      expect(booking.totalAmount).toBe(600);
      expect(booking.slotPrice).toBe(300);
      expect(booking.advancePaid).toBe(200);
      expect(booking.balanceDue).toBe(400);
      expect(booking.paymentStatus).toBe(PAYMENT_STATUS.ADVANCE_PAID);

      expect(booking.pricingSnapshot.subtotal).toBe(600);
      expect(booking.pricingSnapshot.totalAmount).toBe(600);
      expect(booking.pricingSnapshot.fixedAdvanceAmount).toBe(200);
      expect(booking.pricingSnapshot.advanceRequired).toBe(200);
      expect(booking.pricingSnapshot.balanceDue).toBe(400);
    });

    it('Verified payment aggregation calculates balance correctly after advance and subsequent balance payment', async () => {
      // 1. Create booking with advance payment of ₹200 (Total ₹600)
      const createRes = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Balance Flow User',
          customerPhone: '9876543220',
          sportId: 'football-5v5',
          date: testDateStr,
          timeSlots: [testSlot1, testSlot2],
          paymentMethod: PAYMENT_METHODS.PAY_NOW,
          paymentOption: PAYMENT_OPTIONS.ADVANCE,
          razorpay_payment_id: 'pay_adv_balance_test'
        });

      expect(createRes.status).toBe(201);
      const bookingId = createRes.body.data.bookingId;
      expect(createRes.body.data.advancePaid).toBe(200);
      expect(createRes.body.data.balanceDue).toBe(400);
      expect(createRes.body.data.paymentStatus).toBe(PAYMENT_STATUS.ADVANCE_PAID);

      // 2. Admin logs in to obtain auth token
      const loginRes = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'password123' });
      const adminToken = loginRes.body.data.token;

      // 3. Admin marks balance as paid
      const markPaidRes = await request(app)
        .patch(`/api/bookings/${bookingId}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(markPaidRes.status).toBe(200);
      const updatedBooking = markPaidRes.body.data;
      expect(updatedBooking.paymentStatus).toBe(PAYMENT_STATUS.FULLY_PAID);
      expect(updatedBooking.balanceDue).toBe(0);
      expect(updatedBooking.balancePayment.isPaid).toBe(true);
    });
  });

  // ==========================================
  // 7. Legacy Old Booking Normalization Tests
  // ==========================================
  describe('7. Legacy Booking Normalization & Safe Rendering (bookingNormalizer.js)', () => {
    it('should safely normalize old legacy booking with Paid status to Fully Paid', () => {
      const legacyDoc = {
        bookingId: 'BK-LEGACY-001',
        customerName: 'Old Customer',
        mobileNumber: '9876543210',
        date: '2024-01-15',
        slots: ['06:00 AM - 07:00 AM'],
        paymentMethod: 'Pay Now',
        paymentStatus: 'Paid',
        totalAmount: 354
      };

      const normalized = normalizeBookingDocument(legacyDoc);

      expect(normalized).not.toBeNull();
      expect(normalized.bookingId).toBe('BK-LEGACY-001');
      expect(normalized.paymentStatus).toBe(PAYMENT_STATUS.FULLY_PAID);
      expect(normalized.advancePaid).toBe(354);
      expect(normalized.balanceDue).toBe(0);
      expect(normalized.pricingSnapshot).toBeDefined();
    });

    it('should safely normalize old legacy booking with Pending status to Cash Pending', () => {
      const legacyDoc = {
        bookingId: 'BK-LEGACY-002',
        customerName: 'Old Customer 2',
        mobileNumber: '9876543211',
        date: '2024-01-16',
        slots: ['07:00 AM - 08:00 AM'],
        paymentMethod: 'Pay at Spot',
        paymentStatus: 'Pending',
        totalAmount: 354
      };

      const normalized = normalizeBookingDocument(legacyDoc);

      expect(normalized).not.toBeNull();
      expect(normalized.bookingId).toBe('BK-LEGACY-002');
      expect(normalized.paymentStatus).toBe(PAYMENT_STATUS.CASH_PENDING);
      expect(normalized.advancePaid).toBe(0);
      expect(normalized.balanceDue).toBe(354);
      expect(normalized.pricingSnapshot).toBeDefined();
    });
  });

});
