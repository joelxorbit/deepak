import {
  getCustomersService,
  getCustomerByIdentifierService,
  signupCustomerService,
  loginCustomerService,
  googleAuthCustomerService
} from '../services/customerService.js';
import { sendSuccess } from '../utils/response.js';

export const getCustomers = async (req, res, next) => {
  try {
    const customers = await getCustomersService(req.query.search);
    return sendSuccess(res, 'Customers directory retrieved successfully', customers);
  } catch (error) {
    next(error);
  }
};

export const getCustomer = async (req, res, next) => {
  try {
    const identifier = req.params.id || req.params.identifier;
    const customer = await getCustomerByIdentifierService(identifier);
    return sendSuccess(res, 'Customer details retrieved successfully', customer);
  } catch (error) {
    next(error);
  }
};

export const signupCustomer = async (req, res, next) => {
  try {
    const { name, username, phone, password } = req.body;
    const { token, customer } = await signupCustomerService({ name, username, phone, password });

    res.cookie('elite_pitch_customer_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return sendSuccess(res, 'Customer registered successfully', { customer, token });
  } catch (error) {
    next(error);
  }
};

export const loginCustomer = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const { token, customer } = await loginCustomerService({ username, password });

    res.cookie('elite_pitch_customer_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return sendSuccess(res, 'Logged in successfully', { customer, token });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { credential, username } = req.body;
    const { token, customer } = await googleAuthCustomerService({ token: credential, username });

    res.cookie('elite_pitch_customer_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return sendSuccess(res, 'Authenticated successfully', { customer, token });
  } catch (error) {
    next(error);
  }
};

export const logoutCustomer = async (req, res, next) => {
  try {
    res.clearCookie('elite_pitch_customer_token');
    return sendSuccess(res, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const customerId = req.customer._id;
    const customer = await getCustomerByIdentifierService(customerId);
    return sendSuccess(res, 'Profile retrieved', customer);
  } catch (error) {
    next(error);
  }
};
