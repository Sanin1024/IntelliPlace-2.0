import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { problemApi } from '../../api/problem';
import type { CodingProblem } from '../../api/problem';

interface TestCaseResult {
  testCaseNumber: number;
  verdict: string;
  passed: boolean;
  isHidden: boolean;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  executionTimeMs?: number;
}

interface RunOutput {
  verdict: string;
  passed: boolean;
  passedTestCases: number;
  totalTestCases: number;
  results: TestCaseResult[];
}

const DEFAULT_PYTHON = `import sys

# Read input from standard input
lines = sys.stdin.read().split()
if lines:
    # Your solution here
    pass
`;

const DEFAULT_JAVASCRIPT = `const fs = require('fs');

// Read input from standard input
const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
    // Your solution here
}
`;

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<CodingProblem | null>(null);
  const [runnerStatus, setRunnerStatus] = useState<{ enabled: boolean; languages: string[] }>({
    enabled: false,
    languages: ['python', 'javascript'],
  });
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>(DEFAULT_PYTHON);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<RunOutput | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'submissions'>('editor');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    Promise.all([
      problemApi.getById(id),
      problemApi.getRunnerStatus().catch(() => ({ enabled: false, languages: ['python', 'javascript'] })),
      problemApi.getSubmissions(id).catch(() => []),
    ])
      .then(([p, status, subs]) => {
        setProblem(p);
        setRunnerStatus(status);
        if (status.languages && status.languages.length > 0) {
          setLanguage(status.languages[0]);
          setCode(status.languages[0] === 'python' ? DEFAULT_PYTHON : DEFAULT_JAVASCRIPT);
        }
        setSubmissions(subs);
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.error || err.message || 'Failed to load problem');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (code === DEFAULT_PYTHON || code === DEFAULT_JAVASCRIPT || code.trim() === '') {
      setCode(newLang === 'python' ? DEFAULT_PYTHON : DEFAULT_JAVASCRIPT);
    }
  };

  const handleRun = async () => {
    if (!id) return;
    setIsRunning(true);
    setErrorMsg(null);
    setRunResult(null);

    try {
      const res = await problemApi.run(id, { language, code });
      setRunResult(res);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Execution error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!id) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setRunResult(null);

    try {
      const res = await problemApi.submit(id, { language, code });
      setRunResult(res);
      // Refresh submissions
      const updatedSubs = await problemApi.getSubmissions(id).catch(() => []);
      setSubmissions(updatedSubs);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div style={{ padding: '32px' }}>Loading problem...</div>;
  if (!problem) return <div style={{ padding: '32px' }}>Problem not found.</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Breadcrumb navigation */}
      <div style={{ marginBottom: '16px', fontSize: '14px' }}>
        <Link to="/problems" style={{ color: '#4f46e5', textDecoration: 'none' }}>
          ← Back to Problems
        </Link>
      </div>

      {/* Runner Disabled Banner */}
      {!runnerStatus.enabled && (
        <div
          id="runner-disabled-banner"
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <strong>Code execution is turned off on this server.</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
              The local code runner is disabled by default for security. Running and submitting code is unavailable until CODE_RUNNER_ENABLED=true is set in the environment.
            </p>
          </div>
        </div>
      )}

      {/* Problem Header */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <span style={diffBadge(problem.difficulty)}>{problem.difficulty.toUpperCase()}</span>
              <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                {problem.topic?.name || 'Coding'}
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>{problem.title}</h1>
          </div>
          {problem.tags && problem.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {problem.tags.map((t, i) => (
                <span key={i} style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Problem Statement */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 8px 0' }}>Problem Description</h3>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {problem.description}
          </div>
        </div>

        {/* Sample I/O */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Sample Input</h4>
            <pre style={{ background: '#0f172a', color: '#38bdf8', padding: '14px', borderRadius: '8px', fontSize: '13px', margin: 0, overflowX: 'auto' }}>
              {problem.sampleInput}
            </pre>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Sample Output</h4>
            <pre style={{ background: '#0f172a', color: '#4ade80', padding: '14px', borderRadius: '8px', fontSize: '13px', margin: 0, overflowX: 'auto' }}>
              {problem.sampleOutput}
            </pre>
          </div>
        </div>
      </div>

      {/* Navigation tabs between Editor and Submission History */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'editor' ? '3px solid #4f46e5' : '3px solid transparent',
            fontWeight: activeTab === 'editor' ? 700 : 500,
            color: activeTab === 'editor' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
          }}
        >
          Code Editor
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'submissions' ? '3px solid #4f46e5' : '3px solid transparent',
            fontWeight: activeTab === 'submissions' ? 700 : 500,
            color: activeTab === 'submissions' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
          }}
        >
          My Submissions ({submissions.length})
        </button>
      </div>

      {activeTab === 'editor' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Editor Container */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="language-select" style={{ fontSize: '14px', fontWeight: 600 }}>Language:</label>
                <select
                  id="language-select"
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    background: '#fff',
                  }}
                >
                  {runnerStatus.languages.map((l) => (
                    <option key={l} value={l}>
                      {l === 'python' ? 'Python 3' : 'JavaScript (Node.js)'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  id="btn-run-code"
                  onClick={handleRun}
                  disabled={!runnerStatus.enabled || isRunning || isSubmitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#1e293b',
                    fontWeight: 600,
                    cursor: runnerStatus.enabled && !isRunning && !isSubmitting ? 'pointer' : 'not-allowed',
                    opacity: runnerStatus.enabled ? 1 : 0.5,
                  }}
                >
                  {isRunning ? 'Running...' : '▶ Run'}
                </button>
                <button
                  type="button"
                  id="btn-submit-code"
                  onClick={handleSubmit}
                  disabled={!runnerStatus.enabled || isRunning || isSubmitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#4f46e5',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: runnerStatus.enabled && !isRunning && !isSubmitting ? 'pointer' : 'not-allowed',
                    opacity: runnerStatus.enabled ? 1 : 0.5,
                  }}
                >
                  {isSubmitting ? 'Submitting...' : '✓ Submit'}
                </button>
              </div>
            </div>

            {/* Code Textarea */}
            <textarea
              id="code-editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={18}
              spellCheck={false}
              style={{
                width: '100%',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '14px',
                lineHeight: 1.5,
                background: '#0f172a',
                color: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />

            {errorMsg && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontSize: '14px',
                }}
              >
                <strong>Error:</strong> {errorMsg}
              </div>
            )}

            {/* Run / Submission Result Panel */}
            {runResult && (
              <div
                id="result-panel"
                style={{
                  marginTop: '20px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      id="overall-verdict-badge"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: runResult.passed ? '#dcfce7' : '#fee2e2',
                        color: runResult.passed ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {runResult.verdict}
                    </span>
                    <span style={{ fontSize: '14px', color: '#475569', fontWeight: 600 }}>
                      Passed: {runResult.passedTestCases} / {runResult.totalTestCases}
                    </span>
                  </div>
                </div>

                {/* Test cases table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                      <th style={{ padding: '8px 12px' }}>Case #</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Verdict</th>
                      <th style={{ padding: '8px 12px' }}>Time</th>
                      <th style={{ padding: '8px 12px' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runResult.results.map((r) => (
                      <tr key={r.testCaseNumber} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>Case {r.testCaseNumber}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ color: r.passed ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                            {r.passed ? '✓ PASS' : '✗ FAIL'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>{r.verdict}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>
                          {r.executionTimeMs !== undefined ? `${r.executionTimeMs} ms` : '-'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {r.isHidden ? (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Hidden test case</span>
                          ) : (
                            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span><strong>In:</strong> {r.input}</span>
                              <span><strong>Exp:</strong> {r.expectedOutput}</span>
                              {r.actualOutput !== undefined && (
                                <span><strong>Got:</strong> {r.actualOutput}</span>
                              )}
                              {r.error && <span style={{ color: '#dc2626' }}><strong>Err:</strong> {r.error}</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Submission History Tab */
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Your Submissions</h3>
          {submissions.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '32px' }}>
              No submissions recorded yet for this problem.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>Language</th>
                  <th style={{ padding: '10px 12px' }}>Verdict</th>
                  <th style={{ padding: '10px 12px' }}>Passed Cases</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s: any) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{s.language}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '12px',
                          background: s.isPassed ? '#dcfce7' : '#fee2e2',
                          color: s.isPassed ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {s.isPassed ? 'Accepted' : 'Wrong Answer'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {s.passedTestCases} / {s.totalTestCases}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function diffBadge(d: string): React.CSSProperties {
  const bg: Record<string, string> = { easy: '#dcfce7', medium: '#fef3c7', hard: '#fee2e2' };
  const c: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626' };
  return { background: bg[d] || '#f1f5f9', color: c[d] || '#64748b', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 };
}
