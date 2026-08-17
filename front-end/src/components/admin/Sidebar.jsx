import React from 'react';
import { useBooking } from '../../context/BookingContext';

export const Sidebar = ({ currentTab, setCurrentTab, navigate }) => {
  const { setIsAdminLoggedIn } = useBooking();

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    navigate('home');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'manage-bookings', label: 'Manage Bookings', icon: 'edit_calendar' },
    { id: 'booking-history', label: 'Booking History', icon: 'history' },
    { id: 'customers', label: 'Customers', icon: 'group' },
    { id: 'enquiries', label: 'Enquiries', icon: 'mail' },
    { id: 'events', label: 'Events', icon: 'event' },
  ];

  return (
    <aside className="w-full md:w-64 bg-inverse-surface text-white flex-shrink-0 flex flex-col justify-between p-6">
      <div>
        <div className="flex items-center gap-3 mb-10 pb-4 border-b border-white/10">
          <img 
            alt="Elite Pitch Logo" 
            className="h-8 w-8 brightness-0 invert" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXnn5j3ELBZ9E2oyXq7qVWS0omnWwwyx3mBUA-2Ha4NtH7XlYxquD3RJLMlekQTnQS4uDXN_WPV1hcTgxiMP_aS92iQ4YnL84t-VSTKNhr3rPaSh0zcezJ2w-d0XqZnXRLeL0ES12I5VjJ8yhgdsVMHpJXmtYZEQ_mvhAoUMiVyQtB3WgjpjfTCRMkedijOmZgePzLVidC1pBP7jq2Jn-2wwTVrzPlwRGCHILynwUzfZZPYNGiL2T-DQ" 
          />
          <div>
            <span className="font-headline-md text-headline-md tracking-tighter text-white block">ELITE PITCH</span>
            <span className="text-[10px] text-primary-fixed uppercase tracking-wider font-bold block">Admin Control</span>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-label-bold text-label-sm transition-colors text-left ${
                  isActive
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-secondary-fixed-dim hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6 border-t border-white/10 mt-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-label-bold text-label-sm text-error-container hover:bg-error/20 transition-colors text-left"
        >
          <span className="material-symbols-outlined text-xl text-error">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
