import { useEffect, useState } from 'react';
import { mechTrainingApi } from '../../api/mechanicalTraining';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function MechQuestionBankPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    mechTrainingApi.getSubjects().then(setSubjects).catch(() => {});
  }, []);

  useEffect(() => {
    const params: any = {};
    if (filterSubject) params.subjectId = filterSubject;
    if (filterDifficulty) params.difficulty = filterDifficulty;
    params.limit = 100;

    setIsLoading(true);
    mechTrainingApi.getQuestions(params)
      .then(setQuestions)
      .finally(() => setIsLoading(false));
  }, [filterSubject, filterDifficulty]);

  if (isLoading && subjects.length === 0) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '16px' }}>Mechanical Question Bank</h1>
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select 
          value={filterSubject} 
          onChange={(e) => setFilterSubject(e.target.value)} 
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        >
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
        </select>
        <select 
          value={filterDifficulty} 
          onChange={(e) => setFilterDifficulty(e.target.value)} 
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {questions.length === 0 ? (
        <EmptyState icon="📝" title="No Questions Found" description="Try selecting different filters." />
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {questions.map((q, i) => (
            <div key={q.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-info" style={{ fontSize: '11px' }}>{q.subject?.name}</span>
                <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '11px' }}>
                  {q.difficulty}
                </span>
              </div>
              <p style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--color-text)' }}>Q{i + 1}. {q.questionText}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {q.optionA && <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>A. {q.optionA}</p>}
                {q.optionB && <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>B. {q.optionB}</p>}
                {q.optionC && <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>C. {q.optionC}</p>}
                {q.optionD && <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>D. {q.optionD}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

