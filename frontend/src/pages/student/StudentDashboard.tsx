import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [readiness, setReadiness] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      api.get('/reco/readiness').catch(() => ({ data: { data: null } })),
      api.get('/tests/my-attempts').catch(() => ({ data: { data: [] } })),
      api.get('/reco/recommendations').catch(() => ({ data: { data: { recommendations: [] } } })),
      api.get('/students/me').catch(() => ({ data: { data: null } })),
    ])
      .then(([r, a, rec, p]) => {
        setReadiness(r.data?.data || { overall: 0, label: 'Needs Assessment' });
        setAttempts(a.data?.data || []);
        setRecommendations(rec.data?.data?.recommendations || []);
        setProfile(p.data?.data || null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  if (loading && !readiness) return <LoadingSpinner />;

  const score = readiness?.overall ?? 0;
  const scoreColor =
    score >= 75
      ? 'var(--color-success)'
      : score >= 50
      ? 'var(--color-warning)'
      : 'var(--color-danger)';
  const label =
    readiness?.label ||
    (score >= 75 ? 'Placement Ready' : score >= 50 ? 'Developing' : 'Needs Assessment');

  const isProfileIncomplete = !profile || profile.isComplete === false || !profile.cgpa;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '4px' }}>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px' }}>
        Here is your placement preparation snapshot.
      </p>

      {/* Mandatory Student Master Profile Completion Alert */}
      {isProfileIncomplete && (
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--color-primary-light)',
            borderColor: 'var(--color-primary)',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <div>
              <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>
                Complete Your Profile
              </strong>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '13px',
                  color: 'var(--color-text)',
                }}
              >
                Complete your Student Master Profile to unlock campus placement drives and company-specific applications.
              </p>
            </div>
          </div>
          <Link
            to="/profile"
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
          >
            Complete Profile →
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Readiness Score */}
        <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: `6px solid ${scoreColor}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '28px', fontWeight: 800, color: scoreColor }}>{score}</span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>/ 100</span>
          </div>
          <div>
            <h3 style={{ margin: 0, color: scoreColor, fontSize: '18px' }}>{label}</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 8px 0' }}>
              Placement Readiness
            </p>
            <Link
              to="/analytics"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              View Details →
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Link
            to="/practice"
            className="card-hover"
            style={{
              textDecoration: 'none',
              textAlign: 'center',
              padding: '16px',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '24px' }}>📝</div>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              Practice
            </p>
          </Link>
          <Link
            to="/tests"
            className="card-hover"
            style={{
              textDecoration: 'none',
              textAlign: 'center',
              padding: '16px',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '24px' }}>📋</div>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              Mock Tests
            </p>
          </Link>
          <Link
            to="/drives"
            className="card-hover"
            style={{
              textDecoration: 'none',
              textAlign: 'center',
              padding: '16px',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '24px' }}>🏢</div>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              Drives
            </p>
          </Link>
          <Link
            to="/resume"
            className="card-hover"
            style={{
              textDecoration: 'none',
              textAlign: 'center',
              padding: '16px',
              background: 'var(--color-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: '24px' }}>📄</div>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              Resume
            </p>
          </Link>
        </div>
      </div>

      {/* Recommendations & Recent Activity */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}
        className="responsive-grid"
      >
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>🎯 Top Recommendations</h3>
          {recommendations.length === 0 ? (
            <EmptyState
              icon="🎯"
              title="No Recommendations Yet"
              description="Take an assessment to get personalized recommendations."
            />
          ) : (
            recommendations.slice(0, 3).map((r: any, i: number) => (
              <div
                key={i}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-hover)',
                  marginBottom: '8px',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: '14px' }}>
                  {r.resource?.title || r.title || 'Learning Resource'}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {r.reason?.headline || 'Recommended for your skill profile'}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📊 Recent Activity</h3>
          {attempts.length === 0 ? (
            <EmptyState
              icon="📊"
              title="No Recent Tests"
              description="Your recent test results will appear here."
            />
          ) : (
            attempts.slice(0, 3).map((a: any, i: number) => {
              const pct =
                a.percentage ??
                (a.totalMarks ? Math.round(((a.score || 0) / a.totalMarks) * 100) : 0);
              return (
                <div
                  key={i}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <p
                    style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}
                    className="text-ellipsis"
                  >
                    {a.testTitle || a.test?.title || 'Assessment Test'}
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      color: pct >= 60 ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: 600,
                    }}
                  >
                    Score: {pct}%
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .responsive-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
