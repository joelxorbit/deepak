import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { BookingProvider } from './context/BookingContext';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CustomerAuthProvider>
          <BookingProvider>
            <AppRoutes />
          </BookingProvider>
        </CustomerAuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
