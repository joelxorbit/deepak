import {
  calculateAvailability,
  getBlockedSlotsService,
  blockSlotService,
  unblockSlotService
} from '../services/availabilityService.js';
import {
  createSlotHold,
  releaseSlotHold
} from '../services/holdService.js';
import { sendSuccess } from '../utils/response.js';

export const getAvailability = async (req, res, next) => {
  try {
    const date = req.query.date || req.query.dateStr;
    const sportId = req.query.sportId || 'football-5v5';
    const currentHolderId = req.query.holderId || null;

    const data = await calculateAvailability({ date, sportId, currentHolderId });
    return sendSuccess(res, 'Availability retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export const createHold = async (req, res, next) => {
  try {
    const { dateStr, slots, sportId, holderId, durationMinutes } = req.body;
    const data = await createSlotHold({
      dateStr,
      slots,
      sportId,
      holderId,
      durationMinutes
    });
    return sendSuccess(res, 'Temporary slot hold created successfully', data, 201);
  } catch (error) {
    next(error);
  }
};

export const releaseHold = async (req, res, next) => {
  try {
    const { holdId, holderId, dateStr, slots } = req.body;
    const data = await releaseSlotHold({
      holdId,
      holderId,
      dateStr,
      slots
    });
    return sendSuccess(res, data.message || 'Slot hold released', data);
  } catch (error) {
    next(error);
  }
};

export const getBlockedSlots = async (req, res, next) => {
  try {
    const data = await getBlockedSlotsService();
    return sendSuccess(res, 'Blocked slots retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export const blockSlot = async (req, res, next) => {
  try {
    const blockedBy = req.admin ? (req.admin.username || 'admin') : 'admin';
    const data = await blockSlotService({
      ...req.body,
      blockedBy
    });
    return sendSuccess(res, 'Slot blocked successfully', data, 201);
  } catch (error) {
    next(error);
  }
};

export const unblockSlot = async (req, res, next) => {
  try {
    const blockId = req.params.id;
    const data = await unblockSlotService(blockId);
    return sendSuccess(res, 'Slot unblocked successfully', data);
  } catch (error) {
    next(error);
  }
};
