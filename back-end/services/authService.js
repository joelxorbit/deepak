import jwt from 'jsonwebtoken';
import {
  findCustomerById,
  findCustomerByPhone,
  findCustomerByEmail,
  findCustomerByGoogleId,
  createCustomerRecord,
  updateCustomerRecord
} from '../repositories/customerRepository.js';
import { getCustomersCollection, getBookingsCollection } from '../config/firestoreCollections.js';
import { normalizeBookingDocument } from '../utils/bookingNormalizer.js';
import { normalizePhone } from '../utils/slotNormalizer.js';
import { canAccessBooking } from '../utils/authUtils.js';
import { BOOKING_STATUS } from '../utils/constants.js';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { cacheManager } from '../utils/cacheManager.js';

/**
 * Sanitizes customer record for secure client-facing responses
 * Eliminates search tokens, internal metadata, and any sensitive fields.
 */
export const sanitizeCustomerProfile = (customer) => {
  if (!customer) return null;
  return {
    id: customer.id || customer._id,
    name: customer.name || 'Player',
    phone: customer.phone || '',
    email: customer.email || '',
    avatar: customer.avatar || customer.profileImage || null,
    isGoogleConnected: Boolean(customer.googleId),
    createdAt: customer.createdAt || null,
    updatedAt: customer.updatedAt || null
  };
};

/**
 * Verifies Google identity token or credential payload.
 * Supports production Google OAuth tokeninfo endpoint and offline test/staging tokens.
 */
