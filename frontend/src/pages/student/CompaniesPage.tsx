import { useEffect, useState } from 'react';
import { companyApi } from '../../api/company';
import type { Company } from '../../api/company';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'eligible' | 'upcoming' | 'targets'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      companyApi.getAll(),
      companyApi.getMyTargets().catch(() => []),
    ])
      .then(([companiesData, targetsData]) => {
        setCompanies(companiesData);
        setTargets(targetsData.map((t) => t.companyId || t.id));
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load companies'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggleTarget = async (companyId: string) => {
    try {
      const result = await companyApi.toggleTarget(companyId);
      setTargets(prev =>
        result.isTarget
          ? [...prev, companyId]
          : prev.filter(id => id !== companyId)
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update target');
    }
  };

  const getFiltered = () => {
    switch (filter) {
      case 'eligible':
        return companies.filter(c => c.myEligibility?.eligible);
      case 'upcoming':
        return companies.filter(c =>
          c.daysUntilDrive !== null && c.daysUntilDrive >= 0 && c.daysUntilDrive <= 30
        );
      case 'targets':
        return companies.filter(c => targets.includes(c.id));
      default:
        return companies;
    }
  };

  const filtered = getFiltered();

  if (isLoading) return <p>Loading companies...</p>;

  return (
    <div>
      <h1>Company Drives</h1>
      <p style={{ color: '#64748b' }}>
        Browse upcoming placement drives. Check your eligibility and mark target companies.
      </p>

      {error && <div style={errAlert}>{error}</div>}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '20px', marginBottom: '24px' }}>
        {(['all', 'eligible', 'upcoming', 'targets'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...filterBtn,
              ...(filter === f ? filterActive : {}),
            }}
          >
            {f === 'all' ? 'All Companies' :
             f === 'eligible' ? '✅ I\'m Eligible' :
             f === 'upcoming' ? '📅 Within 30 Days' :
             `⭐ My Targets (${targets.length})`}
          </button>
        ))}
      </div>

      {/* Company cards */}
      {filtered.map(company => {
        const isTarget = targets.includes(company.id);
        const isEligible = company.myEligibility?.eligible;
        const driveDateFormatted = company.driveDate
          ? new Date(company.driveDate).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })
          : 'TBD';

        return (
          <div key={company.id} style={companyCard}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{company.name}</h3>
                  {company.package && (
                    <span style={packageBadge}>₹{company.package} LPA</span>
                  )}
                  {isEligible !== undefined && (
                    <span style={isEligible ? eligibleBadge : notEligibleBadge}>
                      {isEligible ? '✅ Eligible' : '❌ Not Eligible'}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '14px', color: '#475569', margin: '8px 0 4px 0' }}>
                  <strong>Role:</strong> {company.jobRole}
                </p>

                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                  <span>📅 Drive: {driveDateFormatted}</span>
                  {company.daysUntilDrive !== null && company.daysUntilDrive >= 0 && (
                    <span style={{
                      color: company.daysUntilDrive <= 7 ? '#dc2626' : '#d97706',
                      fontWeight: 600,
                    }}>
                      ⏰ {company.daysUntilDrive} day{company.daysUntilDrive !== 1 ? 's' : ''} left
                    </span>
                  )}
                  <span>🎓 CGPA: {company.eligibilityCgpa}+</span>
                  <span>👥 {company.eligibleBranches?.map(b => b.name).join(', ')}</span>
                  <span>⭐ {company.targetCount} interested</span>
                </div>
              </div>

              {/* Target button */}
              <button
                onClick={() => handleToggleTarget(company.id)}
                style={{
                  ...targetBtn,
                  ...(isTarget ? targetBtnActive : {}),
                }}
              >
                {isTarget ? '⭐ Target' : '☆ Add Target'}
              </button>
            </div>

            {/* Eligibility reasons */}
            {!isEligible && (company.myEligibility?.reasons?.length ?? 0) > 0 && (
              <div style={reasonsBox}>
                {company.myEligibility?.reasons?.map((reason: string, i: number) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: '12px', color: '#dc2626' }}>
                    • {reason}
                  </p>
                ))}
              </div>
            )}

            {/* Expandable syllabus */}
            <button
              onClick={() => setExpandedId(expandedId === company.id ? null : company.id)}
              style={expandBtn}
            >
              {expandedId === company.id ? '▲ Hide Details' : '▼ View Syllabus & Details'}
            </button>

            {expandedId === company.id && (
              <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                {company.description && (
                  <p style={{ fontSize: '14px', color: '#475569', marginBottom: '12px' }}>
                    {company.description}
                  </p>
                )}
                {company.syllabusText && (
                  <div style={syllabusBox}>
                    <strong style={{ display: 'block', marginBottom: '6px' }}>📋 Syllabus / Pattern:</strong>
                    <pre style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {company.syllabusText}
                    </pre>
                  </div>
                )}
                {company.topics && company.topics.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <strong style={{ fontSize: '13px', color: '#475569' }}>Topics to prepare:</strong>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {company.topics.map(t => (
                        <span key={t.id} style={topicTag}>📚 {t.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>🏢</p>
          <p>No companies match this filter.</p>
        </div>
      )}
    </div>
  );
}

// Styles
const companyCard: React.CSSProperties = {
  background: '#fff', padding: '20px', borderRadius: '12px',
  border: '1px solid #e2e8f0', marginBottom: '14px',
};
const packageBadge: React.CSSProperties = {
  background: '#f0fdf4', color: '#16a34a', padding: '2px 10px',
  borderRadius: '10px', fontSize: '12px', fontWeight: 700,
};
const eligibleBadge: React.CSSProperties = {
  background: '#dcfce7', color: '#166534', padding: '3px 12px',
  borderRadius: '10px', fontSize: '12px', fontWeight: 600,
};
const notEligibleBadge: React.CSSProperties = {
  background: '#fef2f2', color: '#dc2626', padding: '3px 12px',
  borderRadius: '10px', fontSize: '12px', fontWeight: 600,
};
const targetBtn: React.CSSProperties = {
  padding: '8px 16px', background: '#f1f5f9', color: '#475569',
  border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer',
  fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
};
const targetBtnActive: React.CSSProperties = {
  background: '#fef9c3', color: '#854d0e', borderColor: '#fde047',
};
const reasonsBox: React.CSSProperties = {
  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
  padding: '10px 14px', marginTop: '12px',
};
const expandBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer',
  fontSize: '13px', fontWeight: 600, marginTop: '12px', padding: 0,
};
const syllabusBox: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '12px', fontSize: '13px', color: '#475569',
};
const topicTag: React.CSSProperties = {
  background: '#eff6ff', color: '#1e40af', padding: '4px 10px',
  borderRadius: '6px', fontSize: '12px',
};
const filterBtn: React.CSSProperties = {
  padding: '8px 16px', background: '#fff', color: '#475569',
  border: '1px solid #e2e8f0', borderRadius: '20px', cursor: 'pointer',
  fontSize: '13px', fontWeight: 600,
};
const filterActive: React.CSSProperties = {
  background: '#1a73e8', color: '#fff', borderColor: '#1a73e8',
};
const errAlert: React.CSSProperties = {
  padding: '12px', borderRadius: '6px', marginBottom: '16px',
  fontSize: '14px', background: '#fee2e2', color: '#dc2626',
};