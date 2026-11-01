import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analyticsApi } from '../../api/analytics';
import { recoApi } from '../../api/reco';
import type { TopicAccuracy, ReadinessScore, Recommendation, ProgressPoint } from '../../api/analytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [readiness, setReadiness] = useState<ReadinessScore | null>(null);
  const [readinessV2, setReadinessV2] = useState<any>(null);
  const [readinessHistory, setReadinessHistory] = useState<any[]>([]);
  const [growth, setGrowth] = useState<any>(null);
  const [topicAccuracy, setTopicAccuracy] = useState<TopicAccuracy[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const studentId = user.id;

    recoApi.readiness().then(setReadinessV2).catch(() => {});
    recoApi.readinessHistory().then(setReadinessHistory).catch(() => {});
    recoApi.growth().then(setGrowth).catch(() => {});

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

      {/* Readiness v2 (Ch 79) */}
      {readinessV2 ? (
        <div style={{ ...card, display: 'flex', gap: '28px', alignItems: 'center', padding: '28px', flexWrap: 'wrap' }}>
          <div style={{
            width: '130px', height: '130px', borderRadius: '50%',
            border: `7px solid ${readinessV2.overall == null ? '#e2e8f0' : readinessV2.overall >= 75 ? '#16a34a' : readinessV2.overall >= 50 ? '#d97706' : '#dc2626'}`,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '32px', fontWeight: 700 }}>
              {readinessV2.overall ?? '—'}
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>/ 100</span>
          </div>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <h2 style={{ margin: '0 0 2px 0' }}>{readinessV2.label}</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 4px 0' }}>
              Confidence: <strong style={{
                color: ({ insufficient: '#94a3b8', low: '#d97706', moderate: '#1a73e8', high: '#16a34a' } as Record<string, string>)[readinessV2.confidence] || '#64748b'
              }}>{readinessV2.confidence.replace('_', ' ')}</strong>
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 14px 0', fontStyle: 'italic' }}>
              {readinessV2.disclaimer}
            </p>

            {readinessV2.breakdown.map((c: any) => (
              <div key={c.category} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>{c.category}</span>
                  <span style={{ color: '#64748b' }}>
                    {c.score == null ? 'no verified data' : `${c.score}%`} (w={c.weight})
                  </span>
                </div>
                <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${c.score ?? 0}%`,
                    background: c.score == null ? '#e2e8f0' : c.score >= 70 ? '#16a34a' : c.score >= 50 ? '#d97706' : '#dc2626',
                  }} />
                </div>
                {c.note && <p style={{ fontSize: '10px', color: '#d97706', margin: '2px 0 0 0' }}>{c.note}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : readiness ? (
        <div style={{ ...card, display: 'flex', gap: '32px', alignItems: 'center', padding: '28px' }}>
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
          </div>
        </div>
      ) : null}

      {/* Readiness history (Ch 80) */}
      {readinessHistory.length > 1 && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Readiness Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={readinessHistory.map((h: any, i: number) => ({ n: i + 1, overall: h.overall }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="n" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="overall" stroke="#1a73e8" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Skill growth (Ch 80) */}
      {growth && growth.skills.length > 0 && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Skill Growth</h3>
          {growth.skills.map((s: any) => (
            <div key={s.skill} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
              <span style={{ textTransform: 'capitalize' }}>{s.skill}</span>
              <span>
                {s.firstScore ?? '—'} → {s.lastScore ?? '—'}
                {s.delta != null && (
                  <strong style={{
                    marginLeft: '8px',
                    color: s.trend === 'improving' ? '#16a34a' : s.trend === 'declining' ? '#dc2626' : '#64748b',
                  }}>
                    {s.trend === 'improving' ? '▲' : s.trend === 'declining' ? '▼' : '—'} {s.delta > 0 ? '+' : ''}{s.delta}
                  </strong>
                )}
              </span>
            </div>
          ))}
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
const actionBtn: React.CSSProperties = { padding: '8px 16px', minHeight: '40px', display: 'inline-flex', alignItems: 'center', background: '#1a73e8', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: '12px' };