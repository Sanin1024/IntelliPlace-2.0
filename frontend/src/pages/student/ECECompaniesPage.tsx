import { useEffect, useState } from 'react';
import { eceTrainingApi } from '../../api/eceTraining';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function ECECompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [filterIndustry, setFilterIndustry] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    eceTrainingApi.getCompanies(filterIndustry ? { industry: filterIndustry } : {})
      .then(setCompanies)
      .finally(() => setIsLoading(false));
  }, [filterIndustry]);

  if (isLoading && companies.length === 0) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '16px' }}>ECE Company Preparation</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        Company profiles, required skills, and interview preparation for Electronics & Communication Engineers.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        >
          <option value="">All Industries</option>
          <option value="Semiconductor">Semiconductor</option>
          <option value="Telecommunications">Telecommunications</option>
          <option value="Defense">Defense &amp; Aerospace</option>
          <option value="Consumer Electronics">Consumer Electronics</option>
          <option value="Embedded Systems">Embedded Systems</option>
          <option value="IT">IT &amp; Software</option>
        </select>
      </div>

      {companies.length === 0 ? (
        <EmptyState icon="🔌" title="No Companies Found" description="Company profiles will appear here." />
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {companies.map((c) => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <h3 style={{ margin: '0 0 4px 0', color: 'var(--color-text)' }}>{c.companyName}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 12px 0' }}>
                    {c.industry}{c.isVerified && ' • ✓ Verified Recruiter'}
                  </p>
                  {c.description && (
                    <p style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--color-text)' }}>{c.description}</p>
                  )}

                  {c.relevantRoles && c.relevantRoles.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Relevant Roles</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {c.relevantRoles.map((r: string, i: number) => (
                          <span key={i} className="badge badge-info" style={{ fontSize: '10px' }}>{r}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {c.requiredSkills && c.requiredSkills.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Required Skills</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {c.requiredSkills.map((s: string, i: number) => (
                          <span key={i} className="badge badge-warning" style={{ fontSize: '10px' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {c.technicalFocus && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Technical Focus</p>
                      <p style={{ fontSize: '13px', color: 'var(--color-text)', marginTop: '4px' }}>{c.technicalFocus}</p>
                    </div>
                  )}

                  {c.interviewAreas && c.interviewAreas.length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Interview Focus Areas</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                        {c.interviewAreas.map((a: string, i: number) => (
                          <span key={i} className="badge badge-danger" style={{ fontSize: '10px' }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {c.careersUrl && (
                  <a
                    href={c.careersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ fontSize: '13px', whiteSpace: 'nowrap' }}
                  >
                    Careers →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

