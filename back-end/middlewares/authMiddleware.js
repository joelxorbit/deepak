import jwt from 'jsonwebtoken';
import { findAdminById } from '../repositories/adminRepository.js';
import { ENV } from '../config/env.js';
import { sendError } from '../utils/response.js';

export const requireAdmin = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.elite_pitch_token) {
      token = req.cookies.elite_pitch_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Authentication token missing. Access denied.', null, 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Session expired. Please log in again.', null, 401);
      }
      return sendError(res, 'Invalid authentication token.', null, 401);
    }

    const admin = await findAdminById(decoded.adminId);
    if (!admin) {
      return sendError(res, 'Admin account not found or deactivated.', null, 401);
    }

    if (!['admin', 'superadmin'].includes(admin.role)) {
      return sendError(res, 'Permission denied. Admin role required.', null, 403);
    }

    const { password, ...adminWithoutPassword } = admin;
    req.admin = { ...adminWithoutPassword, _id: admin.id };
    next();
  } catch (error) {
    next(error);
  }
};

export const protectAdmin = requireAdmin;

export const requireCustomer = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.elite_pitch_customer_token) {
      token = req.cookies.elite_pitch_customer_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Authentication token missing. Please log in.', null, 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Session expired. Please log in again.', null, 401);
      }
      return sendError(res, 'Invalid authentication token.', null, 401);
    }

    // In a real scenario we'd fetch the customer from DB, but for now we can just attach the decoded payload
    // if we just need the basic details like id, username, name to allow booking.
    req.customer = { _id: decoded.customerId, username: decoded.username, name: decoded.name };
    next();
  } catch (error) {
    next(error);
  }
};
