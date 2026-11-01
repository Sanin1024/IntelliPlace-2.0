import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  type?: 'card' | 'table' | 'line';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  count = 3,
  height = '64px',
  type = 'card',
}) => {
  return (
    <div
      role="status"
      aria-label="Loading content"
      style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', padding: '16px 0' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            borderRadius: type === 'line' ? 'var(--radius-none)' : 'var(--radius-sm)',
            animation: 'bonsaiPulse 1.8s ease-in-out infinite',
          }}
        />
      ))}
      <span style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        Loading...
      </span>
      <style>{`
        @keyframes bonsaiPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
};
