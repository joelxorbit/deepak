import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { getDb } from '../config/firebase.js';
import { ENV } from '../config/env.js';
import { PAYMENT_OPTIONS } from '../utils/constants.js';

describe('Coupon System Suite', () => {
  let adminToken;
  const testDate = '2029-07-20';
  const testSlot = '06:00 PM - 07:00 PM';

  beforeEach(async () => {
    const db = getDb();

    // Clean test collections
    const collectionsToClean = ['coupons', 'rates', 'settings', 'admins', 'bookings', 'customers'];
    for (const col of collectionsToClean) {
      const snap = await db.collection(col).get();
      snap.docs.forEach(doc => doc.ref.delete());
    }

    // Seed Payment Settings (Fixed ₹200 advance)
    await db.collection('settings').doc('paymentSettings').set({
      fixedAdvanceAmount: 200,
      createdAt: new Date().toISOString()
    });

    // Seed Baseline Rate Rule: ₹800/hr
    await db.collection('rates').add({
      ruleName: 'Baseline Football 5v5',
      sportId: 'football-5v5',
      ratePerHour: 800,
      daysOfWeek: ['ALL'],
      timeSlots: ['ALL'],
      status: 'active',
      isActive: true,
      priority: 1
    });

    // Seed Admin
    const adminRef = await db.collection('admins').add({
      username: 'admin_coupons',
      email: 'admin@eliteturf.com',
      role: 'admin'
    });

    adminToken = jwt.sign(
      { adminId: adminRef.id, username: 'admin_coupons', role: 'admin' },
      ENV.JWT_SECRET,
      { expiresIn: '2h' }
    );
  });

  describe('1. Admin Coupon Management', () => {
    it('1.1 Admin can create a valid coupon', async () => {
      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'welcome100',
          discountAmount: 100,
          validUntil: '2029-12-31',
          notes: 'Welcome discount'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('WELCOME100'); // Normalized uppercase
      expect(res.body.data.discountAmount).toBe(100);
      expect(res.body.data.status).toBe('active');
    });

    it('1.2 Rejects non-admin coupon creation', async () => {
      const res = await request(app)
        .post('/api/coupons')
        .send({
          code: 'HACK100',
          discountAmount: 100,
          validUntil: '2029-12-31'
        });

      expect(res.status).toBe(401);
    });

    it('1.3 Rejects duplicate coupon codes', async () => {
      await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'DISCOUNT50',
          discountAmount: 50,
          validUntil: '2029-12-31'
        });

      const res = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'discount50', // Same code lower-case
          discountAmount: 100,
          validUntil: '2029-12-31'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('1.4 Rejects invalid discount amounts and past dates', async () => {
      // Negative amount
      const resNeg = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'BADAMOUNT',
          discountAmount: -50,
          validUntil: '2029-12-31'
        });
      expect(resNeg.status).toBe(400);

      // Past date
      const resPast = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'PASTDATE',
          discountAmount: 100,
          validUntil: '2020-01-01'
        });
      expect(resPast.status).toBe(400);
      expect(resPast.body.message).toMatch(/past/i);
    });

    it('1.5 Admin can list, toggle status, and delete coupons', async () => {
      const createRes = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TESTCOUPON',
          discountAmount: 150,
          validUntil: '2029-12-31'
        });

      const couponId = createRes.body.data.id;

      // List
      const listRes = await request(app)
        .get('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);

      // Toggle inactive
      const toggleRes = await request(app)
        .patch(`/api/coupons/${couponId}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.status).toBe('inactive');

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/coupons/${couponId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteRes.status).toBe(200);

      // List again
      const listRes2 = await request(app)
        .get('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes2.body.data.length).toBe(0);
    });
  });

  describe('2. Public Coupon Validation', () => {
    it('2.1 Validates active, valid coupon successfully', async () => {
      await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'SAVE100',
          discountAmount: 100,
          validUntil: '2029-12-31'
        });

      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'save100', subtotal: 800 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.discountAmount).toBe(100);
      expect(res.body.data.coupon.code).toBe('SAVE100');
    });

    it('2.2 Rejects non-existent or inactive coupon', async () => {
      // Non-existent
      const resNonExist = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'DOESNOTEXIST' });
      expect(resNonExist.status).toBe(400);
      expect(resNonExist.body.message).toMatch(/invalid/i);

      // Inactive
      const createRes = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'INACTIVE50',
          discountAmount: 50,
          validUntil: '2029-12-31'
        });
      await request(app)
        .patch(`/api/coupons/${createRes.body.data.id}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);

      const resInactive = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'INACTIVE50' });
      expect(resInactive.status).toBe(400);
      expect(resInactive.body.message).toMatch(/inactive/i);
    });
  });

  describe('3. Price Calculation & Booking Integration with Coupon', () => {
    it('3.1 Applies coupon discount in price preview', async () => {
      await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TURF100',
          discountAmount: 100,
          validUntil: '2029-12-31'
        });

      // Price preview with coupon
      const res = await request(app)
        .post('/api/bookings/price-preview')
        .send({
          sportId: 'football-5v5',
          date: testDate,
          slots: [testSlot],
          paymentOption: PAYMENT_OPTIONS.ADVANCE,
          couponCode: 'TURF100'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.subtotal).toBe(800);
      expect(res.body.data.discountAmount).toBe(100);
      expect(res.body.data.couponCode).toBe('TURF100');
      expect(res.body.data.totalAmount).toBe(700); // 800 - 100
      expect(res.body.data.fixedAdvanceAmount).toBe(200);
      expect(res.body.data.advanceRequired).toBe(200);
      expect(res.body.data.payableNow).toBe(200);
      expect(res.body.data.balanceDue).toBe(500); // 700 - 200
    });

    it('3.2 Booking creation stores coupon details and reduces balanceDue', async () => {
      await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'PROMO150',
          discountAmount: 150,
          validUntil: '2029-12-31'
        });

      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Test Player',
          customerPhone: '9876543210',
          sportId: 'football-5v5',
          date: new Date('2029-07-20').toISOString(),
          paymentMethod: 'Pay at Spot',
          slots: [testSlot],
          paymentOption: PAYMENT_OPTIONS.CASH,
          couponCode: 'PROMO150'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subtotal).toBe(800);
      expect(res.body.data.discountAmount).toBe(150);
      expect(res.body.data.couponCode).toBe('PROMO150');
      expect(res.body.data.totalAmount).toBe(650); // 800 - 150
      expect(res.body.data.balanceDue).toBe(650);
    });

    it('3.3 Booking works normally when coupon is omitted (Optional field)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customerName: 'Normal Player',
          customerPhone: '9876543210',
          sportId: 'football-5v5',
          date: new Date('2029-07-20').toISOString(),
          paymentMethod: 'Pay at Spot',
          slots: [testSlot],
          paymentOption: PAYMENT_OPTIONS.CASH
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subtotal).toBe(800);
      expect(res.body.data.discountAmount).toBe(0);
      expect(res.body.data.totalAmount).toBe(800);
      expect(res.body.data.balanceDue).toBe(800);
    });
  });
});
