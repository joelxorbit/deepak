import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  customerLoginApi,
  loginWithGoogleApi,
  getProfileApi,
  updateProfileApi,
  customerLogoutApi
} from '../services/authService';

const CustomerAuthContext = createContext();

export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem('elite_pitch_customer_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('elite_pitch_customer_token') || null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Sync token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('elite_pitch_customer_token', token);
    } else {
      localStorage.removeItem('elite_pitch_customer_token');
    }
  }, [token]);

  // Sync customer to localStorage
  useEffect(() => {
    if (customer) {
      localStorage.setItem('elite_pitch_customer_profile', JSON.stringify(customer));
    } else {
      localStorage.removeItem('elite_pitch_customer_profile');
    }
  }, [customer]);

  // Load verified customer profile on initial mount if token exists
  const loadProfile = useCallback(async () => {
    const activeToken = localStorage.getItem('elite_pitch_customer_token');
    if (!activeToken) return null;

    try {
      setIsLoading(true);
      const profile = await getProfileApi();
      setCustomer(profile);
      setAuthError(null);
      return profile;
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setCustomer(null);
        setToken(null);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadProfile();
    }
  }, [token, loadProfile]);

  const loginWithGoogle = useCallback(async (googleAuthData) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const res = await loginWithGoogleApi(googleAuthData);
      setToken(res.token);
      setCustomer(res.customer);
      return res.customer;
    } catch (err) {
      const msg = err.response?.data?.message || 'Google authentication failed. Please try again.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginCustomer = useCallback(async ({ phone, name, email }) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const res = await customerLoginApi({ phone, name, email });
      setToken(res.token);
      setCustomer(res.customer);
      return res.customer;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to authenticate. Please check your phone number.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const updated = await updateProfileApi(profileData);
      setCustomer(updated);
      return updated;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile.';
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logoutCustomer = useCallback(async () => {
    try {
      await customerLogoutApi();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setCustomer(null);
      setToken(null);
      setAuthError(null);
      localStorage.removeItem('elite_pitch_customer_token');
      localStorage.removeItem('elite_pitch_customer_profile');
    }
  }, []);

  const contextValue = useMemo(() => ({
    customer,
    token,
    isAuthenticated: Boolean(token && customer),
    isLoading,
    authError,
    setAuthError,
    loginWithGoogle,
    loginCustomer,
    updateProfile,
    logoutCustomer,
    loadProfile
  }), [
    customer,
    token,
    isLoading,
    authError,
    loginWithGoogle,
    loginCustomer,
    updateProfile,
    logoutCustomer,
    loadProfile
  ]);

  return (
    <CustomerAuthContext.Provider value={contextValue}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
