import React from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { MobileBottomNav } from '../components/common/MobileBottomNav';
import { Footer } from '../components/common/Footer';
import { TrackBookingModal } from '../components/booking/TrackBookingModal';
import { CancelBookingModal } from '../components/booking/CancelBookingModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useBooking } from '../context/BookingContext';
import { ROUTES } from '../constants/routes';

export const PublicLayout = ({ children }) => {
  const { isCreatingBooking } = useBooking();
  const location = useLocation();
  const isHomePage = location.pathname === ROUTES.HOME || location.pathname === '/';

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md selection:bg-primary/20 flex flex-col">
      <Navbar />
      <main className={`flex-grow ${isHomePage ? '' : 'pt-20'}`}>
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
      
      <TrackBookingModal />
      <CancelBookingModal />
      {isCreatingBooking && <LoadingSpinner />}
    </div>
  );
};
