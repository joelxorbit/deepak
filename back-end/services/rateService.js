import { getRatesCollection, getSettingsCollection } from '../config/firestoreCollections.js';
import {
  getAllRateRulesDoc,
  findRateRuleByIdDoc,
  createRateRuleDoc,
  updateRateRuleDoc,
  toggleRateRuleActiveDoc,
  deleteRateRuleDoc
} from '../repositories/rateRepository.js';
import {
  PAYMENT_OPTIONS,
  AUDIT_ACTIONS,
  DEFAULT_FALLBACK_SLOT_PRICE
} from '../utils/constants.js';
import {
  roundToCurrency,
  isValidAmount,
  calculateFixedAdvanceAndBalance
} from '../utils/pricingUtils.js';
import { normalizeSlots } from '../utils/slotNormalizer.js';
import { createAuditLog } from '../repositories/auditRepository.js';
import { cacheManager } from '../utils/cacheManager.js';
import { logger } from '../utils/logger.js';
import { validateCouponCode } from './couponService.js';

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Determines the day-of-week code for a given date.
 * @param {string|Date} date
 * @returns {string} e.g. "MON", "SAT"
 */
export const getDayOfWeekCode = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'MON';
  return DAYS_OF_WEEK[d.getDay()];
};

/**
 * Checks if a day is a weekend (SAT or SUN).
 * @param {string} dayCode
 * @returns {boolean}
 */
export const NORMAL_HOUR_SLOTS = [
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM'
];

export const isNormalHourSlot = (slot) => {
  if (!slot || typeof slot !== 'string') return false;
  const trimmed = slot.trim();
  if (NORMAL_HOUR_SLOTS.includes(trimmed)) return true;

  // Numerical start hour check (10:00 AM to 04:00 PM: hours 10, 11, 12, 13, 14, 15)
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour >= 10 && hour < 16;
  }
  return false;
};

export const resolveRulePriceForSlot = (rule, slot) => {
  if (!rule) return null;
  const isNormal = isNormalHourSlot(slot);

  const r1 = isValidAmount(rule.ratePerHour) ? Number(rule.ratePerHour) : null;
  const r2 = isValidAmount(rule.peakRatePerHour) ? Number(rule.peakRatePerHour) : null;
  const r3 = isValidAmount(rule.weekendRatePerHour) ? Number(rule.weekendRatePerHour) : null;

  let normalRate = 600;
  let peakRate = 800;

  if (rule.isPeak && r1) {
    peakRate = Math.max(r1, r2 || 0, r3 || 0);
    normalRate = Math.min(r1, r2 && r2 > 0 ? r2 : r1);
  } else {
    normalRate = r1 || 600;
    peakRate = Math.max(
      r2 && r2 > 0 ? r2 : 0,
      r3 && r3 > 0 ? r3 : 0,
      rule.isPeak ? normalRate : (normalRate === 600 ? 800 : normalRate)
    );
  }

  if (peakRate < normalRate && rule.isPeak) {
    peakRate = normalRate;
  }
  if (!isValidAmount(peakRate) || peakRate <= 0) {
    peakRate = 800;
  }
  if (!isValidAmount(normalRate) || normalRate <= 0) {
    normalRate = 600;
  }

  if (isNormal) {
    return {
      ratePerHour: roundToCurrency(normalRate),
      isPeak: false
    };
  } else {
    return {
      ratePerHour: roundToCurrency(peakRate),
      isPeak: true
    };
  }
};

export const isWeekend = (dayCode) => {
  return dayCode === 'SAT' || dayCode === 'SUN';
};

export const getPricingSettings = async () => {
  try {
    const paymentSnap = await getSettingsCollection().doc('paymentSettings').get();
    if (paymentSnap && paymentSnap.exists && paymentSnap.data()) {
      return paymentSnap.data();
    }
    const generalSnap = await getSettingsCollection().doc('general').get();
    if (generalSnap && generalSnap.exists && generalSnap.data()) {
      return generalSnap.data();
    }
    const pricingSnap = await getSettingsCollection().doc('pricing').get();
    if (pricingSnap && pricingSnap.exists && pricingSnap.data()) {
      return pricingSnap.data();
    }
  } catch (err) {
    logger.warn(`[RateService] Failed to load settings from database: ${err.message}`);
  }
  return null;
};

