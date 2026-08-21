import {
  findCustomerById,
  findCustomerByUsername,
  findCustomerByEmail,
  getCustomersWithPagination
} from '../repositories/customerRepository.js';
import { getBookingsCollection, getCustomersCollection } from '../config/firestoreCollections.js';
import { admin } from '../config/firebase.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const getCustomersService = async (search) => {
  const result = await getCustomersWithPagination({ search, limit: 100 });
  
  // Format to match exact response required by frontend
  return result.data.map(c => ({
    id: c.id,
    _id: c.id,
    name: c.name,
    username: c.username,
    totalBookings: Array.isArray(c.bookingHistory) ? c.bookingHistory.length : 0,
    createdAt: c.createdAt
  }));
};

export const getCustomerByIdentifierService = async (identifier) => {
  let customer = await findCustomerByUsername(identifier);
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

export const signupCustomerService = async ({ name, username, phone, password }) => {
  const existingCustomer = await findCustomerByUsername(username);
  if (existingCustomer) {
    const error = new Error('Customer with this username already exists');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const nowISO = new Date().toISOString();
  
  const customerDocRef = getCustomersCollection().doc();
  const customerId = customerDocRef.id;

  const newCustomer = {
    name,
    username: username.trim().toLowerCase(),
    phone: phone || null,
    password: hashedPassword,
    bookingHistory: [],
    searchTokens: [name.toLowerCase(), username.trim().toLowerCase()],
    createdAt: nowISO,
    updatedAt: nowISO
  };

  await customerDocRef.set(newCustomer);

  const token = jwt.sign(
    { customerId, username: newCustomer.username, name },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );

  return { token, customer: { _id: customerId, id: customerId, name, username: newCustomer.username } };
};

export const loginCustomerService = async ({ username, password }) => {
  const customer = await findCustomerByUsername(username);
  if (!customer) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  if (!customer.password) {
    const error = new Error('Invalid account state. Please contact support.');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, customer.password);
  if (!isMatch) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    { customerId: customer.id, username: customer.username, name: customer.name },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );

  return { token, customer: { _id: customer.id, id: customer.id, name: customer.name, username: customer.username } };
};

export const googleAuthCustomerService = async ({ token, username }) => {
  let payload;
  try {
    payload = await admin.auth().verifyIdToken(token);
  } catch (err) {
    const error = new Error('Invalid Google Token');
    error.statusCode = 401;
    throw error;
  }

  const { email, name, sub: googleId } = payload;
  
  // 1. Check if user already exists by email
  let customer = await findCustomerByEmail(email);

  // 2. Check if user exists by username (if provided and they don't exist by email)
  if (!customer && username) {
    customer = await findCustomerByUsername(username);
    // Link google account to existing username account if found
    if (customer) {
      const docRef = getCustomersCollection().doc(customer.id);
      await docRef.update({ email, googleId });
    }
  }

  // 3. Create new user if still not found
  if (!customer) {
    let finalUsername = username;
    
    // Auto-generate username from name if not provided
    if (!finalUsername) {
      let baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (baseUsername.length < 3) baseUsername = 'user' + baseUsername;
      
      let exists = await findCustomerByUsername(baseUsername);
      if (exists) {
        baseUsername = baseUsername + Math.floor(1000 + Math.random() * 9000);
      }
      finalUsername = baseUsername;
    } else {
      const existingUsername = await findCustomerByUsername(finalUsername);
      if (existingUsername) {
        const error = new Error('This username is already registered to another account.');
        error.statusCode = 409;
        throw error;
      }
    }

    const nowISO = new Date().toISOString();
    const customerDocRef = getCustomersCollection().doc();
    const customerId = customerDocRef.id;

    customer = {
      id: customerId,
      name,
      email,
      username: finalUsername.trim().toLowerCase(),
      googleId,
      bookingHistory: [],
      searchTokens: [name.toLowerCase(), finalUsername.trim().toLowerCase(), email.toLowerCase()],
      createdAt: nowISO,
      updatedAt: nowISO
    };
    await customerDocRef.set(customer);
  }

  // Issue our own JWT
  const authToken = jwt.sign(
    { customerId: customer.id, username: customer.username, name: customer.name },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );

  return { token: authToken, customer: { _id: customer.id, id: customer.id, name: customer.name, username: customer.username, email: customer.email } };
};
