import React from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = '📂',
  actionText,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1',
        textAlign: 'center',
        margin: '16px 0',
      }}
    >
      <div style={{ fontSize: '42px', marginBottom: '12px' }}>{icon}</div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '420px', lineHeight: 1.5, marginBottom: actionText ? '20px' : '0' }}>
        {message}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '40px',
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
