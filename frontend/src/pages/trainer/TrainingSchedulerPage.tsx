import { useEffect, useState } from 'react';
import { trainingApi } from '../../api/training';
import { publicApi } from '../../api/admin';

interface SessionItem {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  meetingLink: string | null;
  cancelledAt: string | null;
  learningModule?: { id: string; title: string; level: string } | null;
  _count?: { assignments: number };
}

export default function TrainingSchedulerPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for creating a new session
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // Reschedule modal states
  const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(null);
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Assign modal states
  const [assignSessionId, setAssignSessionId] = useState<string | null>(null);
  const [assignBatchId, setAssignBatchId] = useState<string>('');
  const [allowLevelOverride, setAllowLevelOverride] = useState(false);
  const [skippedNotice, setSkippedNotice] = useState<any[] | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mods, batchList, adherenceData] = await Promise.all([
        trainingApi.getModules(),
        publicApi.getBatches(),
        trainingApi.adherence().catch(() => null),
      ]);
      setModules(mods || []);
      setBatches(batchList || []);
      // Adherence endpoint returns recentSessions in data
      if (adherenceData?.recentSessions) {
        setSessions(adherenceData.recentSessions);
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load scheduling data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledAt) {
      alert('Please provide title and scheduled date/time.');
      return;
    }
    try {
      await trainingApi.createSession({
        title,
        description: description || undefined,
        moduleId: moduleId || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number(durationMinutes) || 60,
        location: location || undefined,
        meetingLink: meetingLink || undefined,
      });
      setSuccessMsg('Training session scheduled successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setModuleId('');
      setScheduledAt('');
      setLocation('');
      setMeetingLink('');
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to schedule session');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleSessionId || !newScheduledAt || !rescheduleReason) {
      alert('Please provide new time and a mandatory reason for rescheduling.');
      return;
    }
    try {
      await trainingApi.reschedule(
        rescheduleSessionId,
        new Date(newScheduledAt).toISOString(),
        rescheduleReason
      );
      setSuccessMsg('Session rescheduled and notifications sent to affected students.');
      setTimeout(() => setSuccessMsg(null), 4000);
      setRescheduleSessionId(null);
      setNewScheduledAt('');
      setRescheduleReason('');
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to reschedule');
    }
  };

  const handleAssignBatch = async () => {
    if (!assignSessionId || !assignBatchId) {
      alert('Please select a batch to assign.');
      return;
    }
    setSkippedNotice(null);
    try {
      const res = await trainingApi.assignStudents(assignSessionId, {
        batchId: Number(assignBatchId),
        overrideLevelGuard: allowLevelOverride,
      });
      if (res.skipped && res.skipped.length > 0) {
        setSkippedNotice(res.skipped);
        setSuccessMsg(`Assigned ${res.assignedCount} students. ${res.skipped.length} students were skipped by the level guard.`);
      } else {
        setSuccessMsg(`Successfully assigned ${res.assignedCount} students.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        setAssignSessionId(null);
        setAssignBatchId('');
        setAllowLevelOverride(false);
      }
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to assign students');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading training scheduler...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Training Scheduler & Cohorts</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Plan institutional training sessions, assign student batches, and manage schedule adherence.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            type="button"
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            + Schedule Session
          </button>
          <button
            onClick={loadData}
            type="button"
            style={{
              padding: '8px 16px',
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

      {successMsg && (
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
          {successMsg}
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

      {/* Modal: Create Session */}
      {showCreateModal && (
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
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Schedule New Training Session</h2>
            <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Session Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dynamic Programming Bootcamp"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Description / Objectives</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key topics, prerequisites, and learning objectives"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Associated Module</label>
                  <select value={moduleId} onChange={(e) => setModuleId(e.target.value)} style={inputStyle}>
                    <option value="">None (Standalone)</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.level.toUpperCase()}] {m.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Duration (minutes)</label>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Date & Time (IST) *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Location / Room</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lab 3 / Seminar Hall"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Online Meeting Link</label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reschedule Session (Challenge 51 & 5) */}
      {rescheduleSessionId && (
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
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '460px', maxWidth: '90%' }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Reschedule Session</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px 0' }}>
              Assigned students will immediately receive an audited notification detailing the updated schedule and reason.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>New Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={newScheduledAt}
                  onChange={(e) => setNewScheduledAt(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Reason for Rescheduling (Mandatory) *</label>
                <textarea
                  rows={3}
                  required
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Lab conflict or trainer availability change"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRescheduleSessionId(null)}
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
                  type="button"
                  onClick={handleReschedule}
                  style={{
                    padding: '8px 16px',
                    background: '#d97706',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Confirm Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign Students / Batch (Challenge 55 Level Guard) */}
      {assignSessionId && (
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
            <h2 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Assign Batch to Session</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Select Student Batch</label>
                <select
                  value={assignBatchId}
                  onChange={(e) => setAssignBatchId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">-- Choose Batch --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.year})
                    </option>
                  ))}
                </select>
              </div>

              {/* Level Guard Checkbox (Challenge 55) */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={allowLevelOverride}
                    onChange={(e) => setAllowLevelOverride(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <strong>Override Beginner Level Guard</strong>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      By default, beginner-level students are prevented from mandatory enrollment into advanced modules to protect completion rates. Check this to allow assignment.
                    </div>
                  </div>
                </label>
              </div>

              {skippedNotice && skippedNotice.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef08a', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#92400e' }}>
                  <strong>Skipped Students ({skippedNotice.length}):</strong>
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                    {skippedNotice.slice(0, 4).map((s, idx) => (
                      <li key={idx}>{s.reason}</li>
                    ))}
                    {skippedNotice.length > 4 && <li>...and {skippedNotice.length - 4} more.</li>}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setAssignSessionId(null);
                    setSkippedNotice(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAssignBatch}
                  style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Assign Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Session Title</th>
              <th style={{ padding: '12px 16px' }}>Scheduled Time</th>
              <th style={{ padding: '12px 16px' }}>Module / Level</th>
              <th style={{ padding: '12px 16px' }}>Enrolled</th>
              <th style={{ padding: '12px 16px' }}>Location / Link</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  No sessions found. Create a new training session above.
                </td>
              </tr>
            ) : (
              sessions.map((s) => {
                const dateStr = new Date(s.scheduledAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });
                const isCancelled = !!s.cancelledAt;

                if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading training scheduler...</div>;
  }

  return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      opacity: isCancelled ? 0.6 : 1,
                      background: isCancelled ? '#fafafa' : '#fff',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {s.title}
                      {isCancelled && (
                        <span style={{ marginLeft: '8px', fontSize: '11px', color: '#dc2626' }}>[CANCELLED]</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{dateStr}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.learningModule ? (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {s.learningModule.level}: {s.learningModule.title}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Standalone</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {s._count?.assignments ?? 'N/A'} students
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {s.location || (s.meetingLink ? 'Online Link' : 'TBD')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {!isCancelled && (
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setAssignSessionId(s.id);
                              setSkippedNotice(null);
                            }}
                            style={tblBtnPrimary}
                          >
                            Assign Batch
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleSessionId(s.id);
                              setNewScheduledAt('');
                              setRescheduleReason('');
                            }}
                            style={tblBtnWarning}
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm(`Cancel session "${s.title}"?`)) return;
                              await trainingApi.cancelSession(s.id);
                              loadData();
                            }}
                            style={tblBtnDanger}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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

const tblBtnPrimary: React.CSSProperties = {
  padding: '4px 10px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};

const tblBtnWarning: React.CSSProperties = {
  padding: '4px 10px',
  background: '#f59e0b',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};

const tblBtnDanger: React.CSSProperties = {
  padding: '4px 10px',
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
};
