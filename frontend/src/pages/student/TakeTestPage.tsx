import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testApi } from '../../api/test';
import type { StartAttemptResponse } from '../../api/test';

export default function TakeTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [attemptData, setAttemptData] = useState<StartAttemptResponse | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const submittedRef = useRef(false);

  // Initialize: load or resume attempt
  useEffect(() => {
    const init = async () => {
      try {
        const data = await testApi.startAttempt(testId!);
        setAttemptData(data);
        setRemainingSeconds(data.remainingSeconds);

        // Restore saved answers
        const restored: Record<string, string> = {};
        data.savedAnswers.forEach((a) => {
          restored[a.questionId] = a.selectedOption;
        });
        setAnswers(restored);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to start test');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [testId]);

  // Timer countdown
  useEffect(() => {
    if (!attemptData || remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit when timer hits 0
          if (!submittedRef.current) {
            handleSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [attemptData]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const selectOption = async (option: string) => {
    if (!attemptData || isSubmitting) return;
    const questionId = attemptData.questions[currentQuestion].id;

    // Optimistic update
    setAnswers(prev => ({ ...prev, [questionId]: option }));

    // Save to backend (fire-and-forget, don't block UI)
    try {
      const result = await testApi.saveAnswer(attemptData.attemptId, questionId, option);
      setRemainingSeconds(result.remainingSeconds); // Sync timer with server
    } catch (err: any) {
      if (err.response?.data?.error?.includes('expired')) {
        // Time expired on server — auto-submit
        if (!submittedRef.current) handleSubmit(true);
      }
      // Silently fail — answer is saved locally, will be sent with next navigation
    }
  };

  const navigateQuestion = (index: number) => {
    if (index >= 0 && index < attemptData!.questions.length) {
      setCurrentQuestion(index);
    }
  };

  const handleSubmit = useCallback(async (autoSubmit: boolean = false) => {
    if (!attemptData || submittedRef.current) return;
    if (!autoSubmit) {
      const unanswered = attemptData.questions.filter(q => !answers[q.id]).length;
      if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }

    submittedRef.current = true;
    setIsSubmitting(true);
    clearInterval(timerRef.current);

    try {
      const result = await testApi.submitAttempt(attemptData.attemptId);
      navigate(`/tests/attempts/${result.attemptId}/result`, { state: { result } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submit failed');
      setIsSubmitting(false);
      submittedRef.current = false;
    }
  }, [attemptData, answers, navigate]);

  // Keyboard navigation for take-test
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSubmitConfirm) return;
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (attemptData && currentQuestion < attemptData.questions.length - 1) {
          navigateQuestion(currentQuestion + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentQuestion > 0) {
          navigateQuestion(currentQuestion - 1);
        }
      } else if (e.key === '1' || e.key === 'a' || e.key === 'A') {
        selectOption('A');
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        selectOption('B');
      } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
        selectOption('C');
      } else if (e.key === '4' || e.key === 'd' || e.key === 'D') {
        selectOption('D');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, attemptData, showSubmitConfirm]);

  if (isLoading) return <p style={{ textAlign: 'center', padding: '60px' }}>Loading test...</p>;
  if (error && !attemptData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={errAlert}>{error}</div>
        <button onClick={() => navigate('/tests')} style={btnPrimary}>Back to Tests</button>
      </div>
    );
  }
  if (!attemptData) return null;

  const questions = attemptData.questions;
  const q = questions[currentQuestion];
  const answeredCount = questions.filter(qq => answers[qq.id]).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header with timer */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: remainingSeconds < 60 ? '#dc2626' : '#1e293b',
        color: '#fff', padding: '12px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <strong>{attemptData.test.title}</strong>
          {attemptData.resumed && (
            <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.8 }}>(Resumed)</span>
          )}
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'monospace' }}>
          ⏱ {formatTime(remainingSeconds)}
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        {error && <div style={{ ...errAlert, marginBottom: '16px' }}>{error}</div>}

        {/* Question palette */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => navigateQuestion(i)}
              aria-label={`Go to question ${i + 1}`}
              style={{
                width: '36px', height: '36px', borderRadius: '6px',
                border: `2px solid ${i === currentQuestion ? '#1a73e8' : 'transparent'}`,
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: answers[qq.id]
                  ? (i === currentQuestion ? '#dbeafe' : '#dcfce7')
                  : (i === currentQuestion ? '#dbeafe' : '#fff'),
                color: answers[qq.id] ? '#166534' : '#334155',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Progress */}
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          {answeredCount} of {questions.length} answered
        </p>

        {/* Current question */}
        <div style={questionCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{q.topic?.name}</span>
          </div>

          <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.5, marginBottom: '20px' }}>
            {q.questionText}
          </p>

          <div role="radiogroup" aria-label="Answer options" style={{ display: 'grid', gap: '10px' }}>
            {(['A', 'B', 'C', 'D'] as const).map(opt => {
              const isSelected = answers[q.id] === opt;
              return (
                <button
                  key={opt}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => selectOption(opt)}
                  style={{
                    ...optionBtn,
                    ...(isSelected ? {
                      ...optionSelected,
                      border: '2px solid #2563eb',
                      backgroundColor: '#eff6ff',
                      boxShadow: '0 0 0 1px #2563eb',
                    } : {}),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '44px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <strong style={{ marginRight: '10px', color: isSelected ? '#1d4ed8' : '#334155' }}>{opt})</strong>
                    <span style={{ color: isSelected ? '#1e40af' : '#1e293b' }}>
                      {q[`option${opt}` as 'optionA' | 'optionB' | 'optionC' | 'optionD']}
                    </span>
                  </div>
                  {isSelected && (
                    <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '13px', marginLeft: '12px' }}>
                      ✓ Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button
            onClick={() => navigateQuestion(currentQuestion - 1)}
            disabled={currentQuestion === 0}
            style={{ ...navBtn, opacity: currentQuestion === 0 ? 0.4 : 1 }}
          >
            ← Previous
          </button>

          {currentQuestion < questions.length - 1 ? (
            <button onClick={() => navigateQuestion(currentQuestion + 1)} style={navBtnPrimary}>
              Next →
            </button>
          ) : (
            <button onClick={() => setShowSubmitConfirm(true)} style={submitBtn}>
              ✓ Submit Test
            </button>
          )}
        </div>

        {/* Submit confirmation */}
        {showSubmitConfirm && (
          <div style={modalOverlay} onClick={() => setShowSubmitConfirm(false)}>
            <div style={modalContent} onClick={e => e.stopPropagation()}>
              <h3>Submit Test?</h3>
              <p style={{ color: '#64748b' }}>
                You answered {answeredCount} of {questions.length} questions.
                {questions.length - answeredCount > 0 && (
                  <span style={{ color: '#d97706' }}>
                    {' '}({questions.length - answeredCount} unanswered)
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => setShowSubmitConfirm(false)} style={navBtn}>
                  Cancel
                </button>
                <button onClick={() => handleSubmit(false)} disabled={isSubmitting} style={submitBtn}>
                  {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const questionCard: React.CSSProperties = { background: '#fff', padding: '28px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const optionBtn: React.CSSProperties = { padding: '14px 16px', textAlign: 'left', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' };
const optionSelected: React.CSSProperties = { background: '#dbeafe', border: '2px solid #1a73e8', color: '#1e40af', fontWeight: 600 };
const navBtn: React.CSSProperties = { padding: '10px 20px', background: '#fff', color: '#334155', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' };
const navBtnPrimary: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 };
const submitBtn: React.CSSProperties = { padding: '10px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 };
const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 };
const modalContent: React.CSSProperties = { background: '#fff', padding: '32px', borderRadius: '12px', maxWidth: '400px', width: '90%', textAlign: 'center' };