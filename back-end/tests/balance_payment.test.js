import request from 'supertest';
import app from '../app.js';
import { getDb } from '../config/firebase.js';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

describe('Pay Balance Feature - Comprehensive Integration Test Suite', () => {
  let createdBookingId;
  let customerSessionToken;
  let adminToken;

  beforeAll(async () => {
    const db = getDb();

    // 1. Seed rate rule and settings
    await db.collection('rates').add({
      ruleName: 'Standard Rate',
      sportId: 'football-5v5',
      ratePerHour: 1000,
      daysOfWeek: ['ALL'],
      timeSlots: ['ALL'],
      status: 'active',
      isActive: true,
      priority: 1
    });

    await db.collection('settings').doc('paymentSettings').set({
      fixedAdvanceAmount: 800,
      createdAt: new Date().toISOString()
    });

    // 2. Seed Admin User and Token
    const adminDocRef = await db.collection('admins').add({
      username: 'admin_test',
      email: 'admin@eliteturf.com',
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    adminToken = jwt.sign(
      { adminId: adminDocRef.id, username: 'admin_test', role: 'admin' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );
  });

  it('1. Creates an advance booking with Total = ₹2,000, Advance = ₹800, Balance = ₹1,200', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        customerName: 'Rohit Sharma',
        mobileNumber: '9876543210',
        customerEmail: 'rohit@example.com',
        date: '2029-09-20',
        slots: ['06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM'],
        paymentOption: 'ADVANCE',
        paymentMethod: 'Advance Paid',
        sportId: 'football-5v5'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdBookingId = res.body.data.bookingId;
    customerSessionToken = res.body.data.customerToken;

    expect(createdBookingId).toBeDefined();
    expect(res.body.data.totalAmount).toBe(2000); // 2 slots * 1000 = 2000
    expect(res.body.data.advancePaid).toBe(800);
    expect(res.body.data.balanceDue).toBe(1200);
    expect(res.body.data.paymentStatus).toBe('Advance Paid');
  });

  it('2. Razorpay order creation for the booking authoritatively evaluates to ₹1,200 (balance only)', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .send({
        bookingId: createdBookingId,
        paymentOption: 'FULL'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Order amount must be the balance due (₹1200), NOT total amount (₹2000) or advance (₹800)
    expect(res.body.data.amount).toBe(1200);
    expect(res.body.data.amountInPaise).toBe(120000);
  });

  it('3. Rejects payment verification with invalid signature, keeping balance untouched', async () => {
    ENV.RAZORPAY_KEY_SECRET = 'test_secret_key_123';

    const res = await request(app)
      .post(`/api/bookings/${createdBookingId}/pay-balance`)
      .set('Authorization', `Bearer ${customerSessionToken}`)
      .send({
        razorpay_order_id: 'order_real_12345',
        razorpay_payment_id: 'pay_real_99999',
        razorpay_signature: 'invalid_fraudulent_signature'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Verify booking is still partially paid in DB
    const checkRes = await request(app)
      .get('/api/bookings/track')
      .query({ query: createdBookingId });

    expect(checkRes.status).toBe(200);
    const trackingBooking = checkRes.body.data[0];
    expect(trackingBooking.balanceDue).toBe(1200);
    expect(trackingBooking.paymentStatus).toBe('Advance Paid');
  });

  it('4. Successfully pays balance with verified payment signature and updates database', async () => {
    const devPaymentId = `pay_dev_${Date.now()}`;
    const res = await request(app)
      .post(`/api/bookings/${createdBookingId}/pay-balance`)
      .set('Authorization', `Bearer ${customerSessionToken}`)
      .send({
        razorpay_order_id: `order_dev_${Date.now()}`,
        razorpay_payment_id: devPaymentId,
        razorpay_signature: 'dev_signature'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const updated = res.body.data;

    expect(updated.bookingId).toBe(createdBookingId);
    expect(updated.paymentStatus).toBe('Fully Paid');
    expect(updated.balanceDue).toBe(0);
    expect(updated.balancePaid).toBe(true);
    expect(updated.balanceAmountPaid).toBe(1200);
    expect(updated.balancePayment).toBeDefined();
    expect(updated.balancePayment.isPaid).toBe(true);
    expect(updated.balancePayment.amount).toBe(1200);
  });

  it('5. Prevents duplicate payment: rejects order creation when balance is already ₹0', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .send({
        bookingId: createdBookingId,
        paymentOption: 'FULL'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no pending balance|already fully paid/i);
  });

  it('6. Prevents duplicate payment: rejects pay-balance endpoint when balance is already ₹0', async () => {
    const res = await request(app)
      .post(`/api/bookings/${createdBookingId}/pay-balance`)
      .set('Authorization', `Bearer ${customerSessionToken}`)
      .send({
        razorpay_order_id: `order_dev_dup`,
        razorpay_payment_id: `pay_dev_dup`,
        razorpay_signature: 'dev_signature'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no pending balance|already fully paid/i);
  });

  it('7. Verifies Admin Notification was created for the balance payment', async () => {
    const db = getDb();
    const notifSnap = await db.collection('notifications')
      .where('recipientType', '==', 'admin')
      .where('bookingId', '==', createdBookingId)
      .get();

    expect(notifSnap.empty).toBe(false);
    const balanceNotif = notifSnap.docs.find(d => d.data().title === 'New Balance Payment Received');
    expect(balanceNotif).toBeDefined();
    expect(balanceNotif.data().message).toContain('Rohit Sharma');
    expect(balanceNotif.data().message).toContain('1200');
    expect(balanceNotif.data().message).toContain('Fully Paid');
  });

  it('8. Verifies Admin Manage Bookings returns the booking with updated Fully Paid status and 0 balance', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const targetBooking = res.body.data.find(b => b.bookingId === createdBookingId);
    expect(targetBooking).toBeDefined();
    expect(targetBooking.paymentStatus).toBe('Fully Paid');
    expect(targetBooking.balanceDue).toBe(0);
  });
});
