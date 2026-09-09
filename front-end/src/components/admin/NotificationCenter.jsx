import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchNotificationsService,
  fetchUnreadCountService,
  markNotificationReadService,
  markAllNotificationsReadService
} from '../../services/notificationService';

export const NotificationCenter = ({ variant = 'light' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCountService({ role: 'admin' });
      setUnreadCount(count);
    } catch (e) {
      // Ignore background poll errors
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // 30s poll
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  const handleToggle = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      try {
        setLoading(true);
        const data = await fetchNotificationsService({ limit: 20, role: 'admin' });
        setNotifications(data || []);
      } catch (e) {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markNotificationReadService(id, { role: 'admin' });
      setNotifications(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadService({ role: 'admin' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      // Ignore
    }
  };

  const isDark = variant === 'dark';

  return (
    <div className="relative">
      {/* ── Rounded Notification Icon Button ── */}
      <button
        onClick={handleToggle}
        aria-label="Admin Notifications"
        title="Admin Notifications"
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xs ${
          isDark
            ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
        }`}
      >
        <span className="material-symbols-outlined text-xl transition-transform hover:scale-110">
          {unreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white font-extrabold text-[10px] flex items-center justify-center ring-2 ring-white animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40"
          />

          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden animate-slide-up text-slate-800">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-base">notifications</span>
                </div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Admin Alerts</h3>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                    >
                      Mark all as read
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Loading notifications...
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((n) => {
                  const id = n.id || n._id;
                  const isUnread = !n.isRead;
                  const time = typeof n.createdAt === 'string'
                    ? new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Recently';

                  return (
                    <div
                      key={id}
                      onClick={() => isUnread && handleMarkOneRead(id)}
                      className={`p-3.5 space-y-1 transition-colors cursor-pointer hover:bg-slate-50/80 ${
                        isUnread ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                          <h4 className={`font-bold text-xs ${isUnread ? 'text-slate-900 font-extrabold' : 'text-slate-600'}`}>
                            {n.title}
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{time}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed pl-3">{n.message}</p>
                    </div>
                  );
                })
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
  );
};
