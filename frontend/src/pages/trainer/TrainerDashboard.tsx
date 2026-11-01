import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import type { TrainerSummaryData } from '../../types';

export default function TrainerDashboard() {
  const [data, setData] = useState<TrainerSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/trainer/summary');
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        throw new Error(res.data?.error || 'Failed to load trainer summary');
      }
    } catch (err: any) {
      console.error('Error fetching trainer dashboard summary:', err);
      setError(err.response?.data?.error || err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={skeletonTitle} />
        <div style={skeletonGrid}>
          <div style={skeletonCard} />
          <div style={skeletonCard} />
          <div style={skeletonCard} />
          <div style={skeletonCard} />
        </div>
        <div style={{ ...skeletonCard, height: '280px', marginTop: '24px' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={containerStyle}>
        <div style={errorContainerStyle}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Unable to Load Trainer Dashboard
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', maxWidth: '400px' }}>
            {error || 'Could not retrieve trainer metrics.'}
          </p>
          <button onClick={fetchSummary} style={primaryBtnStyle}>
            ↻ Try Again
          </button>
        </div>
      </div>
    );
  }

  const { counts, recentTests = [], weakestTopics = [] } = data;

  return (
    <div style={containerStyle}>
      {/* Header with Quick Actions */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Trainer Dashboard</h1>
          <p style={subtitleStyle}>Manage question banks, coding challenges, mock assessments, and learning resources.</p>
        </div>
        <div style={quickActionsGroup}>
          <Link to="/trainer/questions" style={primaryActionBtn} id="add-question-btn">
            + Add Question
          </Link>
          <Link to="/trainer/problems" style={secondaryActionBtn} id="add-problem-btn">
            + Add Problem
          </Link>
          <Link to="/trainer/tests" style={accentActionBtn} id="build-test-btn">
            🛠 Build Test
          </Link>
          <Link to="/trainer/resources" style={resourceActionBtn} id="upload-resource-btn">
            📁 Upload Resource
          </Link>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div style={statsGrid}>
        <div style={statCardStyle}>
          <div style={statIconBox('#eff6ff', '#2563eb')}>❓</div>
          <div>
            <span style={statLabelStyle}>Aptitude Questions</span>
            <strong style={statNumberStyle}>{counts.questions}</strong>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={statIconBox('#ecfdf5', '#059669')}>💻</div>
          <div>
            <span style={statLabelStyle}>Coding Problems</span>
            <strong style={statNumberStyle}>{counts.problems}</strong>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={statIconBox('#f5f3ff', '#7c3aed')}>📝</div>
          <div>
            <span style={statLabelStyle}>Mock Tests</span>
            <strong style={statNumberStyle}>{counts.mockTests}</strong>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={statIconBox('#fff7ed', '#ea580c')}>📚</div>
          <div>
            <span style={statLabelStyle}>Study Resources</span>
            <strong style={statNumberStyle}>{counts.resources}</strong>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Tests (Left) & Weakest Topics (Right) */}
      <div style={twoColGrid}>
        {/* Recent Tests Table */}
        <div style={cardStyle}>
          <div style={cardHeaderFlex}>
            <div>
              <h2 style={cardHeading}>Recent Mock Tests</h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Latest 5 tests created by you</span>
            </div>
            <Link to="/trainer/tests" style={viewAllLink}>
              Manage Tests →
            </Link>
          </div>

          {recentTests.length === 0 ? (
            <div style={emptyBoxMedium}>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 12px 0' }}>No tests created yet.</p>
              <Link to="/trainer/tests" style={primaryActionBtn}>
                Create Your First Test
              </Link>
            </div>
          ) : (
            <div tabIndex={0} aria-label="Recent Mock Tests Table" style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={tableHeadRow}>
                    <th style={thStyle}>Test Title</th>
                    <th style={thStyle}>Duration</th>
                    <th style={thStyle}>Attempts</th>
                    <th style={thStyle}>Submitted</th>
                    <th style={thStyle}>Avg Score</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTests.map((t) => (
                    <tr key={t.id} style={tableRowStyle}>
                      <td style={tdStyle}>
                        <strong style={{ color: '#0f172a' }}>{t.title}</strong>
                      </td>
                      <td style={tdStyle}>{t.durationMins}m</td>
                      <td style={tdStyle}>{t.attemptsCount}</td>
                      <td style={tdStyle}>{t.submittedCount}</td>
                      <td style={tdStyle}>
                        {(() => {
                          const pct = t.avgPercentage ?? (t as any).averagePercentage ?? 0;
                          return (
                            <span
                              style={{
                                fontWeight: 700,
                                color: pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626',
                              }}
                            >
                              {t.submittedCount > 0 ? `${pct}%` : 'N/A'}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={tdStyle}>
                        <Link to={`/trainer/tests?viewResults=${t.id}`} style={tableActionLink}>
                          View Results
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Weakest Topics List Across All Students */}
        <div style={cardStyle}>
          <div style={cardHeaderFlex}>
            <div>
              <h2 style={cardHeading}>Student Weak Areas</h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Lowest accuracy across all students (min. 5 answers)</span>
            </div>
          </div>

          {weakestTopics.length === 0 ? (
            <div style={emptyBoxMedium}>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                No topics currently flagged with low student accuracy.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {weakestTopics.map((topic: any, i: number) => {
                const tId = topic.topicId ?? topic.id ?? `topic-${i}`;
                const tName = topic.topicName ?? topic.name ?? 'Topic';
                const tCount = topic.answeredCount ?? topic.totalAnswers ?? 0;
                const tAccuracy = topic.accuracyPercentage ?? topic.accuracy ?? 0;

                return (
                  <div key={tId} style={weakTopicItemStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          #{i + 1} {tName}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>
                          ({tCount} answers recorded)
                        </span>
                      </div>
                      <span style={accuracyBadgeStyle(tAccuracy)}>
                        {tAccuracy}% avg
                      </span>
                    </div>

                    <div style={topicHintBox}>
                      <span style={{ fontSize: '12px', color: '#b45309' }}>
                        💡 <strong>Trainer Action:</strong> Add more practice questions or upload study resources for {tName} to help students improve.
                      </span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <Link to="/trainer/questions" style={smallActionLink}>
                          + Add Questions
                        </Link>
                        <Link to="/trainer/resources" style={smallActionLink}>
                          + Add Resources
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STYLES
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
  marginBottom: '24px',
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

const quickActionsGroup: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const primaryActionBtn: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  textDecoration: 'none',
};

const secondaryActionBtn: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#059669',
  color: '#ffffff',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  textDecoration: 'none',
};

const accentActionBtn: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  textDecoration: 'none',
};

const resourceActionBtn: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#ea580c',
  color: '#ffffff',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  textDecoration: 'none',
};

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
};

const statCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '18px',
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
};

const statIconBox = (bg: string, color: string): React.CSSProperties => ({
  width: '46px',
  height: '46px',
  borderRadius: '10px',
  backgroundColor: bg,
  color,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '22px',
  flexShrink: 0,
});

const statLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#64748b',
  fontWeight: 500,
};

const statNumberStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '22px',
  fontWeight: 800,
  color: '#0f172a',
  marginTop: '2px',
};

const twoColGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
  gap: '24px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  padding: '20px',
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

const viewAllLink: React.CSSProperties = {
  fontSize: '13px',
  color: '#2563eb',
  fontWeight: 600,
  textDecoration: 'none',
  minHeight: '40px',
  display: 'inline-flex',
  alignItems: 'center',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
};

const tableHeadRow: React.CSSProperties = {
  borderBottom: '1px solid #e2e8f0',
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: '11px',
  textTransform: 'uppercase',
  color: '#64748b',
  fontWeight: 700,
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: '1px solid #f1f5f9',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 10px',
  fontSize: '13px',
  color: '#334155',
};

const tableActionLink: React.CSSProperties = {
  fontSize: '12px',
  color: '#2563eb',
  fontWeight: 600,
  textDecoration: 'none',
  minHeight: '40px',
  display: 'inline-flex',
  alignItems: 'center',
};

const weakTopicItemStyle: React.CSSProperties = {
  padding: '12px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  border: '1px solid #f1f5f9',
};

const accuracyBadgeStyle = (pct: number): React.CSSProperties => ({
  fontSize: '12px',
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: '4px',
  backgroundColor: pct < 40 ? '#fef2f2' : '#fffbeb',
  color: pct < 40 ? '#dc2626' : '#b45309',
});

const topicHintBox: React.CSSProperties = {
  marginTop: '6px',
  padding: '8px 10px',
  backgroundColor: '#fffbeb',
  borderRadius: '6px',
  borderLeft: '3px solid #f59e0b',
};

const smallActionLink: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#2563eb',
  textDecoration: 'none',
  minHeight: '40px',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  background: '#eff6ff',
  borderRadius: '4px',
};

const emptyBoxMedium: React.CSSProperties = {
  padding: '32px 16px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
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

const skeletonTitle: React.CSSProperties = {
  height: '32px',
  width: '240px',
  backgroundColor: '#e2e8f0',
  borderRadius: '6px',
  marginBottom: '20px',
};

const skeletonGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
};

const skeletonCard: React.CSSProperties = {
  height: '90px',
  backgroundColor: '#e2e8f0',
  borderRadius: '10px',
};