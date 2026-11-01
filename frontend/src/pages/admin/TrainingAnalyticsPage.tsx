import { useEffect, useState } from 'react';
import { trainingApi } from '../../api/training';
import client from '../../api/client';

export default function TrainingAnalyticsPage() {
  const [effectiveness, setEffectiveness] = useState<any>(null);
  const [relevance, setRelevance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eff, rel] = await Promise.all([
        trainingApi.effectiveness(),
        trainingApi.contentRelevance(),
      ]);
      setEffectiveness(eff);
      setRelevance(rel);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load training analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadCsv = async () => {
    try {
      const res = await client.get('/training/analytics/effectiveness', {
        params: { format: 'csv' },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training_effectiveness_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to download CSV');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading institutional analytics...</div>;
  }

  const modules = effectiveness?.modules || [];
  const branchBreakdown = effectiveness?.branchBreakdown || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Training & Curriculum Effectiveness</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Measure module completion, dropouts, schedule adherence, and alignment with recruitment drive requirements.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleDownloadCsv}
            type="button"
            style={{
              padding: '8px 16px',
              background: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            📥 Export CSV Report
          </button>
          <button
            onClick={loadData}
            type="button"
            style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Top Level Metric Scoreboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={metricCard}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>SCHEDULE ADHERENCE</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
            {effectiveness?.overallAdherenceRate ?? 100}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Institutional on-time rate</div>
        </div>

        <div style={metricCard}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>CURRICULUM RELEVANCE</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
            {relevance?.coverageRate ?? 0}%
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            Coverage of live drive skill demands
          </div>
        </div>

        <div style={metricCard}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ACTIVE DRIVES ANALYZED</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#7c3aed', marginTop: '4px' }}>
            {relevance?.drivesAnalyzed ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {relevance?.totalMarketSkillsDemanded ?? 0} unique skills mapped
          </div>
        </div>

        <div style={metricCard}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>MODULES OFFERED</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {modules.length}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {modules.filter((m: any) => m.dropoutFlag).length} flagged for high dropouts
          </div>
        </div>
      </div>

      {/* Curriculum vs Recruitment Gap Analysis (Challenge 56) */}
      <div style={{ ...cardStyle, marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
              🎯 Curriculum vs. Recruitment Drive Alignment (Challenge 56)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Real-time delta between technical skills demanded by company placement drives and our current training offerings.
            </p>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              background: (relevance?.coverageRate ?? 0) >= 70 ? '#ecfdf5' : '#fef2f2',
              color: (relevance?.coverageRate ?? 0) >= 70 ? '#047857' : '#b91c1c',
            }}
          >
            {relevance?.coverageRate ?? 0}% Coverage
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Missing / Gap Skills */}
          <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '14px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
              🚨 Missing Skills Demanded by Drives ({relevance?.gapSkills?.length || 0})
            </h3>
            {(!relevance?.gapSkills || relevance.gapSkills.length === 0) ? (
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                ✓ No curriculum gaps! All skills demanded by upcoming companies have corresponding training modules.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {relevance.gapSkills.map((gap: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: '#fff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#0f172a' }}>{gap.skill}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{gap.suggestedAction}</div>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: '#fee2e2',
                        color: '#991b1b',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {gap.demandInDrives} Drives
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Covered Skills */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
              ✓ Aligned Training Competencies ({relevance?.coveredSkills?.length || 0})
            </h3>
            {(!relevance?.coveredSkills || relevance.coveredSkills.length === 0) ? (
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                No active skills currently aligned with company drives.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {relevance.coveredSkills.map((c: any, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      fontSize: '12px',
                      color: '#065f46',
                    }}
                  >
                    {c.skill} ({c.demandInDrives} drives · {c.modulesCovering} modules)
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module Dropout & Competency Matrix (Challenge 65) */}
      <div style={{ ...cardStyle, marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 600 }}>
          📊 Module Effectiveness & Dropout Diagnostic
        </h2>
        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b' }}>
          Modules with ≥ 5 enrollments and &lt; 30% completion are flagged for pedagogical review.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '10px 14px' }}>Module Name</th>
                <th style={{ padding: '10px 14px' }}>Level</th>
                <th style={{ padding: '10px 14px' }}>Enrolled</th>
                <th style={{ padding: '10px 14px' }}>Completed</th>
                <th style={{ padding: '10px 14px' }}>Completion Rate</th>
                <th style={{ padding: '10px 14px' }}>Avg Score</th>
                <th style={{ padding: '10px 14px' }}>Status Flag</th>
              </tr>
            </thead>
            <tbody>
              {modules.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    No modules available for analysis.
                  </td>
                </tr>
              ) : (
                modules.map((m: any) => (
                  <tr
                    key={m.moduleId}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: m.dropoutFlag ? '#fffbeb' : '#fff',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{m.title}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                          color: '#475569',
                        }}
                      >
                        {m.level}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{m.enrolledCount}</td>
                    <td style={{ padding: '10px 14px' }}>{m.completedCount}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      <span
                        style={{
                          color: m.completionRate >= 60 ? '#16a34a' : m.completionRate >= 30 ? '#d97706' : '#dc2626',
                        }}
                      >
                        {m.completionRate}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>{m.avgScore != null ? `${m.avgScore}%` : 'N/A'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {m.dropoutFlag ? (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          ⚠️ High Friction / Dropout
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontSize: '12px' }}>✓ Healthy</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-Branch Adherence Comparison */}
      {branchBreakdown.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '17px', fontWeight: 600 }}>
            🏫 Cross-Branch Adherence Comparison
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {branchBreakdown.map((b: any, idx: number) => (
              <div
                key={idx}
                style={{
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{b.branch}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                  {b.adherenceRate}%
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{b.completedCount} assignments completed</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

const metricCard: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  padding: '16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

