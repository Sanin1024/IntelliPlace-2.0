import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testApi } from '../../api/test';

export default function AttemptActivityPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!testId) return;
    testApi.getAttemptActivity(testId)
      .then((d) => setData(d))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load activity logs'))
      .finally(() => setLoading(false));
  }, [testId]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <button onClick={() => navigate(-1)} style={backBtn}>← Back</button>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '16px 0 8px' }}>Assessment Examination Activity Review</h1>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
        {data?.note || 'Activity is evidence for human review — not proof of cheating.'}
      </p>

      {loading && <p>Loading activity logs…</p>}
      {error && <div style={errBox}>{error}</div>}

      {!loading && data?.students?.length === 0 && (
        <p style={{ color: '#64748b' }}>No live activity events recorded for this assessment.</p>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        {data?.students?.map((s: any) => (
          <div key={s.studentId} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <strong style={{ fontSize: '16px' }}>{s.name}</strong>
                <span style={{ color: '#64748b', fontSize: '13px', marginLeft: '10px' }}>({s.email})</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={s.tabSwitches > 0 ? warnBadge : okBadge}>
                  {s.tabSwitches} Tab Switch{s.tabSwitches !== 1 ? 'es' : ''}
                </span>
                <span style={s.focusLoss > 0 ? warnBadge : okBadge}>
                  {s.focusLoss} Focus Loss
                </span>
                <span style={s.warnings > 0 ? alertBadge : okBadge}>
                  {s.warnings} Warning{s.warnings !== 1 ? 's' : ''} Shown
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Event Timeline:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                {s.events.map((e: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                    <span>• {e.type.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#94a3b8' }}>{new Date(e.at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = { padding: '8px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const card: React.CSSProperties = { background: '#fff', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const okBadge: React.CSSProperties = { background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 };
const warnBadge: React.CSSProperties = { background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 };
const alertBadge: React.CSSProperties = { background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 };
const errBox: React.CSSProperties = { padding: '12px', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' };

