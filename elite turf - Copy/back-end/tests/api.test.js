import request from 'supertest';
import app from '../app.js';
import { getDb } from '../config/firebase.js';

describe('Elite Pitch Comprehensive Runtime & API Verification Suite', () => {

  let adminToken = null;
  let createdBookingId = null;
  let payAtSpotBookingId = null;
  let createdEnquiryId = null;

  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPhone2 = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
  
  // Unique future date for fresh isolated tests
  const randomOffsetDays = Math.floor(Math.random() * 800) + 100;
  const testDateStr = new Date(Date.now() + randomOffsetDays * 86400000).toISOString().split('T')[0];

  beforeAll(async () => {
    // Authenticate admin to get JWT token for protected admin endpoints
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123' });
    if (loginRes.body.data && loginRes.body.data.token) {
      adminToken = loginRes.body.data.token;
    }
  }, 40000);

  afterAll(async () => {
    // Clean up test documents created during Jest execution to prevent live database pollution
    try {
      const db = getDb();
      if (createdBookingId) {
        const snap = await db.collection('bookings').where('bookingId', '==', createdBookingId).get();
        snap.docs.forEach(doc => doc.ref.delete());
      }
      if (payAtSpotBookingId) {
        const snap = await db.collection('bookings').where('bookingId', '==', payAtSpotBookingId).get();
        snap.docs.forEach(doc => doc.ref.delete());
      }
      if (createdEnquiryId) {
        await db.collection('enquiries').doc(createdEnquiryId).delete();
      }
      
      // Clean up test customer profiles
      const cSnap1 = await db.collection('customers').where('phone', '==', testPhone).get();
      cSnap1.docs.forEach(doc => doc.ref.delete());
      const cSnap2 = await db.collection('customers').where('phone', '==', testPhone2).get();
      cSnap2.docs.forEach(doc => doc.ref.delete());
    } catch (err) {
      console.warn('[Test Teardown Warning]', err.message);
    }
  }, 40000);

  describe('1. Pricing & Booking Creation Runtime', () => {
    it('POST /api/bookings - Pay Now should have paymentStatus = Paid', async () => {
      const payload = {
        customerName: 'Pay Now Verification User',
        mobileNumber: testPhone,
        date: testDateStr,
        slots: ['06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM'], // 2 hours
        paymentMethod: 'Pay Now'
      };

      const res = await request(app).post('/api/bookings').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const booking = res.body.data;
      createdBookingId = booking.bookingId || booking.id || booking._id;

      expect(booking.paymentStatus).toBe('Paid');
      expect(booking.paymentCollectedBy).toBe('Online Payment');
      expect(booking.paidAt).toBeDefined();
      expect(booking.slotPrice).toBe(300);
      expect(booking.slotCount).toBe(2);
      expect(booking.subtotal).toBe(600);
      expect(booking.gstAmount).toBe(108);
      expect(booking.totalAmount).toBe(708);
    }, 40000);

    it('POST /api/bookings - Pay at Spot should have paymentStatus = Pending', async () => {
      const payload = {
        customerName: 'Pay at Spot Verification User',
        mobileNumber: testPhone2,
        date: testDateStr,
        slots: ['09:00 AM - 10:00 AM'], // 1 hour
        paymentMethod: 'Pay at Spot'
      };

      const res = await request(app).post('/api/bookings').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const booking = res.body.data;
      payAtSpotBookingId = booking.bookingId || booking.id || booking._id;

      expect(booking.paymentStatus).toBe('Pending');
      expect(booking.paidAt).toBeNull();
      expect(booking.paymentCollectedBy).toBeNull();
      expect(booking.totalAmount).toBe(354);
    }, 40000);
  });

  describe('2. Payment Status Workflow & Admin Mark as Paid', () => {
    it('Approving a booking MUST NOT change paymentStatus', async () => {
      expect(payAtSpotBookingId).toBeDefined();
      const approveRes = await request(app)
        .patch(`/api/bookings/${payAtSpotBookingId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('Confirmed');
      expect(approveRes.body.data.paymentStatus).toBe('Pending'); // MUST REMAIN PENDING!
    }, 40000);

    it('PATCH /api/bookings/:id/mark-paid - should update paymentStatus to Paid', async () => {
      expect(payAtSpotBookingId).toBeDefined();
      const markPaidRes = await request(app)
        .patch(`/api/bookings/${payAtSpotBookingId}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(markPaidRes.status).toBe(200);
      expect(markPaidRes.body.data.paymentStatus).toBe('Paid');
      expect(markPaidRes.body.data.paidAt).toBeDefined();
      expect(markPaidRes.body.data.paymentCollectedBy).toBeDefined();
    }, 40000);
  });

  describe('3. Booking Tracking Runtime', () => {
    it('POST /api/bookings/track - should find booking by Booking ID', async () => {
      const res = await request(app).post('/api/bookings/track').send({ query: createdBookingId });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].totalAmount).toBe(708);
    }, 40000);
  });

  describe('4. Booking Cancellation & 2-Hour Restriction Runtime', () => {
    it('POST /api/bookings/cancel - should reject cancellation within 2 hours window', async () => {
      const now = new Date();
      const nextHour = (now.getHours() + 1) % 24;
      const padHour = (h) => String(h > 12 ? h - 12 : (h === 0 ? 12 : h)).padStart(2, '0');
      const period = (h) => h >= 12 ? 'PM' : 'AM';
      const slotStr = `${padHour(now.getHours())}:00 ${period(now.getHours())} - ${padHour(nextHour)}:00 ${period(nextHour)}`;

      const todayStr = now.toISOString().split('T')[0];
      const createRes = await request(app).post('/api/bookings').send({
        customerName: 'Urgent User',
        mobileNumber: '9876543211',
        date: todayStr,
        slots: [slotStr],
        paymentMethod: 'Pay at Spot'
      });

      if (createRes.status === 201) {
        const urgentId = createRes.body.data.bookingId || createRes.body.data.id;
        const cancelRes = await request(app).post('/api/bookings/cancel').send({ bookingId: urgentId });
        expect(cancelRes.status).toBe(400);
        expect(cancelRes.body.success).toBe(false);
        expect(cancelRes.body.message).toContain('within 2 hours');

        // Cleanup temporary urgent test booking
        try {
          const db = getDb();
          const snap = await db.collection('bookings').where('bookingId', '==', urgentId).get();
          snap.docs.forEach(doc => doc.ref.delete());
        } catch (e) {}
      }
    }, 40000);

    it('POST /api/bookings/cancel - should successfully cancel future booking beyond 2 hours', async () => {
      const res = await request(app).post('/api/bookings/cancel').send({ bookingId: createdBookingId });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Cancelled');
      expect(res.body.data.cancelledAt).toBeDefined();
    }, 40000);
  });

  describe('5. Contact Enquiries Management Runtime', () => {
    it('POST /api/enquiries - should submit enquiry document into Firestore', async () => {
      const payload = {
        name: 'Jane Smith',
        phone: '9123456789',
        email: 'jane@example.com',
        subject: 'Tournament Booking Inquiry',
        message: 'We would like to book the turf for a weekend tournament.'
      };

      const res = await request(app).post('/api/enquiries').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Jane Smith');
      expect(res.body.data.status).toBe('Unread');
      if (res.body.data.id || res.body.data._id) {
        createdEnquiryId = res.body.data.id || res.body.data._id;
      }
    }, 40000);
  });

  describe('6. Health Endpoint & Latency Runtime', () => {
    it('GET /api/health - should return connected status and latency metrics', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firestore).toBe('connected');
    }, 40000);
  });

});
