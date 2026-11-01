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
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px dashed var(--border)',
        textAlign: 'center',
        margin: '16px 0',
      }}
    >
      <div style={{ fontSize: '36px', marginBottom: '12px' }} aria-hidden="true">
        {icon}
      </div>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: '0 0 8px 0',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
          maxWidth: '420px',
          lineHeight: 1.5,
          marginBottom: actionText ? '20px' : '0',
          margin: actionText ? '0 0 20px 0' : 0,
        }}
      >
        {message}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary btn-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
