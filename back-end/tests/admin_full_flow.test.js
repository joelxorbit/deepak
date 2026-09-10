import request from 'supertest';
import app from '../app.js';
import { getDb } from '../config/firebase.js';

describe('Admin Full Flow Comprehensive Verification Suite', () => {
  let adminToken;
  let createdBookingId;
  let testCustomerId;

  beforeAll(async () => {
    const db = getDb();

    // Clean test collections
    const collectionsToClean = [
      'admins', 'bookings', 'customers', 'rates', 'coupons', 
      'events', 'enquiries', 'blocked_slots', 'notifications', 'settings'
    ];
    for (const col of collectionsToClean) {
      const snap = await db.collection(col).get();
      snap.docs.forEach(d => d.ref.delete());
    }

    // Seed settings
    await db.collection('settings').doc('paymentSettings').set({
      fixedAdvanceAmount: 200,
      createdAt: new Date().toISOString()
    });

    // Seed Baseline Rate Rule (600 normal, 800 peak)
    await db.collection('rates').add({
      ruleName: 'Standard Rate Rule',
      sportId: 'football-5v5',
      ratePerHour: 600,
      peakRatePerHour: 800,
      daysOfWeek: ['ALL'],
      timeSlots: ['ALL'],
      status: 'active',
      isActive: true,
      priority: 1
    });
  });

  describe('1. Admin Authentication Flow', () => {
    it('1.1 Bootstraps and logs in admin user with username & password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.admin.username).toBe('admin');
      adminToken = res.body.data.token;
    });

    it('1.2 Rejects login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'wrongPassword!@#' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Dashboard & Summary Statistics Flow', () => {
    it('2.1 Admin can fetch live dashboard statistics', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('todayBookingsCount');
      expect(res.body.data).toHaveProperty('totalCustomersCount');
      expect(res.body.data).toHaveProperty('totalEarnings');
    });

    it('2.2 Rejects dashboard access without admin authorization', async () => {
      const res = await request(app).get('/api/admin/dashboard');
      expect(res.status).toBe(401);
    });
  });

  describe('3. Booking Management Flow (Approve, Reject, Review, Mark Paid, Cancel)', () => {
    it('3.1 Create a test booking to manage', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Suresh Raina',
          customerPhone: '9876543210',
          sportId: 'football-5v5',
          date: new Date('2029-08-15').toISOString(),
          paymentMethod: 'Pay at Spot',
          slots: ['11:00 AM - 12:00 PM'],
          paymentOption: 'CASH'
        });

      expect(res.status).toBe(201);
      createdBookingId = res.body.data.bookingId;
      testCustomerId = res.body.data.customerId;
    });

    it('3.2 Admin can fetch all reservations', async () => {
      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('3.3 Admin can mark booking as reviewed', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${createdBookingId}/review`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isReviewed).toBe(true);
    });

    it('3.4 Admin can mark booking payment as Paid', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${createdBookingId}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.balanceDue).toBe(0);
      expect(res.body.data.paymentStatus).toBe('Cash Received');
    });

    it('3.5 Admin can approve booking', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${createdBookingId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Confirmed');
    });

    it('3.6 Admin can cancel reservation with mandatory reason', async () => {
      const res = await request(app)
        .post(`/api/bookings/${createdBookingId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Customer requested cancellation due to weather' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Cancelled');
      expect(res.body.data.cancellation.reason).toBe('Customer requested cancellation due to weather');
    });
  });

  describe('4. Freeze Manager Flow (Block & Unblock Slots)', () => {
    let blockId;

    it('4.1 Admin can block/freeze a slot for maintenance', async () => {
      const res = await request(app)
        .post('/api/availability/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateStr: '2029-09-01',
          slots: ['06:00 AM - 07:00 AM'],
          reason: 'Turf turf grass maintenance'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      blockId = res.body.data.id;
    });

    it('4.2 Admin can retrieve all blocked slots', async () => {
      const res = await request(app)
        .get('/api/availability/blocked')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('4.3 Admin can unblock the slot', async () => {
      const res = await request(app)
        .delete(`/api/availability/block/${blockId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('5. Customers Directory Flow', () => {
    it('5.1 Admin can list registered customers', async () => {
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].phone).toBe('9876543210');
    });
  });

  describe('6. Enquiries Management Flow', () => {
    let enquiryId;

    it('6.1 Customer creates an enquiry and Admin can retrieve it', async () => {
      const createRes = await request(app)
        .post('/api/enquiries')
        .send({
          name: 'Rohit Sharma',
          phone: '9876543211',
          email: 'rohit@test.com',
          subject: 'Corporate Tournament Inquiry',
          message: 'We want to book 5 hours on weekend.'
        });

      expect(createRes.status).toBe(201);
      enquiryId = createRes.body.data.id;

      const listRes = await request(app)
        .get('/api/enquiries')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some(e => e.id === enquiryId)).toBe(true);
    });

    it('6.2 Admin can update enquiry status and add notes', async () => {
      const res = await request(app)
        .patch(`/api/enquiries/${enquiryId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Contacted',
          notes: 'Spoke with manager, sent quote via WhatsApp'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Contacted');
    });

    it('6.3 Admin can delete an enquiry', async () => {
      const res = await request(app)
        .delete(`/api/enquiries/${enquiryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('7. Dynamic Rates & Pricing Flow', () => {
    let rateId;

    it('7.1 Admin creates dynamic rate rule', async () => {
      const res = await request(app)
        .post('/api/rates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ruleName: 'Weekend Evening Surge',
          sportId: 'football-5v5',
          ratePerHour: 700,
          peakRatePerHour: 900,
          daysOfWeek: ['WEEKEND'],
          timeSlots: ['ALL'],
          priority: 25
        });

      expect(res.status).toBe(201);
      rateId = res.body.data.id;
    });

    it('7.2 Admin lists rate rules', async () => {
      const res = await request(app)
        .get('/api/rates')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some(r => r.id === rateId)).toBe(true);
    });

    it('7.3 Admin toggles rate rule status and deletes it', async () => {
      const toggleRes = await request(app)
        .patch(`/api/rates/${rateId}/active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.status).toBe('inactive');

      const delRes = await request(app)
        .delete(`/api/rates/${rateId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
    });
  });

  describe('8. Coupon Management Flow', () => {
    let couponId;

    it('8.1 Admin creates a discount coupon', async () => {
      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'ADMINTEST100',
          discountAmount: 100,
          validUntil: '2029-12-31',
          notes: 'Admin test coupon'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('ADMINTEST100');
      couponId = res.body.data.id;
    });

    it('8.2 Admin lists coupons, toggles status, and deletes', async () => {
      const listRes = await request(app)
        .get('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.some(c => c.id === couponId)).toBe(true);

      const toggleRes = await request(app)
        .patch(`/api/coupons/${couponId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.status).toBe('inactive');

      const delRes = await request(app)
        .delete(`/api/coupons/${couponId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
    });
  });

  describe('9. Upcoming Events Console Flow', () => {
    let eventId;

    it('9.1 Admin creates an event', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Monsoon Championship 2029',
          category: 'Upcoming',
          date: '2029-08-30',
          startTime: '08:00',
          endTime: '20:00',
          venue: 'Elite Pitch Main Arena',
          description: 'Open knockout football tournament for all age groups.',
          contactPhone: '9876543210'
        });

      expect(res.status).toBe(201);
      eventId = res.body.data.id;
    });

    it('9.2 Admin publishes, unpublishes, archives, and deletes event', async () => {
      // Unpublish
      const unpub = await request(app)
        .post(`/api/events/${eventId}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(unpub.status).toBe(200);
      expect(unpub.body.data.isPublished).toBe(false);

      // Publish
      const pub = await request(app)
        .post(`/api/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(pub.status).toBe(200);
      expect(pub.body.data.isPublished).toBe(true);

      // Archive
      const arc = await request(app)
        .post(`/api/events/${eventId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(arc.status).toBe(200);
      expect(arc.body.data.isArchived).toBe(true);

      // Delete
      const del = await request(app)
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(del.status).toBe(200);
    });
  });

  describe('10. Admin Notifications Flow', () => {
    it('10.1 Admin can read in-app notifications and mark all as read', async () => {
      const getRes = await request(app)
        .get('/api/notifications?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body.data)).toBe(true);

      const markRes = await request(app)
        .patch('/api/notifications/read-all?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(markRes.status).toBe(200);
    });
  });

  describe('11. Admin Logout Flow', () => {
    it('11.1 Admin logs out successfully and clears session cookie', async () => {
      const res = await request(app)
        .post('/api/admin/logout')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
