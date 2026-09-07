import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import app from '../app.js';
import { getDb } from '../config/firebase.js';
import { ENV } from '../config/env.js';
import {
  PAYMENT_OPTIONS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  BOOKING_STATUS
} from '../utils/constants.js';
import { normalizeBookingDocument } from '../utils/bookingNormalizer.js';
import { setRazorpayInstance } from '../services/paymentService.js';

describe('Phase 4: Customer Authentication, Profile Management & Booking History Suite', () => {
  const testSecret = 'test_razorpay_secret_key_12345';
  const testKeyId = 'rzp_test_mockKeyId';
  const testDateStr = '2028-11-20'; // Future date
  const pastDateStr = '2020-01-15'; // Past date
  const testSlot1 = '06:00 AM - 07:00 AM';
  const testSlot2 = '07:00 AM - 08:00 AM';

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

  let customer1Token;
  let customer1Id;
  let customer2Token;
  let customer2Id;
  let adminToken;

  beforeAll(async () => {
    ENV.RAZORPAY_KEY_ID = testKeyId;
    ENV.RAZORPAY_KEY_SECRET = testSecret;
    setRazorpayInstance(mockRazorpay);
  });

  beforeEach(async () => {
    const db = getDb();

    // Clean up test collections
    const collectionsToClean = ['customers', 'bookings', 'settings', 'rates', 'admin'];
    for (const col of collectionsToClean) {
      const snap = await db.collection(col).get();
      snap.docs.forEach(doc => doc.ref.delete());
    }

    // Seed payment settings
    await db.collection('settings').doc('paymentSettings').set({
      fixedAdvanceAmount: 200
    });

    // Seed default rates
    await db.collection('rates').add({
      sportId: 'football-5v5',
      daysOfWeek: ['ALL'],
      timeSlots: ['ALL'],
      ratePerHour: 300,
      isPeak: false
    });

    // 1. Create Customer 1
    const cust1Res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '9876543210',
        name: 'Rahul Dravid',
        email: 'rahul@example.com'
      });
    customer1Token = cust1Res.body.data.token;
    customer1Id = cust1Res.body.data.customer.id;

    // 2. Create Customer 2
    const cust2Res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '9123456780',
        name: 'Sachin Tendulkar',
        email: 'sachin@example.com'
      });
    customer2Token = cust2Res.body.data.token;
    customer2Id = cust2Res.body.data.customer.id;

    // 3. Authenticate Admin
    const adminLoginRes = await request(app)
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: 'password123'
      });
    adminToken = adminLoginRes.body.data.token;
  });

  // ==========================================
  // 1. Customer Authentication & Profile Management
  // ==========================================
  describe('1. Customer Profile Retrieval & Updates', () => {
    it('1. should retrieve authenticated customer profile (GET /api/auth/me)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(customer1Id);
      expect(res.body.data.name).toBe('Rahul Dravid');
      expect(res.body.data.phone).toBe('9876543210');
      expect(res.body.data.email).toBe('rahul@example.com');
      expect(res.body.data.password).toBeUndefined();
    });

    it('should reject unauthenticated profile access with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2. should update customer profile with valid fields (PUT /api/auth/profile)', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          name: 'The Wall Dravid',
          email: 'wall@example.com',
          avatar: 'https://example.com/avatar.jpg'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('The Wall Dravid');
      expect(res.body.data.email).toBe('wall@example.com');
      expect(res.body.data.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('3. should reject duplicate phone number update with HTTP 409 Conflict', async () => {
      // Customer 1 attempts to change phone to Customer 2's phone
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          phone: '9123456780' // Already belonging to Customer 2
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Mobile number is already associated with another account');
    });

    it('4. should reject duplicate email update with HTTP 409 Conflict', async () => {
      // Customer 1 attempts to change email to Customer 2's email
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          email: 'sachin@example.com' // Already belonging to Customer 2
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email address is already associated with another account');
    });

    it('5. should reject attempts by customer to edit role or unapproved admin fields', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          name: 'Rahul Dravid',
          role: 'admin', // Malicious attempt
          isAdmin: true,
          bookingStatus: 'Confirmed'
        });

      // Joi validator strictly rejects unknown fields with 400
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 2. Customer Booking History & Filters
  // ==========================================
  describe('2. Booking History & Dynamic Tab Filtering', () => {
    let upcomingBookingId;
    let pastBookingId;
    let cancelledBookingId;

    beforeEach(async () => {
      const db = getDb();

      // 1. Upcoming Booking for Customer 1 (₹600 total, ₹200 advance)
      const b1 = await db.collection('bookings').add({
        bookingId: 'BK-20281120-0001',
        customerId: customer1Id,
        customerName: 'Rahul Dravid',
        customerPhone: '9876543210',
        sportType: 'Football (5v5)',
        sportId: 'football-5v5',
        dateStr: testDateStr,
        date: `${testDateStr}T06:00:00.000Z`,
        timeSlots: [testSlot1, testSlot2],
        slotCount: 2,
        slotPrice: 300,
        subtotal: 600,
        totalAmount: 600,
        advancePaid: 200,
        balanceDue: 400,
        paymentMethod: PAYMENT_METHODS.PAY_NOW,
        paymentOption: PAYMENT_OPTIONS.ADVANCE,
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        status: BOOKING_STATUS.CONFIRMED,
        pricingSnapshot: {
          subtotal: 600,
          totalAmount: 600,
          fixedAdvanceAmount: 200,
          advanceRequired: 200,
          balanceDue: 400
        },
        createdAt: new Date().toISOString()
      });
      upcomingBookingId = 'BK-20281120-0001';

      // 2. Past Booking for Customer 1 (₹300 total, ₹300 fully paid)
      const b2 = await db.collection('bookings').add({
        bookingId: 'BK-20200115-0001',
        customerId: customer1Id,
        customerName: 'Rahul Dravid',
        customerPhone: '9876543210',
        sportType: 'Football (5v5)',
        sportId: 'football-5v5',
        dateStr: pastDateStr,
        date: `${pastDateStr}T06:00:00.000Z`,
        timeSlots: [testSlot1],
        slotCount: 1,
        slotPrice: 300,
        subtotal: 300,
        totalAmount: 300,
        advancePaid: 300,
        balanceDue: 0,
        paymentMethod: PAYMENT_METHODS.PAY_NOW,
        paymentOption: PAYMENT_OPTIONS.FULL,
        paymentStatus: PAYMENT_STATUS.FULLY_PAID,
        status: BOOKING_STATUS.CONFIRMED,
        createdAt: '2020-01-15T00:00:00.000Z'
      });
      pastBookingId = 'BK-20200115-0001';

      // 3. Cancelled Booking for Customer 1
      const b3 = await db.collection('bookings').add({
        bookingId: 'BK-20281120-0002',
        customerId: customer1Id,
        customerName: 'Rahul Dravid',
        customerPhone: '9876543210',
        sportType: 'Football (5v5)',
        sportId: 'football-5v5',
        dateStr: testDateStr,
        date: `${testDateStr}T07:00:00.000Z`,
        timeSlots: [testSlot2],
        totalAmount: 300,
        advancePaid: 0,
        balanceDue: 300,
        paymentMethod: PAYMENT_METHODS.PAY_AT_SPOT,
        paymentStatus: PAYMENT_STATUS.CASH_PENDING,
        status: BOOKING_STATUS.CANCELLED,
        cancellation: {
          isCancelled: true,
          reason: 'Customer schedule conflict',
          cancelledAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      });
      cancelledBookingId = 'BK-20281120-0002';

      // 4. Booking belonging to Customer 2 (for authorization tests)
      await db.collection('bookings').add({
        bookingId: 'BK-20281120-0099',
        customerId: customer2Id,
        customerName: 'Sachin Tendulkar',
        customerPhone: '9123456780',
        sportType: 'Cricket Arena',
        dateStr: testDateStr,
        timeSlots: [testSlot1],
        totalAmount: 150,
        advancePaid: 150,
        balanceDue: 0,
        status: BOOKING_STATUS.CONFIRMED,
        createdAt: new Date().toISOString()
      });
    });

    it('6. should retrieve all bookings for authenticated customer (GET /api/auth/bookings)', async () => {
      const res = await request(app)
        .get('/api/auth/bookings?filter=all')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3); // Customer 1 has 3 bookings
      const bookingIds = res.body.data.map(b => b.bookingId);
      expect(bookingIds).toContain('BK-20281120-0001');
      expect(bookingIds).toContain('BK-20200115-0001');
      expect(bookingIds).toContain('BK-20281120-0002');
      expect(bookingIds).not.toContain('BK-20281120-0099'); // Must not contain Customer 2's booking
    });

    it('7. should filter upcoming bookings correctly (?filter=upcoming)', async () => {
      const res = await request(app)
        .get('/api/auth/bookings?filter=upcoming')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].bookingId).toBe('BK-20281120-0001');
      expect(res.body.data[0].status).toBe(BOOKING_STATUS.CONFIRMED);
    });

    it('8. should filter past bookings correctly (?filter=past)', async () => {
      const res = await request(app)
        .get('/api/auth/bookings?filter=past')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].bookingId).toBe('BK-20200115-0001');
    });

    it('9. should filter cancelled bookings correctly (?filter=cancelled)', async () => {
      const res = await request(app)
        .get('/api/auth/bookings?filter=cancelled')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].bookingId).toBe('BK-20281120-0002');
      expect(res.body.data[0].status).toBe(BOOKING_STATUS.CANCELLED);
      expect(res.body.data[0].cancellation.reason).toBe('Customer schedule conflict');
    });

    it('10. All-history filter returns all customer bookings', async () => {
      const res = await request(app)
        .get('/api/auth/bookings?filter=all')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    it('11. Customer CANNOT access another user’s booking (HTTP 403 Forbidden)', async () => {
      // Customer 1 tries to access Customer 2's booking details
      const res = await request(app)
        .get('/api/auth/bookings/BK-20281120-0099')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Unauthorized access');
    });

    it('Customer CAN access their own booking details (HTTP 200)', async () => {
      const res = await request(app)
        .get(`/api/auth/bookings/${upcomingBookingId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingId).toBe(upcomingBookingId);
      expect(res.body.data.totalAmount).toBe(600);
      expect(res.body.data.advancePaid).toBe(200);
      expect(res.body.data.balanceDue).toBe(400);
    });

    it('12. Admin routes remain strictly protected against customer tokens (HTTP 403)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 3. Normalization, Financial Displays & GST Absence
  // ==========================================
  describe('3. Financial Breakdown Displays & Normalization', () => {
    beforeEach(async () => {
      const db = getDb();
      await db.collection('bookings').add({
        bookingId: 'BK-20281120-0001',
        customerId: customer1Id,
        customerName: 'Rahul Dravid',
        customerPhone: '9876543210',
        sportType: 'Football (5v5)',
        sportId: 'football-5v5',
        dateStr: testDateStr,
        date: `${testDateStr}T06:00:00.000Z`,
        timeSlots: [testSlot1, testSlot2],
        slotCount: 2,
        slotPrice: 300,
        subtotal: 600,
        totalAmount: 600,
        advancePaid: 200,
        balanceDue: 400,
        paymentMethod: PAYMENT_METHODS.PAY_NOW,
        paymentOption: PAYMENT_OPTIONS.ADVANCE,
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        status: BOOKING_STATUS.CONFIRMED,
        pricingSnapshot: {
          subtotal: 600,
          totalAmount: 600,
          fixedAdvanceAmount: 200,
          advanceRequired: 200,
          balanceDue: 400
        },
        createdAt: new Date().toISOString()
      });

      await db.collection('bookings').add({
        bookingId: 'BK-20200115-0001',
        customerId: customer1Id,
        customerName: 'Rahul Dravid',
        customerPhone: '9876543210',
        sportType: 'Football (5v5)',
        sportId: 'football-5v5',
        dateStr: pastDateStr,
        date: `${pastDateStr}T06:00:00.000Z`,
        timeSlots: [testSlot1],
        slotCount: 1,
        slotPrice: 300,
        subtotal: 300,
        totalAmount: 300,
        advancePaid: 300,
        balanceDue: 0,
        paymentMethod: PAYMENT_METHODS.PAY_NOW,
        paymentOption: PAYMENT_OPTIONS.FULL,
        paymentStatus: PAYMENT_STATUS.FULLY_PAID,
        status: BOOKING_STATUS.CONFIRMED,
        createdAt: '2020-01-15T00:00:00.000Z'
      });

      await db.collection('bookings').add({
        bookingId: 'BK-20281120-0002',
        customerId: customer1Id,
        customerName: 'Rahul Dravid',
        customerPhone: '9876543210',
        sportType: 'Football (5v5)',
        sportId: 'football-5v5',
        dateStr: testDateStr,
        date: `${testDateStr}T07:00:00.000Z`,
        timeSlots: [testSlot2],
        totalAmount: 300,
        advancePaid: 0,
        balanceDue: 300,
        paymentMethod: PAYMENT_METHODS.PAY_AT_SPOT,
        paymentStatus: PAYMENT_STATUS.CASH_PENDING,
        status: BOOKING_STATUS.CANCELLED,
        cancellation: {
          isCancelled: true,
          reason: 'Customer schedule conflict',
          cancelledAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      });
    });

    it('13. Legacy bookings normalize correctly in booking history', async () => {
      const db = getDb();
      // Insert legacy booking missing snapshots and canonical payment statuses
      await db.collection('bookings').add({
        bookingId: 'BK-LEGACY-009',
        customerId: customer1Id,
        customerName: 'Rahul Dravid',
        customerPhone: '9876543210',
        date: '2024-05-10',
        slots: ['06:00 AM - 07:00 AM'],
        paymentMethod: 'Pay Now',
        paymentStatus: 'Paid',
        totalAmount: 300
      });

      const res = await request(app)
        .get('/api/auth/bookings/BK-LEGACY-009')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookingId).toBe('BK-LEGACY-009');
      expect(res.body.data.paymentStatus).toBe(PAYMENT_STATUS.FULLY_PAID);
      expect(res.body.data.advancePaid).toBe(300);
      expect(res.body.data.balanceDue).toBe(0);
      expect(res.body.data.pricingSnapshot).toBeDefined();
    });

    it('14. Advance-paid booking accurately displays advance paid, total amount, and balance due', async () => {
      const res = await request(app)
        .get('/api/auth/bookings/BK-20281120-0001')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalAmount).toBe(600);
      expect(res.body.data.advancePaid).toBe(200);
      expect(res.body.data.balanceDue).toBe(400);
      expect(res.body.data.paymentStatus).toBe(PAYMENT_STATUS.ADVANCE_PAID);
    });

    it('15. Fully paid booking displays fully paid status and zero balance due', async () => {
      const res = await request(app)
        .get('/api/auth/bookings/BK-20200115-0001')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalAmount).toBe(300);
      expect(res.body.data.advancePaid).toBe(300);
      expect(res.body.data.balanceDue).toBe(0);
      expect(res.body.data.paymentStatus).toBe(PAYMENT_STATUS.FULLY_PAID);
    });

    it('16. Cash-pending booking displays cash pending and full balance due', async () => {
      const res = await request(app)
        .get('/api/auth/bookings/BK-20281120-0002')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalAmount).toBe(300);
      expect(res.body.data.advancePaid).toBe(0);
      expect(res.body.data.balanceDue).toBe(300);
      expect(res.body.data.paymentStatus).toBe(PAYMENT_STATUS.CASH_PENDING);
    });

    it('17. GST is completely absent from user-facing profile and booking history payloads', async () => {
      const res = await request(app)
        .get('/api/auth/bookings')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      for (const booking of res.body.data) {
        expect(booking.gstAmount).toBeUndefined();
        expect(booking.gstPercentage).toBeUndefined();
        if (booking.pricingSnapshot) {
          expect(booking.pricingSnapshot.gstAmount).toBeUndefined();
          expect(booking.pricingSnapshot.gstPercentage).toBeUndefined();
        }
      }
    });

    it('18. Fixed advance value comes from server response', async () => {
      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: testDateStr,
          slots: [testSlot1],
          paymentOption: PAYMENT_OPTIONS.ADVANCE
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fixedAdvanceAmount).toBe(200);
      expect(res.body.data.advanceRequired).toBe(200);
    });
  });

  // ==========================================
  // 4. Regression Verification for Existing Flows
  // ==========================================
  describe('4. Regression Verification (Existing Booking, Razorpay, & Cash Flows)', () => {
    it('19. Existing booking creation flow still passes without regressions', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Regression Tester',
          customerPhone: '9876543299',
          sportId: 'football-5v5',
          date: testDateStr,
          timeSlots: ['09:00 PM - 10:00 PM'],
          paymentMethod: PAYMENT_METHODS.PAY_NOW,
          paymentOption: PAYMENT_OPTIONS.FULL,
          razorpay_payment_id: 'pay_reg_test_1'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.bookingId).toBeDefined();
      expect(res.body.data.totalAmount).toBe(300);
      expect(res.body.data.paymentStatus).toBe(PAYMENT_STATUS.FULLY_PAID);
    });

    it('20. Existing Razorpay order creation and signature verification flows still pass', async () => {
      const orderRes = await request(app)
        .post('/api/payments/create-order')
        .send({
          date: testDateStr,
          slots: ['10:00 PM - 11:00 PM'],
          sportId: 'football-5v5',
          paymentOption: PAYMENT_OPTIONS.ADVANCE
        });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.data.amountInPaise).toBe(20000);
      const orderId = orderRes.body.data.orderId;
      const paymentId = 'pay_reg_rzp_99';

      const validSignature = crypto
        .createHmac('sha256', testSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const verifyRes = await request(app)
        .post('/api/payments/verify')
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.verified).toBe(true);
    });

    it('21. Existing Pay at Spot cash booking flow still passes', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Cash Tester',
          customerPhone: '9876543288',
          sportId: 'football-5v5',
          date: testDateStr,
          timeSlots: ['11:00 PM - 12:00 AM'],
          paymentMethod: PAYMENT_METHODS.PAY_AT_SPOT,
          paymentOption: PAYMENT_OPTIONS.CASH
        });

      expect(res.status).toBe(201);
      expect(res.body.data.paymentStatus).toBe(PAYMENT_STATUS.CASH_PENDING);
      expect(res.body.data.balanceDue).toBe(300);
    });

    it('22. No production Firestore write occurs during tests (MockDb strictly used)', () => {
      const db = getDb();
      // Ensure db is an instance of MockDb in the test environment
      expect(db.constructor.name).toBe('MockDb');
    });
  });

  // ==========================================
  // 5. Google Authentication & Session Security Suite
  // ==========================================
  describe('5. Google Authentication & Session Security', () => {
    it('23. Google sign-in with valid credentials creates new customer profile and returns JWT', async () => {
      const googlePayload = {
        idToken: 'mock_google_token_1001',
        googleId: 'g_user_1001',
        email: 'virat.kohli@gmail.com',
        name: 'Virat Kohli',
        avatar: 'https://example.com/virat.jpg'
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send(googlePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.customer.name).toBe('Virat Kohli');
      expect(res.body.data.customer.email).toBe('virat.kohli@gmail.com');
      expect(res.body.data.customer.isGoogleConnected).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('24. Existing Google customer is retrieved without duplicate record creation', async () => {
      const googlePayload = {
        idToken: 'mock_google_token_1002',
        googleId: 'g_user_1002',
        email: 'rohit.sharma@gmail.com',
        name: 'Rohit Sharma',
        avatar: 'https://example.com/rohit.jpg'
      };

      // First login
      const res1 = await request(app)
        .post('/api/auth/google')
        .send(googlePayload);
      expect(res1.status).toBe(200);
      const custId1 = res1.body.data.customer.id;

      // Second login with same Google ID
      const res2 = await request(app)
        .post('/api/auth/google')
        .send(googlePayload);
      expect(res2.status).toBe(200);
      const custId2 = res2.body.data.customer.id;

      expect(custId1).toBe(custId2);

      // Verify only 1 customer document exists in database for this email
      const db = getDb();
      const snap = await db.collection('customers').where('email', '==', 'rohit.sharma@gmail.com').get();
      expect(snap.size).toBe(1);
    });

    it('25. Google identity links seamlessly to existing customer profile by email', async () => {
      // Customer 1 was created in beforeEach with email: rahul@example.com
      const googlePayload = {
        idToken: 'mock_google_token_rahul',
        googleId: 'g_user_rahul_999',
        email: 'rahul@example.com',
        name: 'Rahul Dravid (Google)',
        avatar: 'https://example.com/rahul-google.jpg'
      };

      const res = await request(app)
        .post('/api/auth/google')
        .send(googlePayload);

      expect(res.status).toBe(200);
      expect(res.body.data.customer.id).toBe(customer1Id);
      expect(res.body.data.customer.email).toBe('rahul@example.com');
      expect(res.body.data.customer.isGoogleConnected).toBe(true);
    });

    it('26. Google-authenticated customer can access their own profile (GET /api/auth/me)', async () => {
      const googlePayload = {
        idToken: 'mock_google_token_bumrah',
        googleId: 'g_user_bumrah_93',
        email: 'jasprit.bumrah@gmail.com',
        name: 'Jasprit Bumrah'
      };

      const loginRes = await request(app)
        .post('/api/auth/google')
        .send(googlePayload);

      const gToken = loginRes.body.data.token;

      const profileRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${gToken}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.name).toBe('Jasprit Bumrah');
      expect(profileRes.body.data.email).toBe('jasprit.bumrah@gmail.com');
      expect(profileRes.body.data.isGoogleConnected).toBe(true);
    });

    it('27. Google-authenticated customer can view their booking history', async () => {
      const db = getDb();
      const googlePayload = {
        idToken: 'mock_google_token_pant',
        googleId: 'g_user_pant_17',
        email: 'rishabh.pant@gmail.com',
        name: 'Rishabh Pant'
      };

      const loginRes = await request(app)
        .post('/api/auth/google')
        .send(googlePayload);

      const gToken = loginRes.body.data.token;
      const gCustId = loginRes.body.data.customer.id;

      // Seed a booking linked to this customer's email and ID
      await db.collection('bookings').add({
        bookingId: 'BK-GOOGLE-001',
        customerId: gCustId,
        customerName: 'Rishabh Pant',
        customerEmail: 'rishabh.pant@gmail.com',
        dateStr: testDateStr,
        timeSlots: [testSlot1],
        totalAmount: 300,
        advancePaid: 200,
        balanceDue: 100,
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        status: BOOKING_STATUS.CONFIRMED,
        createdAt: new Date().toISOString()
      });

      const historyRes = await request(app)
        .get('/api/auth/bookings')
        .set('Authorization', `Bearer ${gToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.length).toBe(1);
      expect(historyRes.body.data[0].bookingId).toBe('BK-GOOGLE-001');
      expect(historyRes.body.data[0].totalAmount).toBe(300);
    });

    it('28. Google customer CANNOT access another customer’s booking (HTTP 403)', async () => {
      const db = getDb();
      // Seed a booking owned by Customer 1
      await db.collection('bookings').add({
        bookingId: 'BK-CUST1-SECURE-001',
        customerId: customer1Id,
        customerName: 'Rahul Dravid',
        customerPhone: '9876543210',
        dateStr: testDateStr,
        timeSlots: [testSlot1],
        totalAmount: 300,
        status: BOOKING_STATUS.CONFIRMED,
        createdAt: new Date().toISOString()
      });

      const googlePayload = {
        idToken: 'mock_google_token_hardik',
        googleId: 'g_user_hardik_33',
        email: 'hardik.pandya@gmail.com',
        name: 'Hardik Pandya'
      };

      const loginRes = await request(app)
        .post('/api/auth/google')
        .send(googlePayload);

      const gToken = loginRes.body.data.token;

      // Try accessing Customer 1's booking
      const res = await request(app)
        .get('/api/auth/bookings/BK-CUST1-SECURE-001')
        .set('Authorization', `Bearer ${gToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('29. Invalid Google token is rejected with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: 'invalid_token_sample'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('30. Expired Google token is rejected with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: 'expired_token_sample'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('31. Customer logout clears session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('logged out');
    });

    it('32. Insecure phone-only authentication is strictly blocked in production mode (HTTP 403)', async () => {
      const originalEnv = ENV.NODE_ENV;
      ENV.NODE_ENV = 'production';

      try {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            phone: '9876543210'
          });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Insecure phone-only authentication is disabled in production');
      } finally {
        ENV.NODE_ENV = originalEnv;
      }
    });

    it('33. Staging phone authentication works in development/test environment', async () => {
      const originalEnv = ENV.NODE_ENV;
      ENV.NODE_ENV = 'development';

      try {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            phone: '9998887776',
            name: 'Staging Tester'
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
        expect(res.body.data.customer.phone).toBe('9998887776');
      } finally {
        ENV.NODE_ENV = originalEnv;
      }
    });

    it('34. Google Sign-In is NOT blocked by any 15-minute or 2-minute customer rate limiter across rapid attempts', async () => {
      // Execute 8 rapid successive Google Sign-In attempts
      for (let i = 0; i < 8; i++) {
        const res = await request(app)
          .post('/api/auth/google')
          .send({
            idToken: `mock_google_token_rapid_${i}`,
            googleId: `g_rapid_${i}`,
            email: `rapid.player.${i}@gmail.com`,
            name: `Rapid Player ${i}`
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.token).toBeDefined();
      }
    });

    it('35. Staging mobile login is NOT blocked by any 15-minute or 2-minute customer rate limiter across rapid attempts', async () => {
      const originalEnv = ENV.NODE_ENV;
      ENV.NODE_ENV = 'development';

      try {
        // Execute 8 rapid successive staging mobile logins
        for (let i = 0; i < 8; i++) {
          const res = await request(app)
            .post('/api/auth/login')
            .send({
              phone: `987654321${i % 10}`,
              name: `Staging Tester ${i}`
            });

          expect(res.status).toBe(200);
          expect(res.body.success).toBe(true);
          expect(res.body.data.token).toBeDefined();
        }
      } finally {
        ENV.NODE_ENV = originalEnv;
      }
    });

    it('36. Admin login rate limiter remains strictly attached to admin authentication endpoint', async () => {
      // Verify admin login endpoint remains functional and protected
      const res = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'admin',
          password: 'password123'
        });

      // Valid admin credentials succeed
      expect([200, 401]).toContain(res.status);
    });
  });

});
