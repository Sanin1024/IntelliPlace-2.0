import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--color-border)',
        margin: '16px 0',
      }}
    >
      <div style={{ fontSize: '40px', marginBottom: '16px' }} aria-hidden="true">
        {icon}
      </div>
      <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text)', fontSize: '18px' }}>
        {title}
      </h3>
      {description && (
        <p style={{ margin: '0 0 20px 0', maxWidth: '400px', fontSize: '14px', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
