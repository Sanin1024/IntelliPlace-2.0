interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        marginTop: '24px',
        userSelect: 'none',
      }}
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="btn btn-secondary btn-sm"
        aria-label="Previous page"
      >
        ← Prev
      </button>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
        Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong>
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="btn btn-secondary btn-sm"
        aria-label="Next page"
      >
        Next →
      </button>
    </div>
  );
}
