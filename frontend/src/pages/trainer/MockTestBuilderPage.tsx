import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { questionApi } from '../../api/question';
import { publicApi } from '../../api/admin';
import { testApi } from '../../api/test';

export default function MockTestBuilderPage() {
  const [searchParams] = useSearchParams();
  const [tests, setTests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [viewingResults, setViewingResults] = useState<any>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMins, setDurationMins] = useState(30);
  const [batchId, setBatchId] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResults, setShowResults] = useState('after_submit');
  const [warnOnTabSwitch, setWarnOnTabSwitch] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [filterTopic, setFilterTopic] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadTests = async () => {
    try {
      const data = await testApi.getAvailableTests();
      setTests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    publicApi.getBatches().then(setBatches).catch(() => setBatches([]));
    publicApi.getTopics().then(setTopics).catch(() => setTopics([]));
    loadTests();
  }, []);

  const aptitudeTopics = topics.filter((t: any) => t.type === 'aptitude');

  const handleViewResults = async (testId: string) => {
    try {
      const data = await testApi.getTestResults(testId);
      setViewingResults(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load results');
    }
  };

  useEffect(() => {
    const targetTestId = searchParams.get('viewResults') || searchParams.get('testId');
    if (targetTestId) {
      handleViewResults(targetTestId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (showBuilder) {
      const params: any = filterTopic ? { topicId: filterTopic } : {};
      questionApi.getAll(params)
        .then(res => setQuestions(Array.isArray(res.data) ? res.data : []))
        .catch(() => setQuestions([]));
    }
  }, [showBuilder, filterTopic]);

  const toggleQuestion = (questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (selectedQuestions.length === 0) {
      setError('Select at least one question');
      return;
    }
    try {
      await testApi.createTest({
        title,
        description: description || undefined,
        durationMins: Number(durationMins),
        batchId: batchId ? parseInt(batchId) : null,
        maxAttempts: Number(maxAttempts),
        negativeMarks: Number(negativeMarks),
        shuffleQuestions,
        shuffleOptions,
        showResults,
        securityConfig: { warnOnTabSwitch, maxLoggedEvents: 50 },
        questionIds: selectedQuestions,
      });
      setSuccess(`Test "${title}" created with ${selectedQuestions.length} questions`);
      setTitle(''); setDescription(''); setSelectedQuestions([]);
      setShowBuilder(false);
      loadTests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create test');
    }
  };

  const handleDelete = async (testId: string) => {
    if (!confirm('Delete this test?')) return;
    try {
      await testApi.deleteTest(testId);
      loadTests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleRecalculate = async (testId: string) => {
    try {
      const res = await testApi.recalculateTestResults(testId);
      setSuccess(`Recalculated ${res.recalculated} attempts successfully`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to recalculate results');
    }
  };

  const handlePublishResults = async (testId: string) => {
    try {
      await testApi.publishResults(testId);
      setSuccess('Results published to students');
      loadTests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to publish results');
    }
  };

  const handleToggleActive = async (testId: string, currentActive: boolean) => {
    try {
      await testApi.updateTest(testId, { isActive: !currentActive });
      loadTests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update test status');
    }
  };

  if (isLoading) return <p>Loading...</p>;

  // Results modal
  if (viewingResults) {
    return (
      <div>
        <button onClick={() => setViewingResults(null)} style={backBtn}>← Back to Tests</button>
        <h1>{viewingResults.test.title} — Results</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', margin: '20px 0' }}>
          <div style={statCard}><h2>{viewingResults.stats.totalAttempts}</h2><p>Attempts</p></div>
          <div style={statCard}><h2>{viewingResults.stats.avgScore}%</h2><p>Avg Score</p></div>
          <div style={statCard}><h2>{viewingResults.stats.highestScore}</h2><p>Highest</p></div>
          <div style={statCard}><h2>{viewingResults.stats.lowestScore}</h2><p>Lowest</p></div>
        </div>

        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Student</th>
              <th style={th}>Branch</th>
              <th style={th}>Score</th>
              <th style={th}>%</th>
            </tr>
          </thead>
          <tbody>
            {viewingResults.attempts.map((a: any) => (
              <tr key={a.id}>
                <td style={td}>{a.student.name}</td>
                <td style={td}>{a.student.studentProfile?.branch?.name || '-'}</td>
                <td style={td}>{a.score} / {a.totalMarks}</td>
                <td style={td}>
                  {a.totalMarks ? Math.round((a.score / a.totalMarks) * 100) : 0}%
                </td>
              </tr>
            ))}
            {viewingResults.attempts.length === 0 && (
              <tr><td colSpan={4} style={{...td, textAlign: 'center'}}>No attempts yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Mock Tests</h1>
        <button onClick={() => setShowBuilder(!showBuilder)} style={btnPrimary}>
          {showBuilder ? 'Close Builder' : '+ Create Test'}
        </button>
      </div>

      {error && <div style={errAlert}>{error}</div>}
      {success && <div style={okAlert}>{success}</div>}

      {showBuilder && (
        <form onSubmit={handleCreateTest} style={card}>
          <h3>Create New Mock Test</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required minLength={3} style={inp} placeholder="e.g., Infosys Mock Aptitude Test" />
            </div>
            <div>
              <label style={lbl}>Duration (minutes)</label>
              <input type="number" value={durationMins} onChange={e => setDurationMins(Number(e.target.value))} min={5} max={180} required style={inp} />
            </div>
            <div>
              <label style={lbl}>Batch (optional — leave empty for all)</label>
              <select value={batchId} onChange={e => setBatchId(e.target.value)} style={inp}>
                <option value="">All batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Max Attempts</label>
              <select value={maxAttempts} onChange={e => setMaxAttempts(Number(e.target.value))} style={inp}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Negative Marks (per wrong answer)</label>
              <input type="number" step="0.25" min={0} max={5} value={negativeMarks} onChange={e => setNegativeMarks(Number(e.target.value))} style={inp} />
            </div>
            <div>
              <label style={lbl}>Results Visibility</label>
              <select value={showResults} onChange={e => setShowResults(e.target.value)} style={inp}>
                <option value="after_submit">Immediately After Submit</option>
                <option value="after_deadline">After Test Window Closes</option>
                <option value="manual">Manual Publish by Trainer</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '14px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} />
              Shuffle Questions per Attempt
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={shuffleOptions} onChange={e => setShuffleOptions(e.target.checked)} />
              Shuffle Options per Question
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={warnOnTabSwitch} onChange={e => setWarnOnTabSwitch(e.target.checked)} />
              Warn on Tab Switch / Blur
            </label>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={lbl}>Description (optional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} style={inp} placeholder="Test description" />
          </div>

          {/* Question Selection */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Select Questions ({selectedQuestions.length} selected)</h4>
              <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={{...inp, width: '200px'}}>
                <option value="">All topics</option>
                {aptitudeTopics.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              {questions.map(q => (
                <label key={q.id} style={questionRow}>
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                    style={{ marginRight: '12px', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b', marginRight: '8px' }}>{q.difficulty}</span>
                  <span style={{ fontSize: '14px' }}>{q.questionText}</span>
                </label>
              ))}
              {questions.length === 0 && (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No questions found</p>
              )}
            </div>
          </div>

          <button type="submit" style={{ ...btnPrimary, marginTop: '20px' }}>
            Create Test ({selectedQuestions.length} questions)
          </button>
        </form>
      )}

      {/* Test List */}
      <div style={{ marginTop: '24px' }}>
        {tests.map(t => (
          <div key={t.id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0' }}>{t.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  {t.questionCount || t.questions?.length || 0} questions • {t.durationMins} mins •
                  Max {t.maxAttempts} attempt(s) • {t.batch?.name || 'All batches'}
                </p>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {t._count?.attempts || 0} total attempts
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: t.isActive !== false ? '#dcfce7' : '#f1f5f9',
                    color: t.isActive !== false ? '#15803d' : '#64748b',
                  }}
                >
                  {t.isActive !== false ? 'Active' : 'Inactive'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(t.id, t.isActive !== false)}
                  style={{ ...btnSmall, background: '#f1f5f9', color: '#475569' }}
                >
                  {t.isActive !== false ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleViewResults(t.id)} style={btnSmall}>📊 Results</button>
                <button onClick={() => window.location.href = `/trainer/tests/${t.id}/activity`} style={{ ...btnSmall, background: '#fef3c7', color: '#92400e' }}>👁 Activity</button>
                <button onClick={() => handleRecalculate(t.id)} style={{ ...btnSmall, background: '#f1f5f9', color: '#334155' }}>🔄 Recalc</button>
                {t.showResults === 'manual' && !t.resultsPublishedAt && (
                  <button onClick={() => handlePublishResults(t.id)} style={{ ...btnSmall, background: '#dcfce7', color: '#166534' }}>📢 Publish</button>
                )}
                <button onClick={() => handleDelete(t.id)} style={{...btnSmall, background: '#fee2e2', color: '#dc2626'}}>🗑</button>
              </div>
            </div>
          </div>
        ))}
        {tests.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
            No tests created yet. Click "+ Create Test" to build one.
          </p>
        )}
      </div>
    </div>
  );
}

// Styles
const inp: React.CSSProperties = { padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', width: '100%', boxSizing: 'border-box', marginTop: '4px' };
const lbl: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#475569' };
const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' };
const btnSmall: React.CSSProperties = { padding: '6px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const backBtn: React.CSSProperties = { padding: '8px 16px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '16px' };
const card: React.CSSProperties = { background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' };
const questionRow: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' };
const statCard: React.CSSProperties = { background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '10px', overflow: 'hidden' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', color: '#64748b' };
const td: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' };
const errAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#fee2e2', color: '#dc2626' };
const okAlert: React.CSSProperties = { padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', background: '#f0fdf4', color: '#166534' };