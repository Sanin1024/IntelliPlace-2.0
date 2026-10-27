import React from 'react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Failed to load content. Please try again.',
  onRetry,
  title = 'Something went wrong',
}) => {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        backgroundColor: '#fff5f5',
        borderRadius: '12px',
        border: '1px solid #fed7d7',
        textAlign: 'center',
        margin: '16px 0',
      }}
    >
      <div style={{ fontSize: '32px', color: '#e53e3e', marginBottom: '8px' }}>⚠</div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#9b2c2c', margin: '0 0 6px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: '#c53030', maxWidth: '400px', lineHeight: 1.5, marginBottom: onRetry ? '16px' : '0' }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '8px 18px',
            backgroundColor: '#e53e3e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '40px',
          }}
        >
          🔄 Try Again
        </button>
      )}
    </div>
  );
};
