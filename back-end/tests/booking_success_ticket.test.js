import request from 'supertest';
import app from '../app.js';
import { getDb } from '../config/firebase.js';

describe('Booking Success Flow & Ticket PDF Download Test Suite', () => {
  let createdBookingId;
  let customerSessionToken;
  let sessionCookie;

  beforeAll(async () => {
    const db = getDb();
    // Seed rate rule and settings
    await db.collection('rates').add({
      ruleName: 'Standard Rate',
      sportId: 'football-5v5',
      ratePerHour: 600,
      peakRatePerHour: 800,
      daysOfWeek: ['ALL'],
      timeSlots: ['ALL'],
      status: 'active',
      isActive: true,
      priority: 1
    });

    await db.collection('settings').doc('paymentSettings').set({
      fixedAdvanceAmount: 200,
      createdAt: new Date().toISOString()
    });
  });

  it('1. Successfully creates an advance booking with "Advance Paid" payment method', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        customerName: 'Deepak Jose',
        mobileNumber: '9500731606',
        date: '2029-08-15',
        slots: ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM'],
        paymentOption: 'ADVANCE',
        paymentMethod: 'Advance Paid',
        sportId: 'football-5v5'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingId).toBeDefined();
    expect(res.body.data.customerToken).toBeDefined();
    expect(res.body.data.advancePaid).toBe(200);
    expect(res.body.data.balanceDue).toBe(1000); // 2 slots * 600 = 1200 - 200 = 1000
    expect(res.body.data.totalAmount).toBe(1200);

    createdBookingId = res.body.data.bookingId;
    customerSessionToken = res.body.data.customerToken;

    // Check cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const customerCookie = cookies.find(c => c.startsWith('elite_pitch_customer_token='));
    expect(customerCookie).toBeDefined();
    sessionCookie = customerCookie.split(';')[0];
  });

  it('2. Rejects unauthenticated ticket PDF download without token with HTTP 401', async () => {
    const res = await request(app)
      .get(`/api/bookings/${createdBookingId}/ticket.pdf`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('3. Downloads ticket PDF successfully using customer session token (Authorization Header)', async () => {
    const res = await request(app)
      .get(`/api/bookings/${createdBookingId}/ticket.pdf`)
      .set('Authorization', `Bearer ${customerSessionToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(`Elite-Pitch-Ticket-${createdBookingId}.pdf`);

    // Verify PDF header bytes
    const pdfHeader = res.body.slice(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');
  });

  it('4. Downloads ticket PDF successfully using HTTP-only cookie', async () => {
    const res = await request(app)
      .get(`/api/bookings/${createdBookingId}/ticket.pdf`)
      .set('Cookie', [sessionCookie]);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    const pdfHeader = res.body.slice(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');
  });

  it('5. Downloads ticket PDF successfully using ?token= query parameter', async () => {
    const res = await request(app)
      .get(`/api/bookings/${createdBookingId}/ticket.pdf?token=${customerSessionToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    const pdfHeader = res.body.slice(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');
  });

  it('6. Rejects ticket download if customer token belongs to a different customer with HTTP 403', async () => {
    // Create another booking for a different customer
    const otherRes = await request(app)
      .post('/api/bookings')
      .send({
        customerName: 'Different Player',
        mobileNumber: '9888877777',
        date: '2029-08-16',
        slots: ['04:00 PM - 05:00 PM'],
        paymentOption: 'FULL',
        paymentMethod: 'Fully Paid',
        sportId: 'football-5v5'
      });

    expect(otherRes.status).toBe(201);
    const otherToken = otherRes.body.data.customerToken;

    // Different customer tries to download Deepak Jose's ticket
    const res = await request(app)
      .get(`/api/bookings/${createdBookingId}/ticket.pdf`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
