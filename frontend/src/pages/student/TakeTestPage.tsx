import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testApi } from '../../api/test';

export default function TakeTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { single?: string; multi?: string[] }>>({});
  const [remaining, setRemaining] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [error, setError] = useState('');

  const skewRef = useRef(0);              // serverNow - clientNow (Ch 86)
  const idempotencyRef = useRef<string>('');
  const submittedRef = useRef(false);
  const dirtyRef = useRef<Set<string>>(new Set());
  const activityQueue = useRef<any[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // ---------- Load / recover (Ch 87) ----------
  useEffect(() => {
    testApi.startAttempt(testId!).then((d: any) => {
      setData(d);
      setRemaining(d.remainingSeconds);
      skewRef.current = new Date(d.serverNow).getTime() - Date.now();
      const restored: typeof answers = {};
      let recoveredCount = 0;
      d.savedAnswers?.forEach((a: any) => {
        restored[a.questionId] = { single: a.selectedOption ?? undefined, multi: a.selectedOptions ?? undefined };
        if (a.selectedOption || a.selectedOptions?.length) recoveredCount++;
      });
      setAnswers(restored);
      setCurrent(d.lastQuestionIndex || 0);
      setRecovered(d.resumed && recoveredCount > 0);
    }).catch((err: any) => setError(err.response?.data?.error || 'Failed to start'));
  }, [testId]);

  // ---------- Skew-corrected countdown (Ch 86) ----------
  useEffect(() => {
    if (!data) return;
    timerRef.current = setInterval(() => {
      const serverNow = Date.now() + skewRef.current;
      const left = Math.max(0, Math.floor((new Date(data.deadline).getTime() - serverNow) / 1000));
      setRemaining(left);
      if (left <= 0 && !submittedRef.current) handleSubmit(true);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [data]);

  // ---------- Online/offline (Ch 82) ----------
  useEffect(() => {
    const on = () => { setOffline(false); flushQueue(); };
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ---------- Tab-switch detection (Ch 91) ----------
  useEffect(() => {
    if (!data?.attemptId) return;
    const logActivity = (type: string) => {
      activityQueue.current.push({ type, at: new Date().toISOString() });
      if (activityQueue.current.length >= 3) flushActivity();
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden' && !submittedRef.current) {
        logActivity('tab_switch');
        if ((data.test?.securityConfig as any)?.warnOnTabSwitch) setShowTabWarning(true);
      }
    };
    const onBlur = () => { if (!submittedRef.current) logActivity('window_blur'); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
    };
  }, [data]);

  const flushActivity = async () => {
    if (!data?.attemptId || activityQueue.current.length === 0) return;
    const batch = activityQueue.current.splice(0, 10);
    testApi.recordActivity(data.attemptId, batch).catch(() => {
      activityQueue.current.unshift(...batch); // retry later
    });
  };

  // ---------- Autosave: debounced + localStorage mirror (Ch 81, 82) ----------
  const persistLocal = (qid: string, ans: any) => {
    try {
      const key = `ip-attempt-${data.attemptId}`;
      const store = JSON.parse(localStorage.getItem(key) || '{}');
      store[qid] = { ...ans, _savedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(store));
    } catch { /* quota — ignore */ }
  };

  const saveOne = async (qid: string) => {
    const ans = answers[qid];
    setSaveState('saving');
    try {
      const r = await testApi.saveAnswer(data.attemptId, {
        questionId: qid,
        selectedOption: ans?.single ?? null,
        selectedOptions: ans?.multi ?? [],
      });
      skewRef.current = new Date(r.serverNow).getTime() - Date.now();
      setRemaining(r.remainingSeconds);
      setSaveState('saved');
      setLastSavedAt(new Date(r.savedAt));
      setPendingCount((c) => Math.max(0, c - 1));
      dirtyRef.current.delete(qid);
    } catch {
      setSaveState('failed');
      setPendingCount((c) => c + 1);
      // stays in localStorage queue → flushed on reconnect
    }
  };

  useEffect(() => {
    if (dirtyRef.current.size === 0 || !data || offline) return;
    const t = setTimeout(() => {
      const qid = [...dirtyRef.current][0];
      if (qid) saveOne(qid);
    }, 1500); // debounce (Ch 81: "avoid excessive API requests")
    return () => clearTimeout(t);
  }, [answers, offline, data]);

  const flushQueue = () => {
    if (!data) return;
    [...dirtyRef.current].forEach((qid) => saveOne(qid));
  };

  const selectOption = (qid: string, key: string, isMulti: boolean) => {
    setAnswers((prev) => {
      const cur = prev[qid] || {};
      const next = isMulti
        ? { multi: (cur.multi || []).includes(key) ? (cur.multi || []).filter((k) => k !== key) : [...(cur.multi || []), key] }
        : { single: key };
      const merged = { ...cur, ...next };
      persistLocal(qid, merged);
      dirtyRef.current.add(qid);
      return { ...prev, [qid]: merged };
    });
  };

  // Save position on navigation (Ch 87)
  useEffect(() => {
    if (!data?.attemptId) return;
    const t = setTimeout(() => testApi.savePosition(data.attemptId, current).catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [current, data]);

  // ---------- Submit: idempotent, ack-only (Ch 82, 83) ----------
  const handleSubmit = useCallback(async (auto: boolean = false) => {
    if (!data || submittedRef.current) return;
    if (!auto) {
      const unanswered = data.questions.filter((q: any) => {
        const a = answers[q.id];
        return !a?.single && !(a?.multi?.length);
      }).length;
      if (unanswered > 0 && !confirm(`${unanswered} unanswered question(s). Submit anyway?`)) return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    flushActivity();
    flushQueue();

    if (!idempotencyRef.current) {
      idempotencyRef.current = crypto.randomUUID(); // stable across retries (Ch 83)
    }
    try {
      const result = await testApi.submitAttempt(data.attemptId, {
        idempotencyKey: idempotencyRef.current,
        clientSubmittedAt: new Date().toISOString(),
      });
      // Success ONLY after server confirmation (Ch 82)
      navigate(`/tests/attempts/${result.attemptId}/result`, { state: { result } });
    } catch (err: any) {
      submittedRef.current = false;
      setSubmitting(false);
      setSaveState('failed');
      setError(err.response?.data?.error || 'Submission failed — answers saved locally, will retry. Check your connection.');
    }
  }, [data, answers, navigate]);

  if (error && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={errStyle}>{error}</div>
        <button onClick={() => navigate('/tests')} style={btnP}>Back to Assessments</button>
      </div>
    );
  }
  if (!data) return <p style={{ textAlign: 'center', padding: '60px' }}>Loading assessment…</p>;

  const questions = data.questions;
  const q = questions[current];
  const answeredCount = questions.filter((qq: any) => answers[qq.id]?.single || answers[qq.id]?.multi?.length).length;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: remaining < 60 ? '#dc2626' : '#1e293b', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <strong>{data.test.title}</strong>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '13px' }}>
          {/* Ch 81 indicators */}
          <span aria-live="polite">
            {offline ? '📴 Offline — answers saved on this device'
              : saveState === 'saving' ? '💾 Saving…'
              : saveState === 'saved' ? `✓ Saved ${lastSavedAt ? lastSavedAt.toLocaleTimeString() : ''}`
              : saveState === 'failed' ? `⚠ Save failed — ${pendingCount} queued`
              : ''}
          </span>
          <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'monospace' }}>⏱ {fmt(remaining)}</span>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        {recovered && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
            ↩ Session recovered — your previously saved answers and position were restored.
          </div>
        )}
        {offline && (
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
            You appear to be offline. Answers are stored locally and will synchronize automatically when connectivity returns. Do not close this tab.
          </div>
        )}
        {error && <div style={{ ...errStyle, marginBottom: '12px' }}>{error}</div>}

        {/* Palette */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {questions.map((qq: any, i: number) => {
            const a = answers[qq.id];
            const answered = a?.single || a?.multi?.length;
            return (
              <button key={qq.id} onClick={() => setCurrent(i)} aria-label={`Question ${i + 1}${answered ? ' (answered)' : ''}`}
                style={{
                  width: '36px', height: '36px', borderRadius: '6px', border: '2px solid', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                  borderColor: i === current ? '#1a73e8' : 'transparent',
                  background: answered ? (i === current ? '#dbeafe' : '#dcfce7') : (i === current ? '#dbeafe' : '#fff'),
                  color: answered ? '#166534' : '#334155',
                }}>{i + 1}</button>
            );
          })}
        </div>
        <p style={{ fontSize: '13px', color: '#64748b' }}>{answeredCount}/{questions.length} answered
          {data.test.negativeMarks > 0 && ` · ⚠ negative marking: −${data.test.negativeMarks} per wrong answer`}</p>

        {/* Question — options in persisted display order (Ch 95) */}
        <div style={qCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Question {current + 1} of {questions.length} · {q?.marks ?? 1} mark{q?.marks !== 1 ? 's' : ''}</span>
            {q?.isMultiSelect && <span style={multiBadge}>select all that apply</span>}
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.5, marginBottom: '18px' }}>{q?.questionText}</p>
          <div style={{ display: 'grid', gap: '10px' }}>
            {q?.options?.map((opt: any) => {
              const selected = q.isMultiSelect
                ? (answers[q.id]?.multi || []).includes(opt.key)
                : answers[q.id]?.single === opt.key;
              return (
                <button key={opt.key} onClick={() => selectOption(q.id, opt.key, q.isMultiSelect)}
                  style={{ ...optBtn, ...(selected ? optSel : {}) }}>
                  <strong style={{ marginRight: '8px' }}>{opt.key})</strong> {opt.text}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px' }}>
          <button onClick={() => setCurrent((c) => c - 1)} disabled={current === 0} style={{ ...navBtn, opacity: current === 0 ? 0.4 : 1 }}>← Previous</button>
          {current < questions.length - 1
            ? <button onClick={() => setCurrent((c) => c + 1)} style={navP}>Next →</button>
            : <button onClick={() => handleSubmit(false)} disabled={submitting} style={subBtn}>{submitting ? 'Submitting…' : '✓ Submit'}</button>}
        </div>
      </div>

      {/* Tab warning (Ch 91 — warning only, never penalty) */}
      {showTabWarning && (
        <div style={overlay} onClick={() => setShowTabWarning(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Focus warning">
            <h3>⚠ Stay on this assessment</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Leaving the assessment window is recorded in the examination activity log for review.
              This is a reminder, not a penalty.
            </p>
            <button onClick={() => setShowTabWarning(false)} style={btnP}>Continue Assessment</button>
          </div>
        </div>
      )}
    </div>
  );
}

const qCard: React.CSSProperties = { background: '#fff', padding: '26px', borderRadius: '12px', border: '1px solid #e2e8f0' };
const optBtn: React.CSSProperties = { padding: '13px 15px', textAlign: 'left', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' };
const optSel: React.CSSProperties = { background: '#dbeafe', borderColor: '#1a73e8', color: '#1e40af', fontWeight: 600 };
const navBtn: React.CSSProperties = { padding: '10px 20px', background: '#fff', color: '#334155', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' };
const navP: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 };
const subBtn: React.CSSProperties = { padding: '10px 24px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 };
const btnP: React.CSSProperties = { padding: '10px 20px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' };
const multiBadge: React.CSSProperties = { background: '#e0e7ff', color: '#4338ca', padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 };
const errStyle: React.CSSProperties = { padding: '12px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', fontSize: '14px' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 };
const modal: React.CSSProperties = { background: '#fff', padding: '30px', borderRadius: '12px', maxWidth: '400px', textAlign: 'center' };
