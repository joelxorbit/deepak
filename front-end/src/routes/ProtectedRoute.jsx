import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { useBooking } from '../context/BookingContext';

export const ProtectedRoute = ({ children }) => {
  const { isAdminLoggedIn } = useBooking();

  if (!isAdminLoggedIn) {
    return <Navigate to={ROUTES.ADMIN_LOGIN} replace />;
  }

  return children ? children : <Outlet />;
};
