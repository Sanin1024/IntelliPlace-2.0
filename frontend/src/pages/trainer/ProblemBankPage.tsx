import { useEffect, useState } from 'react';
import { problemApi } from '../../api/problem';
import { publicApi } from '../../api/admin';
import type { CodingProblem, TestCase } from '../../api/problem';

const EMPTY_PROBLEM = {
  topicId: '', difficulty: 'easy', title: '', description: '',
  sampleInput: '', sampleOutput: '', tags: '',
  testCases: [{ input: '', expectedOutput: '', isHidden: false }] as TestCase[],
};

export default function ProblemBankPage() {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_PROBLEM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const codingTopics = topics.filter(t => t.type === 'coding');

  const load = async () => {
    try {
      setProblems(await problemApi.getAll());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load problems');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    publicApi.getTopics().then(setTopics).catch(() => setTopics([]));
    load();
  }, []);

  const addTestCase = () => {
    setForm(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '', isHidden: false }],
    }));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    setForm(prev => ({
      ...prev,
      testCases: prev.testCases.map((tc, i) => i === index ? { ...tc, [field]: value } : tc),
    }));
  };

  const removeTestCase = (index: number) => {
    setForm(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const data = {
        topicId: parseInt(form.topicId),
        difficulty: form.difficulty as 'easy' | 'medium' | 'hard',
        title: form.title,
        description: form.description,
        sampleInput: form.sampleInput,
        sampleOutput: form.sampleOutput,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        testCases: form.testCases.filter(tc => tc.input && tc.expectedOutput),
      };
      if (editingId) {
        await problemApi.update(editingId, data);
        setSuccess('Problem updated');
      } else {
        await problemApi.create(data);
        setSuccess('Problem created');
      }
      setForm(EMPTY_PROBLEM);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save problem');
    }
  };

  const handleEdit = (p: CodingProblem) => {
    setForm({
      topicId: p.topicId.toString(),
      difficulty: p.difficulty,
      title: p.title,
      description: p.description,
      sampleInput: p.sampleInput,
      sampleOutput: p.sampleOutput,
      tags: (p.tags || []).join(', '),
      testCases: p.testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
      })),
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this problem?')) return;
    try {
      await problemApi.delete(id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Coding Problem Bank</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY_PROBLEM); }} style={btnPrimary}>
          {showForm ? 'Close Form' : '+ Add Problem'}
        </button>
      </div>

      {error && <div style={errAlert}>{error}</div>}
      {success && <div style={okAlert}>{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={formCard}>
          <h3>{editingId ? 'Edit Problem' : 'New Coding Problem'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>Topic</label>
              <select value={form.topicId} onChange={e => setForm({...form, topicId: e.target.value})} required style={inp}>
                <option value="">Select topic</option>
                {codingTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} style={inp}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={lbl}>Title</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required minLength={3} style={inp} placeholder="e.g., Two Sum" />
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={lbl}>Description (supports multi-line)</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} required minLength={10} rows={5} style={inp} placeholder="Problem description..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={lbl}>Sample Input</label>
              <textarea value={form.sampleInput} onChange={e => setForm({...form, sampleInput: e.target.value})} required rows={3} style={inp} placeholder="5&#10;3 7 1 9 4" />
            </div>
            <div>
              <label style={lbl}>Sample Output</label>
              <textarea value={form.sampleOutput} onChange={e => setForm({...form, sampleOutput: e.target.value})} required rows={3} style={inp} placeholder="9" />
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={lbl}>Tags (comma-separated)</label>
            <input type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} style={inp} placeholder="arrays, two-pointer, sorting" />
          </div>

          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Test Cases</h4>
              <button type="button" onClick={addTestCase} style={btnSmall}>+ Add Test Case</button>
            </div>

            {form.testCases.map((tc, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '8px', marginTop: '12px', alignItems: 'end' }}>
                <div>
                  <label style={lbl}>Input</label>
                  <textarea value={tc.input} onChange={e => updateTestCase(idx, 'input', e.target.value)} rows={2} style={inp} placeholder="Test input" />
                </div>
                <div>
                  <label style={lbl}>Expected Output</label>
                  <textarea value={tc.expectedOutput} onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)} rows={2} style={inp} placeholder="Expected output" />
                </div>
                <div>
                  <label style={lbl}>Hidden</label>
                  <input type="checkbox" checked={tc.isHidden} onChange={e => updateTestCase(idx, 'isHidden', e.target.checked)} style={{ width: '20px', height: '20px' }} />
                </div>
                <button type="button" onClick={() => removeTestCase(idx)} style={{...btnSmall, background: '#fee2e2', color: '#dc2626', marginBottom: '4px' }}>✕</button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={btnPrimary}>{editingId ? 'Update Problem' : 'Create Problem'}</button>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_PROBLEM); }} style={btnSecondary}>Cancel</button>}
          </div>
        </form>
      )}

      <div style={{ marginTop: '20px' }}>
        {problems.map(p => (
          <div key={p.id} style={problemCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={diffBadge(p.difficulty)}>{p.difficulty}</span>
                  <span style={topicBadge}>{p.topic?.name}</span>
                  {p.tags?.map((tag, i) => (
                    <span key={i} style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>#{tag}</span>
                  ))}
                </div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{p.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  {p.testCases?.length || 0} test cases
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button onClick={() => handleEdit(p)} style={btnSmall}>✏️ Edit</button>
                <button onClick={() => handleDelete(p.id)} style={{...btnSmall, background: '#fee2e2', color: '#dc2626'}}>🗑 Delete</button>
              </div>
            </div>
          </div>
        ))}
        {problems.length === 0 && <p style={{ color: '#64748b' }}>No problems yet. Create one above.</p>}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', width: '100%', boxSizing: 'border-box', marginTop: '4px', fontFamily: 'monospace' };
const lbl: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#475569' };
const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const btnSecondary: React.CSSProperties = { padding: '10px 20px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const btnSmall: React.CSSProperties = { padding: '5px 10px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const formCard: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' };
const problemCard: React.CSSProperties = { background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px' };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };
const okAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#f0fdf4', color: '#166534' };
const topicBadge: React.CSSProperties = { background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 };

function diffBadge(d: string): React.CSSProperties {
  const bg: Record<string, string> = { easy: '#f0fdf4', medium: '#fffbeb', hard: '#fef2f2' };
  const c: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626' };
  return { background: bg[d], color: c[d], padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 };
}