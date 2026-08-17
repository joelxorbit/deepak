import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Handle sticky scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', path: ROUTES.HOME },
    { label: 'About', path: ROUTES.ABOUT },
    { label: 'Booking', path: ROUTES.BOOKING },
    { label: 'Events', path: ROUTES.EVENTS },
    { label: 'Contact', path: ROUTES.CONTACT }
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-slate-950/90 backdrop-blur-md border-b border-white/10 shadow-xl py-3' 
        : 'bg-slate-950/70 backdrop-blur-sm border-b border-white/5 py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <Link 
          to={ROUTES.HOME}
          className="flex items-center gap-3 group" 
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <img 
              alt="Elite Pitch Logo" 
              className="h-full w-full object-contain rounded-lg" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXnn5j3ELBZ9E2oyXq7qVWS0omnWwwyx3mBUA-2Ha4NtH7XlYxquD3RJLMlekQTnQS4uDXN_WPV1hcTgxiMP_aS92iQ4YnL84t-VSTKNhr3rPaSh0zcezJ2w-d0XqZnXRLeL0ES12I5VjJ8yhgdsVMHpJXmtYZEQ_mvhAoUMiVyQtB3WgjpjfTCRMkedijOmZgePzLVidC1pBP7jq2Jn-2wwTVrzPlwRGCHILynwUzfZZPYNGiL2T-DQ" 
            />
          </div>
          <span className="font-bold text-lg tracking-wider text-white uppercase group-hover:text-emerald-400 transition-colors">
            ELITE <span className="text-emerald-500">PITCH</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <NavLink 
              key={link.path}
              to={link.path}
              end={link.path === ROUTES.HOME}
              className={({ isActive }) =>
                `text-xs font-medium tracking-wide uppercase transition-all relative py-1 ${
                  isActive 
                    ? 'text-emerald-400 font-semibold' 
                    : 'text-slate-300 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full animate-fade-in" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Action Controls & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(ROUTES.BOOKING)}
            className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-semibold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-base">calendar_month</span>
            Book Now
          </button>

          {/* Hamburger Menu Toggle (Mobile) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all border border-white/10"
          >
            <span className="material-symbols-outlined text-2xl">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 border-b border-white/10 px-4 pt-3 pb-5 space-y-2 animate-fade-in">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === ROUTES.HOME}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          <button 
            onClick={() => navigate(ROUTES.BOOKING)}
            className="w-full mt-2 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-semibold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md"
          >
            <span className="material-symbols-outlined text-base">calendar_month</span>
            Book Your Slot Now
          </button>
        </div>
      )}
    </nav>
  );
};
