import express from 'express';
import { getSports, getSportById, addSport } from '../controllers/sportController.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/', getSports);
router.get('/:id', getSportById);

// Admin Routes
router.post('/', requireAdmin, addSport);

export default router;
