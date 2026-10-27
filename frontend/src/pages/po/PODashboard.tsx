import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../../api/client';
import type { POSummaryData } from '../../types';

export default function PODashboard() {
  const [data, setData] = useState<POSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/po/summary');
      if (res.data?.success) {
        setData(res.data.data);
      } else {
        throw new Error(res.data?.error || 'Failed to load PO summary');
      }
    } catch (err: any) {
      console.error('Error fetching PO dashboard:', err);
      setError(err.response?.data?.error || err.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await api.get('/po/students/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `students_roster_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading CSV:', err);
      alert('Failed to export students CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

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
        <div style={{ ...skeletonCard, height: '300px', marginTop: '24px' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={containerStyle}>
        <div style={errorContainerStyle}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Unable to Load Placement Dashboard
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px', maxWidth: '400px' }}>
            {error || 'Could not retrieve placement office metrics.'}
          </p>
          <button onClick={fetchSummary} style={primaryBtnStyle}>
            ↻ Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    totalStudents = 0,
    byPlacementStatus = { not_placed: 0, in_process: 0, placed: 0 },
    readinessBands = { notReady: 0, almostReady: 0, ready: 0 },
    batchReadiness = [],
    branchReadiness = [],
    upcomingDrives = [],
    attentionStudents = [],
  } = data;

  const placementChartData = [
    { name: 'Not Placed', value: byPlacementStatus.not_placed || 0, color: '#f87171' },
    { name: 'In Process', value: byPlacementStatus.in_process || 0, color: '#fbbf24' },
    { name: 'Placed', value: byPlacementStatus.placed || 0, color: '#34d399' },
  ];

  const readinessChartData = [
    { band: 'Not Ready (<40)', count: readinessBands.notReady || 0, fill: '#ef4444' },
    { band: 'Almost Ready (40-70)', count: readinessBands.almostReady || 0, fill: '#f59e0b' },
    { band: 'Ready (>70)', count: readinessBands.ready || 0, fill: '#10b981' },
  ];

  return (
    <div style={containerStyle}>
      {/* Header with Export Action */}
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Placement Officer Dashboard</h1>
          <p style={subtitleStyle}>Track cohort readiness, placement status, drives, and student interventions.</p>
        </div>
        <div style={actionButtonGroup}>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            style={exportBtnStyle}
            id="export-roster-btn"
          >
            {exporting ? 'Exporting...' : '📥 Export Student Roster (CSV)'}
          </button>
          <Link to="/po/companies" style={primaryActionLink} id="manage-drives-link">
            + Announce Drive
          </Link>
          <Link to="/po/students" style={secondaryActionLink} id="view-students-link">
            👥 All Students
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={statsGrid}>
        <div style={statCardStyle}>
          <div style={statIconBox('#eff6ff', '#2563eb')}>👥</div>
          <div>
            <span style={statLabelStyle}>Total Students</span>
            <strong style={statNumberStyle}>{totalStudents}</strong>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={statIconBox('#ecfdf5', '#059669')}>🎉</div>
          <div>
            <span style={statLabelStyle}>Placed</span>
            <strong style={statNumberStyle}>{byPlacementStatus.placed}</strong>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={statIconBox('#fffbeb', '#d97706')}>⏳</div>
          <div>
            <span style={statLabelStyle}>In Process</span>
            <strong style={statNumberStyle}>{byPlacementStatus.in_process}</strong>
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={statIconBox('#f0fdf4', '#16a34a')}>🎯</div>
          <div>
            <span style={statLabelStyle}>Interview Ready (&gt;70)</span>
            <strong style={statNumberStyle}>{readinessBands.ready}</strong>
          </div>
        </div>
      </div>

      {/* Two Column Section: Placement Status Chart & Readiness Band Chart */}
      <div style={twoColGrid}>
        {/* Placement Status Chart */}
        <div style={cardStyle}>
          <h2 style={cardHeading}>Placement Status Distribution</h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Current student progress towards placement</span>

          {totalStudents === 0 ? (
            <div style={emptyBoxSmall}>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>No student records found</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 240, marginTop: '12px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={placementChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {placementChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} students`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Readiness Band Distribution Chart */}
        <div style={cardStyle}>
          <h2 style={cardHeading}>Readiness Bands</h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Students grouped by readiness benchmark score</span>

          {totalStudents === 0 ? (
            <div style={emptyBoxSmall}>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>No student records found</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 240, marginTop: '12px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={readinessChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="band" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => [`${value} students`, 'Count']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {readinessChartData.map((entry, idx) => (
                      <Cell key={`bar-${idx}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Batch & Branch Comparison Tables */}
      <div style={{ ...twoColGrid, marginTop: '24px' }}>
        {/* Batch Readiness Table */}
        <div style={cardStyle}>
          <h2 style={cardHeading}>Average Readiness by Batch</h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Batch-wise readiness benchmarks</span>

          <div style={{ overflowX: 'auto', marginTop: '12px' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRow}>
                  <th style={thStyle}>Batch</th>
                  <th style={thStyle}>Students</th>
                  <th style={thStyle}>Avg Readiness</th>
                </tr>
              </thead>
              <tbody>
                {batchReadiness.map((b) => (
                  <tr key={b.batchName} style={tableRowStyle}>
                    <td style={tdStyle}>
                      <strong>Batch {b.batchName}</strong>
                    </td>
                    <td style={tdStyle}>{b.studentCount}</td>
                    <td style={tdStyle}>
                      <span style={readinessTagStyle(b.avgReadiness)}>{b.avgReadiness} / 100</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Branch Readiness Table */}
        <div style={cardStyle}>
          <h2 style={cardHeading}>Average Readiness by Branch</h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Branch-wise readiness benchmarks</span>

          <div style={{ overflowX: 'auto', marginTop: '12px' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRow}>
                  <th style={thStyle}>Branch</th>
                  <th style={thStyle}>Students</th>
                  <th style={thStyle}>Avg Readiness</th>
                </tr>
              </thead>
              <tbody>
                {branchReadiness.map((br) => (
                  <tr key={br.branchName} style={tableRowStyle}>
                    <td style={tdStyle}>
                      <strong>{br.branchName}</strong>
                    </td>
                    <td style={tdStyle}>{br.studentCount}</td>
                    <td style={tdStyle}>
                      <span style={readinessTagStyle(br.avgReadiness)}>{br.avgReadiness} / 100</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upcoming Placement Drives Table */}
      <div style={{ ...cardStyle, marginTop: '24px' }}>
        <div style={cardHeaderFlex}>
          <div>
            <h2 style={cardHeading}>Upcoming Drives & Cohort Match</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Targeted vs Eligible students for announced drives</span>
          </div>
          <Link to="/po/companies" style={viewAllLink}>
            Manage Drives →
          </Link>
        </div>

        {upcomingDrives.length === 0 ? (
          <div style={emptyBoxMedium}>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>No drives announced yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRow}>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Job Role</th>
                  <th style={thStyle}>Drive Date</th>
                  <th style={thStyle}>Package</th>
                  <th style={thStyle}>Cutoff CGPA</th>
                  <th style={thStyle}>Targeted</th>
                  <th style={thStyle}>Eligible Pool</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDrives.map((d) => (
                  <tr key={d.id} style={tableRowStyle}>
                    <td style={tdStyle}>
                      <strong>{d.name}</strong>
                    </td>
                    <td style={tdStyle}>{d.jobRole}</td>
                    <td style={tdStyle}>
                      {d.driveDate ? new Date(d.driveDate).toLocaleDateString() : 'TBA'}
                      {d.daysUntilDrive !== null && (
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                          ({d.daysUntilDrive}d left)
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>{d.package ? `${d.package} LPA` : 'TBA'}</td>
                    <td style={tdStyle}>{d.eligibilityCgpa ? `${d.eligibilityCgpa}+` : 'None'}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#2563eb' }}>{d.targetedCount} students</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#059669' }}>{d.eligibleCount} eligible</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Students Requiring Attention (Lowest Readiness or Inactive) */}
      <div style={{ ...cardStyle, marginTop: '24px', marginBottom: '40px' }}>
        <div style={cardHeaderFlex}>
          <div>
            <h2 style={{ ...cardHeading, color: '#dc2626' }}>⚠️ Students Requiring Attention</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Top 5 students with lowest readiness score needing intervention
            </span>
          </div>
          <Link to="/po/students" style={viewAllLink}>
            View Full Student Roster →
          </Link>
        </div>

        {attentionStudents.length === 0 ? (
          <div style={emptyBoxMedium}>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
              All students have strong progress!
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={tableHeadRow}>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Branch / Batch</th>
                  <th style={thStyle}>CGPA</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Readiness Score</th>
                  <th style={thStyle}>Attempts</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {attentionStudents.map((s) => (
                  <tr key={s.id} style={tableRowStyle}>
                    <td style={tdStyle}>
                      <strong style={{ color: '#0f172a' }}>{s.name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{s.email}</div>
                    </td>
                    <td style={tdStyle}>
                      {s.branch} / {s.batch}
                    </td>
                    <td style={tdStyle}>{s.cgpa ?? 'Not Set'}</td>
                    <td style={tdStyle}>
                      <span style={statusTagStyle(s.placementStatus)}>
                        {s.placementStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <strong style={{ color: s.readinessScore < 40 ? '#dc2626' : '#d97706' }}>
                        {s.readinessScore} / 100
                      </strong>
                    </td>
                    <td style={tdStyle}>{s.attemptsCount} attempts</td>
                    <td style={tdStyle}>
                      <Link to={`/po/students/${s.id}`} style={tableActionLink}>
                        Inspect & Intervene →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

const actionButtonGroup: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const exportBtnStyle: React.CSSProperties = {
  backgroundColor: '#0f766e',
  color: '#ffffff',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
};

const primaryActionLink: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  textDecoration: 'none',
};

const secondaryActionLink: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#f1f5f9',
  color: '#334155',
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
};

const readinessTagStyle = (score: number): React.CSSProperties => ({
  fontSize: '12px',
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: '4px',
  backgroundColor: score >= 70 ? '#ecfdf5' : score >= 40 ? '#fffbeb' : '#fef2f2',
  color: score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626',
});

const statusTagStyle = (status: string): React.CSSProperties => {
  if (status === 'placed') return { fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#059669' };
  if (status === 'in_process') return { fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fffbeb', color: '#d97706' };
  return { fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b' };
};

const emptyBoxSmall: React.CSSProperties = {
  height: '140px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const emptyBoxMedium: React.CSSProperties = {
  padding: '32px 16px',
  textAlign: 'center',
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