import { useEffect, useState } from 'react';
import { questionApi } from '../../api/question';
import { publicApi } from '../../api/admin';

interface Topic { id: number; name: string; type: string; }

const EMPTY_FORM = {
  topicId: '',
  difficulty: 'easy',
  questionText: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctOption: 'A',
  explanation: '',
};

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterTopic, setFilterTopic] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const aptitudeTopics = topics.filter(t => t.type === 'aptitude');

  const load = async () => {
    try {
      const params: any = {};
      if (filterTopic) params.topicId = filterTopic;
      const res = await questionApi.getAll(params);
      setQuestions(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    publicApi.getTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  useEffect(() => { load(); }, [filterTopic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const data = {
        topicId: parseInt(form.topicId),
        difficulty: form.difficulty as 'easy' | 'medium' | 'hard',
        questionText: form.questionText,
        optionA: form.optionA,
        optionB: form.optionB,
        optionC: form.optionC,
        optionD: form.optionD,
        correctOption: form.correctOption as 'A' | 'B' | 'C' | 'D',
        explanation: form.explanation || null,
      };
      if (editingId) {
        await questionApi.update(editingId, data);
        setSuccess('Question updated');
      } else {
        await questionApi.create(data);
        setSuccess('Question created');
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save question');
    }
  };

  const handleEdit = (q: any) => {
    setForm({
      topicId: q.topicId.toString(),
      difficulty: q.difficulty,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation || '',
    });
    setEditingId(q.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await questionApi.delete(id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Aptitude Question Bank</h1>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(EMPTY_FORM); }} style={btnPrimary}>
          {showForm ? 'Close Form' : '+ Add Question'}
        </button>
      </div>

      {error && <div style={errAlert}>{error}</div>}
      {success && <div style={okAlert}>{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={formCard}>
          <h3>{editingId ? 'Edit Question' : 'New Question'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>Topic</label>
              <select value={form.topicId} onChange={e => setForm({...form, topicId: e.target.value})} required style={inp}>
                <option value="">Select topic</option>
                {aptitudeTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
            <label style={lbl}>Question Text</label>
            <textarea
              value={form.questionText}
              onChange={e => setForm({...form, questionText: e.target.value})}
              required minLength={5}
              rows={3}
              style={inp}
              placeholder="Enter the question..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            {(['A', 'B', 'C', 'D'] as const).map(opt => (
              <div key={opt}>
                <label style={lbl}>Option {opt}</label>
                <input
                  type="text"
                  value={form[`option${opt}` as keyof typeof form] as string}
                  onChange={e => setForm({...form, [`option${opt}`]: e.target.value})}
                  required
                  style={inp}
                  placeholder={`Option ${opt}`}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={lbl}>Correct Option</label>
              <select value={form.correctOption} onChange={e => setForm({...form, correctOption: e.target.value})} style={inp}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Explanation (optional)</label>
              <input
                type="text"
                value={form.explanation}
                onChange={e => setForm({...form, explanation: e.target.value})}
                style={inp}
                placeholder="Why is this the correct answer?"
              />
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={btnPrimary}>{editingId ? 'Update' : 'Create Question'}</button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }} style={btnSecondary}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div style={{ marginBottom: '16px', marginTop: '20px' }}>
        <label htmlFor="filter-topic-select" style={lbl}>Filter by topic: </label>
        <select id="filter-topic-select" aria-label="Filter by topic" value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={{...inp, width: '200px'}}>
          <option value="">All topics</option>
          {aptitudeTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <p style={{ color: '#64748b', fontSize: '14px' }}>{questions.length} questions</p>

      {questions.map(q => (
        <div key={q.id} style={questionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span style={badge(q.difficulty)}>{q.difficulty}</span>
                <span style={topicBadge}>{q.topic?.name}</span>
              </div>
              <p style={{ fontWeight: 600, margin: '0 0 8px 0' }}>{q.questionText}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '13px', color: '#475569' }}>
                <span>A) {q.optionA}</span>
                <span>B) {q.optionB}</span>
                <span>C) {q.optionC}</span>
                <span>D) {q.optionD}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '8px' }}>
                ✓ Correct: {q.correctOption}
              </p>
              {q.explanation && (
                <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  💡 {q.explanation}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button onClick={() => handleEdit(q)} style={btnSmall}>✏️ Edit</button>
              <button onClick={() => handleDelete(q.id)} style={{...btnSmall, background: '#fee2e2', color: '#dc2626'}}>🗑 Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Shared styles
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box', marginTop: '4px' };
const lbl: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#475569' };
const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const btnSecondary: React.CSSProperties = { padding: '10px 20px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const btnSmall: React.CSSProperties = { padding: '6px 10px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const formCard: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' };
const questionCard: React.CSSProperties = { background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px' };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };
const okAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#f0fdf4', color: '#166534' };
const topicBadge: React.CSSProperties = { background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 };

function badge(difficulty: string): React.CSSProperties {
  const colors: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626' };
  const bgColors: Record<string, string> = { easy: '#f0fdf4', medium: '#fffbeb', hard: '#fef2f2' };
  return {
    background: bgColors[difficulty], color: colors[difficulty],
    padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
  };
}