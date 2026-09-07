import {
  getUserNotificationsService,
  getUnreadCountService,
  markAsReadService,
  markAllAsReadService
} from '../services/notificationService.js';
import { NOTIFICATION_RECIPIENT_TYPE } from '../utils/constants.js';
import { sendSuccess, sendError } from '../utils/response.js';

const getRecipientContext = (req) => {
  if (req.admin) {
    return {
      recipientType: NOTIFICATION_RECIPIENT_TYPE.ADMIN,
      recipientId: 'admin',
      recipientPhone: null,
      recipientEmail: null,
      user: req.admin.username || req.admin.name || 'admin'
    };
  }
  if (req.customer) {
    return {
      recipientType: NOTIFICATION_RECIPIENT_TYPE.CUSTOMER,
      recipientId: req.customer.id || req.customer._id || req.customer.customerId,
      recipientPhone: req.customer.phone || null,
      recipientEmail: req.customer.email || null,
      user: req.customer.name || req.customer.customerName || 'customer'
    };
  }
  return null;
};

export const getNotifications = async (req, res, next) => {
  try {
    const recipient = getRecipientContext(req);
    if (!recipient) {
      return sendError(res, 'Authentication required to access notifications.', null, 401);
    }

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    let isRead = undefined;
    if (req.query.isRead === 'true' || req.query.isRead === true) isRead = true;
    if (req.query.isRead === 'false' || req.query.isRead === false) isRead = false;

    const notifications = await getUserNotificationsService({
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      recipientPhone: recipient.recipientPhone,
      recipientEmail: recipient.recipientEmail,
      isRead,
      limit
    });

    return sendSuccess(res, 'Notifications retrieved successfully', notifications);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const recipient = getRecipientContext(req);
    if (!recipient) {
      return sendError(res, 'Authentication required to access notification count.', null, 401);
    }

    const result = await getUnreadCountService({
      recipientType: recipient.recipientType,
      recipientId: recipient.recipientId,
      recipientPhone: recipient.recipientPhone,
      recipientEmail: recipient.recipientEmail
    });

    return sendSuccess(res, 'Unread notification count retrieved', result);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const recipient = getRecipientContext(req);
    if (!recipient) {
      return sendError(res, 'Authentication required.', null, 401);
    }

    const { id } = req.params;
    if (!id) {
      return sendError(res, 'Notification ID is required.', null, 400);
    }

    const updated = await markAsReadService(id, recipient);
    return sendSuccess(res, 'Notification marked as read', updated);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const recipient = getRecipientContext(req);
    if (!recipient) {
      return sendError(res, 'Authentication required.', null, 401);
    }

    const result = await markAllAsReadService(recipient);
    return sendSuccess(res, 'All notifications marked as read', result);
  } catch (error) {
    next(error);
  }
};
