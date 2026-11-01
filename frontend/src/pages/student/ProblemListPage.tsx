import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { problemApi } from '../../api/problem';
import { publicApi } from '../../api/admin';
import type { CodingProblem } from '../../api/problem';

export default function ProblemListPage() {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    publicApi.getTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const params: any = {};
        if (filterTopic) params.topicId = filterTopic;
        if (filterDifficulty) params.difficulty = filterDifficulty;
        setProblems(await problemApi.getAll(params));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [filterTopic, filterDifficulty]);

  const codingTopics = topics.filter(t => t.type === 'coding');

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Coding Problems</h1>
      <p style={{ color: '#64748b' }}>Click a problem to view details, sample I/O, and test cases.</p>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', marginBottom: '24px' }}>
        <select aria-label="Filter by topic" value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={{...inp, width: '200px'}}>
          <option value="">All topics</option>
          {codingTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select aria-label="Filter by difficulty" value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} style={{...inp, width: '150px'}}>
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {problems.map(p => (
        <div key={p.id} style={problemCard} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <span style={diffBadge(p.difficulty)}>{p.difficulty}</span>
                <span style={topicBadge}>{p.topic?.name}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{p.title}</h3>
            </div>
            <span style={{ fontSize: '18px', color: '#94a3b8' }}>
              {expandedId === p.id ? '▲' : '▼'}
            </span>
          </div>

          {expandedId === p.id && (
            <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <pre style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {p.description}
              </pre>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Sample Input:</h4>
                  <pre style={{ background: '#1e293b', color: '#a5f3fc', padding: '12px', borderRadius: '8px', fontSize: '13px', margin: 0 }}>
                    {p.sampleInput}
                  </pre>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Sample Output:</h4>
                  <pre style={{ background: '#1e293b', color: '#86efac', padding: '12px', borderRadius: '8px', fontSize: '13px', margin: 0 }}>
                    {p.sampleOutput}
                  </pre>
                </div>
              </div>

              {p.tags && p.tags.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  {p.tags.map((tag, i) => (
                    <span key={i} style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', marginRight: '4px' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <Link
                  to={`/problems/${p.id}`}
                  style={{
                    display: 'inline-block',
                    background: '#4f46e5',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Solve Problem →
                </Link>
              </div>
            </div>
          )}
        </div>
      ))}

      {problems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>💻</p>
          <p>No coding problems available yet.</p>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' };
const problemCard: React.CSSProperties = { background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px', cursor: 'pointer' };
const topicBadge: React.CSSProperties = { background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 };

function diffBadge(d: string): React.CSSProperties {
  const bg: Record<string, string> = { easy: '#f0fdf4', medium: '#fffbeb', hard: '#fef2f2' };
  const c: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626' };
  return { background: bg[d], color: c[d], padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 };
}