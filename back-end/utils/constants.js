export const BOOKING_STATUS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected'
};

export const PAYMENT_METHODS = {
  PAY_NOW: 'Pay Now',
  PAY_AT_SPOT: 'Pay at Spot',
  UPI: 'UPI',
  GPAY: 'GPay',
  CASH: 'Cash',
  CARD: 'Card',
  NET_BANKING: 'Net Banking'
};

export const PAYMENT_OPTIONS = {
  ADVANCE: 'ADVANCE',
  FULL: 'FULL',
  CASH: 'CASH'
};

export const PAYMENT_STATUS = {
  // Canonical 9-state payment enum
  UNPAID: 'Unpaid',
  ADVANCE_PENDING: 'Advance Pending',
  ADVANCE_PAID: 'Advance Paid',
  PARTIALLY_PAID: 'Partially Paid',
  FULLY_PAID: 'Fully Paid',
  CASH_PENDING: 'Cash Pending',
  CASH_RECEIVED: 'Cash Received',
  PAYMENT_FAILED: 'Payment Failed',
  PAYMENT_REFUNDED: 'Payment Refunded',

  // Backward-compatibility aliases for legacy code
  PENDING: 'Pending',
  PAID: 'Paid'
};

export const CANCELLATION_ACTOR = {
  CUSTOMER: 'customer',
  ADMIN: 'admin'
};

export const TIME_SLOTS_ORDER = [
  "04:00 AM - 05:00 AM",
  "05:00 AM - 06:00 AM",
  "06:00 AM - 07:00 AM",
  "07:00 AM - 08:00 AM",
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM",
  "08:00 PM - 09:00 PM",
  "09:00 PM - 10:00 PM",
  "10:00 PM - 11:00 PM",
  "11:00 PM - 12:00 AM"
];

export const FIRESTORE_COLLECTIONS = {
  ADMINS: 'admins',
  BOOKINGS: 'bookings',
  CUSTOMERS: 'customers',
  EVENTS: 'events',
  COUNTERS: 'counters',
  AUDIT_LOGS: 'audit_logs',
  IDEMPOTENCY_KEYS: 'idempotency_keys',
  ENQUIRIES: 'enquiries',
  // Reserved for future phases
  SETTINGS: 'settings',
  RATES: 'rates',
  COUPONS: 'coupons',
  SLOT_HOLDS: 'slot_holds',
  BLOCKED_SLOTS: 'blocked_slots',
  NOTIFICATIONS: 'notifications',
  MESSAGE_DELIVERIES: 'message_deliveries'
};

export const NOTIFICATION_TYPES = {
  BOOKING_CREATED: 'BOOKING_CREATED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  ADVANCE_PAYMENT_RECEIVED: 'ADVANCE_PAYMENT_RECEIVED',
  FULL_PAYMENT_RECEIVED: 'FULL_PAYMENT_RECEIVED',
  BALANCE_PAYMENT_UPDATED: 'BALANCE_PAYMENT_UPDATED',
  BOOKING_CANCELLED_BY_ADMIN: 'BOOKING_CANCELLED_BY_ADMIN',
  BOOKING_REVIEWED: 'BOOKING_REVIEWED',
  ENQUIRY_RECEIVED: 'ENQUIRY_RECEIVED',
  ENQUIRY_STATUS_UPDATED: 'ENQUIRY_STATUS_UPDATED',
  EVENT_UPDATE: 'EVENT_UPDATE'
};

export const NOTIFICATION_RECIPIENT_TYPE = {
  CUSTOMER: 'customer',
  ADMIN: 'admin'
};

export const AUDIT_ACTIONS = {
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  BOOKING_CREATE: 'BOOKING_CREATE',
  BOOKING_APPROVE: 'BOOKING_APPROVE',
  BOOKING_REJECT: 'BOOKING_REJECT',
  BOOKING_CANCEL: 'BOOKING_CANCEL',
  PAYMENT_MARK_PAID: 'PAYMENT_MARK_PAID',
  BALANCE_PAYMENT_CONFIRM: 'BALANCE_PAYMENT_CONFIRM',
  EVENT_CREATE: 'EVENT_CREATE',
  EVENT_UPDATE: 'EVENT_UPDATE',
  EVENT_DELETE: 'EVENT_DELETE',
  CUSTOMER_UPDATE: 'CUSTOMER_UPDATE',
  ENQUIRY_CREATE: 'ENQUIRY_CREATE',
  ENQUIRY_STATUS_UPDATE: 'ENQUIRY_STATUS_UPDATE',
  ENQUIRY_DELETE: 'ENQUIRY_DELETE',
  SLOT_BLOCK: 'SLOT_BLOCK',
  SLOT_UNBLOCK: 'SLOT_UNBLOCK',
  RATE_UPDATE: 'RATE_UPDATE',
  COUPON_CREATE: 'COUPON_CREATE',
  COUPON_UPDATE: 'COUPON_UPDATE',
  COUPON_DELETE: 'COUPON_DELETE',
  BOOKING_REVIEW: 'BOOKING_REVIEW',
  BOOKING_CANCEL_ADMIN: 'BOOKING_CANCEL_ADMIN',
  NOTIFICATION_READ_ALL: 'NOTIFICATION_READ_ALL'
};

// Default display-only fallback rates (for legacy records without stored price snapshots)
export const DEFAULT_FALLBACK_SLOT_PRICE = 300;
export const DEFAULT_FALLBACK_ADVANCE_PERCENTAGE = 30;
export const DEFAULT_FIXED_ADVANCE_AMOUNT = 200;
export const DEFAULT_FALLBACK_CANCELLATION_WINDOW_HOURS = 2;

// Aliases for legacy backend code
export const SLOT_PRICE_PER_HOUR = DEFAULT_FALLBACK_SLOT_PRICE;

export const ENQUIRY_STATUS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  IN_PROGRESS: 'In Progress',
  CONVERTED: 'Converted',
  CLOSED: 'Closed',
  // Legacy aliases
  UNREAD: 'Unread',
  READ: 'Read',
  REPLIED: 'Replied'
};

export const MESSAGE_DELIVERY_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED'
};

export const EVENT_STATUS = {
  UPCOMING: 'UPCOMING',
  COMPLETED: 'COMPLETED'
};

export const SLOT_HOLD_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  RELEASED: 'RELEASED',
  CONVERTED: 'CONVERTED'
};

export const DEFAULT_SLOT_HOLD_DURATION_MINUTES = 10;

export const CACHE_TTL_MS = 60 * 1000;

/**
 * Validation helpers to strictly validate statuses without silent fallback to valid state
 */
export const isValidBookingStatus = (status) => {
  if (!status || typeof status !== 'string') return false;
  return Object.values(BOOKING_STATUS).includes(status);
};

export const isValidPaymentStatus = (status) => {
  if (!status || typeof status !== 'string') return false;
  return Object.values(PAYMENT_STATUS).includes(status);
};

export const isValidEnquiryStatus = (status) => {
  if (!status || typeof status !== 'string') return false;
  return Object.values(ENQUIRY_STATUS).includes(status);
};