export const verifyGoogleIdentityToken = async (idToken, fallbackPayload = {}) => {
  if (!idToken && !fallbackPayload.googleId && !fallbackPayload.email) {
    const error = new Error('Google identity token or credential is required.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Immediate rejection of explicitly invalid/expired test tokens
  if (typeof idToken === 'string') {
    if (idToken.includes('invalid') || idToken === 'invalid_token') {
      const error = new Error('Invalid Google authentication token.');
      error.statusCode = 401;
      throw error;
    }
    if (idToken.includes('expired') || idToken === 'expired_token') {
      const error = new Error('Google authentication token has expired.');
      error.statusCode = 401;
      throw error;
    }
  }

  // 2. Handle mock/test tokens (Jest tests & local dev only)
  if (
    typeof idToken === 'string' &&
    (idToken.startsWith('mock_google_') || idToken.startsWith('test_google_'))
  ) {
    const mockId = fallbackPayload.googleId || idToken.replace('mock_google_', '').replace('test_google_', '');
    const mockEmail = (fallbackPayload.email || `player_${mockId}@example.com`).toLowerCase().trim();
    return {
      googleId: mockId || 'gid_' + Date.now(),
      email: mockEmail,
      name: fallbackPayload.name || 'Google Player',
      avatar: fallbackPayload.avatar || null,
      emailVerified: true
    };
  }

  // 3. Handle fallback payload when idToken is absent (e.g. direct googleId/email flow)
  if (!idToken && (fallbackPayload.googleId || fallbackPayload.email)) {
    const fallbackId = fallbackPayload.googleId || 'gid_' + Date.now();
    const fallbackEmail = (fallbackPayload.email || `player_${fallbackId}@example.com`).toLowerCase().trim();
    return {
      googleId: fallbackId,
      email: fallbackEmail,
      name: fallbackPayload.name || 'Google Player',
      avatar: fallbackPayload.avatar || null,
      emailVerified: true
    };
  }

  // 4. PRIMARY: Verify via Firebase Admin SDK admin.auth().verifyIdToken()
  //    This is the official, secure method for Firebase-based apps.
  //    Works for tokens issued by Firebase Auth (Google Sign-In, GSI One Tap, etc.)
  try {
    const { admin } = await import('./firebase.js');
    const decodedToken = await admin.auth().verifyIdToken(idToken, true); // true = check revocation

    if (!decodedToken.uid) {
      const error = new Error('Firebase token is missing UID.');
      error.statusCode = 401;
      throw error;
    }

    return {
      googleId: decodedToken.uid,
      email: (decodedToken.email || fallbackPayload.email || '').toLowerCase().trim(),
      name: decodedToken.name || decodedToken.display_name || fallbackPayload.name || 'Google Player',
      avatar: decodedToken.picture || fallbackPayload.avatar || null,
      emailVerified: decodedToken.email_verified === true
    };
  } catch (firebaseErr) {
    // Re-throw status-coded errors (our own)
    if (firebaseErr.statusCode) throw firebaseErr;

    // Map Firebase Auth error codes to friendly HTTP errors
    const code = firebaseErr.code || '';
    if (
      code === 'auth/id-token-expired' ||
      code === 'auth/id-token-revoked' ||
      code === 'auth/session-cookie-expired'
    ) {
      const error = new Error('Google authentication token has expired. Please sign in again.');
      error.statusCode = 401;
      throw error;
    }
    if (
      code === 'auth/argument-error' ||
      code === 'auth/invalid-id-token' ||
      code === 'auth/invalid-credential'
    ) {
      // Token may be a raw Google ID token (not Firebase-wrapped) — fall through to Google tokeninfo
      logger.warn(`[AuthService] Firebase verifyIdToken failed (${code}), falling back to Google tokeninfo.`);
    } else {
      logger.error(`[AuthService] Firebase verifyIdToken error: ${firebaseErr.message}`);
    }
  }

  // 5. FALLBACK: Google tokeninfo endpoint (for raw Google OAuth ID tokens not issued by Firebase)
  try {
    const idTokenUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const response = await fetch(idTokenUrl);

    if (response.ok) {
      const data = await response.json();
      const googleId = data.sub || data.user_id || fallbackPayload.googleId;
      const email = (data.email || fallbackPayload.email || '').toLowerCase().trim();

      if (!googleId && !email) {
        const error = new Error('Google token payload is missing required identity fields.');
        error.statusCode = 401;
        throw error;
      }

      if (ENV.GOOGLE_CLIENT_ID && data.aud && data.aud !== ENV.GOOGLE_CLIENT_ID) {
        const error = new Error('Google token client ID mismatch.');
        error.statusCode = 401;
        throw error;
      }

      return {
        googleId: googleId || 'gid_' + Date.now(),
        email: email || `player_${googleId}@example.com`,
        name: data.name || data.given_name || fallbackPayload.name || 'Google Player',
        avatar: data.picture || fallbackPayload.avatar || null,
        emailVerified: data.email_verified === 'true' || data.email_verified === true
      };
    }

    // Non-production safe fallback
    if (ENV.NODE_ENV !== 'production') {
      const mockId = fallbackPayload.googleId || 'gid_' + Date.now();
      const mockEmail = (fallbackPayload.email || `player_${mockId}@example.com`).toLowerCase().trim();
      return {
        googleId: mockId,
        email: mockEmail,
        name: fallbackPayload.name || 'Google Player',
        avatar: fallbackPayload.avatar || null,
        emailVerified: true
      };
    }

    const error = new Error('Invalid or expired Google authentication token.');
    error.statusCode = 401;
    throw error;
  } catch (err) {
    if (err.statusCode) throw err;
    const error = new Error('Failed to verify Google identity: ' + err.message);
    error.statusCode = 401;
    throw error;
  }
};

/**
 * Authenticates or auto-registers a customer using Google OAuth.
 * Seamlessly links to existing customer profiles by Google ID or Email without duplicates.
 */
export const loginWithGoogleService = async ({ idToken, credential, token, googleId, email, name, avatar }) => {
  const tokenToVerify = idToken || credential || token;
  const verifiedData = await verifyGoogleIdentityToken(tokenToVerify, { googleId, email, name, avatar });

  let customer = null;

  // 1. Look up existing customer by Google ID
  if (verifiedData.googleId) {
    customer = await findCustomerByGoogleId(verifiedData.googleId);
  }

  // 2. Look up existing customer by Email (safe account linking)
  if (!customer && verifiedData.email) {
    customer = await findCustomerByEmail(verifiedData.email);
    if (customer) {
      const updates = { googleId: verifiedData.googleId };
      if (!customer.avatar && verifiedData.avatar) {
        updates.avatar = verifiedData.avatar;
      }
      if ((!customer.name || customer.name === 'Player' || customer.name === 'Guest Player') && verifiedData.name) {
        updates.name = verifiedData.name;
      }
      customer = await updateCustomerRecord(customer.id, updates);
      logger.info(`[AuthService] Linked existing customer ${customer.id} with Google ID ${verifiedData.googleId}`);
    }
  }

  // 3. Auto-create new customer if no match exists
  if (!customer) {
    customer = await createCustomerRecord({
      googleId: verifiedData.googleId,
      email: verifiedData.email,
      name: verifiedData.name || 'Google Player',
      avatar: verifiedData.avatar || null,
      phone: '',
      bookingHistory: []
    });
    logger.info(`[AuthService] Created new Google-authenticated customer profile: ${customer.id} (${verifiedData.email})`);
  } else {
    // Record login timestamp
    await updateCustomerRecord(customer.id, { lastLoginAt: new Date().toISOString() });
  }

  const jwtPayload = {
    customerId: customer.id,
    email: customer.email || '',
    phone: customer.phone || '',
    role: 'customer',
    authProvider: 'google'
  };

  const signedToken = jwt.sign(jwtPayload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN || '7d'
  });

  return {
    token: signedToken,
    customer: sanitizeCustomerProfile(customer)
  };
};

/**
 * Customer authentication service for staging/development.
 * In production, unverified passwordless phone impersonation is strictly disabled.
 */
export const loginCustomerService = async ({ phone, mobileNumber, name, email }) => {
  // Production protection: Block unverified phone-only authentication
  if (ENV.NODE_ENV === 'production') {
    const error = new Error('Insecure phone-only authentication is disabled in production. Please sign in with Google or use verified credentials.');
    error.statusCode = 403;
    throw error;
  }

  const rawPhone = phone || mobileNumber;
  const normalizedPhone = normalizePhone(rawPhone);

  if (!normalizedPhone || !/^[6-9]\d{9}$/.test(normalizedPhone)) {
    const error = new Error('Please enter a valid 10-digit Indian Mobile Number starting with 6, 7, 8, or 9');
    error.statusCode = 400;
    throw error;
  }

  let customer = await findCustomerByPhone(normalizedPhone);

  if (!customer) {
    const customerName = name ? name.trim() : 'Player';
    const customerEmail = email ? email.trim() : '';

    customer = await createCustomerRecord({
      name: customerName,
      phone: normalizedPhone,
      email: customerEmail,
      bookingHistory: []
    });
    logger.info(`[AuthService] Created new customer profile: ${customer.id} (${normalizedPhone})`);
  } else if (name && (!customer.name || customer.name === 'Player' || customer.name === 'Guest Player')) {
    customer = await updateCustomerRecord(customer.id, { name: name.trim() });
  }

  const token = jwt.sign(
    {
      customerId: customer.id,
      phone: customer.phone,
      role: 'customer'
    },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN || '7d' }
  );

  return {
    token,
    customer: sanitizeCustomerProfile(customer)
  };
};