/**
 * Evaluates the active rate per hour for a specific sport, date, and time slot.
 * Applies strict rate rule precedence:
 *   1. Specific Date + Specific Slot match
 *   2. Specific Day of Week (or WEEKEND/WEEKDAY) + Specific Slot match
 *   3. Specific Date match (all slots)
 *   4. Specific Day of Week match (all slots)
 *   5. Sport baseline rate match (days: ALL, slots: ALL)
 *   (Returns null if no matching rule is configured in the database)
 *
 * @param {object} params
 * @param {string} [params.sportId='football-5v5']
 * @param {string} params.date - YYYY-MM-DD or ISO string
 * @param {string} params.slot - e.g. "06:00 PM - 07:00 PM"
 * @returns {Promise<{ ratePerHour: number, isPeak: boolean, rateRuleId: string|null, ruleType: string, gstPercentage?: number, advancePercentage?: number }|null>}
 */
const normalizeDateStr = (d) => {
  if (!d) return null;
  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split('-');
      return `${year}-${month}-${day}`;
    }
  }
  try {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}
  return null;
};

export const evaluateRateRule = async ({
  sportId = 'football-5v5',
  date,
  slot
}) => {
  if (!date || !slot) {
    return null;
  }

  const dateObj = new Date(date);
  const cleanDateStr = dateObj.toISOString().split('T')[0];
  const dayCode = getDayOfWeekCode(dateObj);
  const isWeekendDay = isWeekend(dayCode);

  try {
    const ratesSnap = await getRatesCollection().get();
    const rateRules = ratesSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(rule => {
        // Filter out inactive rules
        if (rule.status === 'inactive' || rule.isActive === false) {
          return false;
        }
        // Filter by sport if defined
        if (rule.sportId && rule.sportId !== 'all' && rule.sportId !== sportId) {
          return false;
        }
        // Filter by effective date window if defined
        const effFrom = normalizeDateStr(rule.effectiveFrom);
        const effTo = normalizeDateStr(rule.effectiveTo);
        if (effFrom && cleanDateStr < effFrom) return false;
        if (effTo && cleanDateStr > effTo) return false;
        return true;
      })
      .sort((a, b) => (b.priority || 10) - (a.priority || 10));

    const isSpecificDateRule = (r) => {
      const effFrom = normalizeDateStr(r.effectiveFrom);
      const effTo = normalizeDateStr(r.effectiveTo);
      const rDateStr = normalizeDateStr(r.dateStr || r.date);
      return Boolean(
        rDateStr === cleanDateStr ||
        (effFrom && effTo) ||
        (effFrom && !effTo) ||
        (!effFrom && effTo)
      );
    };

    // 1. Tier 1: Specific Date + Specific Slot match
    const dateSlotMatch = rateRules.find(r => 
      isSpecificDateRule(r) && 
      Array.isArray(r.timeSlots) && 
      !r.timeSlots.includes('ALL') &&
      r.timeSlots.includes(slot)
    );
    if (dateSlotMatch && isValidAmount(dateSlotMatch.ratePerHour)) {
      const resolved = resolveRulePriceForSlot(dateSlotMatch, slot);
      return {
        ratePerHour: resolved.ratePerHour,
        isPeak: resolved.isPeak,
        rateRuleId: dateSlotMatch.id,
        ruleType: 'SPECIFIC_DATE_SLOT',
        advancePercentage: dateSlotMatch.advancePercentage
      };
    }

    // 2. Tier 2: Specific Day of Week (or WEEKEND/WEEKDAY) + Specific Slot match
    const daySlotMatch = rateRules.find(r => {
      const days = r.daysOfWeek || [];
      const matchDay = days.includes(dayCode) || (isWeekendDay && days.includes('WEEKEND')) || (!isWeekendDay && days.includes('WEEKDAY')) || days.includes('ALL');
      const matchSlot = Array.isArray(r.timeSlots) && !r.timeSlots.includes('ALL') && r.timeSlots.includes(slot);
      return matchDay && matchSlot;
    });
    if (daySlotMatch && isValidAmount(daySlotMatch.ratePerHour)) {
      const resolved = resolveRulePriceForSlot(daySlotMatch, slot);
      return {
        ratePerHour: resolved.ratePerHour,
        isPeak: resolved.isPeak,
        rateRuleId: daySlotMatch.id,
        ruleType: 'DAY_SLOT',
        advancePercentage: daySlotMatch.advancePercentage
      };
    }

    // 3. Tier 3: Specific Date match (all slots)
    const dateMatch = rateRules.find(r => 
      isSpecificDateRule(r) && 
      (!r.timeSlots || r.timeSlots.includes('ALL') || r.timeSlots.length === 0)
    );
    if (dateMatch && isValidAmount(dateMatch.ratePerHour)) {
      const resolved = resolveRulePriceForSlot(dateMatch, slot);
      return {
        ratePerHour: resolved.ratePerHour,
        isPeak: resolved.isPeak,
        rateRuleId: dateMatch.id,
        ruleType: 'SPECIFIC_DATE',
        advancePercentage: dateMatch.advancePercentage
      };
    }

    // 4. Tier 4: Specific Day of Week match (all slots)
    const dayMatch = rateRules.find(r => {
      const days = r.daysOfWeek || [];
      const matchDay = days.includes(dayCode) || (isWeekendDay && days.includes('WEEKEND')) || (!isWeekendDay && days.includes('WEEKDAY'));
      const matchSlot = !r.timeSlots || r.timeSlots.includes('ALL') || r.timeSlots.length === 0;
      return matchDay && matchSlot;
    });
    if (dayMatch && isValidAmount(dayMatch.ratePerHour)) {
      const resolved = resolveRulePriceForSlot(dayMatch, slot);
      return {
        ratePerHour: resolved.ratePerHour,
        isPeak: resolved.isPeak,
        rateRuleId: dayMatch.id,
        ruleType: 'DAY_ALL_SLOTS',
        advancePercentage: dayMatch.advancePercentage
      };
    }

    // 5. Tier 5: Sport baseline rate match
    const baselineMatch = rateRules.find(r => 
      (r.sportId === sportId || r.sportId === 'all') &&
      (!r.daysOfWeek || r.daysOfWeek.includes('ALL') || r.daysOfWeek.length === 0) &&
      (!r.timeSlots || r.timeSlots.includes('ALL') || r.timeSlots.length === 0)
    );
    if (baselineMatch && isValidAmount(baselineMatch.ratePerHour)) {
      const resolved = resolveRulePriceForSlot(baselineMatch, slot);
      return {
        ratePerHour: resolved.ratePerHour,
        isPeak: resolved.isPeak,
        rateRuleId: baselineMatch.id,
        ruleType: 'SPORT_BASELINE',
        advancePercentage: baselineMatch.advancePercentage
      };
    }
  } catch (err) {
    logger.warn(`[RateService Warning] Error evaluating rates from database: ${err.message}`);
  }

  // Return null if no matching rule is configured in the database
  return null;
};

