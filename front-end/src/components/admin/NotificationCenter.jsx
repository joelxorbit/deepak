import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchNotificationsService,
  fetchUnreadCountService,
  markNotificationReadService,
  markAllNotificationsReadService
} from '../../services/notificationService';

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCountService();
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
        const data = await fetchNotificationsService({ limit: 15 });
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

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative p-2 min-h-[44px] min-w-[44px] rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-2xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-surface-dark animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40"
          ></div>

          <div className="absolute right-0 mt-3 w-84 sm:w-96 bg-white rounded-3xl shadow-2xl border border-black/5 z-50 overflow-hidden animate-slide-up text-on-surface">
            <div className="p-4 bg-surface-container-low border-b border-black/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">notifications_active</span>
                <h3 className="font-bold text-sm">System Notifications</h3>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Read all
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="divide-y divide-black/5 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-xs text-on-surface-variant">
                  Loading notifications...
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((n) => {
                  const id = n.id || n._id;
                  const isUnread = !n.isRead;
                  const time = typeof n.createdAt === 'string'
                    ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Recently';

                  return (
                    <div
                      key={id}
                      onClick={() => isUnread && handleMarkOneRead(id)}
                      className={`p-4 space-y-1 hover:bg-surface-container-lowest transition-colors cursor-pointer ${
                        isUnread ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`font-bold text-xs ${isUnread ? 'text-primary' : 'text-on-surface'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-on-surface-variant whitespace-nowrap">{time}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{n.message}</p>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-on-surface-variant">
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
