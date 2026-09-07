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
  NOTIFICATION_RECIPIENT_TYPE,
  ENQUIRY_STATUS
} from '../utils/constants.js';
import { setRazorpayInstance } from '../services/paymentService.js';
import {
  createNotificationDoc,
  getNotificationsForRecipientDoc,
  getUnreadNotificationCountDoc
} from '../repositories/notificationRepository.js';

describe('Phase 6: In-App Notifications & Event Enquiry Workflow Suite', () => {
  const testSecret = 'test_razorpay_secret_key_12345';
  const testKeyId = 'rzp_test_mockKeyId';
  const testDateStr = '2028-12-10';
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

  let adminToken;
  let customer1Token;
  let customer1Id;
  let customer2Token;
  let customer2Id;
  let testEventId;

  beforeAll(async () => {
    ENV.RAZORPAY_KEY_ID = testKeyId;
    ENV.RAZORPAY_KEY_SECRET = testSecret;
    setRazorpayInstance(mockRazorpay);
  });

  beforeEach(async () => {
    const db = getDb();

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

    // 2. Seed Base Rate Rule (₹1000/hr)
    await db.collection('rates').doc('football_base_rate').set({
      sportId: 'football-5v5',
      ratePerHour: 1000,
      peakRatePerHour: 1000,
      weekendRatePerHour: 1000,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 3. Seed Admin User
    const adminDocRef = await db.collection('admins').add({
      username: 'admin_phase6',
      email: 'admin6@eliteturf.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    adminToken = jwt.sign(
      { adminId: adminDocRef.id, username: 'admin_phase6', role: 'admin' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 4. Seed Customer 1
    const customer1Ref = await db.collection('customers').add({
      name: 'Player One',
      phone: '9876543210',
      email: 'player1@test.com',
      bookingHistory: [],
      createdAt: new Date().toISOString()
    });
    customer1Id = customer1Ref.id;
    customer1Token = jwt.sign(
      { customerId: customer1Id, phone: '9876543210', email: 'player1@test.com', name: 'Player One' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 5. Seed Customer 2 (for authorization isolation tests)
    const customer2Ref = await db.collection('customers').add({
      name: 'Player Two',
      phone: '9876543211',
      email: 'player2@test.com',
      bookingHistory: [],
      createdAt: new Date().toISOString()
    });
    customer2Id = customer2Ref.id;
    customer2Token = jwt.sign(
      { customerId: customer2Id, phone: '9876543211', email: 'player2@test.com', name: 'Player Two' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 6. Seed a Published Event
    const eventRef = await db.collection('events').add({
      title: 'Monsoon Champions League 2028',
      description: 'Annual corporate championship with 16 teams.',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
      date: '2028-12-15',
      category: 'Tournament',
      status: 'Completed',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    testEventId = eventRef.id;
  });

  /* ==========================================================================
     SECTION 1: IN-APP NOTIFICATION DATA MODEL & DEDUPLICATION
     ========================================================================== */

  describe('1. In-App Notification Data Model & Deduplication', () => {
    test('1.1 Should create customer notification with correct attributes', async () => {
      const notif = await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        recipientPhone: '9876543210',
        recipientEmail: 'player1@test.com',
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'Booking Confirmed',
        message: 'Your slot has been booked.',
        bookingId: 'BK-1001'
      });

      expect(notif.id).toBeDefined();
      expect(notif.recipientType).toBe('customer');
      expect(notif.recipientId).toBe(customer1Id);
      expect(notif.isRead).toBe(false);
      expect(notif.readAt).toBeNull();
      expect(notif.createdAt).toBeDefined();
    });

    test('1.2 Should create admin notification targeted to admin dashboard', async () => {
      const notif = await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'New Booking Alert',
        message: 'New reservation by Player One',
        bookingId: 'BK-1002'
      });

      expect(notif.recipientType).toBe('admin');
      expect(notif.recipientId).toBe('admin');
      expect(notif.isRead).toBe(false);
    });

    test('1.3 Should deduplicate idempotent notification creation on repeated key', async () => {
      const idempotencyKey = 'BOOKING_CREATED:BK-9999:customer';

      const firstCall = await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'Booking Confirmed',
        message: 'First attempt',
        idempotencyKey
      });

      const secondCall = await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'Booking Confirmed',
        message: 'Second duplicate attempt',
        idempotencyKey
      });

      expect(secondCall.id).toBe(firstCall.id);
      expect(secondCall.message).toBe('First attempt');

      const allCustomerNotifs = await getNotificationsForRecipientDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id
      });
      expect(allCustomerNotifs.length).toBe(1);
    });

    test('1.4 Should correctly compute unread count for customer vs admin', async () => {
      // Create 2 unread customer1 notifications
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'Notif 1',
        message: 'Msg 1'
      });
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        title: 'Notif 2',
        message: 'Msg 2'
      });

      // Create 1 admin notification
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN,
        type: NOTIFICATION_TYPES.ENQUIRY_RECEIVED,
        title: 'Admin Notif 1',
        message: 'Admin Msg 1'
      });

      const customerUnread = await getUnreadNotificationCountDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id
      });
      const adminUnread = await getUnreadNotificationCountDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN
      });

      expect(customerUnread).toBe(2);
      expect(adminUnread).toBe(1);
    });
  });

  /* ==========================================================================
     SECTION 2: NOTIFICATION API ENDPOINTS & AUTHORIZATION
     ========================================================================== */

  describe('2. Notification API Endpoints & Authorization', () => {
    test('2.1 GET /api/notifications should return customer notifications for authenticated customer', async () => {
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        recipientPhone: '9876543210',
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'Your Match Booking',
        message: 'Football 5v5 reserved.'
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Your Match Booking');
    });

    test('2.2 GET /api/notifications should return admin notifications for authenticated admin', async () => {
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'New Booking #BK-2001',
        message: 'Admin alert'
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].recipientType).toBe('admin');
    });

    test('2.3 GET /api/notifications/unread-count should return unread badge count', async () => {
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'Alert',
        message: 'Unread 1'
      });

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.unreadCount).toBe(1);
    });

    test('2.4 PATCH /api/notifications/:id/read should mark a single notification as read', async () => {
      const notif = await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'Alert To Read',
        message: 'Mark me read'
      });

      const res = await request(app)
        .patch(`/api/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();

      // Check unread count is now 0
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(countRes.body.data.unreadCount).toBe(0);
    });

    test('2.5 Should reject customer attempting to mark another customer notification with HTTP 403', async () => {
      // Create notification owned by Customer 1
      const notifCustomer1 = await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        recipientPhone: '9876543210',
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'Customer 1 Only',
        message: 'Private message'
      });

      // Customer 2 attempts to mark Customer 1's notification as read
      const res = await request(app)
        .patch(`/api/notifications/${notifCustomer1.id}/read`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
    });

    test('2.6 Should reject customer attempting to mark admin notification with HTTP 403', async () => {
      const adminNotif = await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN,
        type: NOTIFICATION_TYPES.ENQUIRY_RECEIVED,
        title: 'Admin Lead Alert',
        message: 'Admin only'
      });

      const res = await request(app)
        .patch(`/api/notifications/${adminNotif.id}/read`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
    });

    test('2.7 POST /api/notifications/read-all should mark all notifications as read for recipient', async () => {
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        type: NOTIFICATION_TYPES.BOOKING_CREATED,
        title: 'Notif 1',
        message: 'Msg 1'
      });
      await createNotificationDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        title: 'Notif 2',
        message: 'Msg 2'
      });

      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(2);

      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(countRes.body.data.unreadCount).toBe(0);
    });

    test('2.8 Unauthenticated access to /api/notifications should return HTTP 401', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  /* ==========================================================================
     SECTION 3: NOTIFICATION TRIGGERS ON BUSINESS EVENTS
     ========================================================================== */

  describe('3. Notification Triggers on Business Events', () => {
    test('3.1 Booking creation should trigger customer and admin notifications', async () => {
      const bookingPayload = {
        customerName: 'Player One',
        mobileNumber: '9876543210',
        customerEmail: 'player1@test.com',
        sportId: 'football-5v5',
        sportType: 'Football Turf (Main Arena)',
        date: testDateStr,
        slots: [testSlot1],
        paymentMethod: PAYMENT_METHODS.PAY_AT_SPOT,
        paymentOption: PAYMENT_OPTIONS.CASH
      };

      const res = await request(app)
        .post('/api/bookings')
        .send(bookingPayload);

      expect(res.status).toBe(201);
      const bookingId = res.body.data.bookingId;

      // Check customer notification
      const customerNotifs = await getNotificationsForRecipientDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        recipientPhone: '9876543210'
      });
      expect(customerNotifs.length).toBeGreaterThanOrEqual(1);
      expect(customerNotifs.some(n => n.type === NOTIFICATION_TYPES.BOOKING_CREATED)).toBe(true);

      // Check admin notification
      const adminNotifs = await getNotificationsForRecipientDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN
      });
      expect(adminNotifs.some(n => n.bookingId === bookingId)).toBe(true);
    });

    test('3.2 Admin cancellation should trigger customer notification with mandatory reason', async () => {
      // 1. Create a booking first
      const bookingRes = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Player One',
          mobileNumber: '9876543210',
          customerEmail: 'player1@test.com',
          sportId: 'football-5v5',
          date: testDateStr,
          slots: [testSlot2],
          paymentMethod: PAYMENT_METHODS.PAY_AT_SPOT,
          paymentOption: PAYMENT_OPTIONS.CASH
        });

      const bookingId = bookingRes.body.data.bookingId;

      // 2. Admin cancels booking with reason
      const cancelRes = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Maintenance work on lighting towers' });

      expect(cancelRes.status).toBe(200);

      // 3. Verify customer received cancellation notification with reason
      const customerNotifs = await getNotificationsForRecipientDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        recipientPhone: '9876543210'
      });

      const cancelNotif = customerNotifs.find(n => n.type === NOTIFICATION_TYPES.BOOKING_CANCELLED_BY_ADMIN);
      expect(cancelNotif).toBeDefined();
      expect(cancelNotif.message).toContain('Maintenance work on lighting towers');
      expect(cancelNotif.bookingId).toBe(bookingId);
    });

    test('3.3 Updating booking payment to paid should trigger payment verified notification', async () => {
      // 1. Create cash booking
      const bookingRes = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Player One',
          mobileNumber: '9876543210',
          customerEmail: 'player1@test.com',
          sportId: 'football-5v5',
          date: testDateStr,
          slots: ['09:00 AM - 10:00 AM'],
          paymentMethod: PAYMENT_METHODS.PAY_AT_SPOT,
          paymentOption: PAYMENT_OPTIONS.CASH
        });

      const bookingId = bookingRes.body.data.bookingId;

      // 2. Admin marks payment as paid
      const payRes = await request(app)
        .patch(`/api/bookings/${bookingId}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paymentStatus: PAYMENT_STATUS.FULLY_PAID });

      expect(payRes.status).toBe(200);

      // 3. Verify customer received payment notification
      const customerNotifs = await getNotificationsForRecipientDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
        recipientId: customer1Id,
        recipientPhone: '9876543210'
      });

      const payNotif = customerNotifs.find(n => n.type === NOTIFICATION_TYPES.FULL_PAYMENT_RECEIVED);
      expect(payNotif).toBeDefined();
    });
  });

  /* ==========================================================================
     SECTION 4: EVENT ENQUIRY SUBMISSION & LIFECYCLE WORKFLOW
     ========================================================================== */

  describe('4. Event Enquiry Submission & Lifecycle Workflow', () => {
    test('4.1 Should submit general contact enquiry with default status "New"', async () => {
      const payload = {
        name: 'Alex Ferguson',
        phone: '9876543210',
        email: 'alex@ferguson.com',
        subject: 'Coaching Camps',
        message: 'Do you offer weekend youth football coaching sessions?'
      };

      const res = await request(app)
        .post('/api/enquiries')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ENQUIRY_STATUS.NEW);
      expect(res.body.data.name).toBe('Alex Ferguson');

      // Verify admin notification was created
      const adminNotifs = await getNotificationsForRecipientDoc({
        recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN
      });
      const enquiryNotif = adminNotifs.find(n => n.type === NOTIFICATION_TYPES.ENQUIRY_RECEIVED);
      expect(enquiryNotif).toBeDefined();
      expect(enquiryNotif.message).toContain('Alex Ferguson');
    });

    test('4.2 Should submit event enquiry with valid eventId and canonical event title', async () => {
      const payload = {
        name: 'Corporate League Team',
        phone: '9876543210',
        email: 'events@corp.com',
        eventId: testEventId,
        eventTitle: 'Tampered Title That Should Be Overridden',
        preferredDate: '2028-12-20',
        participantCount: 32,
        contactPreference: 'phone',
        message: 'We want to book the turf for our annual 32-player cup tournament.'
      };

      const res = await request(app)
        .post('/api/enquiries')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.eventId).toBe(testEventId);
      // Title must match the authoritative event in database
      expect(res.body.data.eventTitle).toBe('Monsoon Champions League 2028');
      expect(res.body.data.participantCount).toBe(32);
      expect(res.body.data.contactPreference).toBe('phone');
    });

    test('4.3 Should reject event enquiry with invalid eventId with HTTP 404', async () => {
      const payload = {
        name: 'Invalid Event Request',
        phone: '9876543210',
        eventId: 'non_existent_event_id_9999',
        message: 'Interested in this event'
      };

      const res = await request(app)
        .post('/api/enquiries')
        .send(payload);

      expect(res.status).toBe(404);
    });

    test('4.4 Admin should list enquiries and filter by status', async () => {
      // Seed 2 enquiries
      await request(app).post('/api/enquiries').send({
        name: 'Lead One',
        phone: '9876543210',
        message: 'Message 1'
      });
      const lead2Res = await request(app).post('/api/enquiries').send({
        name: 'Lead Two',
        phone: '9876543211',
        message: 'Message 2'
      });

      // Update lead 2 to Contacted
      await request(app)
        .patch(`/api/enquiries/${lead2Res.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: ENQUIRY_STATUS.CONTACTED, notes: 'Called customer' });

      // Admin lists all
      const allRes = await request(app)
        .get('/api/enquiries')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allRes.status).toBe(200);
      expect(allRes.body.data.length).toBe(2);

      // Admin filters by status: Contacted
      const contactedRes = await request(app)
        .get('/api/enquiries?status=Contacted')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(contactedRes.status).toBe(200);
      expect(contactedRes.body.data.length).toBe(1);
      expect(contactedRes.body.data[0].name).toBe('Lead Two');
      expect(contactedRes.body.data[0].notes).toBe('Called customer');
    });

    test('4.5 Customer enquiry history GET /api/enquiries/my should return only customer enquiries', async () => {
      // Customer 1 enquiry
      await request(app)
        .post('/api/enquiries')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          name: 'Player One',
          phone: '9876543210',
          email: 'player1@test.com',
          message: 'Player One enquiry'
        });

      // Customer 2 enquiry
      await request(app)
        .post('/api/enquiries')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          name: 'Player Two',
          phone: '9876543211',
          email: 'player2@test.com',
          message: 'Player Two enquiry'
        });

      // Customer 1 fetches their enquiries
      const res = await request(app)
        .get('/api/enquiries/my')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Player One');
    });

    test('4.6 Enquiry validation should reject invalid phone or short messages', async () => {
      const invalidPhoneRes = await request(app)
        .post('/api/enquiries')
        .send({
          name: 'Bad Phone',
          phone: '12345',
          message: 'Valid enquiry message here'
        });

      expect(invalidPhoneRes.status).toBe(400);

      const shortMsgRes = await request(app)
        .post('/api/enquiries')
        .send({
          name: 'Short Message',
          phone: '9876543210',
          message: 'Hi'
        });

      expect(shortMsgRes.status).toBe(400);
    });
  });

  /* ==========================================================================
     SECTION 5: SYSTEM PRESERVATIONS & REGRESSION CHECKS
     ========================================================================== */

  describe('5. System Preservations & Regression Checks', () => {
    test('5.1 Fixed ₹200 advance rule remains functional and GST-free', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Player One',
          mobileNumber: '9876543210',
          sportId: 'football-5v5',
          date: testDateStr,
          slots: [testSlot1, testSlot2], // 2 hours = ₹2000
          paymentMethod: PAYMENT_METHODS.PAY_NOW,
          paymentOption: PAYMENT_OPTIONS.ADVANCE
        });

      expect(res.status).toBe(201);
      const booking = res.body.data;
      expect(booking.totalAmount).toBe(2000);
      expect(booking.advancePaid).toBe(200); // Authoritative fixed advance from settings
      expect(booking.balanceDue).toBe(1800);
      expect(booking.pricingSnapshot?.gstAmount).toBeUndefined(); // Zero GST
    });

    test('5.2 Google Sign-In authentication remains functional', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({
          idToken: 'mock_google_token_phase6',
          googleId: 'g_phase6_test',
          email: 'googleplayer@test.com',
          name: 'Google Player'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.customer.email).toBe('googleplayer@test.com');
    });
  });
});