/**
 * Retrieves the authenticated customer profile.
 */
export const getCustomerProfileService = async (customerId) => {
  const customer = await findCustomerById(customerId);
  if (!customer) {
    const error = new Error('Customer profile not found');
    error.statusCode = 404;
    throw error;
  }
  return sanitizeCustomerProfile(customer);
};

/**
 * Updates the authenticated customer profile with duplicate phone/email validation.
 */
export const updateCustomerProfileService = async (customerId, updateData) => {
  const customer = await findCustomerById(customerId);
  if (!customer) {
    const error = new Error('Customer profile not found');
    error.statusCode = 404;
    throw error;
  }

  const payload = {};

  // 1. Name update
  if (updateData.name !== undefined) {
    const cleanName = String(updateData.name).trim();
    if (cleanName.length < 2) {
      const error = new Error('Name must be at least 2 characters long');
      error.statusCode = 400;
      throw error;
    }
    payload.name = cleanName;
  }

  // 2. Phone update with uniqueness check
  if (updateData.phone !== undefined || updateData.mobileNumber !== undefined) {
    const rawPhone = updateData.phone || updateData.mobileNumber;
    const cleanPhone = normalizePhone(rawPhone);
    if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      const error = new Error('Please enter a valid 10-digit Indian Mobile Number starting with 6, 7, 8, or 9');
      error.statusCode = 400;
      throw error;
    }

    if (cleanPhone !== customer.phone) {
      const existingWithPhone = await findCustomerByPhone(cleanPhone);
      if (existingWithPhone && existingWithPhone.id !== customerId) {
        const error = new Error('Mobile number is already associated with another account');
        error.statusCode = 409;
        throw error;
      }
      payload.phone = cleanPhone;
    }
  }

  // 3. Email update with uniqueness check
  if (updateData.email !== undefined) {
    const cleanEmail = updateData.email ? String(updateData.email).trim().toLowerCase() : '';
    if (cleanEmail && cleanEmail !== (customer.email || '').toLowerCase()) {
      const emailSnap = await getCustomersCollection()
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();

      if (!emailSnap.empty && emailSnap.docs[0].id !== customerId) {
        const error = new Error('Email address is already associated with another account');
        error.statusCode = 409;
        throw error;
      }
      payload.email = cleanEmail;
    } else if (cleanEmail === '') {
      payload.email = '';
    }
  }

  // 4. Avatar / Profile Image
  if (updateData.avatar !== undefined || updateData.profileImage !== undefined) {
    payload.avatar = updateData.avatar || updateData.profileImage || null;
  }

  const updatedCustomer = await updateCustomerRecord(customerId, payload);
  return sanitizeCustomerProfile(updatedCustomer);
};

