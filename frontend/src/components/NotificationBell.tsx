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
            background: '#dc2626',
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
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          border: '1px solid #e2e8f0',
          zIndex: 1000,
        }}>
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <strong style={{ fontSize: '14px' }}>Notifications</strong>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={{ fontSize: '12px', color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
              No notifications
            </div>
          )}

          {notifications.map(n => (
            <div
              key={n.notificationId}
              onClick={() => !n.isRead && handleMarkOne(n.notificationId)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f8fafc',
                cursor: n.isRead ? 'default' : 'pointer',
                background: n.isRead ? '#fff' : '#eff6ff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                  {!n.isRead && <span style={{ color: '#1a73e8', marginRight: '4px' }}>●</span>}
                  {n.notification.title}
                </strong>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0', lineHeight: 1.4 }}>
                {n.notification.message.length > 100
                  ? n.notification.message.substring(0, 100) + '...'
                  : n.notification.message}
              </p>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                {n.notification.creator?.name} • {new Date(n.notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}