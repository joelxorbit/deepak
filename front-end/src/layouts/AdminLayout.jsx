import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { useBooking } from '../context/BookingContext';
import { NotificationCenter } from '../components/admin/NotificationCenter';

export const AdminLayout = ({ children }) => {
  const { logoutAdmin } = useBooking();
  const navigate = useNavigate();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate(ROUTES.ADMIN_LOGIN);
  };

  const navItems = [
    { id: 'dashboard', path: ROUTES.ADMIN_DASHBOARD, label: 'Dashboard', icon: 'dashboard' },
    { id: 'bookings', path: ROUTES.ADMIN_BOOKINGS, label: 'Manage Bookings', icon: 'event_available' },
    { id: 'history', path: ROUTES.ADMIN_HISTORY, label: 'Booking History', icon: 'history' },
    { id: 'reports', path: ROUTES.ADMIN_REPORTS, label: 'Reports & Analytics', icon: 'analytics' },
    { id: 'customers', path: ROUTES.ADMIN_CUSTOMERS, label: 'Customers', icon: 'group' },
    { id: 'enquiries', path: ROUTES.ADMIN_ENQUIRIES, label: 'Enquiries', icon: 'mail' },
    { id: 'events', path: ROUTES.ADMIN_EVENTS, label: 'Events Showcase', icon: 'event' },
  ];

  return (
    <div className="min-h-screen bg-surface-container-low text-on-background flex flex-col md:flex-row font-body-md">
      {/* Mobile Top Header (Visible < 768px) */}
      <header className="md:hidden sticky top-0 z-40 bg-surface-dark text-white p-4 flex justify-between items-center border-b border-white/10 shadow-md">
        <div 
          onClick={() => navigate(ROUTES.HOME)}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <img 
            alt="Elite Pitch Logo" 
            className="h-8 w-8 object-contain" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXnn5j3ELBZ9E2oyXq7qVWS0omnWwwyx3mBUA-2Ha4NtH7XlYxquD3RJLMlekQTnQS4uDXN_WPV1hcTgxiMP_aS92iQ4YnL84t-VSTKNhr3rPaSh0zcezJ2w-d0XqZnXRLeL0ES12I5VjJ8yhgdsVMHpJXmtYZEQ_mvhAoUMiVyQtB3WgjpjfTCRMkedijOmZgePzLVidC1pBP7jq2Jn-2wwTVrzPlwRGCHILynwUzfZZPYNGiL2T-DQ" 
          />
          <span className="font-display-lg text-lg tracking-tight text-white font-bold">ELITE PITCH</span>
        </div>

        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            aria-label="Toggle Mobile Menu"
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-2xl">
              {isMobileDrawerOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div 
          onClick={() => setIsMobileDrawerOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
        ></div>
      )}

      {/* Mobile Slide Drawer */}
      <aside 
        className={`md:hidden fixed top-0 bottom-0 left-0 z-50 w-72 bg-surface-dark text-white p-6 flex flex-col justify-between transition-transform duration-300 ease-in-out overflow-y-auto ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img 
                alt="Elite Pitch Logo" 
                className="h-8 w-8 object-contain" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXnn5j3ELBZ9E2oyXq7qVWS0omnWwwyx3mBUA-2Ha4NtH7XlYxquD3RJLMlekQTnQS4uDXN_WPV1hcTgxiMP_aS92iQ4YnL84t-VSTKNhr3rPaSh0zcezJ2w-d0XqZnXRLeL0ES12I5VjJ8yhgdsVMHpJXmtYZEQ_mvhAoUMiVyQtB3WgjpjfTCRMkedijOmZgePzLVidC1pBP7jq2Jn-2wwTVrzPlwRGCHILynwUzfZZPYNGiL2T-DQ" 
              />
              <span className="font-display-lg text-lg tracking-tight text-white font-bold block">ELITE PITCH</span>
            </div>
            <button 
              onClick={() => setIsMobileDrawerOpen(false)}
              className="text-on-surface-dark-variant hover:text-white p-1"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setIsMobileDrawerOpen(false)}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-label-bold text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-lg shadow-primary/25 font-bold'
                      : 'text-on-surface-dark-variant hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-label-bold text-sm text-error hover:bg-error/10 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Desktop Collapsible Sidebar (Visible >= 768px) */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex sticky top-0 h-screen bg-surface-dark text-white p-4 flex-col justify-between border-r border-white/10 shrink-0 transition-all duration-300 ease-in-out z-30 ${
          isHovered ? 'w-64' : 'w-20'
        }`}
      >
        <div>
          <div 
            onClick={() => navigate(ROUTES.HOME)}
            className="flex items-center gap-3 mb-6 cursor-pointer px-2 py-2 rounded-xl hover:bg-white/5 transition-colors overflow-hidden"
          >
            <img 
              alt="Elite Pitch Logo" 
              className="h-10 w-10 shrink-0 object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXnn5j3ELBZ9E2oyXq7qVWS0omnWwwyx3mBUA-2Ha4NtH7XlYxquD3RJLMlekQTnQS4uDXN_WPV1hcTgxiMP_aS92iQ4YnL84t-VSTKNhr3rPaSh0zcezJ2w-d0XqZnXRLeL0ES12I5VjJ8yhgdsVMHpJXmtYZEQ_mvhAoUMiVyQtB3WgjpjfTCRMkedijOmZgePzLVidC1pBP7jq2Jn-2wwTVrzPlwRGCHILynwUzfZZPYNGiL2T-DQ" 
            />
            <div className={`transition-opacity duration-300 whitespace-nowrap ${isHovered ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'}`}>
              <span className="font-display-lg text-lg tracking-tight font-bold text-white block">ELITE PITCH</span>
            </div>
          </div>

          <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                title={!isHovered ? item.label : undefined}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl font-label-bold text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-lg shadow-primary/30 font-bold scale-[1.02]'
                      : 'text-on-surface-dark-variant hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <span className="material-symbols-outlined text-2xl shrink-0">{item.icon}</span>
                <span className={`whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'}`}>
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleLogout}
            title={!isHovered ? 'Logout' : undefined}
            className="flex-1 flex items-center gap-3.5 px-3 py-2.5 rounded-2xl font-label-bold text-sm text-error hover:bg-error/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl shrink-0">logout</span>
            <span className={`whitespace-nowrap transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'}`}>
              Logout
            </span>
          </button>
          {isHovered && <NotificationCenter />}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
