import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { BookingProvider } from './context/BookingContext';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <BookingProvider>
          <AppRoutes />
        </BookingProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
