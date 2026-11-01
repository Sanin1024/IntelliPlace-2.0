import { useEffect, useState } from 'react';
import { mechTrainingApi } from '../../api/mechanicalTraining';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function MechSoftwarePage() {
  const [software, setSoftware] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    mechTrainingApi.getSoftware(filterCategory ? { category: filterCategory } : {})
      .then(setSoftware)
      .finally(() => setIsLoading(false));
  }, [filterCategory]);

  if (isLoading && software.length === 0) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '16px' }}>Engineering Software</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        CAD, CAM, CAE, and analysis software learning resources for Mechanical Engineering.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <select 
          value={filterCategory} 
          onChange={(e) => setFilterCategory(e.target.value)} 
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        >
          <option value="">All Categories</option>
          <option value="CAD">CAD</option>
          <option value="CAM">CAM</option>
          <option value="CAE">CAE</option>
          <option value="Programming">Programming</option>
        </select>
      </div>

      {software.length === 0 ? (
        <EmptyState icon="💻" title="No Software Found" description="Engineering software resources will appear here." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {software.map((s) => (
            <div key={s.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-info">{s.category}</span>
                  {s.isFree && <span className="badge badge-success">Free</span>}
                  {s.hasStudentLicense && <span className="badge badge-warning">Student License</span>}
                </div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--color-text)' }}>{s.name}</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                  {s.vendor || 'Unknown vendor'}
                </p>
                {s.description && <p style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--color-text)' }}>{s.description}</p>}
                {s.supportedFormats && s.supportedFormats.length > 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Formats: {s.supportedFormats.join(', ')}
                  </p>
                )}
              </div>
              {s.learningUrl && (
                <a href={s.learningUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ marginTop: '12px', fontSize: '13px' }}>
                  Learn →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

