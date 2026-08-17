import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findAdminByUsername, getAdminsCount, createAdmin } from '../repositories/adminRepository.js';
import { getBookingsCollection, getCustomersCollection, getEnquiriesCollection } from '../config/firestoreCollections.js';
import { ENV } from '../config/env.js';
import { BOOKING_STATUS, PAYMENT_METHODS, PAYMENT_STATUS, AUDIT_ACTIONS, ENQUIRY_STATUS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';
import { cacheManager } from '../utils/cacheManager.js';
import { createAuditLog } from '../repositories/auditRepository.js';

export const loginAdminService = async (username, password) => {
  if (!username || !password) {
    const error = new Error('Username and Password are required');
    error.statusCode = 400;
    throw error;
  }

  let admin = await findAdminByUsername(username);

  if (!admin) {
    const count = await getAdminsCount();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      admin = await createAdmin({
        username,
        password: hashedPassword,
        role: 'admin'
      });
      logger.info(`[AdminService] Bootstrapped default admin user: ${username}`);
    } else {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }
  } else {
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }
  }

  const token = jwt.sign(
    { adminId: admin.id, username: admin.username, role: admin.role },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );

  logger.info(`[AdminService] Admin authenticated: ${username}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.ADMIN_LOGIN,
    user: admin.username,
    details: { adminId: admin.id }
  });

  return {
    token,
    admin: {
      id: admin.id,
      _id: admin.id,
      username: admin.username,
      role: admin.role
    }
  };
};

export const fetchAdminDashboardStatsService = async () => {
  const cacheKey = 'admin_dashboard_stats';
  const cachedStats = cacheManager.get(cacheKey);
  if (cachedStats) {
    return cachedStats;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfWeekStr = startOfWeek.toISOString();

  // Parallel batch fetch for bookings, customers, and enquiries
  const [bookingsSnap, customersSnap, enquiriesSnap] = await Promise.all([
    getBookingsCollection().get(),
    getCustomersCollection().get(),
    getEnquiriesCollection().get()
  ]);

  const allBookings = bookingsSnap.docs.map(doc => doc.data()).filter(b => !b.isDeleted);

  const todayBookingsCount = allBookings.filter(b => b.dateStr === todayStr && b.status !== BOOKING_STATUS.CANCELLED).length;
  const weeklyBookingsCount = allBookings.filter(b => b.createdAt >= startOfWeekStr && b.status !== BOOKING_STATUS.CANCELLED).length;

  // Pending Pay at Spot Filter: paymentMethod == 'Pay at Spot' AND paymentStatus == 'Pending' (independent of booking status!)
  const pendingPayAtSpotBookings = allBookings.filter(b => 
    b.paymentMethod === PAYMENT_METHODS.PAY_AT_SPOT && 
    (b.paymentStatus === PAYMENT_STATUS.PENDING || (!b.paymentStatus && b.status !== BOOKING_STATUS.CANCELLED)) &&
    b.status !== BOOKING_STATUS.CANCELLED &&
    b.status !== BOOKING_STATUS.REJECTED
  );

  const pendingPayAtSpotCount = pendingPayAtSpotBookings.length;
  const pendingPayAtSpotAmount = pendingPayAtSpotBookings.reduce((sum, b) => sum + (b.totalAmount || (b.timeSlots?.length || 1) * 354), 0);

  // Total Booking Earnings (sum totalAmount for non-cancelled bookings)
  const totalEarnings = allBookings
    .filter(b => b.status !== BOOKING_STATUS.CANCELLED && b.status !== BOOKING_STATUS.REJECTED)
    .reduce((sum, b) => sum + (b.totalAmount || (b.timeSlots?.length || 1) * 354), 0);

  const totalCustomersCount = customersSnap.size;

  const allEnquiries = enquiriesSnap.docs.map(d => d.data());
  const totalEnquiriesCount = allEnquiries.length;
  const unreadEnquiriesCount = allEnquiries.filter(e => e.status === ENQUIRY_STATUS.UNREAD).length;

  const stats = {
    todayBookingsCount,
    weeklyBookingsCount,
    pendingPayAtSpotCount,
    pendingPayAtSpotAmount,
    totalCustomersCount,
    totalEarnings,
    totalEnquiriesCount,
    unreadEnquiriesCount
  };

  cacheManager.set(cacheKey, stats, 60 * 1000); // 1-minute TTL
  return stats;
};
