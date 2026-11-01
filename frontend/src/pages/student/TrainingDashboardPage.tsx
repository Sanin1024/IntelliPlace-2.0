import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { trainingApi } from '../../api/training';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function TrainingDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      trainingApi.getDashboard().catch(() => ({ bookmarks: 0, inProgress: 0, completed: 0 })),
      trainingApi.getResources({ limit: 5 }).catch(() => [])
    ]).then(([s, r]) => {
      setStats(s);
      setResources(r);
    }).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '24px' }}>Placement Training Hub</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '32px' }}>{stats?.bookmarks || 0}</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '8px 0 0 0' }}>Bookmarked</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--color-warning)', fontSize: '32px' }}>{stats?.inProgress || 0}</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '8px 0 0 0' }}>In Progress</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--color-success)', fontSize: '32px' }}>{stats?.completed || 0}</h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '8px 0 0 0' }}>Completed</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0 }}>Latest Resources</h3>
        <Link to="/training/resources" className="btn btn-secondary">View Library →</Link>
      </div>

      {resources.length === 0 ? (
        <EmptyState icon="📚" title="No Resources Yet" description="Check back later for learning materials and modules." />
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {resources.map(r => (
            <div key={r.id} className="card card-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>{r.title}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                  {r.provider || 'Internal'} • {r.category || 'General'} • {r.difficulty || 'All Levels'}
                </p>
              </div>
              {r.externalUrl && (
                <a href={r.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                  Access
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

