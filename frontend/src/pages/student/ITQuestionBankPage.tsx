import { useEffect, useState } from 'react';
import { itTrainingApi } from '../../api/itTraining';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function ITQuestionBankPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params: any = {};
    if (filterSubject) params.subject = filterSubject;
    if (filterDifficulty) params.difficulty = filterDifficulty;
    params.limit = 100;

    itTrainingApi.getQuestions(params)
      .then(setQuestions)
      .finally(() => setIsLoading(false));
  }, [filterSubject, filterDifficulty]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '16px' }}>IT Question Bank</h1>
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="🔍 Search subject..." 
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="input-field"
          style={{ width: 'auto' }}
        />
        <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {questions.length === 0 ? (
        <EmptyState icon="💻" title="No Questions Found" />
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {questions.map((q, i) => (
            <div key={q.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-info" style={{ fontSize: '11px' }}>{q.subject}</span>
                <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '11px' }}>
                  {q.difficulty}
                </span>
              </div>
              <p style={{ fontWeight: 600, marginBottom: '12px' }}>Q{i + 1}. {q.questionText}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
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