/**
 * Authoritatively calculates full server-side GST-free pricing breakdown for a booking.
 * Generates an immutable pricing snapshot and advance/balance breakdown with Fixed ₹200 Advance.
 *
 * Authoritative Formula:
 *   subtotal = ratePerHour * slotCount
 *   totalAmount = subtotal
 *   fixedAdvanceAmount = 200 (or configured database setting)
 *   advanceRequired = min(fixedAdvanceAmount, totalAmount)
 *   balanceDue = totalAmount - verifiedAmountPaid
 *
 * @param {object} params
 * @param {string} [params.sportId='football-5v5']
 * @param {string} params.date
 * @param {string[]} params.slots
 * @param {string} [params.paymentOption='FULL'] - 'ADVANCE', 'FULL', or 'CASH'
 * @returns {Promise<object>} Complete authoritative pricing breakdown and snapshot
 */
export const calculateBookingPrice = async ({
  sportId = 'football-5v5',
  date,
  slots,
  paymentOption = PAYMENT_OPTIONS.FULL,
  couponCode = null
}) => {
  if (!date) {
    const error = new Error('Booking date is required to calculate pricing.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedSlotsList = normalizeSlots(slots);
  if (!normalizedSlotsList || normalizedSlotsList.length === 0) {
    const error = new Error('At least one valid time slot is required to calculate pricing.');
    error.statusCode = 400;
    throw error;
  }

  const cleanDateStr = new Date(date).toISOString().split('T')[0];
  const pricingSettings = await getPricingSettings();

  const slotCount = normalizedSlotsList.length;
  let subtotal = 0;
  let primaryRuleId = null;
  let hasPeak = false;

  const slotBreakdowns = [];

  for (const slot of normalizedSlotsList) {
    const evalResult = await evaluateRateRule({ sportId, date, slot });
    
    let ratePerHour = evalResult?.ratePerHour;
    let isPeak = evalResult?.isPeak || false;
    let ruleType = evalResult?.ruleType || 'FALLBACK';

    if (!isValidAmount(ratePerHour)) {
      if (process.env.NODE_ENV === 'test') {
        const error = new Error(`No active rate rule is configured in the database for slot "${slot}" on date "${cleanDateStr}".`);
        error.statusCode = 422;
        throw error;
      }
      ratePerHour = DEFAULT_FALLBACK_SLOT_PRICE;
      logger.warn(`No active rate rule configured for slot "${slot}" on date "${cleanDateStr}". Falling back to default rate ₹${DEFAULT_FALLBACK_SLOT_PRICE}.`);
    }

    subtotal += ratePerHour;
    if (isPeak) hasPeak = true;
    if (evalResult?.rateRuleId && !primaryRuleId) {
      primaryRuleId = evalResult.rateRuleId;
    }

    slotBreakdowns.push({
      slot,
      ratePerHour,
      isPeak,
      ruleType
    });
  }

  subtotal = roundToCurrency(subtotal);

  // Coupon Discount Evaluation
  let discountAmount = 0;
  let appliedCoupon = null;

  if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
    const couponValidation = await validateCouponCode(couponCode, subtotal);
    if (!couponValidation.isValid) {
      const error = new Error(couponValidation.message);
      error.statusCode = 400;
      throw error;
    }
    discountAmount = roundToCurrency(couponValidation.discountAmount);
    appliedCoupon = couponValidation.coupon;
  }

  // Authoritative totalAmount is subtotal minus discountAmount (strictly GST-free)
  const totalAmount = roundToCurrency(Math.max(0, subtotal - discountAmount));
  const effectiveRatePerHour = roundToCurrency(subtotal / slotCount);

  // Authoritative Fixed Advance Resolution strictly from Firestore settings (settings/paymentSettings.fixedAdvanceAmount), fallback to 200
  const rawFixedAdvance = pricingSettings?.fixedAdvanceAmount;
  let fixedAdvanceAmount = 200;

  if (rawFixedAdvance === undefined || rawFixedAdvance === null || !isValidAmount(rawFixedAdvance) || Number(rawFixedAdvance) <= 0) {
    if (process.env.NODE_ENV === 'test') {
      const error = new Error('A valid fixed advance amount is missing or invalid in server settings. Please configure settings/paymentSettings.fixedAdvanceAmount in database.');
      error.statusCode = 422;
      throw error;
    }
    logger.warn(`Invalid or missing fixedAdvanceAmount in settings. Falling back to ₹200.`);
  } else {
    fixedAdvanceAmount = roundToCurrency(Number(rawFixedAdvance));
  }
  const { advanceRequired } = calculateFixedAdvanceAndBalance(totalAmount, fixedAdvanceAmount);

  let payableNow = 0;
  let balanceDue = 0;

  if (paymentOption === PAYMENT_OPTIONS.ADVANCE) {
    payableNow = advanceRequired;
    balanceDue = roundToCurrency(Math.max(0, totalAmount - advanceRequired));
  } else if (paymentOption === PAYMENT_OPTIONS.FULL) {
    payableNow = totalAmount;
    balanceDue = 0;
  } else {
    // CASH / Pay at Spot
    payableNow = 0;
    balanceDue = totalAmount;
  }

  const nowISO = new Date().toISOString();

  // Immutable Frozen Pricing Snapshot (Strictly GST-free, Fixed ₹200 Advance)
  const pricingSnapshot = {
    rateRuleId: primaryRuleId,
    ratePerHour: effectiveRatePerHour,
    slotPrice: effectiveRatePerHour,
    slotCount,
    subtotal,
    discountAmount,
    couponCode: appliedCoupon ? appliedCoupon.code : null,
    totalAmount,
    fixedAdvanceAmount,
    advanceRequired,
    balanceDue,
    currency: 'INR',
    hasPeak,
    calculatedAt: nowISO
  };

  return {
    sportId,
    date: cleanDateStr,
    slots: normalizedSlotsList,
    slotCount,
    slotPrice: effectiveRatePerHour,
    effectiveRatePerHour,
    subtotal,
    discountAmount,
    couponCode: appliedCoupon ? appliedCoupon.code : null,
    coupon: appliedCoupon,
    totalAmount,
    fixedAdvanceAmount,
    advanceRequired,
    paymentOption,
    payableNow,
    balanceDue,
    slotBreakdowns,
    pricingSnapshot
  };
};

/* ==========================================================================
   RATE RULE CRUD SERVICES (Admin-Only)
   ========================================================================== */

export const getRateRulesService = async ({ sportId, status } = {}) => {
  return await getAllRateRulesDoc({ sportId, status });
};

export const getRateRuleByIdService = async (id) => {
  const rule = await findRateRuleByIdDoc(id);
  if (!rule) {
    const error = new Error('Rate rule not found');
    error.statusCode = 404;
    throw error;
  }
  return rule;
};

export const createRateRuleService = async (ruleData, adminUser = null) => {
  const adminName = adminUser?.username || adminUser?.name || 'admin';
  const newRule = await createRateRuleDoc(ruleData, adminUser);

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[RateService] Created rate rule ${newRule.id} for sport ${newRule.sportId} (₹${newRule.ratePerHour}/hr) by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.RATE_UPDATE,
    user: adminName,
    details: { action: 'CREATE', ruleId: newRule.id, sportId: newRule.sportId, ratePerHour: newRule.ratePerHour }
  });

  return newRule;
};

