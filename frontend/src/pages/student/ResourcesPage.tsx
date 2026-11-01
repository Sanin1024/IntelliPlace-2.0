import { useEffect, useState } from 'react';
import { resourceApi } from '../../api/resource';
import { publicApi } from '../../api/admin';
import { trainingApi } from '../../api/training';
import type { Resource } from '../../api/resource';

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [filterTopic, setFilterTopic] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const params: any = {};
      if (filterTopic) params.topicId = filterTopic;
      if (search) params.search = search;
      let data = await resourceApi.getAll(params);

      if (filterType) {
        data = data.filter(r => {
          const ext = r.fileUrl.split('.').pop()?.toLowerCase();
          if (filterType === 'pdf') return ext === 'pdf';
          if (filterType === 'video') return ['mp4', 'avi', 'mkv'].includes(ext || '');
          if (filterType === 'document') return ['doc', 'docx', 'txt', 'md'].includes(ext || '');
          if (filterType === 'presentation') return ['ppt', 'pptx'].includes(ext || '');
          return true;
        });
      }
      setResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    publicApi.getTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  useEffect(() => { load(); }, [filterTopic, search]);

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Learning Resources</h1>
      <p style={{ color: '#64748b' }}>Study materials uploaded by your trainers.</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          aria-label="Search resources"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search resources..."
          style={{ ...inp, flex: 1, minWidth: '200px' }}
        />
        <select aria-label="Filter by topic" value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={{...inp, width: '200px'}}>
          <option value="">All topics</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select aria-label="Filter by type" value={filterType} onChange={e => { setFilterType(e.target.value); }} style={{...inp, width: '150px'}}>
          <option value="">All types</option>
          <option value="pdf">PDF</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
          <option value="presentation">Presentations</option>
        </select>
      </div>

      {/* Resource cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {resources.map(r => (
          <div key={r.id} style={card}>
            <p style={{ fontSize: '28px', margin: '0 0 8px 0' }}>
              {r.fileUrl.includes('.pdf') ? '📄' :
               r.fileUrl.includes('.mp4') ? '🎥' :
               r.fileUrl.includes('.ppt') ? '📊' :
               r.fileUrl.includes('.mp3') ? '🎵' : '📁'}
            </p>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{r.title}</h3>
            {r.description && (
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>{r.description}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {r.topic?.name || 'General'}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const downloadEndpoint = trainingApi.downloadUrl(r.id);
                    const res = await fetch(downloadEndpoint, {
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    if (!res.ok) throw new Error('Download failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${r.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch {
                    alert('Error downloading resource');
                  }
                }}
                style={viewBtn}
              >
                Download →
              </button>
            </div>
          </div>
        ))}
      </div>

      {resources.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>📚</p>
          <p>No resources found. Try different filters.</p>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' };
const card: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const viewBtn: React.CSSProperties = { padding: '6px 14px', background: '#1a73e8', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 };