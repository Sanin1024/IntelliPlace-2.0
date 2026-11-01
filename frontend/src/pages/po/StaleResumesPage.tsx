import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function StaleResumesPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/resumes/stale-report');
      const rawData = res.data?.data;
      const list = Array.isArray(rawData) ? rawData : (rawData?.students || []);
      setStudents(list);
    } catch {
      addToast('Failed to load stale reports', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remind = async (studentId: string) => {
    try {
      await api.post(`/resumes/remind/${studentId}`);
      addToast('Reminder sent', 'success');
    } catch {
      addToast('Failed to send reminder', 'error');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h1>Stale Resume Report</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Students who haven't updated their resume in over 120 days or have unverified academic info.</p>
      
      {students.length === 0 ? (
        <EmptyState icon="✅" title="All Up to Date!" description="No students require resume updates right now." />
      ) : (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Student</th>
                <th style={th}>Branch</th>
                <th style={th}>Last Updated</th>
                <th style={th}>Days Old</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const uploadDate = s.lastUploadedAt || s.activeVersion?.uploadedAt;
                const age = s.daysOld ?? s.daysSinceUpload ?? null;
                return (
                  <tr key={s.studentId}>
                    <td style={td}>
                      {s.name}<br/>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{s.email}</span>
                    </td>
                    <td style={td}>{s.branch || 'N/A'}</td>
                    <td style={td}>{uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Never'}</td>
                    <td style={{ ...td, color: (age || 0) > 180 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                      {age !== null ? `${age} days` : 'N/A'}
                    </td>
                    <td style={td}>
                      <button onClick={() => remind(s.studentId)} style={btn}>Send Reminder</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '12px', color: '#64748b' };
const td: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
const btn: React.CSSProperties = { padding: '6px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 };
