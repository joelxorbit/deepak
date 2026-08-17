import { TIME_SLOTS_ORDER } from './constants.js';

export const normalizePhone = (phoneStr) => {
  if (!phoneStr || typeof phoneStr !== 'string') return '';
  const digitsOnly = phoneStr.replace(/\D/g, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.slice(1);
  }
  if (digitsOnly.length > 10) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly;
};

export const parseSlotToDateTime = (bookingDate, slotString) => {
  const dateObj = new Date(bookingDate);
  const timePart = slotString.split(' - ')[0].trim();
  const match = timePart.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return dateObj;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  dateObj.setHours(hours, minutes, 0, 0);
  return dateObj;
};

export const normalizeSlotString = (slot) => {
  if (typeof slot !== 'string') return slot;
  return slot.trim();
};

export const normalizeSlots = (slots) => {
  if (!Array.isArray(slots)) return [];
  return slots.map(normalizeSlotString);
};

export const generateSearchTokens = (...strings) => {
  const tokens = new Set();
  for (const str of strings) {
    if (!str || typeof str !== 'string') continue;
    const clean = str.toLowerCase().trim();
    if (!clean) continue;
    tokens.add(clean);
    
    // Generate prefixes
    for (let i = 1; i <= clean.length; i++) {
      tokens.add(clean.substring(0, i));
    }

    // Split words
    const words = clean.split(/\s+/);
    for (const word of words) {
      if (!word) continue;
      tokens.add(word);
      for (let i = 1; i <= word.length; i++) {
        tokens.add(word.substring(0, i));
      }
    }
  }
  return Array.from(tokens);
};
