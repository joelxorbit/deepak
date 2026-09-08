import jwt from 'jsonwebtoken';
import { findAdminById } from '../repositories/adminRepository.js';
import { findCustomerById } from '../repositories/customerRepository.js';
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

    if (!decoded.adminId) {
      return sendError(res, 'Permission denied. Admin role required.', null, 403);
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
    } else if (req.cookies && req.cookies.elite_pitch_token) {
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

    const customerId = decoded.customerId || decoded.id;
    if (!customerId) {
      return sendError(res, 'Customer token invalid or missing customer identity.', null, 401);
    }

    const customer = await findCustomerById(customerId);
    if (!customer) {
      return sendError(res, 'Customer account not found.', null, 401);
    }

    req.customer = { ...customer, _id: customer.id, customerId: customer.id };
    req.user = req.customer;
    next();
  } catch (error) {
    next(error);
  }
};

export const protectCustomer = requireCustomer;

export const requireAnyAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.elite_pitch_token) {
      token = req.cookies.elite_pitch_token;
    } else if (req.cookies && req.cookies.elite_pitch_customer_token) {
      token = req.cookies.elite_pitch_customer_token;
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

    if (decoded.adminId) {
      const admin = await findAdminById(decoded.adminId);
      if (admin && ['admin', 'superadmin'].includes(admin.role)) {
        const { password, ...adminWithoutPassword } = admin;
        req.admin = { ...adminWithoutPassword, _id: admin.id };
        req.user = req.admin;
        return next();
      }
    }

    const customerId = decoded.customerId || decoded.id;
    if (customerId) {
      const customer = await findCustomerById(customerId);
      if (customer) {
        req.customer = { ...customer, _id: customer.id, customerId: customer.id };
        req.user = req.customer;
        return next();
      }
    }

    return sendError(res, 'Account not found or access unauthorized.', null, 401);
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.elite_pitch_token) {
      token = req.cookies.elite_pitch_token;
    } else if (req.cookies && req.cookies.elite_pitch_customer_token) {
      token = req.cookies.elite_pitch_customer_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET);
    } catch (err) {
      return next();
    }

    if (decoded.adminId) {
      const admin = await findAdminById(decoded.adminId);
      if (admin && ['admin', 'superadmin'].includes(admin.role)) {
        const { password, ...adminWithoutPassword } = admin;
        req.admin = { ...adminWithoutPassword, _id: admin.id };
        req.user = req.admin;
      }
    } else if (decoded.customerId || decoded.id) {
      const customerId = decoded.customerId || decoded.id;
      const customer = await findCustomerById(customerId);
      if (customer) {
        req.customer = { ...customer, _id: customer.id, customerId: customer.id };
        req.user = req.customer;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

