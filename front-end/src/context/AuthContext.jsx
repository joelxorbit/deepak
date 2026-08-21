import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  customerLoginService,
  customerSignupService,
  customerGoogleAuthService,
  customerLogoutService,
  getCustomerProfileService
} from '../services/customerAuthService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsCustomerLoading(true);
      const data = await getCustomerProfileService();
      if (data && data.success) {
        setCustomer(data.data);
      } else {
        setCustomer(null);
      }
    } catch (err) {
      setCustomer(null);
    } finally {
      setIsCustomerLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const loginCustomer = async (username, password) => {
    try {
      setError(null);
      const res = await customerLoginService(username, password);
      if (res.success) {
        setCustomer(res.data.customer);
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signupCustomer = async (name, username, phone, password) => {
    try {
      setError(null);
      const res = await customerSignupService(name, username, phone, password);
      if (res.success) {
        setCustomer(res.data.customer);
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed';
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async (credential, username = null) => {
    try {
      setError(null);
      const res = await customerGoogleAuthService(credential, username);
      if (res.success) {
        setCustomer(res.data.customer);
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || 'Google Auth failed';
      setError(msg);
      // We throw the full error so the caller can check err.response?.data?.requiresPhone
      throw err;
    }
  };

  const logoutCustomer = async () => {
    try {
      await customerLogoutService();
    } catch (err) {
      console.warn('Logout failed', err);
    } finally {
      setCustomer(null);
    }
  };

  const value = {
    customer,
    isCustomerLoading,
    error,
    loginCustomer,
    signupCustomer,
    loginWithGoogle,
    logoutCustomer,
    fetchProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
