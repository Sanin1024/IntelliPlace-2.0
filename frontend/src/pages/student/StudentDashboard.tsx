import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import api from '../../api/client';
import type { StudentDashboardData } from '../../types';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/students/me/dashboard');
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        throw new Error(res.data?.error || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('Error fetching student dashboard:', err);
      setError(err.response?.data?.error || err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={skeletonHeader} />
        <div style={skeletonGrid}>
          <div style={skeletonCard} />
          <div style={skeletonCard} />
          <div style={skeletonCard} />
        </div>
        <div style={{ ...skeletonCard, height: '320px', marginTop: '24px' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={containerStyle}>
        <div style={errorContainerStyle}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Unable to Load Dashboard
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', maxWidth: '400px' }}>
            {error || 'Could not retrieve your placement progress data.'}
          </p>
          <button onClick={fetchDashboard} style={primaryBtnStyle}>
            ↻ Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    profile,
    readiness,
    topicAccuracy = [],
    weakTopics = [],
    strongTopics = [],
    progress = [],
    mockTests = [],
    drives = [],
    notifications = [],
    unreadNotificationsCount = 0,
    hasAttempts = false,
  } = data;

  // Recommendations: fallback to empty array if not present
  const recommendations = (data as any).recommendations || [];

  const overallScore = readiness?.overallScore ?? readiness?.score ?? 0;
  const statusBadge =
    overallScore > 70
      ? { label: 'Ready (>70)', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' }
      : overallScore >= 40
      ? { label: 'Almost Ready (40-70)', bg: '#fffbeb', color: '#d97706', border: '#fde68a' }
      : { label: 'Not Ready (<40)', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };

  return (
    <div style={containerStyle}>
      {/* Header & Welcome */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Welcome back, {profile.name}! 👋</h1>
          <p style={subtitleStyle}>
            {profile.branchName ? `${profile.branchName} • ` : ''}
            {profile.batchName ? `Batch ${profile.batchName} • ` : ''}
            Level: <strong style={{ textTransform: 'capitalize' }}>{profile.knowledgeLevel}</strong>
          </p>
        </div>
        <div style={headerActionGroup}>
          <Link to="/practice" style={secondaryLinkStyle}>
            📝 Practice Questions
          </Link>
          <Link to="/tests" style={primaryLinkStyle}>
            🚀 Take Mock Test
          </Link>
        </div>
      </div>

      {/* Profile Completeness Alert */}
      {profile.missingProfileFields && profile.missingProfileFields.length > 0 && (
        <div style={profileAlertBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '20px' }}>💡</span>
            <div>
              <strong style={{ color: '#0f172a' }}>Boost your profile readiness score:</strong>{' '}
              <span style={{ color: '#475569' }}>
                Add your {profile.missingProfileFields.join(', ')} to increase your profile score by up to 10 points!
              </span>
            </div>
          </div>
          <Link to="/profile" style={alertActionLink}>
            Complete Profile →
          </Link>
        </div>
      )}

      {/* Top Overview: Readiness Card + Notifications */}
      <div style={topGridStyle}>
        {/* Readiness Card */}
        <div style={cardStyle}>
          <div style={cardHeaderFlex}>
            <h2 style={cardHeading}>🎯 Placement Readiness</h2>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                background: statusBadge.bg,
                color: statusBadge.color,
                border: `1px solid ${statusBadge.border}`,
              }}
            >
              {statusBadge.label}
            </span>
          </div>

          <div style={readinessMainRow}>
            {/* Circular Ring Simulation */}
            <div style={circularRingWrapper}>
              <div style={ringOuter}>
                <div style={ringInner}>
                  <div style={ringScoreNumber}>{overallScore}</div>
                  <div style={ringScoreTotal}>/ 100</div>
                </div>
              </div>
            </div>

            {/* Breakdown Bars */}
            <div style={breakdownList}>
              <div style={breakdownItem}>
                <div style={breakdownLabelRow}>
                  <span style={breakdownName}>Aptitude Tests</span>
                  <span style={breakdownScore}>
                    <strong>{readiness.breakdown?.aptitude?.points ?? 0}</strong> / 60 pts
                  </span>
                </div>
                <div style={progressBarTrack}>
                  <div
                    style={{
                      ...progressBarFill,
                      width: `${Math.min(100, ((readiness.breakdown?.aptitude?.points ?? 0) / 60) * 100)}%`,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                </div>
                <span style={breakdownHint}>
                  {readiness.breakdown?.aptitude?.testsCount ?? 0} mock tests evaluated
                </span>
              </div>

              <div style={breakdownItem}>
                <div style={breakdownLabelRow}>
                  <span style={breakdownName}>Coding Challenges</span>
                  <span style={breakdownScore}>
                    <strong>{readiness.breakdown?.coding?.points ?? 0}</strong> / 30 pts
                  </span>
                </div>
                <div style={progressBarTrack}>
                  <div
                    style={{
                      ...progressBarFill,
                      width: `${Math.min(100, ((readiness.breakdown?.coding?.points ?? 0) / 30) * 100)}%`,
                      backgroundColor: '#10b981',
                    }}
                  />
                </div>
                <span style={breakdownHint}>
                  {readiness.breakdown?.coding?.problemsCount ?? 0} problems submitted
                </span>
              </div>

              <div style={breakdownItem}>
                <div style={breakdownLabelRow}>
                  <span style={breakdownName}>Profile Completeness</span>
                  <span style={breakdownScore}>
                    <strong>{readiness.breakdown?.profile?.points ?? 0}</strong> / 10 pts
                  </span>
                </div>
                <div style={progressBarTrack}>
                  <div
                    style={{
                      ...progressBarFill,
                      width: `${Math.min(100, ((readiness.breakdown?.profile?.points ?? 0) / 10) * 100)}%`,
                      backgroundColor: '#8b5cf6',
                    }}
                  />
                </div>
                <span style={breakdownHint}>
                  CGPA, Resume, Branch, Target Role
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Card */}
        <div style={cardStyle}>
          <div style={cardHeaderFlex}>
            <h2 style={cardHeading}>🔔 Recent Notifications</h2>
            {unreadNotificationsCount > 0 && (
              <span style={unreadBadgeStyle}>{unreadNotificationsCount} unread</span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={emptyBoxSmall}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>No notifications yet</p>
            </div>
          ) : (
            <div style={notificationListStyle}>
              {notifications.slice(0, 5).map((notif: any) => (
                <div
                  key={notif.id}
                  style={{
                    ...notificationItemStyle,
                    background: notif.isRead ? 'transparent' : '#f8fafc',
                    borderLeft: notif.isRead ? '3px solid transparent' : '3px solid #3b82f6',
                  }}
                >
                  <div style={notifTitleRow}>
                    <strong style={notifTitleText}>{notif.title}</strong>
                    <span style={notifDateText}>
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p style={notifBodyText}>{notif.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section: Recommended Actions */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={sectionHeadingStyle}>💡 Recommended for You</h2>
          <div style={recommendationsGrid}>
            {recommendations.map((rec: any, idx: number) => (
              <div key={idx} style={recommendationCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: rec.priority === 'high' ? '#fef2f2' : '#f0fdf4',
                      color: rec.priority === 'high' ? '#ef4444' : '#16a34a',
                    }}
                  >
                    {rec.priority} priority
                  </span>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' }}>
                  {rec.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', flex: 1 }}>
                  {rec.message}
                </p>
                {rec.action && (
                  <Link to={rec.action.link} style={recBtnStyle}>
                    {rec.action.label} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section: Analytics & Performance Charts */}
      <div style={{ marginTop: '24px' }}>
        <h2 style={sectionHeadingStyle}>📈 Performance & Topic Accuracy</h2>

        {!hasAttempts ? (
          <div style={emptyCardLarge}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Take your first practice session
            </h3>
            <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '440px', margin: '0 0 20px 0' }}>
              Your accuracy and score-over-time charts will appear here after you complete your first practice set or mock test.
            </p>
            <Link to="/practice" style={primaryLinkStyle}>
              Start First Practice Session
            </Link>
          </div>
        ) : (
          <div style={chartsGrid}>
            {/* Topic Accuracy Bar Chart */}
            <div style={cardStyle}>
              <h3 style={chartTitleStyle}>Topic Accuracy (%)</h3>
              {topicAccuracy.length === 0 ? (
                <div style={emptyBoxSmall}>
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>No topic answers recorded yet</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topicAccuracy} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="topicName" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => [`${value}%`, 'Accuracy']} />
                      <Bar dataKey="accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Score Over Time Line Chart */}
            <div style={cardStyle}>
              <h3 style={chartTitleStyle}>Score Over Time (%)</h3>
              {progress.length === 0 ? (
                <div style={emptyBoxSmall}>
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Take mock tests to track score progress over time</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progress} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="attemptNumber" tickFormatter={(n) => `Test ${n}`} tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => [`${value}%`, 'Score']} />
                      <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Weak & Strong Topics Cards */}
      {hasAttempts && (
        <div style={topicsGrid}>
          {/* Weak Topics */}
          <div style={cardStyle}>
            <div style={cardHeaderFlex}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️ Focus Areas (Weak Topics)</span>
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>min. 5 answered</span>
            </div>
            {weakTopics.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px', margin: '12px 0 0 0' }}>
                No topics flagged as weak. Keep practicing to maintain high accuracy!
              </p>
            ) : (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {weakTopics.map((wt: any) => (
                  <div key={wt.topicId} style={topicListItemStyle}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{wt.topicName}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                        ({wt.totalAnswered ?? wt.total} questions)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                        {wt.accuracyPercentage ?? wt.accuracy}%
                      </span>
                      <Link to={`/practice?topic=${wt.topicId}`} style={smallPracticeLink}>
                        Practice
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Strong Topics */}
          <div style={cardStyle}>
            <div style={cardHeaderFlex}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⭐ Strong Topics (&gt;= 80%)</span>
              </h3>
            </div>
            {strongTopics.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13px', margin: '12px 0 0 0' }}>
                Answer questions with &gt;= 80% accuracy to earn strong topic status!
              </p>
            ) : (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {strongTopics.map((st: any) => (
                  <div key={st.topicId} style={topicListItemStyle}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{st.topicName}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                        {st.accuracyPercentage ?? st.accuracy}%
                      </span>
                      <Link to={`/practice?topic=${st.topicId}&difficulty=hard`} style={smallPracticeLink}>
                        Challenge
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section: Mock Tests */}
      <div style={{ marginTop: '32px' }}>
        <div style={cardHeaderFlex}>
          <h2 style={sectionHeadingStyle}>📝 Available Mock Tests</h2>
          <Link to="/tests" style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            View All Tests →
          </Link>
        </div>

        {mockTests.length === 0 ? (
          <div style={emptyCardMedium}>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>No mock tests scheduled at this time.</p>
          </div>
        ) : (
          <div style={testsGrid}>
            {mockTests.slice(0, 4).map((t: any) => (
              <div key={t.id} style={testCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{t.title}</h3>
                  <span style={durationBadge}>{t.durationMins} mins</span>
                </div>

                <div style={testDetailsGrid}>
                  <div style={testDetailItem}>
                    <span style={testDetailLabel}>Questions</span>
                    <span style={testDetailVal}>{t.questionCount ?? t.totalQuestions ?? 0}</span>
                  </div>
                  <div style={testDetailItem}>
                    <span style={testDetailLabel}>Attempts</span>
                    <span style={testDetailVal}>
                      {t.attemptsUsed} / {t.maxAttempts}
                    </span>
                  </div>
                  <div style={testDetailItem}>
                    <span style={testDetailLabel}>Batch</span>
                    <span style={testDetailVal}>{t.batchName || 'All Batches'}</span>
                  </div>
                </div>

                {t.availableFrom && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                    Window: {new Date(t.availableFrom).toLocaleDateString()} -{' '}
                    {t.availableUntil ? new Date(t.availableUntil).toLocaleDateString() : 'Open'}
                  </div>
                )}

                <div style={{ marginTop: '16px' }}>
                  {t.isAvailable ? (
                    <button
                      onClick={() => navigate(`/tests/${t.id}`)}
                      style={startTestBtnStyle}
                      id={`start-test-btn-${t.id}`}
                    >
                      Start Test →
                    </button>
                  ) : (
                    <button disabled style={disabledBtnStyle}>
                      {!t.isWindowOpen
                        ? 'Window Closed'
                        : !t.isBatchEligible
                        ? 'Batch Ineligible'
                        : t.remainingAttempts <= 0
                        ? 'Attempts Exhausted'
                        : 'Unavailable'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: Upcoming Placement Drives */}
      <div style={{ marginTop: '32px', marginBottom: '40px' }}>
        <div style={cardHeaderFlex}>
          <h2 style={sectionHeadingStyle}>🏢 Upcoming Placement Drives</h2>
          <Link to="/companies" style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            View All Companies →
          </Link>
        </div>

        {drives.length === 0 ? (
          <div style={emptyCardMedium}>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>No drives announced yet.</p>
          </div>
        ) : (
          <div style={drivesGrid}>
            {drives.slice(0, 4).map((d: any) => (
              <div
                key={d.id}
                style={{
                  ...driveCardStyle,
                  borderColor: d.isTarget ? '#93c5fd' : '#e2e8f0',
                  boxShadow: d.isTarget ? '0 4px 12px rgba(59, 130, 246, 0.08)' : 'none',
                }}
              >
                {d.isTarget && <span style={pinnedBadgeStyle}>📌 Target Company</span>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: d.isTarget ? '4px' : '0' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>{d.name}</h3>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{d.jobRole}</span>
                  </div>
                  {d.package && <span style={packageBadgeStyle}>{d.package} LPA</span>}
                </div>

                <div style={driveInfoRow}>
                  <div>
                    <span style={driveMetaLabel}>Drive Date</span>
                    <strong style={driveMetaVal}>
                      {d.driveDate ? new Date(d.driveDate).toLocaleDateString() : 'TBA'}
                    </strong>
                  </div>
                  <div>
                    <span style={driveMetaLabel}>Countdown</span>
                    <strong style={driveMetaVal}>
                      {d.daysUntilDrive !== null ? `${d.daysUntilDrive} days left` : 'TBA'}
                    </strong>
                  </div>
                  <div>
                    <span style={driveMetaLabel}>Min CGPA</span>
                    <strong style={driveMetaVal}>{d.eligibilityCgpa ?? 'None'}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  {d.isEligible ? (
                    <span style={eligibleBadgeStyle}>✅ Eligible to Apply</span>
                  ) : (
                    <div>
                      <span style={ineligibleBadgeStyle}>❌ Not Eligible</span>
                      {d.reasons && d.reasons.length > 0 && (
                        <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>
                          {d.reasons.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STYLES (Modular, responsive, high aesthetic)
// ============================================================

const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '16px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '16px',
  marginBottom: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 800,
  color: '#0f172a',
  margin: 0,
  letterSpacing: '-0.02em',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  margin: '4px 0 0 0',
};

const headerActionGroup: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
};

const primaryLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
};

const secondaryLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#f1f5f9',
  color: '#334155',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
};

const profileAlertBanner: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
  padding: '12px 18px',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '10px',
  marginBottom: '20px',
};

const alertActionLink: React.CSSProperties = {
  color: '#15803d',
  fontWeight: 700,
  fontSize: '13px',
  textDecoration: 'none',
};

const topGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '20px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
};

const cardHeaderFlex: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
};

const cardHeading: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: 700,
  color: '#0f172a',
  margin: 0,
};

const readinessMainRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  flexWrap: 'wrap',
};

const circularRingWrapper: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexShrink: 0,
};

const ringOuter: React.CSSProperties = {
  width: '110px',
  height: '110px',
  borderRadius: '50%',
  background: 'conic-gradient(#3b82f6 0%, #10b981 70%, #e2e8f0 70%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 4px 10px rgba(59, 130, 246, 0.15)',
};

const ringInner: React.CSSProperties = {
  width: '86px',
  height: '86px',
  borderRadius: '50%',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
};

const ringScoreNumber: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 800,
  color: '#0f172a',
  lineHeight: 1,
};

const ringScoreTotal: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
  fontWeight: 600,
  marginTop: '2px',
};

const breakdownList: React.CSSProperties = {
  flex: 1,
  minWidth: '220px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const breakdownItem: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const breakdownLabelRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
};

const breakdownName: React.CSSProperties = {
  color: '#334155',
  fontWeight: 600,
};

const breakdownScore: React.CSSProperties = {
  color: '#64748b',
};

const progressBarTrack: React.CSSProperties = {
  height: '8px',
  backgroundColor: '#f1f5f9',
  borderRadius: '999px',
  overflow: 'hidden',
};

const progressBarFill: React.CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  transition: 'width 0.5s ease',
};

const breakdownHint: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
};

const unreadBadgeStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: '999px',
  backgroundColor: '#eff6ff',
  color: '#2563eb',
};

const notificationListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const notificationItemStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #f1f5f9',
};

const notifTitleRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2px',
};

const notifTitleText: React.CSSProperties = {
  fontSize: '13px',
  color: '#1e293b',
};

const notifDateText: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
};

const notifBodyText: React.CSSProperties = {
  fontSize: '12px',
  color: '#64748b',
  margin: 0,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 16px 0',
};

const recommendationsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '16px',
};

const recommendationCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
};

const recBtnStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  fontSize: '13px',
  fontWeight: 600,
  color: '#2563eb',
  textDecoration: 'none',
};

const chartsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '20px',
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#334155',
  margin: '0 0 12px 0',
};

const topicsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
  marginTop: '20px',
};

const topicListItemStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
};

const smallPracticeLink: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#2563eb',
  backgroundColor: '#eff6ff',
  padding: '3px 8px',
  borderRadius: '4px',
  textDecoration: 'none',
};

const testsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '16px',
};

const testCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const durationBadge: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  backgroundColor: '#f1f5f9',
  color: '#475569',
  padding: '2px 8px',
  borderRadius: '4px',
};

const testDetailsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginTop: '12px',
};

const testDetailItem: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const testDetailLabel: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
};

const testDetailVal: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#1e293b',
};

const startTestBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
};

const disabledBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  backgroundColor: '#e2e8f0',
  color: '#94a3b8',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'not-allowed',
};

const drivesGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '16px',
};

const driveCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
};

const pinnedBadgeStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#2563eb',
  backgroundColor: '#eff6ff',
  padding: '2px 8px',
  borderRadius: '4px',
  alignSelf: 'flex-start',
  marginBottom: '4px',
};

const packageBadgeStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#059669',
  backgroundColor: '#ecfdf5',
  padding: '2px 8px',
  borderRadius: '4px',
};

const driveInfoRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginTop: '12px',
};

const driveMetaLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#94a3b8',
};

const driveMetaVal: React.CSSProperties = {
  fontSize: '12px',
  color: '#1e293b',
};

const eligibleBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#15803d',
  backgroundColor: '#f0fdf4',
  padding: '4px 8px',
  borderRadius: '4px',
};

const ineligibleBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#b91c1c',
  backgroundColor: '#fef2f2',
  padding: '4px 8px',
  borderRadius: '4px',
};

const emptyCardLarge: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px dashed #cbd5e1',
  borderRadius: '12px',
  padding: '40px 20px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const emptyCardMedium: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px dashed #cbd5e1',
  borderRadius: '10px',
  padding: '24px',
  textAlign: 'center',
};

const emptyBoxSmall: React.CSSProperties = {
  height: '140px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const errorContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #fee2e2',
  borderRadius: '12px',
  padding: '48px 24px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  padding: '8px 20px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
};

const skeletonHeader: React.CSSProperties = {
  height: '40px',
  width: '280px',
  backgroundColor: '#e2e8f0',
  borderRadius: '8px',
  marginBottom: '20px',
};

const skeletonGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px',
};

const skeletonCard: React.CSSProperties = {
  height: '160px',
  backgroundColor: '#e2e8f0',
  borderRadius: '10px',
};