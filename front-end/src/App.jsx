import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { BookingProvider } from './context/BookingContext';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <BookingProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BookingProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
