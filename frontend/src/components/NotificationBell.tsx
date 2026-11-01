import { useEffect, useState, useRef } from 'react';
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
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications');
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // Poll every 30s
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
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          fontSize: '22px',
          padding: '4px 8px',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            background: 'var(--color-danger)',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '40px',
          right: 0,
          width: '360px',
          maxHeight: '400px',
          overflowY: 'auto',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
          zIndex: 1000,
        }}>
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{ fontSize: '12px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
              No notifications
            </div>
          )}

          {notifications.map(n => (
            <div
              key={n.notificationId}
              onClick={() => !n.isRead && handleMarkOne(n.notificationId)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                cursor: n.isRead ? 'default' : 'pointer',
                background: n.isRead ? 'var(--color-surface)' : 'var(--color-surface-hover)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>
                  {!n.isRead && <span style={{ color: 'var(--color-primary)', marginRight: '4px' }}>●</span>}
                  {n.notification.title}
                </strong>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0', lineHeight: 1.4 }}>
                {n.notification.message.length > 100
                  ? n.notification.message.substring(0, 100) + '...'
                  : n.notification.message}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                {n.notification.creator?.name} • {new Date(n.notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}