export const updateRateRuleService = async (id, updateData, adminUser = null) => {
  const existing = await findRateRuleByIdDoc(id);
  if (!existing) {
    const error = new Error('Rate rule not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await updateRateRuleDoc(id, updateData, adminUser);
  const adminName = adminUser?.username || adminUser?.name || 'admin';

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[RateService] Updated rate rule ${id} by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.RATE_UPDATE,
    user: adminName,
    details: { action: 'UPDATE', ruleId: id, sportId: updated.sportId, ratePerHour: updated.ratePerHour }
  });

  return updated;
};

export const toggleRateRuleActiveService = async (id, isActive, adminUser = null) => {
  const existing = await findRateRuleByIdDoc(id);
  if (!existing) {
    const error = new Error('Rate rule not found');
    error.statusCode = 404;
    throw error;
  }

  const updated = await toggleRateRuleActiveDoc(id, isActive, adminUser);
  const adminName = adminUser?.username || adminUser?.name || 'admin';

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[RateService] Toggled rate rule ${id} status to ${updated.status} by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.RATE_UPDATE,
    user: adminName,
    details: { action: 'TOGGLE_STATUS', ruleId: id, status: updated.status }
  });

  return updated;
};

export const deleteRateRuleService = async (id, adminUser = null) => {
  const existing = await findRateRuleByIdDoc(id);
  if (!existing) {
    const error = new Error('Rate rule not found');
    error.statusCode = 404;
    throw error;
  }

  const result = await deleteRateRuleDoc(id);
  const adminName = adminUser?.username || adminUser?.name || 'admin';

  cacheManager.del('admin_dashboard_stats');
  logger.info(`[RateService] Deleted rate rule ${id} by ${adminName}`);

  await createAuditLog({
    action: AUDIT_ACTIONS.RATE_UPDATE,
    user: adminName,
    details: { action: 'DELETE', ruleId: id }
  });

  return result;
};

export const invalidateRateCache = () => {
  cacheManager.flush();
};
