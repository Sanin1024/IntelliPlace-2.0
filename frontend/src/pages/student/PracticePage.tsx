import { useEffect, useState } from 'react';
import { practiceApi } from '../../api/practice';
import { publicApi } from '../../api/admin';
import type { PracticeQuestion, PracticeSummary } from '../../api/practice';

type Stage = 'select' | 'question' | 'feedback' | 'summary';

interface Topic { id: number; name: string; type: string; }

export default function PracticePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stage, setStage] = useState<Stage>('select');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [difficulty, setDifficulty] = useState<string>('');

  // Session state
  const [attemptId, setAttemptId] = useState('');
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [summary, setSummary] = useState<PracticeSummary | null>(null);

  const [score, setScore] = useState(0);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const aptitudeTopics = topics.filter(t => t.type === 'aptitude');

  useEffect(() => {
    publicApi.getTopics().then(setTopics).catch(() => setTopics([]));
  }, []);

  const startPractice = async (topic: Topic) => {
    setError('');
    setIsLoading(true);
    setSelectedTopic(topic);
    try {
      const data = await practiceApi.start({
        topicId: topic.id,
        ...(difficulty ? { difficulty } : {}),
        count: 10,
      });
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setScore(0);
      setStage('question');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start practice');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedOption) return;
    setError('');
    setIsLoading(true);
    try {
      const result = await practiceApi.submitAnswer({
        attemptId,
        questionId: questions[currentIndex].id,
        selectedOption,
      });
      setFeedback(result);
      if (result.isCorrect) setScore(prev => prev + 1);
      setStage('feedback');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  };

  const nextQuestion = () => {
    setSelectedOption('');
    setFeedback(null);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setStage('question');
    } else {
      finishPractice();
    }
  };

  const finishPractice = async () => {
    try {
      const result = await practiceApi.finish(attemptId);
      setSummary(result);
      setStage('summary');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to finish practice');
    }
  };

  const resetPractice = () => {
    setStage('select');
    setSelectedTopic(null);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedOption('');
    setFeedback(null);
    setSummary(null);
    setScore(0);
  };

  // ========== STAGE: TOPIC SELECTION ==========
  if (stage === 'select') {
    return (
      <div>
        <h1>Aptitude Practice</h1>
        <p style={{ color: '#64748b' }}>Select a topic to start practicing. You'll get instant feedback on each question.</p>

        {error && <div style={errStyle}>{error}</div>}

        <div style={{ marginTop: '20px', marginBottom: '24px' }}>
          <label htmlFor="practice-difficulty" style={lbl}>Difficulty filter (optional): </label>
          <select id="practice-difficulty" aria-label="Difficulty filter" value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{...inp, width: '200px'}}>
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {aptitudeTopics.map(topic => (
            <div key={topic.id} style={topicCard} onClick={() => startPractice(topic)}>
              <h3 style={{ margin: '0 0 8px 0' }}>{topic.name}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Click to start a 10-question practice session
              </p>
              <div style={{ marginTop: '12px' }}>
                <span style={{ color: '#1a73e8', fontWeight: 600, fontSize: '14px' }}>
                  {isLoading && selectedTopic?.id === topic.id ? 'Starting...' : 'Start Practice →'}
                </span>
              </div>
            </div>
          ))}
          {aptitudeTopics.length === 0 && (
            <p style={{ color: '#64748b' }}>No aptitude topics available yet.</p>
          )}
        </div>
      </div>
    );
  }

  // ========== STAGE: QUESTION ==========
  if (stage === 'question') {
    const q = questions[currentIndex];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>{selectedTopic?.name}</h1>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            Question {currentIndex + 1} of {questions.length} | Score: {score}
          </span>
        </div>

        <div style={progressBar}>
          <div style={{ ...progressFill, width: `${((currentIndex) / questions.length) * 100}%` }} />
        </div>

        {error && <div style={errStyle}>{error}</div>}

        <div style={questionCard}>
          <span style={difficultyBadge(q.difficulty)}>{q.difficulty}</span>
          <p style={{ fontSize: '16px', fontWeight: 600, marginTop: '12px', marginBottom: '20px' }}>
            {q.questionText}
          </p>

          <div style={{ display: 'grid', gap: '10px' }}>
            {(['A', 'B', 'C', 'D'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setSelectedOption(opt)}
                style={{
                  ...optionBtn,
                  ...(selectedOption === opt ? optionBtnSelected : {}),
                }}
              >
                <strong style={{ marginRight: '8px' }}>{opt})</strong>
                {q[`option${opt}` as keyof PracticeQuestion]}
              </button>
            ))}
          </div>

          <button
            onClick={submitAnswer}
            disabled={!selectedOption || isLoading}
            style={{ ...btnPrimary, marginTop: '20px', opacity: !selectedOption || isLoading ? 0.5 : 1 }}
          >
            {isLoading ? 'Checking...' : 'Submit Answer'}
          </button>
        </div>
      </div>
    );
  }

  // ========== STAGE: FEEDBACK ==========
  if (stage === 'feedback' && feedback) {
    const q = questions[currentIndex];
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ margin: 0 }}>{selectedTopic?.name}</h1>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            Question {currentIndex + 1} of {questions.length} | Score: {score}
          </span>
        </div>

        <div style={questionCard}>
          <div style={{
            ...feedbackBanner,
            background: feedback.isCorrect ? '#f0fdf4' : '#fef2f2',
            color: feedback.isCorrect ? '#166534' : '#dc2626',
            borderColor: feedback.isCorrect ? '#16a34a' : '#dc2626',
          }}>
            {feedback.isCorrect ? '✅ Correct!' : `❌ Incorrect. Correct answer: ${feedback.correctOption}`}
          </div>

          <p style={{ fontSize: '15px', fontWeight: 600, marginTop: '16px', marginBottom: '16px' }}>
            {q.questionText}
          </p>

          {feedback.explanation && (
            <div style={{
              background: '#eff6ff', padding: '12px', borderRadius: '8px',
              border: '1px solid #bfdbfe', fontSize: '14px', color: '#1e40af', marginBottom: '16px',
            }}>
              💡 <strong>Explanation:</strong> {feedback.explanation}
            </div>
          )}

          <button onClick={nextQuestion} style={btnPrimary}>
            {currentIndex + 1 < questions.length ? 'Next Question →' : 'See Results'}
          </button>
        </div>
      </div>
    );
  }

  // ========== STAGE: SUMMARY ==========
  if (stage === 'summary' && summary) {
    return (
      <div>
        <h1>Practice Complete! 🎉</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '24px' }}>
          <div style={statCard}>
            <h2 style={{ margin: 0, fontSize: '36px', color: '#1a73e8' }}>{summary.correctCount}</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Correct</p>
          </div>
          <div style={statCard}>
            <h2 style={{ margin: 0, fontSize: '36px', color: '#dc2626' }}>{summary.wrongCount}</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Wrong</p>
          </div>
          <div style={statCard}>
            <h2 style={{ margin: 0, fontSize: '36px', color: summary.accuracy >= 60 ? '#16a34a' : '#d97706' }}>
              {summary.accuracy}%
            </h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Accuracy</p>
          </div>
          <div style={statCard}>
            <h2 style={{ margin: 0, fontSize: '36px', color: '#7c3aed' }}>{Math.floor(summary.duration / 60)}m</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>Duration</p>
          </div>
        </div>

        <div style={{
          marginTop: '24px', padding: '16px', borderRadius: '10px',
          background: summary.accuracy >= 60 ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${summary.accuracy >= 60 ? '#16a34a' : '#d97706'}`,
        }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {summary.accuracy >= 80
              ? '🎉 Excellent! You\'re strong in this topic. Try a harder difficulty!'
              : summary.accuracy >= 60
              ? '👍 Good job! Keep practicing to improve further.'
              : '📚 Keep practicing! Review the explanations and try again.'}
          </p>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button onClick={() => selectedTopic && startPractice(selectedTopic)} style={btnPrimary}>
            Practice Again
          </button>
          <button onClick={resetPractice} style={btnSecondary}>
            Choose Different Topic
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Styles
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', marginTop: '4px' };
const lbl: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#475569' };
const btnPrimary: React.CSSProperties = { padding: '12px 28px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px', fontWeight: 600 };
const btnSecondary: React.CSSProperties = { padding: '12px 28px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '15px' };
const topicCard: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' };
const questionCard: React.CSSProperties = { background: '#fff', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const optionBtn: React.CSSProperties = { padding: '14px 16px', textAlign: 'left', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' };
const optionBtnSelected: React.CSSProperties = { background: '#dbeafe', borderColor: '#1a73e8', color: '#1e40af', fontWeight: 600 };
const progressBar: React.CSSProperties = { height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '24px', overflow: 'hidden' };
const progressFill: React.CSSProperties = { height: '100%', background: '#1a73e8', borderRadius: '3px', transition: 'width 0.3s' };
const feedbackBanner: React.CSSProperties = { padding: '14px', borderRadius: '8px', border: '2px solid', fontSize: '16px', fontWeight: 600, textAlign: 'center' };
const statCard: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' };
const errStyle: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };

function difficultyBadge(difficulty: string): React.CSSProperties {
  const colors: Record<string, [string, string]> = {
    easy: ['#f0fdf4', '#16a34a'], medium: ['#fffbeb', '#d97706'], hard: ['#fef2f2', '#dc2626'],
  };
  const [bg, color] = colors[difficulty] || ['#f8fafc', '#64748b'];
  return { background: bg, color, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, display: 'inline-block' };
}