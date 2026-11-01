import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { notificationApi } from '../api/notification';
import type { NotificationItem } from '../api/notification';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const data = await notificationApi.getMy();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications');
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkOne = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          transition: 'all var(--transition-fast)',
        }}
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'var(--error)',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: 'var(--radius-full)',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--surface)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '44px',
            right: 0,
            width: '360px',
            maxHeight: '420px',
            overflowY: 'auto',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-dropdown)',
            border: '1px solid var(--border)',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-muted)',
            }}
          >
            <strong style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Notifications
            </strong>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: '12px',
                  color: 'var(--accent-text)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 && (
            <div
              style={{
                padding: '32px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
              }}
            >
              No notifications right now
            </div>
          )}

          {notifications.map((n) => (
            <div
              key={n.notificationId}
              onClick={() => !n.isRead && handleMarkOne(n.notificationId)}
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
                cursor: n.isRead ? 'default' : 'pointer',
                background: n.isRead ? 'var(--surface)' : 'var(--surface-muted)',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: n.isRead ? 400 : 600 }}>
                  {!n.isRead && (
                    <span style={{ color: 'var(--accent)', marginRight: '6px' }}>●</span>
                  )}
                  {n.notification.title}
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(n.notification.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {n.notification.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
