import {
  findCustomerById,
  findCustomerByPhone,
  getCustomersWithPagination
} from '../repositories/customerRepository.js';
import { getBookingsCollection } from '../config/firestoreCollections.js';

export const getCustomersService = async (search) => {
  const result = await getCustomersWithPagination({ search, limit: 100 });
  
  // Format to match exact response required by frontend
  return result.data.map(c => ({
    id: c.id,
    _id: c.id,
    name: c.name,
    phone: c.phone,
    totalBookings: Array.isArray(c.bookingHistory) ? c.bookingHistory.length : 0,
    createdAt: c.createdAt
  }));
};

export const getCustomerByIdentifierService = async (identifier) => {
  let customer = await findCustomerByPhone(identifier);
  if (!customer) {
    customer = await findCustomerById(identifier);
  }

  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  // Populate booking history details
  let bookingHistory = [];
  if (Array.isArray(customer.bookingHistory) && customer.bookingHistory.length > 0) {
    const bookingSnaps = await Promise.all(
      customer.bookingHistory.map(bId => getBookingsCollection().doc(bId).get())
    );
    bookingHistory = bookingSnaps
      .filter(snap => snap.exists)
      .map(snap => ({ id: snap.id, _id: snap.id, ...snap.data() }));
  }

  return {
    ...customer,
    _id: customer.id,
    bookingHistory
  };
};
