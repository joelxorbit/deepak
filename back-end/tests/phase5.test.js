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
  BOOKING_STATUS,
  AUDIT_ACTIONS
} from '../utils/constants.js';
import { setRazorpayInstance } from '../services/paymentService.js';

describe('Phase 5: Admin Booking Review Queue, Cancellation & Availability Console Suite', () => {
  const testSecret = 'test_razorpay_secret_key_12345';
  const testKeyId = 'rzp_test_mockKeyId';
  const testDateStr = '2028-12-05'; // Future date
  const testSlot1 = '06:00 AM - 07:00 AM';
  const testSlot2 = '07:00 AM - 08:00 AM';
  const testSlot3 = '08:00 AM - 09:00 AM';

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

  let adminToken;
  let customerToken;
  let customerId;

  beforeAll(async () => {
    ENV.RAZORPAY_KEY_ID = testKeyId;
    ENV.RAZORPAY_KEY_SECRET = testSecret;
    setRazorpayInstance(mockRazorpay);
  });

  beforeEach(async () => {
    const db = getDb();

    // Clean up test collections
    const collectionsToClean = ['customers', 'bookings', 'settings', 'rates', 'admin', 'blocked_slots', 'audit_logs', 'holds'];
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

    // Authenticate Admin
    const adminLoginRes = await request(app)
      .post('/api/admin/login')
      .send({
        username: 'admin',
        password: 'password123'
      });
    adminToken = adminLoginRes.body.data.token;

    // Authenticate Customer
    const custRes = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '9876543210',
        name: 'Phase5 Tester',
        email: 'phase5@example.com'
      });
    customerToken = custRes.body.data.token;
    customerId = custRes.body.data.customer.id;
  });

  // ==========================================
  // 1. Admin Booking Review Queue & Acknowledgment
  // ==========================================
  describe('1. Admin Booking Review Queue & Acknowledgment', () => {
    let unreviewedBookingId;

    beforeEach(async () => {
      const db = getDb();
      const bDoc = await db.collection('bookings').add({
        bookingId: 'BK-20281205-0001',
        customerId,
        customerName: 'Phase5 Tester',
        customerPhone: '9876543210',
        sportType: 'Football (5v5)',
        sportId: 'football-5v5',
        dateStr: testDateStr,
        date: `${testDateStr}T06:00:00.000Z`,
        timeSlots: [testSlot1],
        slotCount: 1,
        slotPrice: 300,
        subtotal: 300,
        totalAmount: 300,
        advancePaid: 200,
        balanceDue: 100,
        paymentMethod: PAYMENT_METHODS.PAY_NOW,
        paymentOption: PAYMENT_OPTIONS.ADVANCE,
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        status: BOOKING_STATUS.CONFIRMED,
        pricingSnapshot: {
          subtotal: 300,
          totalAmount: 300,
          fixedAdvanceAmount: 200,
          advanceRequired: 200,
          balanceDue: 100
        },
        isReviewed: false,
        createdAt: new Date().toISOString()
      });
      unreviewedBookingId = 'BK-20281205-0001';
    });

    it('1. Admin can mark a booking as reviewed (PATCH /api/bookings/:id/review)', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${unreviewedBookingId}/review`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingId).toBe(unreviewedBookingId);
      expect(res.body.data.isReviewed).toBe(true);
      expect(res.body.data.reviewedBy).toBe('admin');
      expect(res.body.data.reviewedAt).toBeDefined();
    });

    it('2. Reviewing a booking MUST NOT mutate booking status, payment status, totals, or pricing snapshot', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${unreviewedBookingId}/review`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const b = res.body.data;
      expect(b.status).toBe(BOOKING_STATUS.CONFIRMED);
      expect(b.paymentStatus).toBe(PAYMENT_STATUS.ADVANCE_PAID);
      expect(b.totalAmount).toBe(300);
      expect(b.advancePaid).toBe(200);
      expect(b.balanceDue).toBe(100);
      expect(b.pricingSnapshot).toEqual({
        subtotal: 300,
        totalAmount: 300,
        fixedAdvanceAmount: 200,
        advanceRequired: 200,
        balanceDue: 100
      });
    });

    it('3. Non-admin customer token cannot review bookings (HTTP 403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${unreviewedBookingId}/review`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4. Unauthenticated request cannot review bookings (HTTP 401 Unauthorized)', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${unreviewedBookingId}/review`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('5. Reviewing non-existent booking returns HTTP 404', async () => {
      const res = await request(app)
        .patch('/api/bookings/BK-NONEXISTENT-999/review')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 2. Admin Cancellation with Mandatory Reason
  // ==========================================
  describe('2. Admin Booking Cancellation & Reason Validation', () => {
    let activeBookingId;

    beforeEach(async () => {
      const db = getDb();
      await db.collection('bookings').add({
        bookingId: 'BK-20281205-0002',
        customerId,
        customerName: 'Phase5 Tester',
        customerPhone: '9876543210',
        sportType: 'Football (5v5)',
        sportId: 'football-5v5',
        dateStr: testDateStr,
        date: `${testDateStr}T07:00:00.000Z`,
        timeSlots: [testSlot2],
        slotCount: 1,
        slotPrice: 300,
        subtotal: 300,
        totalAmount: 300,
        advancePaid: 200,
        balanceDue: 100,
        paymentMethod: PAYMENT_METHODS.PAY_NOW,
        paymentOption: PAYMENT_OPTIONS.ADVANCE,
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        status: BOOKING_STATUS.CONFIRMED,
        pricingSnapshot: {
          subtotal: 300,
          totalAmount: 300,
          fixedAdvanceAmount: 200,
          advanceRequired: 200,
          balanceDue: 100
        },
        isReviewed: false,
        createdAt: new Date().toISOString()
      });
      activeBookingId = 'BK-20281205-0002';
    });

    it('6. Admin can cancel an active booking with mandatory reason (POST /api/bookings/:id/cancel)', async () => {
      const res = await request(app)
        .post(`/api/bookings/${activeBookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Customer called to cancel due to weather disruption'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(BOOKING_STATUS.CANCELLED);
      expect(res.body.data.cancellation).toBeDefined();
      expect(res.body.data.cancellation.isCancelled).toBe(true);
      expect(res.body.data.cancellation.cancelledBy).toBe('admin');
      expect(res.body.data.cancellation.reason).toBe('Customer called to cancel due to weather disruption');
      expect(res.body.data.cancellation.cancelledAt).toBeDefined();
    });

    it('7. Admin cancellation rejects missing reason with HTTP 400', async () => {
      const res = await request(app)
        .post(`/api/bookings/${activeBookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('8. Admin cancellation rejects reason shorter than 3 characters with HTTP 400', async () => {
      const res = await request(app)
        .post(`/api/bookings/${activeBookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'no' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('9. Admin cancellation preserves financial snapshot and records for audit trail', async () => {
      const res = await request(app)
        .post(`/api/bookings/${activeBookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Private event override' });

      expect(res.status).toBe(200);
      const b = res.body.data;
      expect(b.totalAmount).toBe(300);
      expect(b.advancePaid).toBe(200);
      expect(b.balanceDue).toBe(100);
      expect(b.paymentStatus).toBe(PAYMENT_STATUS.ADVANCE_PAID);
      expect(b.pricingSnapshot).toBeDefined();
    });

    it('10. Admin cancellation releases slot availability immediately', async () => {
      // 1. Verify slot is currently booked
      const availBefore = await request(app)
        .get(`/api/availability/slots?date=${testDateStr}`);
      expect(availBefore.body.data.bookedSlots).toContain(testSlot2);
      expect(availBefore.body.data.availableSlots).not.toContain(testSlot2);

      // 2. Admin cancels booking
      await request(app)
        .post(`/api/bookings/${activeBookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Customer requested cancellation' });

      // 3. Verify slot is now immediately available
      const availAfter = await request(app)
        .get(`/api/availability/slots?date=${testDateStr}`);
      expect(availAfter.body.data.bookedSlots).not.toContain(testSlot2);
      expect(availAfter.body.data.availableSlots).toContain(testSlot2);
    });

    it('11. Cancelling an already cancelled booking returns HTTP 409 Conflict', async () => {
      // First cancellation
      await request(app)
        .post(`/api/bookings/${activeBookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'First cancellation reason' });

      // Second cancellation
      const res = await request(app)
        .post(`/api/bookings/${activeBookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Duplicate cancellation attempt' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already cancelled');
    });

    it('12. Non-admin customer token cannot call admin cancellation route (HTTP 403)', async () => {
      const res = await request(app)
        .post(`/api/bookings/${activeBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Unauthorized cancel attempt' });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 3. Slot & Full-Day Availability Blocking & Conflict Detection
  // ==========================================
  describe('3. Slot Availability Blocking & Conflict Detection', () => {
    it('13. Admin can block a single time slot (POST /api/availability/block)', async () => {
      const res = await request(app)
        .post('/api/availability/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateStr: testDateStr,
          slot: testSlot3,
          reason: 'Floodlight repair scheduled'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dateStr).toBe(testDateStr);
      expect(res.body.data.slots).toContain(testSlot3);
      expect(res.body.data.reason).toBe('Floodlight repair scheduled');
      expect(res.body.data.blockedBy).toBe('admin');

      // Verify availability reflects blocked slot
      const availRes = await request(app)
        .get(`/api/availability/slots?date=${testDateStr}`);
      expect(availRes.body.data.blockedSlots).toContain(testSlot3);
      expect(availRes.body.data.availableSlots).not.toContain(testSlot3);
    });

    it('14. Admin can block full-day closure (POST /api/availability/block with isFullDay: true)', async () => {
      const closureDate = '2028-12-10';
      const res = await request(app)
        .post('/api/availability/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateStr: closureDate,
          isFullDay: true,
          reason: 'Annual Turf Maintenance & Reseeding'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isFullDay).toBe(true);

      // Verify availability reflects full-day closure
      const availRes = await request(app)
        .get(`/api/availability/slots?date=${closureDate}`);
      expect(availRes.body.data.isFullDayBlocked).toBe(true);
      expect(availRes.body.data.closureReason).toBe('Annual Turf Maintenance & Reseeding');
      expect(availRes.body.data.availableSlots.length).toBe(0);
    });

    it('15. Blocking slot rejects missing or short reason with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/availability/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateStr: testDateStr,
          slot: testSlot1,
          reason: 'ab' // < 3 chars
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('16. Conflict Detection: Blocking a slot with active booking returns HTTP 409 Conflict', async () => {
      const db = getDb();
      // Seed active booking on testSlot1
      await db.collection('bookings').add({
        bookingId: 'BK-CONFLICT-001',
        dateStr: testDateStr,
        timeSlots: [testSlot1],
        status: BOOKING_STATUS.CONFIRMED,
        totalAmount: 300,
        advancePaid: 200,
        createdAt: new Date().toISOString()
      });

      // Admin attempts to block testSlot1
      const res = await request(app)
        .post('/api/availability/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateStr: testDateStr,
          slot: testSlot1,
          reason: 'Try to block active booked slot'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('active booking');

      // Verify ZERO block documents created
      const blocksSnap = await db.collection('blocked_slots').where('dateStr', '==', testDateStr).get();
      expect(blocksSnap.size).toBe(0);

      // Verify active booking is completely unmodified
      const bookingSnap = await db.collection('bookings').where('bookingId', '==', 'BK-CONFLICT-001').get();
      expect(bookingSnap.docs[0].data().status).toBe(BOOKING_STATUS.CONFIRMED);
    });

    it('17. Conflict Detection: Full-day closure on date with active bookings returns HTTP 409 Conflict', async () => {
      const db = getDb();
      await db.collection('bookings').add({
        bookingId: 'BK-CONFLICT-002',
        dateStr: testDateStr,
        timeSlots: [testSlot2],
        status: BOOKING_STATUS.CONFIRMED,
        totalAmount: 300,
        createdAt: new Date().toISOString()
      });

      const res = await request(app)
        .post('/api/availability/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateStr: testDateStr,
          isFullDay: true,
          reason: 'Emergency Maintenance Closure'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('active booking');
    });

    it('18. Non-admin customer token cannot block slots (HTTP 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/availability/block')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          dateStr: testDateStr,
          slot: testSlot3,
          reason: 'Customer block attempt'
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 4. Slot & Closure Unblocking
  // ==========================================
  describe('4. Slot Unblocking', () => {
    let blockId;

    beforeEach(async () => {
      const db = getDb();
      const bDoc = await db.collection('blocked_slots').add({
        dateStr: testDateStr,
        slot: testSlot3,
        slots: [testSlot3],
        isFullDay: false,
        reason: 'Temporary maintenance',
        blockedBy: 'admin',
        createdAt: new Date().toISOString()
      });
      blockId = bDoc.id;
    });

    it('19. Admin can unblock slot (DELETE /api/availability/unblock/:id)', async () => {
      const res = await request(app)
        .delete(`/api/availability/unblock/${blockId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify availability reflects unblocked slot
      const availRes = await request(app)
        .get(`/api/availability/slots?date=${testDateStr}`);
      expect(availRes.body.data.blockedSlots).not.toContain(testSlot3);
      expect(availRes.body.data.availableSlots).toContain(testSlot3);
    });

    it('20. Unblocking non-existent block ID returns HTTP 404', async () => {
      const res = await request(app)
        .delete('/api/availability/unblock/non_existent_block_id_999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('21. Non-admin customer token cannot unblock slots (HTTP 403)', async () => {
      const res = await request(app)
        .delete(`/api/availability/unblock/${blockId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // 5. Admin Query Filtering Tests
  // ==========================================
  describe('5. Admin Booking Query Filters', () => {
    beforeEach(async () => {
      const db = getDb();
      // 1. Unreviewed & Advance Paid
      await db.collection('bookings').add({
        bookingId: 'BK-TEST-FILTER-1',
        customerName: 'Filter Alpha',
        customerPhone: '9876543201',
        dateStr: testDateStr,
        timeSlots: [testSlot1],
        totalAmount: 300,
        advancePaid: 200,
        balanceDue: 100,
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        paymentMethod: PAYMENT_METHODS.PAY_NOW,
        status: BOOKING_STATUS.CONFIRMED,
        isReviewed: false,
        createdAt: new Date().toISOString()
      });

      // 2. Reviewed & Fully Paid
      await db.collection('bookings').add({
        bookingId: 'BK-TEST-FILTER-2',
        customerName: 'Filter Beta',
        customerPhone: '9876543202',
        dateStr: testDateStr,
        timeSlots: [testSlot2],
        totalAmount: 300,
        advancePaid: 300,
        balanceDue: 0,
        paymentStatus: PAYMENT_STATUS.FULLY_PAID,
        paymentMethod: PAYMENT_METHODS.PAY_NOW,
        status: BOOKING_STATUS.CONFIRMED,
        isReviewed: true,
        reviewedBy: 'admin',
        reviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // 3. Cancelled & Cash Pending
      await db.collection('bookings').add({
        bookingId: 'BK-TEST-FILTER-3',
        customerName: 'Filter Gamma',
        customerPhone: '9876543203',
        dateStr: testDateStr,
        timeSlots: [testSlot3],
        totalAmount: 300,
        advancePaid: 0,
        balanceDue: 300,
        paymentStatus: PAYMENT_STATUS.CASH_PENDING,
        paymentMethod: PAYMENT_METHODS.PAY_AT_SPOT,
        status: BOOKING_STATUS.CANCELLED,
        cancellation: { isCancelled: true, reason: 'Test cancel', cancelledAt: new Date().toISOString() },
        isReviewed: false,
        createdAt: new Date().toISOString()
      });
    });

    it('22. Admin can filter unreviewed bookings (?filter=unreviewed)', async () => {
      const res = await request(app)
        .get('/api/bookings?filter=unreviewed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map(b => b.bookingId);
      expect(ids).toContain('BK-TEST-FILTER-1');
      expect(ids).not.toContain('BK-TEST-FILTER-2');
    });

    it('23. Admin can filter reviewed bookings (?filter=reviewed)', async () => {
      const res = await request(app)
        .get('/api/bookings?filter=reviewed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map(b => b.bookingId);
      expect(ids).toContain('BK-TEST-FILTER-2');
      expect(ids).not.toContain('BK-TEST-FILTER-1');
    });

    it('24. Admin can filter cancelled bookings (?filter=cancelled)', async () => {
      const res = await request(app)
        .get('/api/bookings?filter=cancelled')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map(b => b.bookingId);
      expect(ids).toContain('BK-TEST-FILTER-3');
      expect(ids).not.toContain('BK-TEST-FILTER-1');
    });

    it('25. Admin can filter advancePaid and balancePending bookings', async () => {
      const advRes = await request(app)
        .get('/api/bookings?filter=advancePaid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(advRes.status).toBe(200);
      const advIds = advRes.body.data.map(b => b.bookingId);
      expect(advIds).toContain('BK-TEST-FILTER-1');
      expect(advIds).not.toContain('BK-TEST-FILTER-2');

      const balRes = await request(app)
        .get('/api/bookings?filter=balancePending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(balRes.status).toBe(200);
      const balIds = balRes.body.data.map(b => b.bookingId);
      expect(balIds).toContain('BK-TEST-FILTER-1');
    });

    it('26. Admin can filter fullyPaid and cashPending bookings', async () => {
      const fullRes = await request(app)
        .get('/api/bookings?filter=fullyPaid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(fullRes.status).toBe(200);
      const fullIds = fullRes.body.data.map(b => b.bookingId);
      expect(fullIds).toContain('BK-TEST-FILTER-2');
      expect(fullIds).not.toContain('BK-TEST-FILTER-1');

      const cashRes = await request(app)
        .get('/api/bookings?filter=cashPending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(cashRes.status).toBe(200);
      const cashIds = cashRes.body.data.map(b => b.bookingId);
      expect(cashIds).toContain('BK-TEST-FILTER-3');
    });
  });

  // ==========================================
  // 6. Audit Trail Logging Verification
  // ==========================================
  describe('6. Admin Audit Logs Verification', () => {
    it('27. Booking review writes BOOKING_REVIEW audit log', async () => {
      const db = getDb();
      const bDoc = await db.collection('bookings').add({
        bookingId: 'BK-AUDIT-001',
        customerName: 'Audit Customer',
        dateStr: testDateStr,
        timeSlots: [testSlot1],
        totalAmount: 300,
        status: BOOKING_STATUS.CONFIRMED,
        isReviewed: false,
        createdAt: new Date().toISOString()
      });

      await request(app)
        .patch('/api/bookings/BK-AUDIT-001/review')
        .set('Authorization', `Bearer ${adminToken}`);

      const auditSnap = await db.collection('audit_logs').where('action', '==', AUDIT_ACTIONS.BOOKING_REVIEW).get();
      expect(auditSnap.size).toBeGreaterThanOrEqual(1);
      const log = auditSnap.docs[0].data();
      expect(log.action).toBe(AUDIT_ACTIONS.BOOKING_REVIEW);
      expect(log.details.bookingId).toBe('BK-AUDIT-001');
    });

    it('28. Admin cancellation writes BOOKING_CANCEL_ADMIN audit log', async () => {
      const db = getDb();
      await db.collection('bookings').add({
        bookingId: 'BK-AUDIT-002',
        customerName: 'Audit Cancel Customer',
        dateStr: testDateStr,
        timeSlots: [testSlot2],
        totalAmount: 300,
        advancePaid: 200,
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        status: BOOKING_STATUS.CONFIRMED,
        createdAt: new Date().toISOString()
      });

      await request(app)
        .post('/api/bookings/BK-AUDIT-002/cancel')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Audit cancellation test reason' });

      const auditSnap = await db.collection('audit_logs').where('action', '==', AUDIT_ACTIONS.BOOKING_CANCEL_ADMIN).get();
      expect(auditSnap.size).toBeGreaterThanOrEqual(1);
      const log = auditSnap.docs[0].data();
      expect(log.action).toBe(AUDIT_ACTIONS.BOOKING_CANCEL_ADMIN);
      expect(log.details.bookingId).toBe('BK-AUDIT-002');
      expect(log.details.reason).toBe('Audit cancellation test reason');
    });

    it('29. Slot blocking and unblocking write SLOT_BLOCK and SLOT_UNBLOCK audit logs', async () => {
      const db = getDb();
      // Block
      const blockRes = await request(app)
        .post('/api/availability/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateStr: testDateStr,
          slot: testSlot1,
          reason: 'Audit maintenance block'
        });

      const blockId = blockRes.body.data.id;

      const blockLogs = await db.collection('audit_logs').where('action', '==', AUDIT_ACTIONS.SLOT_BLOCK).get();
      expect(blockLogs.size).toBeGreaterThanOrEqual(1);

      // Unblock
      await request(app)
        .delete(`/api/availability/unblock/${blockId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const unblockLogs = await db.collection('audit_logs').where('action', '==', AUDIT_ACTIONS.SLOT_UNBLOCK).get();
      expect(unblockLogs.size).toBeGreaterThanOrEqual(1);
    });

    it('30. Production Firestore remains untouched during all Phase 5 operations', () => {
      const db = getDb();
      expect(db.constructor.name).toBe('MockDb');
    });
  });
});
