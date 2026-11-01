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
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        backgroundColor: 'var(--error-bg)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--error-border)',
        textAlign: 'center',
        margin: '16px 0',
      }}
    >
      <div style={{ fontSize: '28px', color: 'var(--error-text)', marginBottom: '8px' }}>⚠</div>
      <h3 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--error-text)', margin: '0 0 6px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--error-text)', maxWidth: '400px', lineHeight: 1.5, opacity: 0.9, marginBottom: onRetry ? '16px' : '0' }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-danger btn-sm"
          style={{ marginTop: '8px' }}
        >
          Try Again
        </button>
      )}
    </div>
  );
};
