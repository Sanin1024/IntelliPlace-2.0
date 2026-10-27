import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { testApi } from '../../api/test';
import type { AttemptResult } from '../../api/test';

export default function TestResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If result was passed via navigation state, use it (instant display)
    const stateResult = (location.state as any)?.result;
    if (stateResult) {
      setResult(stateResult);
      setIsLoading(false);
    } else {
      // Otherwise fetch from API (e.g., page refresh)
      testApi.getResult(attemptId!)
        .then(setResult)
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [attemptId]);

  if (isLoading) return <p style={{ textAlign: 'center', padding: '60px' }}>Loading result...</p>;
  if (!result) return <p style={{ textAlign: 'center', padding: '60px' }}>Result not found.</p>;

  const passed = result.percentage >= 60;
  const mins = Math.floor(result.durationSecs / 60);
  const secs = result.durationSecs % 60;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Score header */}
      <div style={{
        ...scoreHeader,
        background: passed ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #d97706, #b45309)',
        color: '#fff',
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>{result.testTitle}</h1>
        <div style={{ marginTop: '16px', display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '48px' }}>{result.percentage}%</h2>
            <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '14px' }}>Score</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '36px' }}>{result.score}/{result.totalMarks}</h2>
            <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '14px' }}>Correct</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '36px' }}>{mins}m {secs}s</h2>
            <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '14px' }}>Time Taken</p>
          </div>
        </div>
        <p style={{ marginTop: '16px', fontSize: '14px', opacity: 0.9 }}>
          {passed ? '🎉 Great job! You scored above 60%.' : '📚 Keep practicing — review the explanations below.'}
        </p>
      </div>

      {/* Question Review */}
      <h3 style={{ margin: '32px 0 16px 0' }}>Question Review</h3>

      {result.review.map((item, index) => (
        <div key={item.questionId} style={{
          ...reviewCard,
          border: `2px solid ${item.isCorrect ? '#16a34a' : '#dc2626'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Q{index + 1}</span>
            <span style={{
              fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
              background: item.isCorrect ? '#f0fdf4' : '#fef2f2',
              color: item.isCorrect ? '#16a34a' : '#dc2626',
            }}>
              {item.isCorrect ? '✓ Correct' : item.myAnswer ? '✗ Wrong' : '— Skipped'}
            </span>
          </div>

          <p style={{ fontWeight: 600, margin: '12px 0 12px 0', fontSize: '14px' }}>{item.questionText}</p>

          {/* Options with correct/incorrect highlighting */}
          <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
            {(['A', 'B', 'C', 'D'] as const).map(opt => {
              const isMyAnswer = item.myAnswer === opt;
              const isCorrectAnswer = item.correctAnswer === opt;
              return (
                <div key={opt} style={{
                  padding: '8px 12px', borderRadius: '6px',
                  background: isCorrectAnswer ? '#f0fdf4'
                    : isMyAnswer ? '#fef2f2'
                    : '#f8fafc',
                  border: `1px solid ${
                    isCorrectAnswer ? '#16a34a'
                    : isMyAnswer ? '#dc2626'
                    : '#e2e8f0'
                  }`,
                  color: isCorrectAnswer ? '#166534' : isMyAnswer ? '#dc2626' : '#475569',
                }}>
                  <strong>{opt})</strong> {item.options[opt]}
                  {isCorrectAnswer && ' ✓'}
                  {isMyAnswer && !isCorrectAnswer && ' ← Your answer'}
                </div>
              );
            })}
          </div>

          {item.explanation && (
            <div style={{
              marginTop: '12px', padding: '10px 12px', borderRadius: '8px',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              fontSize: '13px', color: '#1e40af',
            }}>
              💡 <strong>Explanation:</strong> {item.explanation}
            </div>
          )}

          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>{item.topic?.name}</p>
        </div>
      ))}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
        <button onClick={() => navigate('/tests')} style={btnPrimary}>Back to Tests</button>
        <button onClick={() => navigate('/analytics')} style={btnSecondary}>View Analytics</button>
      </div>
    </div>
  );
}

const scoreHeader: React.CSSProperties = { padding: '32px', borderRadius: '16px', textAlign: 'center' };
const reviewCard: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '12px' };
const btnPrimary: React.CSSProperties = { padding: '12px 24px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 };
const btnSecondary: React.CSSProperties = { padding: '12px 24px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' };