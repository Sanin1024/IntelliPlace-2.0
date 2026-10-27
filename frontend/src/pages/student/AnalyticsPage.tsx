import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsApi } from '../../api/analytics';
import type { TopicAccuracy, ReadinessScore, Recommendation, ProgressPoint } from '../../api/analytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null);
  const [topicAccuracy, setTopicAccuracy] = useState<TopicAccuracy[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const studentId = user.id;

    Promise.all([
      analyticsApi.getReadiness(studentId),
      analyticsApi.getTopicAccuracy(studentId),
      analyticsApi.getRecommendations(studentId),
      analyticsApi.getProgress(studentId),
    ])
      .then(([r, t, rec, p]) => {
        setReadiness(r);
        setTopicAccuracy(t);
        setRecommendations(rec);
        setProgress(p);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user]);

  if (isLoading) return <p>Loading analytics...</p>;

  const score = readiness?.readinessScore ?? 0;
  const readinessColor = 
    score >= 75 ? '#16a34a' :
    score >= 50 ? '#d97706' :
    score >= 25 ? '#ea580c' : '#dc2626';

  return (
    <div>
      <h1>My Analytics & Readiness</h1>

      {/* Readiness Score */}
      {readiness && (
        <div style={{ ...card, display: 'flex', gap: '32px', alignItems: 'center', padding: '28px' }}>
          {/* Score gauge */}
          <div style={{
            width: '140px', height: '140px', borderRadius: '50%',
            border: `8px solid ${readinessColor}`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '36px', fontWeight: 700, color: readinessColor }}>
              {readiness.readinessScore}
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>/ 100</span>
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 4px 0', color: readinessColor }}>{readiness.readinessLevel}</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Placement Readiness Score
            </p>

            {/* Breakdown bars */}
            {[
              { label: 'Aptitude Tests', data: readiness.breakdown.aptitude },
              { label: 'Coding Practice', data: readiness.breakdown.coding },
              { label: 'Profile', data: readiness.breakdown.profile },
            ].map(({ label, data }) => (
              <div key={label} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>{label}</span>
                  <span style={{ color: '#64748b' }}>{data.points} / {data.maxPoints}</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(data.points / data.maxPoints) * 100}%`,
                    background: '#1a73e8',
                    borderRadius: '4px',
                    transition: 'width 0.5s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic-wise Accuracy Chart */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Topic-wise Accuracy</h3>
        {topicAccuracy.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topicAccuracy}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="topicName" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
              <Bar dataKey="accuracy" fill="#1a73e8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
            Take a practice session or mock test to see your topic-wise performance.
          </p>
        )}
      </div>

      {/* Progress Over Time */}
      {progress.length > 1 && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Progress Over Time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={progress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="attemptNumber" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
              <Line type="monotone" dataKey="percentage" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendations */}
      <div style={card}>
        <h3 style={{ marginTop: 0 }}>🎯 Recommended for You</h3>
        {recommendations.length > 0 ? (
          recommendations.map((rec, i) => (
            <div key={i} style={{
              padding: '14px', borderRadius: '10px', marginBottom: '10px',
              border: '1px solid',
              borderColor: rec.priority === 'high' ? '#fecaca' : rec.priority === 'medium' ? '#fde68a' : '#e2e8f0',
              background: rec.priority === 'high' ? '#fef2f2' : rec.priority === 'medium' ? '#fffbeb' : '#f8fafc',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: '14px' }}>
                    {rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'} {rec.title}
                  </p>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 8px 0' }}>
                    {rec.message}
                  </p>
                </div>
                <Link to={rec.action.link} style={actionBtn}>
                  {rec.action.label} →
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
            🎉 No recommendations — you're on track! Keep practicing.
          </p>
        )}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px' };
const actionBtn: React.CSSProperties = { padding: '8px 16px', background: '#1a73e8', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '12px' };