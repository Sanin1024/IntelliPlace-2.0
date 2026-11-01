import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const FLAG_COLORS: Record<string, string> = {
  rapid_completion: '#d97706',
  suspicious_pattern: '#dc2626',
  abnormal_improvement: '#7c3aed',
};

export default function IntegrityFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/reco/integrity-flags', { params: { status: statusFilter } });
      setFlags(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load flags.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const review = async (id: string, status: 'reviewed' | 'dismissed') => {
    const note = prompt(`Note for marking this flag "${status}" (optional):`) || '';
    try {
      await api.patch(`/reco/integrity-flags/${id}`, { status, note });
      addToast(`Flag ${status}`, 'success');
      load();
    } catch (e: any) {
      addToast(e.response?.data?.error || 'Failed', 'error');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <EmptyState icon="⚠️" title="Error" description={error} />;

  return (
    <div>
      <h1>Assessment Integrity Flags</h1>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
        Flags indicate patterns worth reviewing — they are <strong>not accusations</strong>. Review the details before drawing conclusions.
      </p>

      <div style={{ display: 'flex', gap: '8px', margin: '16px 0 24px' }}>
        {['open', 'reviewed', 'dismissed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ ...chip, ...(statusFilter === s ? chipActive : {}) }}>
            {s} {s === 'open' && flags.length > 0 ? `(${flags.length})` : ''}
          </button>
        ))}
      </div>

      {flags.length === 0 ? (
        <EmptyState icon="✅" title={`No ${statusFilter} flags`} description="Everything looks clear right now." />
      ) : (
        flags.map(f => (
          <div key={f.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <strong>{f.student?.name || 'Unknown Student'}</strong>
                <span style={{ marginLeft: '8px', ...badge, color: FLAG_COLORS[f.flagType] || '#64748b', background: `${FLAG_COLORS[f.flagType] || '#64748b'}15` }}>
                  {f.flagType?.replace(/_/g, ' ')}
                </span>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  {f.attempt?.test?.title || 'Assessment'} · {new Date(f.createdAt).toLocaleString()}
                </p>
                <pre style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '12px', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(f.details, null, 2)}
                </pre>
              </div>
              {f.status === 'open' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button onClick={() => review(f.id, 'reviewed')} style={btnP}>Mark Reviewed</button>
                  <button onClick={() => review(f.id, 'dismissed')} style={btnS}>Dismiss</button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px' };
const chip: React.CSSProperties = { padding: '6px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };
const chipActive: React.CSSProperties = { background: '#1a73e8', color: '#fff', borderColor: '#1a73e8' };
const badge: React.CSSProperties = { padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 };
const btnP: React.CSSProperties = { padding: '8px 16px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' };
const btnS: React.CSSProperties = { padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' };
