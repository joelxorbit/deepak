import request from 'supertest';
import app from '../app.js';
import { getDb } from '../config/firebase.js';
import {
  createSlotHold,
  releaseSlotHold,
  getActiveHoldsForDate
} from '../services/holdService.js';
import {
  calculateAvailability,
  blockSlotService,
  unblockSlotService
} from '../services/availabilityService.js';
import { SLOT_HOLD_STATUS } from '../utils/constants.js';

describe('Phase 2: Slot Availability, Temporary Holds & Double-Booking Protection Suite', () => {

  let adminToken = null;
  const testDateStr = '2028-11-20';
  const testSlot1 = '06:00 AM - 07:00 AM';
  const testSlot2 = '07:00 AM - 08:00 AM';
  const holderA = 'holder_session_A_123';
  const holderB = 'holder_session_B_456';

  beforeAll(async () => {
    // Authenticate admin to get JWT token for protected admin endpoints
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123' });
    if (loginRes.body.data && loginRes.body.data.token) {
      adminToken = loginRes.body.data.token;
    }

    const db = getDb();
    await db.collection('rates').add({
      sportId: 'football-5v5',
      daysOfWeek: ['ALL'],
      timeSlots: ['ALL'],
      ratePerHour: 300,
      isPeak: false
    });
    await db.collection('settings').doc('pricing').set({
      advancePercentage: 30
    });
  }, 30000);

  afterEach(async () => {
    // Clean up test documents in MockDb
    try {
      const db = getDb();
      const holdsSnap = await db.collection('slot_holds').where('dateStr', '==', testDateStr).get();
      holdsSnap.docs.forEach(doc => doc.ref.delete());

      const blocksSnap = await db.collection('blocked_slots').where('dateStr', '==', testDateStr).get();
      blocksSnap.docs.forEach(doc => doc.ref.delete());

      const bookingsSnap = await db.collection('bookings').where('dateStr', '==', testDateStr).get();
      bookingsSnap.docs.forEach(doc => doc.ref.delete());
    } catch (e) {
      // Cleanup fallback
    }
  });

  // ==========================================
  // 1. Temporary Slot Hold Service & Flow
  // ==========================================
  describe('1. Temporary Slot Holds (holdService.js)', () => {
    it('should create a 10-minute hold for a user', async () => {
      const hold = await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderA,
        durationMinutes: 10
      });

      expect(hold).toBeDefined();
      expect(hold.holdId).toBeDefined();
      expect(hold.status).toBe(SLOT_HOLD_STATUS.ACTIVE);
      expect(hold.holderId).toBe(holderA);
      expect(hold.slots).toEqual([testSlot1]);

      const now = new Date();
      const expiresAt = new Date(hold.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should reject hold creation if slot is held by another user (409 Conflict)', async () => {
      await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderA
      });

      await expect(
        createSlotHold({
          dateStr: testDateStr,
          slots: [testSlot1],
          holderId: holderB
        })
      ).rejects.toMatchObject({
        statusCode: 409
      });
    });

    it('should allow the same holder to update/replace their own hold', async () => {
      await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderA
      });

      // Same holder changes selection to testSlot2
      const updatedHold = await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot2],
        holderId: holderA
      });

      expect(updatedHold.slots).toEqual([testSlot2]);

      // testSlot1 should now be free for holderB
      const holderBHold = await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderB
      });
      expect(holderBHold.slots).toEqual([testSlot1]);
    });

    it('should release a slot hold when requested by the correct holder', async () => {
      const hold = await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderA
      });

      const releaseResult = await releaseSlotHold({
        holdId: hold.holdId,
        holderId: holderA
      });

      expect(releaseResult.released).toBe(true);

      // Now holderB can hold testSlot1
      const holdB = await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderB
      });
      expect(holdB.holdId).toBeDefined();
    });

    it('should reject hold release if attempted by an unauthorized holder (403 Forbidden)', async () => {
      const hold = await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderA
      });

      await expect(
        releaseSlotHold({
          holdId: hold.holdId,
          holderId: holderB // Wrong holder!
        })
      ).rejects.toMatchObject({
        statusCode: 403
      });
    });

    it('should ignore expired holds in active holds query', async () => {
      const db = getDb();
      const expiredHoldRef = db.collection('slot_holds').doc();
      const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      await expiredHoldRef.set({
        holdId: expiredHoldRef.id,
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderA,
        status: SLOT_HOLD_STATUS.ACTIVE,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        expiresAt: pastTime // Expired 5 minutes ago!
      });

      const { heldSlots } = await getActiveHoldsForDate(testDateStr);
      expect(heldSlots).not.toContain(testSlot1);

      // holderB can now claim the slot without conflict
      const holdB = await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderB
      });
      expect(holdB.holdId).toBeDefined();
    });
  });

  // ==========================================
  // 2. Real-Time Availability Service
  // ==========================================
  describe('2. Real-Time Availability (availabilityService.js)', () => {
    it('should calculate availability considering booked, held, and free slots', async () => {
      // 1. Create a confirmed booking for testSlot1
      const res = await request(app).post('/api/bookings').send({
        customerName: 'Existing Booking User',
        mobileNumber: '9876543210',
        date: testDateStr,
        slots: [testSlot1],
        paymentMethod: 'Pay at Spot'
      });
      expect(res.status).toBe(201);

      // 2. Create a hold on testSlot2 by holderA
      await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot2],
        holderId: holderA
      });

      // 3. Query availability for holderB (should see testSlot1 as booked and testSlot2 as held)
      const availabilityForB = await calculateAvailability({
        date: testDateStr,
        currentHolderId: holderB
      });

      expect(availabilityForB.bookedSlots).toContain(testSlot1);
      expect(availabilityForB.heldSlots).toContain(testSlot2);
      expect(availabilityForB.availableSlots).not.toContain(testSlot1);
      expect(availabilityForB.availableSlots).not.toContain(testSlot2);

      // 4. Query availability for holderA (holderA sees their own held slot as NOT held by others)
      const availabilityForA = await calculateAvailability({
        date: testDateStr,
        currentHolderId: holderA
      });

      expect(availabilityForA.heldSlots).not.toContain(testSlot2);
    });

    it('should reflect full day block in availability', async () => {
      const block = await blockSlotService({
        dateStr: testDateStr,
        isFullDay: true,
        reason: 'Annual Maintenance Day',
        blockedBy: 'admin'
      });

      const availability = await calculateAvailability({ date: testDateStr });
      expect(availability.isFullDayBlocked).toBe(true);
      expect(availability.closureReason).toBe('Annual Maintenance Day');
      expect(availability.availableSlots.length).toBe(0);

      // Unblock
      await unblockSlotService(block.id);
      const afterUnblock = await calculateAvailability({ date: testDateStr });
      expect(afterUnblock.isFullDayBlocked).toBe(false);
      expect(afterUnblock.availableSlots.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 3. Availability & Hold REST API Endpoints
  // ==========================================
  describe('3. Availability REST API Endpoints', () => {
    it('GET /api/availability/slots should return real-time availability breakdown', async () => {
      const res = await request(app)
        .get(`/api/availability/slots?date=${testDateStr}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.date).toBe(testDateStr);
      expect(Array.isArray(res.body.data.availableSlots)).toBe(true);
      expect(Array.isArray(res.body.data.bookedSlots)).toBe(true);
      expect(Array.isArray(res.body.data.heldSlots)).toBe(true);
    });

    it('POST /api/availability/hold should create hold via API', async () => {
      const res = await request(app)
        .post('/api/availability/hold')
        .send({
          dateStr: testDateStr,
          slots: [testSlot1],
          holderId: holderA
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.holdId).toBeDefined();
      expect(res.body.data.slots).toEqual([testSlot1]);
    });

    it('POST /api/availability/release-hold should release hold via API', async () => {
      const holdRes = await request(app)
        .post('/api/availability/hold')
        .send({
          dateStr: testDateStr,
          slots: [testSlot1],
          holderId: holderA
        });

      const holdId = holdRes.body.data.holdId;

      const releaseRes = await request(app)
        .post('/api/availability/release-hold')
        .send({
          holdId,
          holderId: holderA
        });

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.success).toBe(true);
      expect(releaseRes.body.data.released).toBe(true);
    });

    it('Admin block & unblock endpoints should protect and restore slots', async () => {
      // 1. Block slot via admin API
      const blockRes = await request(app)
        .post('/api/availability/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateStr: testDateStr,
          slot: testSlot1,
          reason: 'VIP Tournament Booking'
        });

      expect(blockRes.status).toBe(201);
      const blockId = blockRes.body.data.id;

      // 2. User booking attempt on blocked slot should fail (409)
      const bookRes = await request(app).post('/api/bookings').send({
        customerName: 'Blocked Slot User',
        mobileNumber: '9876543210',
        date: testDateStr,
        slots: [testSlot1],
        paymentMethod: 'Pay at Spot'
      });
      expect(bookRes.status).toBe(409);

      // 3. Unblock slot via admin API
      const unblockRes = await request(app)
        .delete(`/api/availability/unblock/${blockId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(unblockRes.status).toBe(200);

      // 4. User booking should now succeed (201)
      const retryBookRes = await request(app).post('/api/bookings').send({
        customerName: 'Unblocked Slot User',
        mobileNumber: '9876543210',
        date: testDateStr,
        slots: [testSlot1],
        paymentMethod: 'Pay at Spot'
      });
      expect(retryBookRes.status).toBe(201);
    });
  });

  // ==========================================
  // 4. Double-Booking Concurrency & Race Condition
  // ==========================================
  describe('4. Transactional Double-Booking Prevention & Concurrency', () => {
    it('should reject booking if slot is held by another user (409 Conflict)', async () => {
      // User A holds testSlot1
      await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderA
      });

      // User B attempts to book testSlot1
      const res = await request(app).post('/api/bookings').send({
        customerName: 'Interloper User',
        mobileNumber: '9876543210',
        date: testDateStr,
        slots: [testSlot1],
        paymentMethod: 'Pay at Spot',
        holderId: holderB
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('currently held by another user');
    });

    it('should allow user with valid hold to successfully convert hold into booking', async () => {
      // User A holds testSlot1
      const hold = await createSlotHold({
        dateStr: testDateStr,
        slots: [testSlot1],
        holderId: holderA
      });

      // User A completes booking with matching holderId & holdId
      const res = await request(app).post('/api/bookings').send({
        customerName: 'Holder User A',
        mobileNumber: '9876543210',
        date: testDateStr,
        slots: [testSlot1],
        paymentMethod: 'Pay at Spot',
        holderId: holderA,
        holdId: hold.holdId
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingId).toBeDefined();

      // Hold should now be CONVERTED
      const db = getDb();
      const holdDoc = await db.collection('slot_holds').doc(hold.holdId).get();
      if (holdDoc.exists) {
        expect(holdDoc.data().status).toBe(SLOT_HOLD_STATUS.CONVERTED);
      }
    });

    it('Atomic Concurrency Race: Two simultaneous bookings for same slot must result in exactly 1 success (201) and 1 conflict (409)', async () => {
      const payload1 = {
        customerName: 'Racer One',
        mobileNumber: '9876543211',
        date: testDateStr,
        slots: [testSlot1],
        paymentMethod: 'Pay at Spot'
      };

      const payload2 = {
        customerName: 'Racer Two',
        mobileNumber: '9876543212',
        date: testDateStr,
        slots: [testSlot1],
        paymentMethod: 'Pay at Spot'
      };

      // Launch both booking requests concurrently via Promise.all
      const [res1, res2] = await Promise.all([
        request(app).post('/api/bookings').send(payload1),
        request(app).post('/api/bookings').send(payload2)
      ]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(201); // Exactly one succeeded
      expect(statuses).toContain(409); // Exactly one failed with 409 Conflict

      const successes = [res1, res2].filter(r => r.status === 201);
      const conflicts = [res1, res2].filter(r => r.status === 409);

      expect(successes.length).toBe(1);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].body.message).toContain('already booked');
    });
  });

});
