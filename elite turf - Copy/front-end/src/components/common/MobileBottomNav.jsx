import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const MobileBottomNav = () => {
  const navItems = [
    { id: 'home', path: ROUTES.HOME, label: 'Home', icon: 'home' },
    { id: 'about', path: ROUTES.ABOUT, label: 'About', icon: 'info' },
    { id: 'events', path: ROUTES.EVENTS, label: 'Events', icon: 'event' },
    { id: 'booking', path: ROUTES.BOOKING, label: 'Booking', icon: 'event_available' },
    { id: 'contact', path: ROUTES.CONTACT, label: 'Contact', icon: 'mail' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full md:hidden z-50 glass-nav bg-surface/90 border-t border-black/5 flex justify-around items-center py-2.5 px-2 shadow-[0px_-10px_30px_rgba(15,23,42,0.08)]">
      {navItems.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          end={item.path === ROUTES.HOME}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center px-3 py-1 rounded-full transition-all duration-200 ${
              isActive
                ? 'bg-primary-container text-on-primary-container font-semibold scale-105'
                : 'text-on-secondary-container hover:text-primary'
            }`
          }
        >
          <span className="material-symbols-outlined text-xl">{item.icon}</span>
          <span className="text-[11px] font-label-sm leading-tight mt-0.5">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
