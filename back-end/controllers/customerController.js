import {
  getCustomersService,
  getCustomerByIdentifierService
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
