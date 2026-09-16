import { getSportsService, getSportByIdService, addSportService } from '../services/sportService.js';
import { sendSuccess } from '../utils/response.js';

export const getSports = async (req, res, next) => {
  try {
    const sports = await getSportsService();
    return sendSuccess(res, 'Sports retrieved successfully', sports);
  } catch (error) {
    next(error);
  }
};

export const getSportById = async (req, res, next) => {
  try {
    const sport = await getSportByIdService(req.params.id);
    return sendSuccess(res, 'Sport retrieved successfully', sport);
  } catch (error) {
    next(error);
  }
};

export const addSport = async (req, res, next) => {
  try {
    const newSport = await addSportService(req.body);
    return sendSuccess(res, 'Sport created successfully', newSport, 201);
  } catch (error) {
    next(error);
  }
};
