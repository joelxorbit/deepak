import React, { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { PublicLayout } from '../layouts/PublicLayout';
import { CustomerProtectedRoute } from './CustomerProtectedRoute';

const HomePage = lazy(() => import('../pages/public/HomePage').then(m => ({ default: m.HomePage })));
const AboutPage = lazy(() => import('../pages/public/AboutPage').then(m => ({ default: m.AboutPage })));
const BookingPage = lazy(() => import('../pages/public/BookingPage').then(m => ({ default: m.BookingPage })));
const BookingSuccessPage = lazy(() => import('../pages/public/BookingSuccessPage').then(m => ({ default: m.BookingSuccessPage })));
const EventsPage = lazy(() => import('../pages/public/EventsPage').then(m => ({ default: m.EventsPage })));
const ContactPage = lazy(() => import('../pages/public/ContactPage').then(m => ({ default: m.ContactPage })));
const NotFoundPage = lazy(() => import('../pages/public/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const CustomerLoginPage = lazy(() => import('../pages/public/CustomerLoginPage').then(m => ({ default: m.CustomerLoginPage })));
const CustomerSignupPage = lazy(() => import('../pages/public/CustomerSignupPage').then(m => ({ default: m.CustomerSignupPage })));

const PageFallback = () => (
  <div className="max-w-7xl mx-auto px-4 py-12 space-y-8 animate-pulse">
    <div className="h-8 w-64 bg-surface-variant/60 rounded-xl"></div>
    <div className="h-4 w-96 bg-surface-variant/40 rounded-lg"></div>
    <div className="h-64 w-full bg-surface-container-low rounded-3xl"></div>
  </div>
);

const PublicLayoutWrapper = () => {
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  );
};

export const PublicRoutes = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<PublicLayoutWrapper />}>
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.ABOUT} element={<AboutPage />} />
          <Route path={ROUTES.EVENTS} element={<EventsPage />} />
          <Route path={ROUTES.CONTACT} element={<ContactPage />} />
          <Route path={ROUTES.LOGIN} element={<CustomerLoginPage />} />
          <Route path={ROUTES.SIGNUP} element={<CustomerSignupPage />} />

          <Route element={<CustomerProtectedRoute />}>
            <Route path={ROUTES.BOOKING} element={<BookingPage />} />
            <Route path={ROUTES.BOOKING_SUCCESS} element={<BookingSuccessPage />} />
          </Route>

          <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
