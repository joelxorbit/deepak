import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminLayout } from '../layouts/AdminLayout';

const AdminLoginPage = lazy(() => import('../pages/admin/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ManageBookings = lazy(() => import('../pages/admin/ManageBookings').then(m => ({ default: m.ManageBookings })));
const BookingHistory = lazy(() => import('../pages/admin/BookingHistory').then(m => ({ default: m.BookingHistory })));
const CustomersPage = lazy(() => import('../pages/admin/CustomersPage').then(m => ({ default: m.CustomersPage })));
const AdminEventsPage = lazy(() => import('../pages/admin/AdminEventsPage').then(m => ({ default: m.AdminEventsPage })));
const EnquiriesPage = lazy(() => import('../pages/admin/EnquiriesPage').then(m => ({ default: m.EnquiriesPage })));
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })));

const AdminPageFallback = () => (
  <div className="space-y-8 animate-pulse p-6">
    <div className="h-8 w-64 bg-surface-variant/60 rounded-xl"></div>
    <div className="h-4 w-96 bg-surface-variant/40 rounded-lg"></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-surface-container-low rounded-3xl"></div>
      ))}
    </div>
  </div>
);

const AdminLayoutWrapper = () => {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
};

export const AdminRoutes = () => {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <Routes>
        <Route path="/" element={<AdminLoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayoutWrapper />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="bookings" element={<ManageBookings />} />
            <Route path="history" element={<BookingHistory />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="enquiries" element={<EnquiriesPage />} />
            <Route path="events" element={<AdminEventsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.ADMIN_DASHBOARD} replace />} />
      </Routes>
    </Suspense>
  );
};