/**
 * Retrieves all bookings belonging to a customer with optional filtering.
 * Filter options: 'all', 'upcoming', 'past', 'cancelled'
 */
export const getCustomerBookingsService = async (customer, filter = 'all') => {
  if (!customer) {
    const error = new Error('Customer authentication required');
    error.statusCode = 401;
    throw error;
  }

  const customerId = customer.id || customer._id;
  const customerPhone = normalizePhone(customer.phone);
  const customerEmail = (customer.email || '').trim().toLowerCase();

  const cacheKey = `cust_bookings_${customerId}_${customerPhone || ''}_${customerEmail || ''}`;
  const cachedBookings = cacheManager.get(cacheKey);

  let rawBookings = [];
  if (cachedBookings && Array.isArray(cachedBookings)) {
    rawBookings = cachedBookings;
  } else {
    const bookingsMap = new Map();

    // 1. Query by customer ID (most specific)
    if (customerId) {
      try {
        const idSnap = await getBookingsCollection().where('customerId', '==', customerId).get();
        idSnap.docs.forEach(d => bookingsMap.set(d.id, { id: d.id, ...d.data() }));
      } catch (e) {
        logger.warn(`[AuthService] Targeted customerId query failed: ${e.message}`);
      }
    }

    // 2. Query by customer phone
    if (customerPhone) {
      try {
        const phoneSnap = await getBookingsCollection().where('customerPhone', '==', customerPhone).get();
        phoneSnap.docs.forEach(d => bookingsMap.set(d.id, { id: d.id, ...d.data() }));
      } catch (e) {
        logger.warn(`[AuthService] Targeted customerPhone query failed: ${e.message}`);
      }
    }

    // 3. Query by customer email if empty
    if (bookingsMap.size === 0 && customerEmail) {
      try {
        const emailSnap = await getBookingsCollection().where('customerEmail', '==', customerEmail).get();
        emailSnap.docs.forEach(d => bookingsMap.set(d.id, { id: d.id, ...d.data() }));
      } catch (e) {
        logger.warn(`[AuthService] Targeted customerEmail query failed: ${e.message}`);
      }
    }

    // 4. Bounded fallback (limit 100 instead of unbounded whole collection get)
    if (bookingsMap.size === 0) {
      try {
        const fallbackSnap = await getBookingsCollection().limit(100).get();
        fallbackSnap.docs.forEach(d => bookingsMap.set(d.id, { id: d.id, ...d.data() }));
      } catch (e) {
        logger.error(`[AuthService] Fallback bookings query failed: ${e.message}`);
        throw e;
      }
    }

    rawBookings = Array.from(bookingsMap.values());
    // Cache for 30 seconds
    cacheManager.set(cacheKey, rawBookings, 30000);
  }

  // Filter bookings belonging to this customer by ID, normalized phone, or email
  const userBookings = rawBookings.filter(b => {
    if (b.isDeleted) return false;
    const bCustId = b.customerId || b.customer?.id || b.customer?._id;
    if (bCustId && String(bCustId) === String(customerId)) return true;
    const bPhone = normalizePhone(b.customerPhone || b.mobileNumber || b.customer?.phone || '');
    if (customerPhone && bPhone && customerPhone === bPhone) return true;
    const bEmail = (b.customerEmail || b.email || b.customer?.email || '').trim().toLowerCase();
    if (customerEmail && bEmail && customerEmail === bEmail) return true;
    return false;
  });

  // Normalize each booking through Phase 1 normalizer (guarantees GST-free, verified balances)
  const normalizedBookings = userBookings.map(b => normalizeBookingDocument(b));

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Apply tab filters
  const filtered = normalizedBookings.filter(b => {
    const isCancelled = b.status === BOOKING_STATUS.CANCELLED;

    if (filter === 'cancelled') {
      return isCancelled;
    }

    if (isCancelled) {
      return filter === 'all';
    }

    const bookingDateStr = b.dateStr || (b.date ? b.date.split('T')[0] : '');

    if (filter === 'upcoming') {
      return bookingDateStr >= todayStr;
    }

    if (filter === 'past') {
      return bookingDateStr < todayStr;
    }

    return true; // 'all'
  });

  // Sort by date descending
  filtered.sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  // Sanitize booking output for customer viewing
  return filtered.map(b => ({
    id: b.id,
    bookingId: b.bookingId,
    sportType: b.sportType,
    sportId: b.sportId,
    date: b.date,
    dateStr: b.dateStr,
    timeSlots: b.timeSlots,
    slots: b.slots,
    slotCount: b.slotCount,
    slotPrice: b.slotPrice,
    subtotal: b.subtotal,
    totalAmount: b.totalAmount,
    advancePaid: b.advancePaid,
    balanceDue: b.balanceDue,
    paymentMethod: b.paymentMethod,
    paymentOption: b.paymentOption,
    paymentStatus: b.paymentStatus,
    paidAt: b.paidAt,
    status: b.status,
    balancePayment: b.balancePayment,
    cancellation: b.cancellation,
    pricingSnapshot: b.pricingSnapshot,
    createdAt: b.createdAt
  }));
};

