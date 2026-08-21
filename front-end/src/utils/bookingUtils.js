import { getFormattedDateString } from './dateUtils';

export const TIME_SLOTS = [
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

export const SLOT_PRICE_PER_HOUR = 300;
export const GST_PERCENTAGE = 0;

export const calculateBookingPricing = (slotsCount = 0) => {
  const count = Number(slotsCount) || 0;
  const slotPrice = SLOT_PRICE_PER_HOUR;
  const subtotal = count * slotPrice;
  const gstAmount = 0;
  const totalAmount = subtotal;

  return {
    slotPrice,
    slotCount: count,
    subtotal,
    gstAmount,
    totalAmount
  };
};

export const parseSlotToDate = (bookingDateStr, slotString) => {
  const dateObj = new Date(bookingDateStr);
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

export const isPastSlotForToday = (slotString, bookingDateStr) => {
  if (!bookingDateStr || !slotString) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  if (bookingDateStr !== todayStr) return false;

  const slotStartDate = parseSlotToDate(bookingDateStr, slotString);
  const now = new Date();
  
  // If slot start time is on or before current time, mark as past/running
  return slotStartDate.getTime() <= now.getTime();
};

export const generateBookingId = (date, sequenceNumber = 1) => {
  const dateStr = getFormattedDateString(date);
  const seqStr = String(sequenceNumber).padStart(4, '0');
  return `BK-${dateStr}-${seqStr}`;
};

export const areSlotsConsecutive = (selectedSlots) => {
  if (!selectedSlots || selectedSlots.length <= 1) return true;
  
  const indices = selectedSlots
    .map(slot => TIME_SLOTS.indexOf(slot))
    .filter(index => index !== -1)
    .sort((a, b) => a - b);
    
  for (let i = 0; i < indices.length - 1; i++) {
    if (indices[i + 1] - indices[i] !== 1) {
      return false;
    }
  }
  return true;
};

export const isSlotAvailable = (slot, bookedSlots) => {
  if (!bookedSlots || !Array.isArray(bookedSlots)) return true;
  return !bookedSlots.includes(slot);
};

export const formatSlotLabel = (slot) => {
  return slot || '';
};
