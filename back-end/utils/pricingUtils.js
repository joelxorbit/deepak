/**
 * Server-Side Currency & Pricing Utilities
 * Pure financial calculations with zero floating-point errors, strict validation,
 * and rejection of NaN, Infinity, negative values, and non-numeric inputs.
 */

/**
 * Validates whether an input is a finite, non-negative numerical amount.
 * @param {any} amount
 * @returns {boolean}
 */
export const isValidAmount = (amount) => {
  if (typeof amount !== 'number' && typeof amount !== 'string') return false;
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num) || num < 0) return false;
  return true;
};

/**
 * Safely rounds a currency number to 2 decimal places (or whole rupees for INR).
 * Eliminates JavaScript floating point precision issues (e.g. 0.1 + 0.2 = 0.30000000000000004).
 * @param {number|string} amount
 * @param {number} decimals
 * @returns {number}
 */
export const roundToCurrency = (amount, decimals = 0) => {
  if (!isValidAmount(amount)) {
    throw new Error(`Invalid monetary amount provided: ${amount}`);
  }
  const num = Number(amount);
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
};

/**
 * Calculates advance required and remaining balance given a total amount and fixed advance amount.
 * Authoritative Rule:
 *   advanceRequired = min(fixedAdvanceAmount, totalAmount)
 *   balanceDue = max(0, totalAmount - advanceRequired)
 *
 * @param {number} totalAmount
 * @param {number} [fixedAdvanceAmount=200]
 * @returns {{ advanceRequired: number, balanceDue: number }}
 */
export const calculateFixedAdvanceAndBalance = (totalAmount, fixedAdvanceAmount) => {
  if (!isValidAmount(totalAmount)) {
    throw new Error(`Invalid total amount for advance calculation: ${totalAmount}`);
  }
  if (!isValidAmount(fixedAdvanceAmount) || Number(fixedAdvanceAmount) <= 0) {
    throw new Error(`Invalid fixed advance amount: ${fixedAdvanceAmount}`);
  }

  const roundedTotal = roundToCurrency(totalAmount);
  const roundedAdvance = roundToCurrency(fixedAdvanceAmount);

  if (roundedTotal === 0) {
    return { advanceRequired: 0, balanceDue: 0 };
  }

  const advanceRequired = roundToCurrency(Math.min(roundedAdvance, roundedTotal));
  const balanceDue = roundToCurrency(Math.max(0, roundedTotal - advanceRequired));

  return { advanceRequired, balanceDue };
};

/**
 * Legacy percentage-based calculation utility (preserved for historical reference/backwards compatibility).
 * @param {number} totalAmount
 * @param {number} [advancePercentage=30]
 * @returns {{ advanceRequired: number, balanceDue: number }}
 */
export const calculateAdvanceAndBalance = (totalAmount, advancePercentage = 30) => {
  if (!isValidAmount(totalAmount)) {
    throw new Error(`Invalid total amount for advance calculation: ${totalAmount}`);
  }
  if (!isValidAmount(advancePercentage) || advancePercentage > 100) {
    throw new Error(`Invalid advance percentage: ${advancePercentage}`);
  }

  const roundedTotal = roundToCurrency(totalAmount);
  if (roundedTotal === 0) {
    return { advanceRequired: 0, balanceDue: 0 };
  }

  if (advancePercentage === 100) {
    return { advanceRequired: roundedTotal, balanceDue: 0 };
  }

  const advanceRequired = roundToCurrency((roundedTotal * advancePercentage) / 100);
  const balanceDue = roundToCurrency(Math.max(0, roundedTotal - advanceRequired));

  return { advanceRequired, balanceDue };
};

/**
 * Calculates a complete server-verified price breakdown (strictly GST-free, Fixed ₹200 Advance).
 * Authoritative Formula:
 *   subtotal = ratePerHour * slotCount
 *   totalAmount = subtotal
 *   fixedAdvanceAmount = 200
 *   advanceRequired = min(fixedAdvanceAmount, totalAmount)
 *   balanceDue = totalAmount - advanceRequired
 *
 * @param {object} params
 * @param {number} params.ratePerHour
 * @param {number} params.slotCount
 * @param {number} [params.fixedAdvanceAmount=200]
 * @returns {{
 *   ratePerHour: number,
 *   slotCount: number,
 *   subtotal: number,
 *   totalAmount: number,
 *   fixedAdvanceAmount: number,
 *   advanceRequired: number,
 *   balanceDue: number
 * }}
 */
export const calculatePricingBreakdown = ({
  ratePerHour,
  slotCount,
  fixedAdvanceAmount
}) => {
  if (!isValidAmount(ratePerHour)) {
    throw new Error(`Invalid rate per hour: ${ratePerHour}`);
  }
  if (!isValidAmount(slotCount) || slotCount <= 0 || !Number.isInteger(Number(slotCount))) {
    throw new Error(`Invalid slot count: ${slotCount}`);
  }
  if (!isValidAmount(fixedAdvanceAmount) || Number(fixedAdvanceAmount) <= 0) {
    throw new Error(`Invalid fixed advance amount: ${fixedAdvanceAmount}`);
  }

  const count = Number(slotCount);
  const rate = roundToCurrency(ratePerHour);
  const subtotal = roundToCurrency(count * rate);
  const totalAmount = subtotal;

  const { advanceRequired, balanceDue } = calculateFixedAdvanceAndBalance(totalAmount, fixedAdvanceAmount);

  return {
    ratePerHour: rate,
    slotCount: count,
    subtotal,
    totalAmount,
    fixedAdvanceAmount: Number(fixedAdvanceAmount),
    advanceRequired,
    balanceDue
  };
};

/**
 * Calculates remaining balance given total amount and amount paid.
 * @param {number} totalAmount
 * @param {number} amountPaid
 * @returns {number}
 */
export const calculateRemainingBalance = (totalAmount, amountPaid) => {
  if (!isValidAmount(totalAmount)) {
    throw new Error(`Invalid total amount: ${totalAmount}`);
  }
  if (!isValidAmount(amountPaid)) {
    throw new Error(`Invalid amount paid: ${amountPaid}`);
  }
  const total = roundToCurrency(totalAmount);
  const paid = roundToCurrency(amountPaid);
  return roundToCurrency(Math.max(0, total - paid));
};
