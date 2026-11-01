import { useEffect, useState } from 'react';
import { trainingApi } from '../../api/training';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { useToast } from '../../context/ToastContext';

export default function ResourceLibraryPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { addToast } = useToast();

  const load = () => {
    setIsLoading(true);
    trainingApi.getResources({ search: filter })
      .then(setResources)
      .catch(() => setResources([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(load, 300);
    return () => clearTimeout(timeout);
  }, [filter]);

  const handleBookmark = async (id: string) => {
    try {
      const res = await trainingApi.toggleBookmark(id);
      addToast(res.bookmarked ? 'Resource bookmarked' : 'Bookmark removed', 'success');
    } catch { 
      addToast('Failed to update bookmark', 'error'); 
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '16px' }}>Resource Library</h1>
      
      <input 
        type="text" 
        placeholder="🔍 Search resources by title..." 
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="input-field"
        style={{ marginBottom: '24px', maxWidth: '480px' }}
      />

      {resources.length === 0 ? (
        <EmptyState icon="🔍" title="No Resources Found" description="Try a different search term or check back later." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {resources.map(r => (
            <div key={r.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge badge-info">{r.resourceType}</span>
                  {r.difficulty && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {r.difficulty}
                    </span>
                  )}
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--color-text)' }}>{r.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                  {r.description || 'No description available.'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                  Provider: <strong>{r.provider || 'Internal'}</strong>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                {r.externalUrl && (
                  <a href={r.externalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: 1, fontSize: '13px' }}>
                    Open ↗
                  </a>
                )}
                <button 
                  onClick={() => handleBookmark(r.id)} 
                  className="btn btn-primary" 
                  style={{ fontSize: '14px', padding: '8px 12px' }}
                  title="Bookmark resource"
                  aria-label="Bookmark resource"
                >
                  🔖
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

