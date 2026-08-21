import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { signInWithGooglePopup } from '../../config/firebase';
import { useToast } from '../../context/ToastContext';
import { ROUTES } from '../../constants/routes';

export const CustomerSignupPage = () => {
  const navigate = useNavigate();
  const { signupCustomer, loginWithGoogle, customer, isCustomerLoading } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google specific state
  const [googleCredential, setGoogleCredential] = useState(null);

  useEffect(() => {
    if (!isCustomerLoading && customer) {
      navigate(ROUTES.BOOKING, { replace: true });
    }
  }, [customer, isCustomerLoading, navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (phone.length !== 10) {
      setError('Mobile number must be exactly 10 digits.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await signupCustomer(name, username, phone, password);
      addToast('Account created successfully.', 'success');
      navigate(ROUTES.BOOKING);
    } catch (err) {
      const msg = err?.message || 'Signup failed.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const result = await signInWithGooglePopup();
      const token = await result.user.getIdToken();
      await loginWithGoogle(token);
      addToast('Logged in with Google successfully.', 'success');
      navigate(ROUTES.BOOKING);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Google signup failed.';
      setError(msg);
      addToast(msg, 'error');
    }
  };

  if (isCustomerLoading) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl border border-black/5 text-center space-y-6">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">person_add</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-2xl font-extrabold text-on-surface">Create Account</h1>
          <p className="text-on-surface-variant font-body-md text-sm mt-1">
            Join Elite Pitch to book your slots quickly
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-error-container text-on-error-container text-xs font-label-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Deepak Jose"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Username *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. john_doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Mobile Number *
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-label-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-2xl px-4 py-3 text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-12"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] bg-primary text-on-primary font-label-bold py-3.5 rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary-dark hover:scale-[1.01] active:scale-[0.99] transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-outline-variant"></div>
          <span className="flex-shrink-0 mx-4 text-on-surface-variant text-xs font-label-bold uppercase">Or</span>
          <div className="flex-grow border-t border-outline-variant"></div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full min-h-[44px] bg-white text-on-surface border border-outline-variant font-label-bold py-3 rounded-full hover:bg-surface-container-low transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>

        <p className="text-sm text-on-surface-variant pt-2">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-bold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};
