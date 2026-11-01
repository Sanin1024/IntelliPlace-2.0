import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testApi } from '../../api/test';

export default function SyncMonitorPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await testApi.getSyncStatus();
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch sync status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleReconcile = async (attemptId: string) => {
    try {
      setReconciling(attemptId);
      const res = await testApi.reconcileAttempt(attemptId);
      setMessage(`Attempt reconciled: score ${res.score}/${res.totalMarks}`);
      loadStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reconcile attempt');
    } finally {
      setReconciling(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <button onClick={() => navigate(-1)} style={backBtn}>← Back</button>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '16px 0 8px' }}>Assessment Result Synchronization Monitor</h1>
      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
        {data?.note || 'Monitors attempts whose stored aggregates need reconciliation with student answers.'}
      </p>

      {message && <div style={msgBox}>{message}</div>}
      {error && <div style={errBox}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={statCard}>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{data?.totalSubmitted ?? 0}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Total Submitted</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: (data?.pendingOrFailed ?? 0) > 0 ? '#dc2626' : '#16a34a' }}>
            {data?.pendingOrFailed ?? 0}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Inconsistent / Pending</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>
            {(data?.totalSubmitted ?? 0) - (data?.pendingOrFailed ?? 0)}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Evaluated & Synced</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>Inconsistent Attempts Requiring Action</h2>
        {loading ? (
          <p>Loading status…</p>
        ) : data?.inconsistent?.length === 0 ? (
          <p style={{ color: '#16a34a', fontWeight: 500 }}>✓ All submitted attempts are fully evaluated and synchronized.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={th}>Student</th>
                <th style={th}>Assessment</th>
                <th style={th}>Evaluation Status</th>
                <th style={th}>Current Score</th>
                <th style={th}>Answers</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.inconsistent?.map((item: any) => (
                <tr key={item.attemptId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{item.student}</td>
                  <td style={td}>{item.test || 'Practice'}</td>
                  <td style={td}>
                    <span style={item.evaluationStatus === 'eval_failed' ? alertBadge : warnBadge}>
                      {item.evaluationStatus}
                    </span>
                  </td>
                  <td style={td}>{item.score ?? '—'}</td>
                  <td style={td}>{item.answers}</td>
                  <td style={td}>
                    <button
                      onClick={() => handleReconcile(item.attemptId)}
                      disabled={reconciling === item.attemptId}
                      style={recBtn}
                    >
                      {reconciling === item.attemptId ? 'Reconciling…' : 'Reconcile'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = { padding: '8px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const statCard: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' };
const th: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' };
const td: React.CSSProperties = { padding: '10px 12px' };
const recBtn: React.CSSProperties = { padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };
const warnBadge: React.CSSProperties = { background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 };
const alertBadge: React.CSSProperties = { background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 };
const msgBox: React.CSSProperties = { padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '6px', marginBottom: '16px' };
const errBox: React.CSSProperties = { padding: '12px', background: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' };