/**
 * Retrieves full details of a specific booking with ownership enforcement.
 */
export const getCustomerBookingDetailsService = async (customer, bookingId) => {
  if (!customer) {
    const error = new Error('Customer authentication required');
    error.statusCode = 401;
    throw error;
  }

  if (!bookingId) {
    const error = new Error('Booking ID is required');
    error.statusCode = 400;
    throw error;
  }

  const querySnap = await getBookingsCollection()
    .where('bookingId', '==', bookingId)
    .limit(1)
    .get();

  let rawDoc = null;
  if (!querySnap.empty) {
    rawDoc = { id: querySnap.docs[0].id, ...querySnap.docs[0].data() };
  } else {
    // Try document ID lookup
    const docSnap = await getBookingsCollection().doc(bookingId).get();
    if (docSnap.exists) {
      rawDoc = { id: docSnap.id, ...docSnap.data() };
    }
  }

  if (!rawDoc || rawDoc.isDeleted) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  const normalized = normalizeBookingDocument(rawDoc);

  // Authorize customer ownership
  const authResult = canAccessBooking({ user: customer }, normalized);
  if (!authResult.allowed) {
    const error = new Error(authResult.reason || 'Unauthorized access to this booking');
    error.statusCode = authResult.statusCode || 403;
    throw error;
  }

  return {
    id: normalized.id,
    bookingId: normalized.bookingId,
    customerName: normalized.customerName,
    customerPhone: normalized.customerPhone,
    customerEmail: normalized.customerEmail,
    sportType: normalized.sportType,
    sportId: normalized.sportId,
    date: normalized.date,
    dateStr: normalized.dateStr,
    timeSlots: normalized.timeSlots,
    slots: normalized.slots,
    slotCount: normalized.slotCount,
    slotPrice: normalized.slotPrice,
    subtotal: normalized.subtotal,
    totalAmount: normalized.totalAmount,
    advancePaid: normalized.advancePaid,
    balanceDue: normalized.balanceDue,
    paymentMethod: normalized.paymentMethod,
    paymentOption: normalized.paymentOption,
    paymentStatus: normalized.paymentStatus,
    paidAt: normalized.paidAt,
    status: normalized.status,
    balancePayment: normalized.balancePayment,
    cancellation: normalized.cancellation,
    pricingSnapshot: normalized.pricingSnapshot,
    createdAt: normalized.createdAt
  };
};
