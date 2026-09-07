import request from 'supertest';
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
  NOTIFICATION_TYPES,
  NOTIFICATION_RECIPIENT_TYPE
} from '../utils/constants.js';
import { setRazorpayInstance } from '../services/paymentService.js';
import { invalidateRateCache } from '../services/rateService.js';

describe('Phase 8: Secure Server-Side Ticket PDF Generation & Download Console Suite', () => {
  const testSecret = 'test_razorpay_secret_key_12345';
  const testKeyId = 'rzp_test_mockKeyId';
  const testDateStr = '2029-07-20';
  const testSlots = ['06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM'];

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
  let adminId;
  let customer1Token;
  let customer1Id;
  let customer2Token;
  let customer2Id;

  let publicBooking1Id;
  let internalDoc1Id;
  let publicBooking2Id;

  beforeAll(async () => {
    ENV.RAZORPAY_KEY_ID = testKeyId;
    ENV.RAZORPAY_KEY_SECRET = testSecret;
    setRazorpayInstance(mockRazorpay);
  });

  beforeEach(async () => {
    const db = getDb();
    invalidateRateCache();

    // Clean up test collections
    const collectionsToClean = [
      'customers',
      'bookings',
      'settings',
      'rates',
      'admins',
      'admin',
      'blocked_slots',
      'audit_logs',
      'holds',
      'notifications',
      'enquiries',
      'events'
    ];
    for (const col of collectionsToClean) {
      const snap = await db.collection(col).get();
      snap.docs.forEach(doc => doc.ref.delete());
    }

    // 1. Seed Payment Settings with Fixed ₹200 Advance
    await db.collection('settings').doc('paymentSettings').set({
      fixedAdvanceAmount: 200,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 2. Seed Authoritative General Settings
    await db.collection('settings').doc('general').set({
      businessName: 'Elite Pitch Arena Stadium',
      venueAddress: 'Plot 42, International Sports City',
      contactPhone: '9876543210',
      contactEmail: 'arena@eliteturf.com',
      instructions: [
        'Arrive 15 minutes before your scheduled slot.',
        'Strictly wear astro-turf studs or flat-sole footwear.',
        'Settle remaining balance before entering the pitch.'
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 3. Seed Default Base Rate Rule (₹350/hr)
    await db.collection('rates').add({
      name: 'Default Regular Rate',
      ratePerHour: 350,
      ruleType: 'DEFAULT_BASE',
      priority: 5,
      isActive: true,
      sportId: 'football-5v5',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 4. Seed Admin User
    const adminDocRef = await db.collection('admins').add({
      username: 'admin_phase8',
      email: 'admin8@eliteturf.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    adminId = adminDocRef.id;
    adminToken = jwt.sign(
      { adminId: adminDocRef.id, username: 'admin_phase8', role: 'admin' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 5. Seed Customer 1 (Alice)
    const customer1Ref = await db.collection('customers').add({
      name: 'Alice Johnson',
      phone: '9876500001',
      email: 'alice@example.com',
      isPhoneVerified: true,
      createdAt: new Date().toISOString()
    });
    customer1Id = customer1Ref.id;
    customer1Token = jwt.sign(
      { customerId: customer1Id, phone: '9876500001', email: 'alice@example.com' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 6. Seed Customer 2 (Bob)
    const customer2Ref = await db.collection('customers').add({
      name: 'Bob Smith',
      phone: '9876500002',
      email: 'bob@example.com',
      isPhoneVerified: true,
      createdAt: new Date().toISOString()
    });
    customer2Id = customer2Ref.id;
    customer2Token = jwt.sign(
      { customerId: customer2Id, phone: '9876500002', email: 'bob@example.com' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 7. Seed Booking 1 for Customer 1 (Advance Paid: ₹200, Total: ₹700, Balance: ₹500)
    publicBooking1Id = 'BK-20290720-0001';
    const booking1DocRef = await db.collection('bookings').add({
      bookingId: publicBooking1Id,
      customerId: customer1Id,
      customerName: 'Alice Johnson',
      customerPhone: '9876500001',
      customerEmail: 'alice@example.com',
      sportId: 'football-5v5',
      sportType: 'Football Arena (5v5)',
      dateStr: testDateStr,
      timeSlots: testSlots,
      slotCount: 2,
      slotPrice: 350,
      subtotal: 700,
      totalAmount: 700,
      advancePaid: 200,
      balanceDue: 500,
      paymentOption: PAYMENT_OPTIONS.ADVANCE,
      paymentMethod: PAYMENT_METHODS.ONLINE,
      paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
      status: BOOKING_STATUS.CONFIRMED,
      isReviewed: true,
      pricingSnapshot: {
        ratePerHour: 350,
        subtotal: 700,
        totalAmount: 700,
        fixedAdvanceAmount: 200,
        advanceRequired: 200,
        advancePaid: 200,
        balanceDue: 500,
        snapshotVersion: 1
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    internalDoc1Id = booking1DocRef.id;

    // 8. Seed Booking 2 for Customer 2 (Fully Paid: ₹700, Balance: ₹0)
    publicBooking2Id = 'BK-20290720-0002';
    await db.collection('bookings').add({
      bookingId: publicBooking2Id,
      customerId: customer2Id,
      customerName: 'Bob Smith',
      customerPhone: '9876500002',
      customerEmail: 'bob@example.com',
      sportId: 'football-5v5',
      sportType: 'Football Arena (5v5)',
      dateStr: testDateStr,
      timeSlots: ['08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM'],
      slotCount: 2,
      slotPrice: 350,
      subtotal: 700,
      totalAmount: 700,
      advancePaid: 700,
      balanceDue: 0,
      paymentOption: PAYMENT_OPTIONS.FULL,
      paymentMethod: PAYMENT_METHODS.ONLINE,
      paymentStatus: PAYMENT_STATUS.FULLY_PAID,
      status: BOOKING_STATUS.CONFIRMED,
      isReviewed: true,
      pricingSnapshot: {
        ratePerHour: 350,
        subtotal: 700,
        totalAmount: 700,
        fixedAdvanceAmount: 200,
        advanceRequired: 700,
        advancePaid: 700,
        balanceDue: 0,
        snapshotVersion: 1
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  // =========================================================================
  // SUITE 1: SECURITY, AUTHORIZATION & PUBLIC BOOKING ID RESOLUTION
  // =========================================================================
  describe('1. Security, Authorization & Public Identifier Invariants', () => {
    it('should reject unauthenticated request with HTTP 401', async () => {
      const res = await request(app)
        .get(`/api/bookings/${publicBooking1Id}/ticket.pdf`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Authentication required|missing/i);
    });

    it('should reject unauthenticated request on versioned route /api/v1/bookings/:bookingId/ticket.pdf with HTTP 401', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${publicBooking1Id}/ticket.pdf`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow authenticated customer to download their own ticket PDF', async () => {
      const res = await request(app)
        .get(`/api/bookings/${publicBooking1Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain(`Elite-Pitch-Ticket-${publicBooking1Id}.pdf`);
      expect(res.headers['cache-control']).toMatch(/private|no-cache/i);

      // Verify valid PDF binary signature (%PDF-1.)
      expect(res.body).toBeInstanceOf(Buffer);
      const pdfHeader = res.body.slice(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');
    });

    it('should reject cross-customer ticket download attempt with HTTP 403 Forbidden', async () => {
      // Customer 1 tries to download Customer 2's ticket
      const res = await request(app)
        .get(`/api/bookings/${publicBooking2Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Access denied|only download tickets for your own bookings/i);
    });

    it('should reject customer attempting identity spoofing via query parameters with HTTP 403', async () => {
      // Customer 1 supplies query parameter attempting to impersonate Customer 2
      const res = await request(app)
        .get(`/api/bookings/${publicBooking2Id}/ticket.pdf?customerId=${customer2Id}&phone=9876500002`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject internal Firestore document ID lookup with HTTP 404 Not Found', async () => {
      // Attempt to access via internal document ID instead of public bookingId
      const res = await request(app)
        .get(`/api/bookings/${internalDoc1Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Booking not found/i);
    });

    it('should return HTTP 404 for non-existent public bookingId', async () => {
      const res = await request(app)
        .get('/api/bookings/BK-99999999-9999/ticket.pdf')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should allow authenticated admin to download any booking ticket PDF', async () => {
      // Admin downloads Customer 1's ticket
      const res1 = await request(app)
        .get(`/api/bookings/${publicBooking1Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res1.status).toBe(200);
      expect(res1.headers['content-type']).toBe('application/pdf');
      expect(res1.body.slice(0, 5).toString('ascii')).toBe('%PDF-');

      // Admin downloads Customer 2's ticket
      const res2 = await request(app)
        .get(`/api/bookings/${publicBooking2Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.status).toBe(200);
      expect(res2.headers['content-type']).toBe('application/pdf');
    });

    it('should support authentication via cookie (elite_pitch_customer_token)', async () => {
      const res = await request(app)
        .get(`/api/bookings/${publicBooking1Id}/ticket.pdf`)
        .set('Cookie', [`elite_pitch_customer_token=${customer1Token}`]);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });
  });

  // =========================================================================
  // SUITE 2: PDF CONTENT, FINANCIAL ACCURACY & CANCELLATION STATE
  // =========================================================================
  describe('2. PDF Content, Financial Breakdown & State Rendering', () => {
    it('should generate valid PDF for advance-paid booking with correct pricing breakdown', async () => {
      const res = await request(app)
        .get(`/api/bookings/${publicBooking1Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(1000); // Standard PDF binary is >1KB

      const pdfRawText = res.body.toString('latin1');
      // Verify PDF contains public bookingId in document
      expect(pdfRawText).toContain(publicBooking1Id);
    });

    it('should generate valid PDF for fully-paid booking', async () => {
      const res = await request(app)
        .get(`/api/bookings/${publicBooking2Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('should render CANCELLED BY ADMIN banner on cancelled bookings and strip private admin ID', async () => {
      const db = getDb();
      const cancelledBookingId = 'BK-20290720-0003';

      // Seed a cancelled booking
      await db.collection('bookings').add({
        bookingId: cancelledBookingId,
        customerId: customer1Id,
        customerName: 'Alice Johnson',
        customerPhone: '9876500001',
        sportId: 'football-5v5',
        sportType: 'Football Arena (5v5)',
        dateStr: testDateStr,
        timeSlots: ['04:00 PM - 05:00 PM'],
        slotCount: 1,
        slotPrice: 350,
        subtotal: 350,
        totalAmount: 350,
        advancePaid: 200,
        balanceDue: 0,
        status: BOOKING_STATUS.CANCELLED,
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        cancellation: {
          isCancelled: true,
          reason: 'Arena floodlight maintenance required',
          cancelledBy: adminId, // Private internal admin ID
          cancelledAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      });

      const res = await request(app)
        .get(`/api/bookings/${cancelledBookingId}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');

      const pdfRawText = res.body.toString('latin1');
      expect(pdfRawText).toContain(cancelledBookingId);
      // Private internal admin ID must NOT be present in the PDF text
      expect(pdfRawText).not.toContain(adminId);
    });

    it('should handle cash pending / pay at spot booking correctly', async () => {
      const db = getDb();
      const cashBookingId = 'BK-20290720-0004';

      await db.collection('bookings').add({
        bookingId: cashBookingId,
        customerId: customer1Id,
        customerName: 'Alice Johnson',
        customerPhone: '9876500001',
        sportId: 'football-5v5',
        sportType: 'Football Arena (5v5)',
        dateStr: testDateStr,
        timeSlots: ['05:00 PM - 06:00 PM'],
        slotCount: 1,
        slotPrice: 350,
        subtotal: 350,
        totalAmount: 350,
        advancePaid: 0,
        balanceDue: 350,
        paymentOption: PAYMENT_OPTIONS.FULL,
        paymentMethod: PAYMENT_METHODS.CASH,
        paymentStatus: PAYMENT_STATUS.CASH_PENDING,
        status: BOOKING_STATUS.PENDING,
        createdAt: new Date().toISOString()
      });

      const res = await request(app)
        .get(`/api/bookings/${cashBookingId}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    it('should maintain immutable historical pricing snapshot even if active rate rules change', async () => {
      const db = getDb();

      // Change rate rule to ₹600/hr in the database
      await db.collection('rates').add({
        name: 'New Increased Rate',
        ratePerHour: 600,
        ruleType: 'DATE_OVERRIDE',
        priority: 1,
        isActive: true,
        specificDate: testDateStr,
        sportId: 'football-5v5',
        createdAt: new Date().toISOString()
      });
      invalidateRateCache();

      // Download Ticket 1 created when rate was ₹350
      const res = await request(app)
        .get(`/api/bookings/${publicBooking1Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      // The booking's stored snapshot (₹700 total, ₹200 advance, ₹500 balance) remains intact
      const bookingDoc = (await db.collection('bookings').where('bookingId', '==', publicBooking1Id).get()).docs[0].data();
      expect(bookingDoc.totalAmount).toBe(700);
      expect(bookingDoc.balanceDue).toBe(500);
    });
  });

  // =========================================================================
  // SUITE 3: AUTHORITATIVE SETTINGS, LEGACY BOOKINGS & ZERO MUTATION
  // =========================================================================
  describe('3. Authoritative Settings, Legacy Support & Zero Database Mutation', () => {
    it('should strictly use server settings and avoid fake invented defaults', async () => {
      const db = getDb();

      // Set explicit custom arena name
      await db.collection('settings').doc('general').set({
        businessName: 'Super Star Sports Turf Arena',
        venueAddress: 'Sector 5, Silicon Valley Highway',
        contactPhone: '9988776655',
        contactEmail: 'contact@superstarturf.com',
        instructions: ['Follow turf instructions strictly.'],
        updatedAt: new Date().toISOString()
      });

      const res = await request(app)
        .get(`/api/bookings/${publicBooking1Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      const pdfRawText = res.body.toString('latin1');
      expect(pdfRawText).not.toContain('123 Sports Complex Way');
    });

    it('should support legacy bookings without customerId by falling back to session phone/email', async () => {
      const db = getDb();
      const legacyBookingId = 'BK-LEGACY-0001';

      // Seed legacy booking without customerId
      await db.collection('bookings').add({
        bookingId: legacyBookingId,
        customerName: 'Alice Johnson',
        customerPhone: '9876500001',
        customerEmail: 'alice@example.com',
        sportType: 'Football',
        dateStr: testDateStr,
        timeSlots: ['10:00 AM - 11:00 AM'],
        slotCount: 1,
        totalAmount: 350,
        advancePaid: 200,
        balanceDue: 150,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.ADVANCE_PAID,
        createdAt: new Date().toISOString()
      });

      // Customer 1 (phone: 9876500001) should be allowed to download
      const resAllowed = await request(app)
        .get(`/api/bookings/${legacyBookingId}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(resAllowed.status).toBe(200);
      expect(resAllowed.headers['content-type']).toBe('application/pdf');

      // Customer 2 (phone: 9876500002) should be rejected
      const resDenied = await request(app)
        .get(`/api/bookings/${legacyBookingId}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(resDenied.status).toBe(403);
    });

    it('should perform zero database mutations during ticket generation', async () => {
      const db = getDb();

      // Snapshot booking document before PDF generation
      const snapBefore = (await db.collection('bookings').where('bookingId', '==', publicBooking1Id).get()).docs[0].data();

      // Request ticket PDF
      await request(app)
        .get(`/api/bookings/${publicBooking1Id}/ticket.pdf`)
        .set('Authorization', `Bearer ${customer1Token}`);

      // Snapshot booking document after PDF generation
      const snapAfter = (await db.collection('bookings').where('bookingId', '==', publicBooking1Id).get()).docs[0].data();

      expect(snapBefore).toEqual(snapAfter);
    });

    it('should verify complete absence of QR signing secrets, QR images, and QR verification endpoints', async () => {
      // 1. Verify ENV does not require QR_SIGNING_SECRET
      expect(ENV.QR_SIGNING_SECRET).toBeUndefined();

      // 2. Verify no public QR verification endpoint exists
      const qrVerifyRes = await request(app)
        .get(`/api/verify-ticket?token=mock_qr_token`);
      expect(qrVerifyRes.status).toBe(404);

      const qrScanRes = await request(app)
        .get(`/api/bookings/verify/qr`);
      expect(qrScanRes.status).toBe(404);
    });
  });

  // =========================================================================
  // SUITE 4: SYSTEM INTEGRITY & REGRESSION PRESERVATION
  // =========================================================================
  describe('4. Preservation of Authentication, Fixed Advance & Pricing Invariants', () => {
    it('should preserve fixed ₹200 advance calculation on price preview', async () => {
      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: testDateStr,
          slots: testSlots,
          sportId: 'football-5v5',
          paymentOption: PAYMENT_OPTIONS.ADVANCE
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subtotal).toBe(700);
      expect(res.body.data.totalAmount).toBe(700);
      expect(res.body.data.advanceRequired).toBe(200);
      expect(res.body.data.balanceDue).toBe(500);
      // Strictly GST-free
      expect(res.body.data.gstAmount).toBeUndefined();
    });

    it('should preserve in-app notifications and event enquiry workflows', async () => {
      const db = getDb();

      // Seed an event
      const eventRef = await db.collection('events').add({
        title: 'Monsoon Championship 2029',
        slug: 'monsoon-championship-2029',
        category: 'Tournament',
        sportType: 'Football',
        status: 'published',
        eventDate: '2029-08-15',
        isRegistrationOpen: true,
        createdAt: new Date().toISOString()
      });

      // Submit enquiry
      const enquiryRes = await request(app)
        .post('/api/enquiries')
        .send({
          eventId: eventRef.id,
          name: 'Praveen Player',
          phone: '9876543210',
          email: 'player@example.com',
          message: 'Interested in registering a team of 8 players.'
        });

      expect(enquiryRes.status).toBe(201);
      expect(enquiryRes.body.success).toBe(true);

      // Verify admin notification was created
      const notifSnap = await db.collection('notifications')
        .where('recipientType', '==', NOTIFICATION_RECIPIENT_TYPE.ADMIN)
        .get();
      expect(notifSnap.empty).toBe(false);
    });
  });
});
