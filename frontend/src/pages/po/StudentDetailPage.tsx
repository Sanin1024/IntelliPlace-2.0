import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { poApi } from '../../api/po';
import type { StudentDetail } from '../../api/po';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    poApi.getStudentDetail(studentId!)
      .then(setDetail)
      .catch(err => setError(err.response?.data?.error || 'Failed to load student'))
      .finally(() => setIsLoading(false));
  }, [studentId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await poApi.updatePlacementStatus(studentId!, newStatus);
      setDetail(prev => prev ? { ...prev, profile: { ...prev.profile, placementStatus: newStatus } } : prev);
      setSuccessMsg(`Placement status updated to "${newStatus.replace('_', ' ')}"`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update');
    }
  };

  if (isLoading) return <p>Loading student details...</p>;
  if (error && !detail) return (
    <div>
      <div style={errAlert}>{error}</div>
      <button onClick={() => navigate('/po/students')} style={btnSecondary}>← Back</button>
    </div>
  );
  if (!detail) return null;

  const { profile, attempts, topicAccuracy, targetCompanies } = detail;

  return (
    <div>
      <button onClick={() => navigate('/po/students')} style={btnSecondary}>← Back to Students</button>

      {successMsg && <div style={okAlert}>{successMsg}</div>}
      {error && <div style={errAlert}>{error}</div>}

      {/* Profile Header */}
      <div style={{ ...card, marginTop: '16px', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 style={{ margin: 0 }}>{profile.name}</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>{profile.email}</p>

            <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Branch</p>
                <p style={{ fontSize: '15px', fontWeight: 600, margin: '2px 0 0 0' }}>{profile.branch || 'Not set'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Batch</p>
                <p style={{ fontSize: '15px', fontWeight: 600, margin: '2px 0 0 0' }}>{profile.batch || 'Not set'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>CGPA</p>
                <p style={{ fontSize: '15px', fontWeight: 600, margin: '2px 0 0 0' }}>{profile.cgpa ?? 'Not set'}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Level</p>
                <p style={{ fontSize: '15px', fontWeight: 600, margin: '2px 0 0 0', textTransform: 'capitalize' }}>
                  {profile.knowledgeLevel}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Target Role</p>
                <p style={{ fontSize: '15px', fontWeight: 600, margin: '2px 0 0 0' }}>{profile.targetRole || 'Not set'}</p>
              </div>
            </div>

            {profile.resumeUrl && (
              <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSmall, display: 'inline-flex', alignItems: 'center', minHeight: '40px', marginTop: '16px', textDecoration: 'none' }}>
                📄 View Resume
              </a>
            )}
          </div>

          {/* Placement Status Control */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px 0' }}>Placement Status</p>
            <select
              aria-label="Placement Status"
              value={profile.placementStatus}
              onChange={e => handleStatusChange(e.target.value)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '2px solid',
                borderColor: profile.placementStatus === 'placed' ? '#16a34a'
                  : profile.placementStatus === 'in_process' ? '#d97706' : '#e2e8f0',
                background: profile.placementStatus === 'placed' ? '#f0fdf4'
                  : profile.placementStatus === 'in_process' ? '#fffbeb' : '#fff',
                color: profile.placementStatus === 'placed' ? '#16a34a'
                  : profile.placementStatus === 'in_process' ? '#d97706' : '#64748b',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <option value="not_placed">Not Placed</option>
              <option value="in_process">In Process</option>
              <option value="placed">✅ Placed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Target Companies */}
      {targetCompanies.length > 0 && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>⭐ Target Companies</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {targetCompanies.map(c => (
              <span key={c.id} style={targetTag}>
                {c.name} • {new Date(c.driveDate).toLocaleDateString()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Topic Accuracy Chart */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>📊 Topic-wise Accuracy</h3>
        {topicAccuracy.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topicAccuracy}>
              <XAxis dataKey="topicName" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
              <Bar dataKey="accuracy" fill="#1a73e8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
            No test data yet — student hasn't taken any tests.
          </p>
        )}
      </div>

      {/* Test History */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>📝 Test & Practice History</h3>
        {attempts.length > 0 ? (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Test</th>
                <th style={th}>Type</th>
                <th style={th}>Score</th>
                <th style={th}>%</th>
                <th style={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map(a => (
                <tr key={a.attemptId}>
                  <td style={td}>{a.testTitle}</td>
                  <td style={td}>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      background: a.attemptType === 'mock' ? '#dbeafe' : '#f0fdf4',
                      color: a.attemptType === 'mock' ? '#1e40af' : '#166534',
                      fontWeight: 600,
                    }}>
                      {a.attemptType}
                    </span>
                  </td>
                  <td style={td}>{a.score}/{a.totalMarks}</td>
                  <td style={td}>
                    <span style={{
                      color: a.percentage >= 60 ? '#16a34a' : '#dc2626',
                      fontWeight: 600,
                    }}>
                      {a.percentage}%
                    </span>
                  </td>
                  <td style={td}>{a.endTime ? new Date(a.endTime).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
            No attempts recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '12px', color: '#64748b', fontWeight: 600 };
const td: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' };
const btnSecondary: React.CSSProperties = { padding: '10px 20px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const btnSmall: React.CSSProperties = { padding: '8px 16px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 };
const targetTag: React.CSSProperties = { background: '#fef9c3', color: '#854d0e', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };
const okAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#f0fdf4', color: '#166534' };