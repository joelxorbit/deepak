import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { PublicRoutes } from './PublicRoutes';
import { AdminRoutes } from './AdminRoutes';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path={`${ROUTES.ADMIN}/*`} element={<AdminRoutes />} />
      <Route path="/*" element={<PublicRoutes />} />
    </Routes>
  );
};
