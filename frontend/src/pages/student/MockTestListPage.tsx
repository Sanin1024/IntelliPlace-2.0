import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testApi } from '../../api/test';
import type { MockTest } from '../../api/test';

export default function MockTestListPage() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    testApi.getAvailableTests()
      .then(setTests)
      .catch(err => setError(err.response?.data?.error || 'Failed to load tests'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleStart = async (testId: string) => {
    navigate(`/tests/${testId}/take`);
  };

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Mock Tests</h1>
      <p style={{ color: '#64748b' }}>Timed tests that simulate real placement exams.</p>

      {error && <div style={errAlert}>{error}</div>}

      <div style={{ marginTop: '24px' }}>
        {tests.map(test => (
          <div key={test.id} style={testCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px 0' }}>{test.title}</h3>
                {test.description && (
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 8px 0' }}>{test.description}</p>
                )}
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                  <span>📝 {test.questionCount} questions</span>
                  <span>⏱ {test.durationMins} minutes</span>
                  <span>🔄 {test.attemptsUsed}/{test.maxAttempts} attempts used</span>
                  {test.batch && <span>👥 {test.batch.name}</span>}
                </div>

                {/* Show past attempt scores */}
                {test.myAttempts?.filter(a => a.status === 'submitted').map((a, i) => (
                  <p key={i} style={{ fontSize: '12px', color: '#16a34a', marginTop: '8px' }}>
                    ✓ Attempt {i + 1}: Score {a.score}/{a.totalMarks}
                  </p>
                ))}
              </div>

              <div>
                {test.available && test.remainingAttempts > 0 ? (
                  <button onClick={() => handleStart(test.id)} style={startBtn}>
                    {test.attemptsUsed > 0 ? 'Retake Test' : 'Start Test'} →
                  </button>
                ) : (
                  <span style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 16px' }}>
                    {test.remainingAttempts === 0 ? 'No attempts left' : 'Not available'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {tests.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <p style={{ fontSize: '48px', margin: 0 }}>📋</p>
            <p>No tests available yet. Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
}

const testCard: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' };
const startBtn: React.CSSProperties = { padding: '12px 24px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600 };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };