import {
  getPublicEventsService,
  getAdminEventsService,
  getEventByIdService,
  addEventService,
  updateEventService,
  publishEventService,
  unpublishEventService,
  archiveEventService,
  deleteEventService,
  uploadEventBannerService
} from '../services/eventService.js';
import { sendSuccess } from '../utils/response.js';

export const getEvents = async (req, res, next) => {
  try {
    const events = await getPublicEventsService();
    return sendSuccess(res, 'Public events retrieved successfully', events);
  } catch (error) {
    next(error);
  }
};

export const getAdminEvents = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const events = await getAdminEventsService({ status, search });
    return sendSuccess(res, 'Admin events retrieved successfully', events);
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req, res, next) => {
  try {
    const isPublic = !req.admin;
    const event = await getEventByIdService(req.params.id, isPublic);
    return sendSuccess(res, 'Event retrieved successfully', event);
  } catch (error) {
    next(error);
  }
};

export const addEvent = async (req, res, next) => {
  try {
    const newEvent = await addEventService(req.body, req.admin);
    return sendSuccess(res, 'Event created successfully', newEvent, 201);
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const event = await updateEventService(req.params.id, req.body, req.admin);
    return sendSuccess(res, 'Event updated successfully', event);
  } catch (error) {
    next(error);
  }
};

export const publishEvent = async (req, res, next) => {
  try {
    const event = await publishEventService(req.params.id, req.admin);
    return sendSuccess(res, 'Event published successfully', event);
  } catch (error) {
    next(error);
  }
};

export const unpublishEvent = async (req, res, next) => {
  try {
    const event = await unpublishEventService(req.params.id, req.admin);
    return sendSuccess(res, 'Event unpublished successfully', event);
  } catch (error) {
    next(error);
  }
};

export const archiveEvent = async (req, res, next) => {
  try {
    const event = await archiveEventService(req.params.id, req.admin);
    return sendSuccess(res, 'Event archived successfully', event);
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const result = await deleteEventService(req.params.id, req.admin);
    return sendSuccess(res, 'Event deleted successfully', result);
  } catch (error) {
    next(error);
  }
};

export const uploadBanner = async (req, res, next) => {
  try {
    const uploadResult = await uploadEventBannerService(req.body);
    return sendSuccess(res, 'Event banner uploaded successfully', uploadResult);
  } catch (error) {
    next(error);
  }
};
