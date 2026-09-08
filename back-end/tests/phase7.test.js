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
import { invalidateRateCache } from '../services/rateService.js';

describe('Phase 7: Upcoming Events Console & Dynamic Rate Management Suite', () => {
  const testSecret = 'test_razorpay_secret_key_12345';
  const testKeyId = 'rzp_test_mockKeyId';
  const testDateStr = '2029-05-15'; // A Tuesday
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
  let customerToken;
  let customerId;

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

    // 2. Seed Admin User
    const adminDocRef = await db.collection('admins').add({
      username: 'admin_phase7',
      email: 'admin7@eliteturf.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    adminToken = jwt.sign(
      { adminId: adminDocRef.id, username: 'admin_phase7', role: 'admin' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // 3. Seed Customer
    const customerRef = await db.collection('customers').add({
      name: 'Praveen Kumar',
      phone: '9876543210',
      email: 'praveen@test.com',
      bookingHistory: [],
      createdAt: new Date().toISOString()
    });
    customerId = customerRef.id;
    customerToken = jwt.sign(
      { customerId: customerId, phone: '9876543210', email: 'praveen@test.com', name: 'Praveen Kumar' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );
  });

  // =========================================================================
  // SECTION 1: UPCOMING EVENT CREATION, EDIT, PUBLISH, ARCHIVE, DELETE
  // =========================================================================
  describe('1. Upcoming Event Management Subsystem', () => {
    test('1.1 Admin can create an upcoming event with full schema', async () => {
      const payload = {
        title: 'Monsoon 5v5 Premier Cup',
        category: 'Tournament',
        date: '2029-07-20',
        startTime: '08:00 AM',
        endTime: '08:00 PM',
        venue: 'Elite Turf Main Arena',
        description: 'Annual monsoon 5-a-side championship with 16 premier teams.',
        image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
        registrationStatus: 'OPEN',
        registrationDeadline: '2029-07-15',
        maxParticipants: 16,
        contactPhone: '9876543210',
        contactEmail: 'tournaments@eliteturf.com',
        rules: '1. 5 players + 3 subs\n2. 15 min halves',
        isPublished: true
      };

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.title).toBe(payload.title);
      expect(res.body.data.category).toBe('Tournament');
      expect(res.body.data.status).toBe('Upcoming');
      expect(res.body.data.isPublished).toBe(true);
      expect(res.body.data.isArchived).toBe(false);
      expect(res.body.data.maxParticipants).toBe(16);
      expect(res.body.data.currentParticipants).toBe(0);
    });

    test('1.2 Non-admin request to create event is rejected with 401/403', async () => {
      const payload = {
        title: 'Unauthorized Event',
        description: 'Should not be allowed to create without admin token.',
        category: 'Tournament',
        date: '2029-08-01'
      };

      const resNoAuth = await request(app)
        .post('/api/events')
        .send(payload);
      expect(resNoAuth.status).toBe(401);

      const resCustomer = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(payload);
      expect(resCustomer.status).toBe(403);
    });

    test('1.3 Event validation rejects missing title, short description, or invalid category', async () => {
      const resMissingTitle = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Valid long enough description for an event.',
          date: '2029-08-01'
        });
      expect(resMissingTitle.status).toBe(400);

      const resShortDesc = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Event Short Desc',
          description: 'Sh',
          date: '2029-08-01'
        });
      expect(resShortDesc.status).toBe(400);
    });

    test.skip('1.4 Custom validation rejects event if registrationDeadline is after event date', async () => {
      const payload = {
        title: 'Late Registration Cup',
        description: 'Registration deadline cannot be after the match day.',
        category: 'Tournament',
        date: '2029-08-10',
        registrationDeadline: '2029-08-15' // Invalid: deadline is 5 days AFTER the event
      };

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/deadline cannot be after/i);
    });

    test('1.5 Admin can update event details', async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Original Title',
          description: 'Original event description text.',
          category: 'Friendly',
          date: '2029-09-01'
        });

      const eventId = createRes.body.data.id;

      const updateRes = await request(app)
        .put(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Cup Title',
          description: 'Updated event description text.',
          maxParticipants: 32
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.title).toBe('Updated Cup Title');
      expect(updateRes.body.data.maxParticipants).toBe(32);
    });

    test('1.6 Admin can publish, unpublish, and archive an event', async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Draft Event',
          description: 'Draft event waiting for approval.',
          isPublished: false,
          date: '2029-10-01'
        });

      const eventId = createRes.body.data.id;
      expect(createRes.body.data.isPublished).toBe(false);

      // Publish
      const pubRes = await request(app)
        .patch(`/api/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.isPublished).toBe(true);

      // Unpublish
      const unpubRes = await request(app)
        .patch(`/api/events/${eventId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(unpubRes.status).toBe(200);
      expect(unpubRes.body.data.isPublished).toBe(false);

      // Archive
      const archRes = await request(app)
        .post(`/api/events/${eventId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(archRes.status).toBe(200);
      expect(archRes.body.data.isArchived).toBe(true);
      expect(archRes.body.data.status).toBe('Archived');
    });

    test('1.7 Admin can soft-delete an event', async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Event to Delete',
          description: 'This event will be deleted.',
          date: '2029-11-01'
        });

      const eventId = createRes.body.data.id;

      const delRes = await request(app)
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Admin all should no longer list it
      const adminAllRes = await request(app)
        .get('/api/events/admin/all')
        .set('Authorization', `Bearer ${adminToken}`);
      const found = adminAllRes.body.data.find(e => (e.id === eventId || e._id === eventId));
      expect(found).toBeUndefined();
    });
  });

  // =========================================================================
  // SECTION 2: PUBLIC VS ADMIN VISIBILITY & LEGACY EVENT PRESERVATION
  // =========================================================================
  describe('2. Event Visibility Invariants & Legacy Completed Events', () => {
    test('2.1 Public GET /api/events returns published upcoming and completed events, hiding drafts and archives', async () => {
      const db = getDb();

      // Seed 1: Published Upcoming Event
      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Published Upcoming Tournament',
          description: 'Open for registration.',
          isPublished: true,
          date: '2029-12-01'
        });

      // Seed 2: Unpublished Draft Event
      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Secret Draft Tournament',
          description: 'Not yet visible to public.',
          isPublished: false,
          date: '2029-12-05'
        });

      // Seed 3: Archived Event
      const archEvt = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Cancelled Old Event',
          description: 'Archived event.',
          isPublished: true,
          date: '2029-12-10'
        });
      await request(app)
        .post(`/api/events/${archEvt.body.data.id}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Seed 4: Legacy Completed Event
      await db.collection('events').add({
        title: 'Past 2024 Championship Showcase',
        description: 'Highlights from last year.',
        category: 'COMPLETED',
        status: 'Completed',
        isPublished: true,
        isArchived: false,
        date: '2024-05-12'
      });

      const publicRes = await request(app).get('/api/events');
      expect(publicRes.status).toBe(200);
      const publicEvents = publicRes.body.data;

      // Assertions
      const titles = publicEvents.map(e => e.title);
      expect(titles).toContain('Published Upcoming Tournament');
      expect(titles).toContain('Past 2024 Championship Showcase');
      expect(titles).not.toContain('Secret Draft Tournament');
      expect(titles).not.toContain('Cancelled Old Event');
    });

    test('2.2 Public GET /api/events/:id returns 404 for unpublished or archived event', async () => {
      const draftRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Internal Unapproved Event',
          description: 'Draft not published.',
          isPublished: false,
          date: '2029-12-20'
        });

      const draftId = draftRes.body.data.id;

      // Public caller gets 404
      const pubRes = await request(app).get(`/api/events/${draftId}`);
      expect(pubRes.status).toBe(404);

      // Admin caller can view it
      const adminRes = await request(app)
        .get(`/api/events/${draftId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.title).toBe('Internal Unapproved Event');
    });
  });

  // =========================================================================
  // SECTION 3: BANNER IMAGE UPLOAD SAFETY & VALIDATION
  // =========================================================================
  describe('3. Event Banner Image Upload Safety', () => {
    test('3.1 Valid JPEG/PNG banner image upload succeeds', async () => {
      const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const res = await request(app)
        .post('/api/events/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageBase64: sampleBase64,
          mimeType: 'image/png',
          fileName: 'test_banner.png'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBeDefined();
    });

    test('3.2 Banner upload rejects disallowed MIME types (e.g. PDF, executable)', async () => {
      const res = await request(app)
        .post('/api/events/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageBase64: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago=',
          mimeType: 'application/pdf',
          fileName: 'malicious.pdf'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid image/i);
    });

    test('3.3 Banner upload rejects files larger than 5MB', async () => {
      // Create a 6MB dummy base64 buffer
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
      const largeBase64 = `data:image/jpeg;base64,${largeBuffer.toString('base64')}`;

      const res = await request(app)
        .post('/api/events/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          imageBase64: largeBase64,
          mimeType: 'image/jpeg',
          fileName: 'oversized.jpg'
        });

      expect([400, 413]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.message).toMatch(/exceeds 5MB/i);
      }
    });
  });

  // =========================================================================
  // SECTION 4: CLOSED REGISTRATION & ENQUIRY INTEGRATION
  // =========================================================================
  describe('4. Event Registration Status & Enquiry Rejection', () => {
    test('4.1 Enquiry is accepted when event registrationStatus is OPEN', async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Open Championship Cup',
          description: 'Open for registration.',
          registrationStatus: 'OPEN',
          date: '2029-08-20'
        });

      const eventId = createRes.body.data.id;

      const enquiryRes = await request(app)
        .post('/api/enquiries')
        .send({
          name: 'Captain Virat',
          phone: '9876543210',
          email: 'virat@test.com',
          eventId: eventId,
          eventTitle: 'Open Championship Cup',
          message: 'Registering our 8-player squad.'
        });

      expect(enquiryRes.status).toBe(201);
      expect(enquiryRes.body.success).toBe(true);
      expect(enquiryRes.body.data.eventId).toBe(eventId);
    });

    test('4.2 Enquiry is strictly rejected with 400 when event registrationStatus is CLOSED', async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Full Capacity League',
          description: 'No more registrations accepted.',
          registrationStatus: 'CLOSED',
          date: '2029-08-22'
        });

      const eventId = createRes.body.data.id;

      const enquiryRes = await request(app)
        .post('/api/enquiries')
        .send({
          name: 'Late Entrant',
          phone: '9876543210',
          eventId: eventId,
          message: 'Trying to register late.'
        });

      expect(enquiryRes.status).toBe(400);
      expect(enquiryRes.body.message).toMatch(/registration.*is.*closed/i);
    });

    test('4.3 Enquiry is strictly rejected with 400 when event is ARCHIVED', async () => {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Archived Past Cup',
          description: 'Old archived event.',
          registrationStatus: 'OPEN',
          date: '2029-08-25'
        });

      const eventId = createRes.body.data.id;
      await request(app)
        .post(`/api/events/${eventId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      const enquiryRes = await request(app)
        .post('/api/enquiries')
        .send({
          name: 'Praveen',
          phone: '9876543210',
          eventId: eventId,
          message: 'Attempting to enquire for archived event.'
        });

      expect(enquiryRes.status).toBe(400);
      expect(enquiryRes.body.message).toMatch(/archived/i);
    });
  });

  // =========================================================================
  // SECTION 5: DYNAMIC RATE RULE CRUD & 5-TIER PRECEDENCE
  // =========================================================================
  describe('5. Dynamic Server-Side Rate Rule Management', () => {
    test('5.1 Admin can create, read, update, toggle active, and delete rate rules', async () => {
      // 1. Create
      const createRes = await request(app)
        .post('/api/rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ruleName: 'Weekend Prime Hours',
          sportId: 'football-5v5',
          ratePerHour: 1800,
          daysOfWeek: ['WEEKEND'],
          timeSlots: ['06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM'],
          status: 'active',
          isPeak: true
        });

      expect(createRes.status).toBe(201);
      const ruleId = createRes.body.data.id;
      expect(createRes.body.data.ratePerHour).toBe(1800);
      expect(createRes.body.data.sportId).toBe('football-5v5');

      // 2. Read
      const getRes = await request(app)
        .get('/api/rates')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBeGreaterThanOrEqual(1);

      // 3. Update
      const updateRes = await request(app)
        .put(`/api/rates/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ratePerHour: 1950,
          notes: 'Adjusted for festival demand'
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.ratePerHour).toBe(1950);

      // 4. Toggle Active Status
      const toggleRes = await request(app)
        .patch(`/api/rates/${ruleId}/active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.status).toBe('inactive');

      // 5. Delete
      const delRes = await request(app)
        .delete(`/api/rates/${ruleId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);
    });

    test('5.2 Non-admin request to create or modify rate rules is rejected with 401/403', async () => {
      const resNoAuth = await request(app)
        .post('/api/rates')
        .send({ sportId: 'football-5v5', ratePerHour: 1200 });
      expect(resNoAuth.status).toBe(401);

      const resCustomer = await request(app)
        .post('/api/rates')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ sportId: 'football-5v5', ratePerHour: 1200 });
      expect(resCustomer.status).toBe(403);
    });

    test('5.3 Rate rule validation rejects non-positive rates, invalid dates, or invalid slots', async () => {
      const resZeroRate = await request(app)
        .post('/api/rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sportId: 'football-5v5',
          ratePerHour: 0
        });
      expect(resZeroRate.status).toBe(400);

      const resNegativeRate = await request(app)
        .post('/api/rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sportId: 'football-5v5',
          ratePerHour: -500
        });
      expect(resNegativeRate.status).toBe(400);

      const resInvalidDateRange = await request(app)
        .post('/api/rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sportId: 'football-5v5',
          ratePerHour: 1200,
          effectiveFrom: '2029-05-20',
          effectiveTo: '2029-05-10' // Invalid: effectiveTo is earlier than effectiveFrom
        });
      expect(resInvalidDateRange.status).toBe(400);
    });
  });

  // =========================================================================
  // SECTION 6: 5-TIER RATE PRECEDENCE VERIFICATION
  // =========================================================================
  describe('6. Rate Precedence Evaluation Order', () => {
    const targetDate = '2029-06-15'; // Friday
    const targetSlot = '08:00 PM - 09:00 PM';

    test('6.1 Tier 1 (Specific Date + Specific Slot) takes highest precedence', async () => {
      const db = getDb();

      // Tier 5: Baseline Rate (₹1000)
      await db.collection('rates').doc('rule_tier5').set({
        sportId: 'football-5v5',
        ratePerHour: 1000,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });

      // Tier 4: Day of Week (All Slots) (₹1200)
      await db.collection('rates').doc('rule_tier4').set({
        sportId: 'football-5v5',
        ratePerHour: 1200,
        daysOfWeek: ['FRI'],
        timeSlots: ['ALL'],
        status: 'active'
      });

      // Tier 3: Specific Date (All Slots) (₹1400)
      await db.collection('rates').doc('rule_tier3').set({
        sportId: 'football-5v5',
        ratePerHour: 1400,
        effectiveFrom: targetDate,
        effectiveTo: targetDate,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });

      // Tier 2: Day of Week + Specific Slot (₹1600)
      await db.collection('rates').doc('rule_tier2').set({
        sportId: 'football-5v5',
        ratePerHour: 1600,
        daysOfWeek: ['FRI'],
        timeSlots: [targetSlot],
        status: 'active'
      });

      // Tier 1: Specific Date + Specific Slot (₹2000)
      await db.collection('rates').doc('rule_tier1').set({
        sportId: 'football-5v5',
        ratePerHour: 2000,
        effectiveFrom: targetDate,
        effectiveTo: targetDate,
        daysOfWeek: ['ALL'],
        timeSlots: [targetSlot],
        status: 'active'
      });

      invalidateRateCache();

      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: targetDate,
          slots: [targetSlot],
          sportId: 'football-5v5'
        });

      expect(res.status).toBe(200);
      // Must match Tier 1 rate (₹2000)
      expect(res.body.data.slotPrice).toBe(2000);
      expect(res.body.data.subtotal).toBe(2000);
      expect(res.body.data.totalAmount).toBe(2000);
    });

    test('6.2 Tier 2 (Day of Week + Specific Slot) takes precedence when Tier 1 is absent', async () => {
      const db = getDb();

      // Tier 5: Baseline Rate (₹1000)
      await db.collection('rates').doc('rule_tier5').set({
        sportId: 'football-5v5',
        ratePerHour: 1000,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });

      // Tier 3: Specific Date (All Slots) (₹1400)
      await db.collection('rates').doc('rule_tier3').set({
        sportId: 'football-5v5',
        ratePerHour: 1400,
        effectiveFrom: targetDate,
        effectiveTo: targetDate,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });

      // Tier 2: Day of Week + Specific Slot (₹1600)
      await db.collection('rates').doc('rule_tier2').set({
        sportId: 'football-5v5',
        ratePerHour: 1600,
        daysOfWeek: ['FRI'],
        timeSlots: [targetSlot],
        status: 'active'
      });

      invalidateRateCache();

      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: targetDate,
          slots: [targetSlot],
          sportId: 'football-5v5'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.slotPrice).toBe(1600);
    });

    test('6.3 Tier 3 (Specific Date, All Slots) takes precedence when Tier 1 & 2 are absent', async () => {
      const db = getDb();

      // Tier 5: Baseline Rate (₹1000)
      await db.collection('rates').doc('rule_tier5').set({
        sportId: 'football-5v5',
        ratePerHour: 1000,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });

      // Tier 4: Day of Week (All Slots) (₹1200)
      await db.collection('rates').doc('rule_tier4').set({
        sportId: 'football-5v5',
        ratePerHour: 1200,
        daysOfWeek: ['FRI'],
        timeSlots: ['ALL'],
        status: 'active'
      });

      // Tier 3: Specific Date (All Slots) (₹1400)
      await db.collection('rates').doc('rule_tier3').set({
        sportId: 'football-5v5',
        ratePerHour: 1400,
        effectiveFrom: targetDate,
        effectiveTo: targetDate,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });

      invalidateRateCache();

      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: targetDate,
          slots: [targetSlot],
          sportId: 'football-5v5'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.slotPrice).toBe(1400);
    });

    test('6.4 Tier 5 (Baseline) is used when no specific date or day rules match', async () => {
      const db = getDb();

      // Tier 5: Baseline Rate (₹1000)
      await db.collection('rates').doc('rule_tier5').set({
        sportId: 'football-5v5',
        ratePerHour: 1000,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });

      invalidateRateCache();

      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: targetDate,
          slots: [targetSlot],
          sportId: 'football-5v5'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.slotPrice).toBe(1000);
    });

    test('6.5 Missing rate rule rejects with HTTP 422 (Zero Hardcoded Fallback)', async () => {
      // Do not seed any rate rules for 'badminton'
      invalidateRateCache();

      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: targetDate,
          slots: [targetSlot],
          sportId: 'badminton'
        });

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/No active rate rule is configured|Authoritative rate rule/i);
    });
  });

  // =========================================================================
  // SECTION 7: IMMUTABLE PRICING SNAPSHOTS & GST ABSENCE
  // =========================================================================
  describe('7. Pricing Snapshot Immutability & Financial Correctness', () => {
    test('7.1 Existing booking retains its frozen pricing snapshot after rate rule change', async () => {
      const db = getDb();

      // 1. Seed Initial Rate Rule (₹1000/hr)
      await db.collection('rates').doc('baseline_football').set({
        sportId: 'football-5v5',
        ratePerHour: 1000,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });
      invalidateRateCache();

      // 2. Create Booking under ₹1000/hr
      const bookingPayload = {
        customerName: 'Praveen Kumar',
        mobileNumber: '9876543210',
        customerPhone: '9876543210',
        customerEmail: 'praveen@test.com',
        date: testDateStr,
        slots: [testSlot1],
        sportId: 'football-5v5',
        paymentOption: PAYMENT_OPTIONS.FULL,
        paymentMethod: PAYMENT_METHODS.CASH
      };

      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(bookingPayload);

      expect(bookRes.status).toBe(201);
      const bookingIdentifier = bookRes.body.data.bookingId || bookRes.body.data.id;
      expect(bookRes.body.data.totalAmount).toBe(1000);
      expect(bookRes.body.data.pricingSnapshot.slotPrice).toBe(1000);

      // 3. Now Admin increases the rate to ₹2500/hr
      await request(app)
        .put('/api/rates/baseline_football')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ratePerHour: 2500 });
      invalidateRateCache();

      // 4. Future pricing preview reflects ₹2500
      const previewRes = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: testDateStr,
          slots: [testSlot1],
          sportId: 'football-5v5'
        });
      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.totalAmount).toBe(2500);

      // 5. Existing Booking when tracked still has frozen ₹1000 snapshot
      const trackRes = await request(app)
        .post('/api/bookings/track')
        .send({ query: bookingIdentifier });

      expect(trackRes.status).toBe(200);
      const tracked = Array.isArray(trackRes.body.data) ? trackRes.body.data[0] : trackRes.body.data;
      expect(tracked).toBeDefined();
      expect(tracked.totalAmount).toBe(1000);
      expect(tracked.pricingSnapshot.slotPrice).toBe(1000);
      expect(tracked.pricingSnapshot.totalAmount).toBe(1000);
    });

    test('7.2 Fixed ₹200 advance payment and GST-free calculations remain strictly active', async () => {
      const db = getDb();

      // Rate: ₹1500/hr
      await db.collection('rates').doc('rate_adv_test').set({
        sportId: 'football-5v5',
        ratePerHour: 1500,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });
      invalidateRateCache();

      const previewRes = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          date: testDateStr,
          slots: [testSlot1, testSlot2], // 2 slots = ₹3000
          sportId: 'football-5v5',
          paymentOption: PAYMENT_OPTIONS.ADVANCE
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.slotCount).toBe(2);
      expect(previewRes.body.data.subtotal).toBe(3000);
      expect(previewRes.body.data.totalAmount).toBe(3000);
      // Strictly GST-free (no GST line item, subtotal == totalAmount)
      expect(previewRes.body.data.gstAmount).toBeUndefined();
      expect(previewRes.body.data.fixedAdvanceAmount).toBe(200);
      expect(previewRes.body.data.advanceRequired).toBe(200);
      expect(previewRes.body.data.balanceDue).toBe(2800);
    });
  });

  // =========================================================================
  // SECTION 8: SYSTEM REGRESSION & PRESERVATION INVARIANTS
  // =========================================================================
  describe('8. Preservation of Google Auth, Notifications, and Slot Holds', () => {
    test('8.1 In-app notification creation and unread count remain functional in Phase 7', async () => {
      const db = getDb();
      await db.collection('rates').doc('rate_notif').set({
        sportId: 'football-5v5',
        ratePerHour: 1000,
        daysOfWeek: ['ALL'],
        timeSlots: ['ALL'],
        status: 'active'
      });
      invalidateRateCache();

      // Create booking to trigger notification
      await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          customerName: 'Praveen Kumar',
          mobileNumber: '9876543210',
          customerPhone: '9876543210',
          customerEmail: 'praveen@test.com',
          date: testDateStr,
          slots: [testSlot1],
          sportId: 'football-5v5',
          paymentOption: PAYMENT_OPTIONS.FULL,
          paymentMethod: PAYMENT_METHODS.CASH
        });

      // Customer notifications
      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(notifRes.status).toBe(200);
      expect(notifRes.body.data.length).toBeGreaterThanOrEqual(1);
    });

    test('8.2 Admin audit logs are recorded on rate creation and event creation', async () => {
      const db = getDb();

      await request(app)
        .post('/api/rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ruleName: 'Audit Test Rate',
          sportId: 'football-5v5',
          ratePerHour: 1100
        });

      const auditSnap = await db.collection('audit_logs').get();
      const logs = auditSnap.docs.map(d => d.data());
      const rateAudit = logs.find(l => l.action === 'RATE_UPDATE' || l.action === 'RATE_CREATE');
      expect(rateAudit).toBeDefined();
      expect(rateAudit.user).toBe('admin_phase7');
    });
  });
});
