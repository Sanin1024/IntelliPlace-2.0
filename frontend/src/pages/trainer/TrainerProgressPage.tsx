import { useEffect, useState } from 'react';
import { trainingApi } from '../../api/training';

interface FallingBehindStudent {
  studentId: string;
  name: string;
  email: string;
  universityId: string;
  branch: string | null;
  overdueCount: number;
  missedCount: number;
  totalLapsed: number;
}

export default function TrainerProgressPage() {
  const [adherenceData, setAdherenceData] = useState<any>(null);
  const [fallingBehind, setFallingBehind] = useState<FallingBehindStudent[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Manual verification modal state (Ch 57)
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyModuleId, setVerifyModuleId] = useState('');
  const [verifyStudentId, setVerifyStudentId] = useState('');
  const [verifyPassed, setVerifyPassed] = useState(true);
  const [verifyNote, setVerifyNote] = useState('');

  // Prerequisite exception modal state (Ch 55)
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [prereqModuleId, setPrereqModuleId] = useState('');
  const [prereqStudentId, setPrereqStudentId] = useState('');
  const [prereqReason, setPrereqReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [adh, mods] = await Promise.all([trainingApi.adherence(), trainingApi.getModules()]);
      setAdherenceData(adh);
      setFallingBehind(adh.fallingBehind || []);
      setModules(mods || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModuleId || !verifyStudentId) {
      alert('Module and student are required.');
      return;
    }
    try {
      await trainingApi.trainerVerifyModule(
        verifyModuleId,
        verifyStudentId,
        verifyPassed,
        verifyNote || undefined
      );
      setActionMsg(`Module verification recorded successfully.`);
      setTimeout(() => setActionMsg(null), 4000);
      setShowVerifyModal(false);
      setVerifyStudentId('');
      setVerifyNote('');
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Verification failed');
    }
  };

  const handleGrantPrereqException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prereqModuleId || !prereqStudentId || prereqReason.trim().length < 10) {
      alert('Prerequisite exception requires module, student, and a rationale of at least 10 characters.');
      return;
    }
    try {
      await trainingApi.grantPrereqException(prereqModuleId, prereqStudentId, prereqReason);
      setActionMsg('Prerequisite exception granted and audited.');
      setTimeout(() => setActionMsg(null), 4000);
      setShowPrereqModal(false);
      setPrereqStudentId('');
      setPrereqReason('');
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to grant exception');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading trainer progress tracking...</div>;
  }

  const stats = adherenceData?.stats || { total: 0, completed: 0, scheduled: 0, overdue: 0, missed: 0, adherenceRate: 100 };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Cohort Progress & Interventions</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Identify students falling behind on training commitments and record competency sign-offs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowVerifyModal(true)}
            type="button"
            style={{
              padding: '8px 14px',
              background: '#0891b2',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            ✓ Verify Competency
          </button>
          <button
            onClick={() => setShowPrereqModal(true)}
            type="button"
            style={{
              padding: '8px 14px',
              background: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            🔓 Prereq Exception
          </button>
          <button
            onClick={loadData}
            type="button"
            style={{
              padding: '8px 14px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '1rem',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            color: '#065f46',
            fontSize: '14px',
          }}
        >
          {actionMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>TOTAL ASSIGNMENTS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{stats.total}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>COMPLETED ON-TIME</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>{stats.completed}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#d97706' }}>CURRENTLY OVERDUE</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#d97706', marginTop: '4px' }}>{stats.overdue}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>MISSED (48H+ LAPSED)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>{stats.missed}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>OVERALL ADHERENCE</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>{stats.adherenceRate}%</div>
        </div>
      </div>

      {/* Falling Behind Alert Table (Challenge 51 & 58) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              ⚠️ Students Falling Behind ({fallingBehind.length})
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Flagged automatically when a student accumulates 2 or more overdue or missed assignments.
            </p>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 16px' }}>Student Name</th>
                <th style={{ padding: '12px 16px' }}>University ID</th>
                <th style={{ padding: '12px 16px' }}>Branch</th>
                <th style={{ padding: '12px 16px' }}>Overdue</th>
                <th style={{ padding: '12px 16px' }}>Missed</th>
                <th style={{ padding: '12px 16px' }}>Total Lapsed</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {fallingBehind.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#16a34a' }}>
                    ✓ Excellent! No students are currently flagged as falling behind in assigned training.
                  </td>
                </tr>
              ) : (
                fallingBehind.map((s) => (
                  <tr key={s.studentId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {s.name}
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>{s.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{s.universityId}</td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{s.branch || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', color: '#d97706', fontWeight: 600 }}>{s.overdueCount}</td>
                    <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 600 }}>{s.missedCount}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{s.totalLapsed}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setVerifyStudentId(s.studentId);
                          setShowVerifyModal(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Sign-off
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Competency Verification Modal (Challenge 57) */}
      {showVerifyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '480px', maxWidth: '90%' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Trainer Competency Verification</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>
              Manually certify module competency for students who completed offline projects or practical lab demonstrations.
            </p>
            <form onSubmit={handleManualVerify} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Target Module *</label>
                <select
                  required
                  value={verifyModuleId}
                  onChange={(e) => setVerifyModuleId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Select Module --</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.level.toUpperCase()}] {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Student ID *</label>
                <input
                  type="text"
                  required
                  value={verifyStudentId}
                  onChange={(e) => setVerifyStudentId(e.target.value)}
                  placeholder="Paste Student UUID"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Result *</label>
                <select
                  value={verifyPassed ? 'pass' : 'fail'}
                  onChange={(e) => setVerifyPassed(e.target.value === 'pass')}
                  style={inputStyle}
                >
                  <option value="pass">Pass (Verify Competency)</option>
                  <option value="fail">Fail (Needs Improvement)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Trainer Evaluation Note</label>
                <textarea
                  rows={3}
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  placeholder="Details of code review, viva, or lab demonstration"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#0891b2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Submit Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prerequisite Override Exception Modal (Challenge 55) */}
      {showPrereqModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '480px', maxWidth: '90%' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Grant Prerequisite Exception</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>
              Allows an advanced student to bypass strict prerequisite locks. Every exception is logged to the institutional audit ledger.
            </p>
            <form onSubmit={handleGrantPrereqException} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Target Module *</label>
                <select
                  required
                  value={prereqModuleId}
                  onChange={(e) => setPrereqModuleId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Select Module --</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.level.toUpperCase()}] {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Student ID *</label>
                <input
                  type="text"
                  required
                  value={prereqStudentId}
                  onChange={(e) => setPrereqStudentId(e.target.value)}
                  placeholder="Paste Student UUID"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Audited Rationale (Min 10 characters) *</label>
                <textarea
                  rows={3}
                  required
                  value={prereqReason}
                  onChange={(e) => setPrereqReason(e.target.value)}
                  placeholder="Explain why this student qualifies for a prerequisite bypass"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPrereqModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Grant Exception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  padding: '16px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  boxSizing: 'border-box',
};

