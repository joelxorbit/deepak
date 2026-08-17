import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useToast } from '../../context/ToastContext';
import { ROUTES } from '../../constants/routes';

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { loginAdmin, isAdminLoggedIn } = useBooking();
  const { addToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If admin is already logged in, redirect immediately to dashboard
  useEffect(() => {
    if (isAdminLoggedIn) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    }
  }, [isAdminLoggedIn, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await loginAdmin(username, password);
      addToast('Welcome back! Authenticated successfully.', 'success');
      navigate(ROUTES.ADMIN_DASHBOARD);
    } catch (err) {
      const msg = err?.message || 'Please enter valid credentials.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl border border-black/5 text-center space-y-6">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-2xl font-extrabold text-on-surface">Admin Portal</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Elite Pitch Operations & Management
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-error-container text-on-error-container text-xs font-label-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Username *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Enter admin username"
                aria-label="Admin Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                aria-label="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl pl-4 pr-11 py-3 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-3 text-on-surface-variant hover:text-primary transition-colors p-1"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] bg-primary text-on-primary font-label-bold py-3.5 rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary-dark hover:scale-[1.01] active:scale-[0.99] transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">lock_open</span>
            {isSubmitting ? 'Authenticating...' : 'Access Admin Portal'}
          </button>
        </form>

        <button 
          onClick={() => navigate(ROUTES.HOME)}
          className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto pt-2"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span> Return to Public Website
        </button>
      </div>
    </div>
  );
};
