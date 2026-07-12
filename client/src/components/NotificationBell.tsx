import React from 'react';
import { Bell, Check, AlertTriangle, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import useNotificationStore from '../store/notificationStore';
import type { Notification } from '../store/notificationStore';
import api from '../lib/api';

interface NotificationBellProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAllRead, markAsRead } = useNotificationStore();

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      markAllRead();
    } catch (e) {
      console.error('Failed to mark all notifications as read', e);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    if (n.isRead) return;
    try {
      await api.patch(`/notifications/${n.id}/read`);
      markAsRead(n.id);
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'BADGE_UNLOCK':
        return <Trophy size={16} style={{ color: 'var(--gamify)' }} />;
      case 'CSR_APPROVED':
      case 'CHALLENGE_APPROVED':
        return <ShieldCheck size={16} style={{ color: 'var(--env)' }} />;
      case 'CSR_REJECTED':
      case 'CHALLENGE_REJECTED':
        return <AlertTriangle size={16} style={{ color: 'var(--severity-high)' }} />;
      case 'COMPLIANCE_OVERDUE':
        return <AlertTriangle size={16} style={{ color: 'var(--severity-critical)' }} />;
      case 'POLICY_REMINDER':
        return <Sparkles size={16} style={{ color: 'var(--gov)' }} />;
      default:
        return <Bell size={16} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="card" 
      style={{
        position: 'fixed',
        right: '1.5rem',
        bottom: '4.5rem', // Floating panel above the footer
        width: '320px',
        maxHeight: '380px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        padding: '1rem',
        backgroundColor: 'rgba(19, 23, 31, 0.95)',
        border: '1px solid var(--border-focus)'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={16} />
          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span className="badge badge--pending" style={{ fontSize: '10px', padding: '1px 6px' }}>
              {unreadCount} New
            </span>
          )}
        </div>
        <button 
          onClick={onClose} 
          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.625rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: n.isRead ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                borderLeft: n.isRead ? '2px solid transparent' : '2px solid var(--env)',
                cursor: n.isRead ? 'default' : 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              className="notification-item"
            >
              <div style={{ marginTop: '0.125rem' }}>{getIcon(n.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: n.isRead ? 500 : 700 }}>
                  {n.title}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '0.125rem', lineHeight: '1.3' }}>
                  {n.message}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {unreadCount > 0 && (
        <button 
          onClick={handleMarkAllRead}
          className="btn btn-secondary"
          style={{ width: '100%', padding: '0.5rem', fontSize: 'var(--text-xs)', marginTop: '0.75rem' }}
        >
          <Check size={12} />
          Mark all as read
        </button>
      )}
    </div>
  );
};
export default NotificationBell;
