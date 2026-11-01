import { useEffect, useState } from 'react';
import { eeeTrainingApi } from '../../api/eeeTraining';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function EEECompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [filterIndustry, setFilterIndustry] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    eeeTrainingApi.getCompanies(filterIndustry ? { industry: filterIndustry } : {})
      .then(setCompanies)
      .finally(() => setIsLoading(false));
  }, [filterIndustry]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '16px' }}>EEE Company Preparation</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        Power, electrical equipment, renewable energy, EV, and automation company profiles.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          <option value="">All Industries</option>
          <option value="Power Generation">Power Generation</option>
          <option value="Electrical Equipment">Electrical Equipment</option>
          <option value="Renewable Energy">Renewable Energy</option>
          <option value="EV">EV</option>
          <option value="Automation">Automation</option>
          <option value="Government">Government</option>
          <option value="Engineering Services">Engineering Services</option>
        </select>
      </div>

      {companies.length === 0 ? (
        <EmptyState icon="🏢" title="No Companies Found" />
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {companies.map(c => (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <h3 style={{ margin: '0 0 4px 0' }}>{c.companyName}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 12px 0' }}>
                    {c.industry} {c.isVerified && '✓ Verified'}
                  </p>
                  {c.description && <p style={{ fontSize: '14px', marginBottom: '12px' }}>{c.description}</p>}

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
                  <a href={c.careersUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
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

