import {
  getCompletedEventsService,
  addEventService,
  updateEventService,
  deleteEventService
} from '../services/eventService.js';
import { sendSuccess } from '../utils/response.js';

export const getCompletedEvents = async (req, res, next) => {
  try {
    const events = await getCompletedEventsService();
    return sendSuccess(res, 'Completed events retrieved successfully', events);
  } catch (error) {
    next(error);
  }
};

export const addEvent = async (req, res, next) => {
  try {
    const newEvent = await addEventService(req.body);
    return sendSuccess(res, 'Event created successfully', newEvent, 201);
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const event = await updateEventService(req.params.id, req.body);
    return sendSuccess(res, 'Event updated successfully', event);
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const result = await deleteEventService(req.params.id);
    return sendSuccess(res, 'Event deleted successfully', result);
  } catch (error) {
    next(error);
  }
};
