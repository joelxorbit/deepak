import { getAllSportsDoc, findSportById, createSport } from '../repositories/sportRepository.js';
import { logger } from '../utils/logger.js';

export const getSportsService = async () => {
  try {
    return await getAllSportsDoc();
  } catch (error) {
    logger.error(`[SportService] Failed to retrieve sports: ${error.message}`);
    throw error;
  }
};

export const getSportByIdService = async (id) => {
  const sport = await findSportById(id);
  if (!sport) {
    const error = new Error('Sport not found');
    error.statusCode = 404;
    throw error;
  }
  return sport;
};

export const addSportService = async (sportData) => {
  return await createSport(sportData);
};
