import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';
import { requireAnyAuth } from '../middlewares/authMiddleware.js';
import { validateNotificationQuery } from '../validators/notificationValidator.js';

const router = express.Router();

router.use(requireAnyAuth);

router.get('/', validateNotificationQuery, getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.post('/read-all', markAllAsRead);

export default router;
