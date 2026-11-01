import { useEffect, useState } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function AcademicPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/academic/me')
      .then(r => setData(r.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load academic records.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <EmptyState icon="⚠️" title="Error" description={error} />;
  if (!data || !data.profile) return <EmptyState icon="📝" title="No Academic Data" description="Your academic records have not been initialized. Please contact the Placement Officer." />;

  // Defensive extraction with fallbacks
  const profile = data.profile || {};
  const semesters = Array.isArray(data.semesters) ? data.semesters : [];
  const backlogs = Array.isArray(data.backlogs)
    ? { records: data.backlogs, activeCount: data.backlogs.filter((b: any) => b.status === 'active').length, activeUnverified: 0, clearedCount: data.backlogs.filter((b: any) => b.status === 'cleared').length }
    : (data.backlogs || { records: [], activeCount: 0, activeUnverified: 0, clearedCount: 0 });
  const cgpa = data.cgpa || data.cgpaInfo || { cgpa: null, conclusive: false, missingSemesters: [] };
  const completeness = data.completeness || { percentage: 0, missing: [] };
  const freshness = data.freshness || {};
  const corrections = data.correctionRequests || [];

  const statusColor = ({ verified: '#16a34a', pending: '#d97706', rejected: '#dc2626', requires_correction: '#ea580c' } as Record<string, string>)[profile.academicStatus] || '#64748b';

  return (
    <div>
      <h1>My Academic Records</h1>

      {/* Verification banner */}
      <div style={{ padding: '16px', borderRadius: '10px', background: `${statusColor}15`, border: `1px solid ${statusColor}55`, marginBottom: '20px' }}>
        <strong style={{ color: statusColor }}>
          Academic Status: {profile.academicStatus?.replace('_', ' ') || 'Unknown'}
          {profile.cgpaVerified ? ' • CGPA Verified ✓' : ' • CGPA Unverified'}
        </strong>
        {cgpa.missingSemesters && cgpa.missingSemesters.length > 0 && (
          <p style={{ fontSize: '13px', color: '#d97706', margin: '6px 0 0 0' }}>
            ⚠️ Semester results missing: {cgpa.missingSemesters.join(', ')} — your CGPA cannot be conclusively determined.
          </p>
        )}
        {cgpa.cgpa != null && (
          <p style={{ fontSize: '13px', margin: '6px 0 0 0' }}>
            Computed CGPA (verified semesters only): <strong>{cgpa.cgpa}</strong> ({cgpa.conclusive ? 'conclusive' : 'not conclusive'})
          </p>
        )}
        {freshness.daysSinceUpdate != null && (
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
            Profile data freshness: updated {freshness.daysSinceUpdate} days ago
          </p>
        )}
      </div>

      {/* Completeness */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Profile Completeness: {completeness.percentage}%</h3>
        {(!completeness.missing || completeness.missing.length === 0) ? (
          <p style={{ color: '#16a34a' }}>✅ All placement-required fields complete.</p>
        ) : (
          completeness.missing.map((m: any) => (
            <p key={m.field} style={{ color: '#dc2626', fontSize: '13px', margin: '4px 0' }}>❌ {m.label} — <a href={m.link} style={{ color: '#1a73e8' }}>fix now →</a></p>
          ))
        )}
      </div>

      {/* Semesters */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Semester Results</h3>
        {semesters.length === 0 ? <p style={{ color: '#94a3b8' }}>No semester results recorded yet.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Semester</th><th style={th}>SGPA</th><th style={th}>Credits</th><th style={th}>Status</th></tr></thead>
            <tbody>{semesters.map((s: any) => (
              <tr key={s.id}><td style={td}>Sem {s.semesterNumber}</td><td style={td}>{s.sgpa ?? s.gpa ?? '—'}</td><td style={td}>{s.credits ?? s.creditsEarned ?? '—'}</td>
                <td style={{ ...td, color: s.status === 'published' ? '#16a34a' : '#d97706' }}>{s.status}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Backlogs */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Backlogs — Active: {backlogs.activeCount}{backlogs.activeUnverified > 0 ? ` (+${backlogs.activeUnverified} pending verification)` : ''}</h3>
        {(!backlogs.records || backlogs.records.length === 0) ? <p style={{ color: '#94a3b8' }}>No backlog records.</p> : backlogs.records.map((b: any) => (
          <p key={b.id} style={{ fontSize: '13px', margin: '4px 0', color: b.status === 'active' ? '#dc2626' : '#16a34a' }}>
            {b.status === 'active' ? '🔴' : '🟢'} {b.subject || b.subjectName || b.subjectCode} (Sem {b.semesterNumber || b.semester}){b.status === 'cleared' && b.clearedInSemester ? ` — cleared in Sem ${b.clearedInSemester}` : ''}
          </p>
        ))}
      </div>

      {/* Correction requests */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>My Correction Requests</h3>
        {corrections.length === 0 ? <p style={{ color: '#94a3b8' }}>None submitted. Use this if your branch/batch/university ID/CGPA is wrong — these fields require officer approval.</p> : corrections.map((c: any) => (
          <p key={c.id} style={{ fontSize: '13px', margin: '4px 0' }}>
            <strong>{c.field || c.fieldRequested}</strong>: {c.currentValue} → {c.requestedValue} — <span style={{ color: c.status === 'approved' ? '#16a34a' : c.status === 'rejected' ? '#dc2626' : '#d97706' }}>{c.status}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' };
const th: React.CSSProperties = { textAlign: 'left', padding: '8px', borderBottom: '2px solid #e2e8f0', fontSize: '12px', color: '#64748b' };
const td: React.CSSProperties = { padding: '8px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' };
