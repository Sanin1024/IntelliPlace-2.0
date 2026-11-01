import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function EligibilityShortlistPage() {
  const [drives, setDrives] = useState<any[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    api.get('/drives').then(r => setDrives(r.data.data || [])).catch(() => {});
  }, []);

  const loadPreview = async (driveId: string) => {
    setSelectedDriveId(driveId);
    setSelected([]);
    setIsLoading(true);
    setPreview(null);
    try {
      const res = await api.get(`/drives/${driveId}/eligibility-preview`);
      setPreview(res.data.data);
    } catch {
      addToast('Failed to load preview', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShortlist = async () => {
    if (selected.length === 0) return;
    try {
      const results = await api.post(`/drives/${selectedDriveId}/shortlist`, { studentIds: selected });
      const ok = results.data.data.filter((r: any) => r.ok).length;
      const failed = results.data.data.filter((r: any) => !r.ok);
      addToast(`${ok} shortlisted, ${failed.length} rejected`, failed.length ? 'error' : 'success');
      loadPreview(selectedDriveId);
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Shortlist failed', 'error');
    }
  };

  const toggleStudent = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const activeDrives = drives.filter(d => ['published', 'active', 'closed'].includes(d.status));

  return (
    <div>
      <h1>Eligibility & Shortlisting</h1>
      
      <div style={{ marginBottom: '24px' }}>
        <select value={selectedDriveId} onChange={e => loadPreview(e.target.value)} style={inp}>
          <option value="">Select a drive...</option>
          {activeDrives.map(d => <option key={d.id} value={d.id}>{d.title} ({d.status})</option>)}
        </select>
      </div>

      {isLoading && <LoadingSpinner />}

      {preview && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', margin: '16px 0 24px' }}>
            <Stat label="Total" value={preview.counts.total} color="#64748b" />
            <Stat label="Eligible" value={preview.counts.eligible} color="#16a34a" />
            <Stat label="Ineligible" value={preview.counts.ineligible} color="#dc2626" />
            <Stat label="Pending" value={preview.counts.pending} color="#d97706" />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button onClick={handleShortlist} disabled={selected.length === 0} style={btnP}>
              Shortlist Selected ({selected.length})
            </button>
          </div>

          {preview.students.length === 0 ? (
            <EmptyState icon="🔍" title="No Students Found" description="No students match the criteria for this drive." />
          ) : (
            <div style={card}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}></th>
                    <th style={th}>Student</th>
                    <th style={th}>Branch</th>
                    <th style={th}>Status</th>
                    <th style={th}>Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.students.map((s: any) => (
                    <tr key={s.studentId}>
                      <td style={td}>
                        <input 
                          type="checkbox" 
                          disabled={s.status !== 'ELIGIBLE'}
                          checked={selected.includes(s.studentId)}
                          onChange={() => toggleStudent(s.studentId)} 
                        />
                      </td>
                      <td style={td}>{s.name}</td>
                      <td style={td}>{s.branch || '—'}</td>
                      <td style={{ ...td, fontWeight: 700, color: s.status === 'ELIGIBLE' ? '#16a34a' : s.status === 'INELIGIBLE' ? '#dc2626' : '#d97706' }}>
                        {s.status}
                      </td>
                      <td style={{ ...td, fontSize: '12px', color: '#64748b' }}>
                        {[...s.failedReasons, ...s.pendingReasons].join(' ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: any) {
  return (
    <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
      <h2 style={{ margin: 0, color, fontSize: '28px' }}>{value}</h2>
      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>{label}</p>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '12px', color: '#64748b' };
const td: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
const btnP: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 };
