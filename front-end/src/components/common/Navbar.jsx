import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import {
  fetchNotificationsService,
  fetchUnreadCountService,
  markNotificationReadService,
  markAllNotificationsReadService
} from '../../services/notificationService';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, customer } = useCustomerAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Close mobile drawer and dropdowns on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotifOpen(false);
  }, [location]);

  // Handle sticky scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch unread notification count if customer is authenticated
  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await fetchUnreadCountService();
      setUnreadCount(count);
    } catch (e) {
      // Suppress background poll errors
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  const handleOpenNotifications = async () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen && isAuthenticated) {
      try {
        setLoadingNotifs(true);
        const data = await fetchNotificationsService({ limit: 10 });
        setNotifications(data || []);
      } catch (e) {
        // Suppress notification load errors
      } finally {
        setLoadingNotifs(false);
      }
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markNotificationReadService(id);
      setNotifications(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadService();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      // Ignore
    }
  };

  const navLinks = [
    { label: 'Home', path: ROUTES.HOME },
    { label: 'About', path: ROUTES.ABOUT },
    { label: 'Booking', path: ROUTES.BOOKING },
    { label: 'My Account', path: ROUTES.ACCOUNT },
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
          
          {/* Customer Notification Bell (When Authenticated) */}
          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                aria-label="Customer Notifications"
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all border border-white/10 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-950">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <>
                  <div
                    onClick={() => setIsNotifOpen(false)}
                    className="fixed inset-0 z-40"
                  />
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden text-white animate-fade-in">
                    <div className="p-3.5 bg-slate-950/80 border-b border-white/10 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400 text-lg">notifications</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Notifications</span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                      {loadingNotifs ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Loading notifications...
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div
                            key={n.id || n._id}
                            onClick={() => !n.isRead && handleMarkOneRead(n.id || n._id)}
                            className={`p-3.5 space-y-1 transition-colors cursor-pointer hover:bg-slate-800/60 ${
                              !n.isRead ? 'bg-emerald-500/10' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className={`text-xs font-bold ${!n.isRead ? 'text-emerald-400' : 'text-slate-200'}`}>
                                {n.title}
                              </span>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {typeof n.createdAt === 'string' ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400">
                          No notifications yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

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
