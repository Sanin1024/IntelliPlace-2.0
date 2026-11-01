import { useEffect, useState } from 'react';
import { eceTrainingApi } from '../../api/eceTraining';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function ECEQuestionBankPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params: any = {};
    if (filterSubject) params.subject = filterSubject;
    if (filterDifficulty) params.difficulty = filterDifficulty;
    params.limit = 100;

    setIsLoading(true);
    eceTrainingApi.getQuestions(params)
      .then(setQuestions)
      .finally(() => setIsLoading(false));
  }, [filterSubject, filterDifficulty]);

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
  };

  if (isLoading && questions.length === 0) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '8px' }}>ECE Question Bank</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
        Practice questions for VLSI Design, Embedded Systems, Digital Communication, and more.
      </p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filter by subject (e.g. VLSI, Embedded)..."
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          style={{ ...selectStyle, flex: '1', minWidth: '220px' }}
        />
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {questions.length === 0 ? (
        <EmptyState icon="📡" title="No Questions Found" description="Try different filters or check back later." />
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {questions.map((q, i) => (
            <div key={q.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="badge badge-info" style={{ fontSize: '11px' }}>{q.subject}</span>
                  {q.topic && <span className="badge badge-secondary" style={{ fontSize: '11px' }}>{q.topic}</span>}
                  {q.questionType !== 'mcq' && (
                    <span className="badge badge-primary" style={{ fontSize: '11px' }}>{q.questionType}</span>
                  )}
                </div>
                <span
                  className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`}
                  style={{ fontSize: '11px' }}
                >
                  {q.difficulty}
                </span>
              </div>
              <p style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Q{i + 1}. {q.questionText}</p>
              {(q.optionA || q.optionB || q.optionC || q.optionD) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  {q.optionA && <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>A. {q.optionA}</p>}
                  {q.optionB && <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>B. {q.optionB}</p>}
                  {q.optionC && <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>C. {q.optionC}</p>}
                  {q.optionD && <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>D. {q.optionD}</p>}
                </div>
              )}
              {q.formula && (
                <p style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '8px', fontStyle: 'italic' }}>
                  Formula: {q.formula}
                </p>
              )}
              {q.hdlCode && (
                <pre style={{
                  fontSize: '12px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  marginTop: '8px',
                  overflowX: 'auto',
                  color: 'var(--color-text)',
                }}>
                  {q.hdlCode}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

