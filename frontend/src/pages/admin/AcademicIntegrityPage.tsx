import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Repeat,
  Clock,
  ArrowRight,
  Send,
} from 'lucide-react';
import {
  academicApi,
  DuplicateCluster,
  ProfileCorrectionRequest,
} from '../../api/academic';

type TabType = 'queue' | 'missing' | 'corrections' | 'transfers' | 'stale' | 'duplicates';

export default function AcademicIntegrityPage() {
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab Data
  const [missingResults, setMissingResults] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<ProfileCorrectionRequest[]>([]);
  const [staleProfiles, setStaleProfiles] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCluster[]>([]);

  // Verification modal
  const [verifyStudentId, setVerifyStudentId] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState('verified');
  const [verifyReason, setVerifyReason] = useState('');

  // Review Correction modal
  const [selectedCorrection, setSelectedCorrection] = useState<ProfileCorrectionRequest | null>(null);
  const [correctionAction, setCorrectionAction] = useState<'approved' | 'rejected'>('approved');
  const [rejectionReason, setRejectionReason] = useState('');

  // Transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStudentId, setTransferStudentId] = useState('');
  const [toBranchId, setToBranchId] = useState(1);
  const [toBatchId, setToBatchId] = useState(1);
  const [transferReason, setTransferReason] = useState('');

  // Merge modal
  const [mergeCluster, setMergeCluster] = useState<DuplicateCluster | null>(null);
  const [primaryUserId, setPrimaryUserId] = useState('');
  const [duplicateUserId, setDuplicateUserId] = useState('');

  const loadTabData = async (tab: TabType) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      if (tab === 'missing') {
        const res = await academicApi.getMissingResults();
        setMissingResults(res);
      } else if (tab === 'corrections') {
        const res = await academicApi.getCorrectionRequests();
        setCorrections(res);
      } else if (tab === 'stale') {
        const res = await academicApi.getStaleProfiles();
        setStaleProfiles(res);
      } else if (tab === 'duplicates') {
        const res = await academicApi.getDuplicates();
        setDuplicates(res);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to fetch tab data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyStudentId) return;
    try {
      await academicApi.verifyAcademic(verifyStudentId, verifyStatus, verifyReason || null);
      setFeedback({ type: 'success', text: `Student status updated to ${verifyStatus}.` });
      setVerifyStudentId(null);
      setVerifyReason('');
      await loadTabData(activeTab);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Verification failed.' });
    }
  };

  const handleReviewCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCorrection) return;
    try {
      await academicApi.reviewCorrectionRequest(
        selectedCorrection.id,
        correctionAction,
        rejectionReason || null
      );
      setFeedback({ type: 'success', text: `Correction request has been ${correctionAction}.` });
      setSelectedCorrection(null);
      setRejectionReason('');
      await loadTabData('corrections');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Review submission failed.' });
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await academicApi.createTransfer({
        studentId: transferStudentId.trim(),
        toBranchId,
        toBatchId,
        reason: transferReason.trim(),
      });
      setFeedback({ type: 'success', text: 'Transfer successfully processed and cohort updated.' });
      setShowTransferModal(false);
      setTransferStudentId('');
      setTransferReason('');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Transfer failed.' });
    }
  };

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryUserId || !duplicateUserId) return;
    try {
      const res = await academicApi.mergeAccounts(primaryUserId, duplicateUserId);
      setFeedback({ type: 'success', text: res.message || 'Accounts successfully merged.' });
      setMergeCluster(null);
      await loadTabData('duplicates');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Account merge failed.' });
    }
  };

  const handleSendStaleReminders = async () => {
    try {
      const res = await academicApi.sendStaleReminders();
      setFeedback({ type: 'success', text: res.message });
      await loadTabData('stale');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Failed to send reminders.' });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Academic Integrity & Verification Hub</h1>
          <p style={styles.subtitle}>
            Enforce academic standards, verify transcripts, audit missing results, and resolve student identity conflicts.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabBar}>
        <button
          onClick={() => setActiveTab('queue')}
          style={{ ...styles.tabButton, ...(activeTab === 'queue' ? styles.tabActive : {}) }}
        >
          <ShieldCheck size={16} /> Quick Verification
        </button>
        <button
          onClick={() => setActiveTab('missing')}
          style={{ ...styles.tabButton, ...(activeTab === 'missing' ? styles.tabActive : {}) }}
        >
          <AlertTriangle size={16} /> Missing Results
        </button>
        <button
          onClick={() => setActiveTab('corrections')}
          style={{ ...styles.tabButton, ...(activeTab === 'corrections' ? styles.tabActive : {}) }}
        >
          <Repeat size={16} /> Correction Requests
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          style={{ ...styles.tabButton, ...(activeTab === 'transfers' ? styles.tabActive : {}) }}
        >
          <ArrowRight size={16} /> Cohort Transfers
        </button>
        <button
          onClick={() => setActiveTab('stale')}
          style={{ ...styles.tabButton, ...(activeTab === 'stale' ? styles.tabActive : {}) }}
        >
          <Clock size={16} /> Stale Profiles
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          style={{ ...styles.tabButton, ...(activeTab === 'duplicates' ? styles.tabActive : {}) }}
        >
          <Users size={16} /> Duplicate Accounts
        </button>
      </div>

      {/* Tab 1: Quick Verification */}
      {activeTab === 'queue' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Verify Student Academic Profile</h2>
          <p style={styles.cardSubtitle}>
            Update a student&apos;s verification status, lock verified CGPA, and trigger automated eligibility updates.
          </p>

          <form onSubmit={handleVerifySubmit} style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={styles.formLabel}>Student User ID (UUID)</label>
              <input
                type="text"
                value={verifyStudentId || ''}
                onChange={(e) => setVerifyStudentId(e.target.value)}
                placeholder="Paste student UUID"
                required
                style={styles.formInput}
              />
            </div>
            <div>
              <label style={styles.formLabel}>Verification Decision</label>
              <select
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value)}
                style={styles.formInput}
              >
                <option value="verified">Verified (Official Credentials Confirmed)</option>
                <option value="requires_correction">Requires Correction (Discrepancy Flagged)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label style={styles.formLabel}>Reason / Remarks (Optional)</label>
              <textarea
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                placeholder="Institutional note or feedback for student..."
                rows={2}
                style={styles.formInput}
              />
            </div>
            <button type="submit" style={styles.primaryButton}>
              Submit Verification Status
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Missing Results Audit */}
      {activeTab === 'missing' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Missing Semester Results Audit</h2>
          <p style={styles.cardSubtitle}>
            Students with gaps in their semester transcripts. Missing semesters are never zero-filled.
          </p>

          {isLoading ? (
            <p>Loading report...</p>
          ) : missingResults.length === 0 ? (
            <p style={{ color: '#16a34a', margin: '20px 0' }}>✓ All active students have complete semester sequences.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Student Name</th>
                    <th style={styles.th}>University ID</th>
                    <th style={styles.th}>Cohort</th>
                    <th style={styles.th}>Missing Semesters</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {missingResults.map((r: any) => (
                    <tr key={r.studentId}>
                      <td style={styles.td}>
                        <strong>{r.name}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{r.email}</div>
                      </td>
                      <td style={styles.td}>{r.universityId || 'Not Set'}</td>
                      <td style={styles.td}>
                        {r.branch} • {r.batch}
                      </td>
                      <td style={{ ...styles.td, color: '#b91c1c', fontWeight: 600 }}>
                        {r.missingSemesters ? `Sem ${r.missingSemesters.join(', ')}` : r.issue}
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => {
                            setVerifyStudentId(r.studentId);
                            setActiveTab('queue');
                          }}
                          style={styles.smallButton}
                        >
                          Review Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Correction Requests */}
      {activeTab === 'corrections' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Student Profile Correction Requests</h2>
          <p style={styles.cardSubtitle}>
            Review requests to modify locked institutional fields (University ID, CGPA, Branch, Batch).
          </p>

          {isLoading ? (
            <p>Loading requests...</p>
          ) : corrections.length === 0 ? (
            <p style={{ color: '#64748b', margin: '20px 0' }}>No pending correction requests.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Student</th>
                    <th style={styles.th}>Field Requested</th>
                    <th style={styles.th}>Requested Value</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((c: ProfileCorrectionRequest) => (
                    <tr key={c.id}>
                      <td style={styles.td}>
                        <strong>{c.student?.user.name}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{c.student?.user.email}</div>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{c.fieldRequested}</td>
                      <td style={styles.td}>{c.requestedValue}</td>
                      <td style={styles.td}>
                        {c.reason}
                        {c.documentUrl && (
                          <div>
                            <a
                              href={c.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#4f46e5', fontSize: '12px' }}
                            >
                              View Attached Document
                            </a>
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => {
                            setSelectedCorrection(c);
                            setCorrectionAction('approved');
                          }}
                          style={styles.primaryButton}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Transfers */}
      {activeTab === 'transfers' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={styles.cardTitle}>Student Branch / Batch Transfers</h2>
              <p style={styles.cardSubtitle}>
                Execute administrative transfers between academic cohorts with full audit trail and reset verification.
              </p>
            </div>
            <button onClick={() => setShowTransferModal(true)} style={styles.primaryButton}>
              Initiate Student Transfer
            </button>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            When a transfer is approved, the student&apos;s department is migrated, verified status is safely reset to force re-evaluation by the new department, and an audit entry is generated.
          </p>
        </div>
      )}

      {/* Tab 5: Stale Profiles */}
      {activeTab === 'stale' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={styles.cardTitle}>Stale Profile Audits (&gt; 180 Days)</h2>
              <p style={styles.cardSubtitle}>
                Students who have not updated or verified their placement credentials in over 6 months.
              </p>
            </div>
            <button onClick={handleSendStaleReminders} style={styles.secondaryButton}>
              <Send size={15} /> Broadcast Update Reminders
            </button>
          </div>

          {isLoading ? (
            <p>Loading stale profiles...</p>
          ) : staleProfiles.length === 0 ? (
            <p style={{ color: '#16a34a', margin: '20px 0' }}>✓ All active profiles have been updated recently.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>University ID</th>
                    <th style={styles.th}>Cohort</th>
                    <th style={styles.th}>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {staleProfiles.map((s: any) => (
                    <tr key={s.userId}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>{s.name}</td>
                      <td style={styles.td}>{s.email}</td>
                      <td style={styles.td}>{s.universityId || '—'}</td>
                      <td style={styles.td}>{s.branch} • {s.batch}</td>
                      <td style={styles.td}>{new Date(s.lastUpdated).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Duplicate Accounts */}
      {activeTab === 'duplicates' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Duplicate Account Detection & Merge</h2>
          <p style={styles.cardSubtitle}>
            Clustered candidate accounts matching on University ID or Cohort & Name. Safely merge records in a transactional operation.
          </p>

          {isLoading ? (
            <p>Scanning accounts...</p>
          ) : duplicates.length === 0 ? (
            <p style={{ color: '#16a34a', margin: '20px 0' }}>✓ No duplicate accounts detected.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
              {duplicates.map((cluster: DuplicateCluster, idx: number) => (
                <div key={idx} style={styles.clusterCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={styles.clusterTag}>
                        Match: {cluster.matchType.replace(/_/g, ' ').toUpperCase()} ({cluster.key})
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setMergeCluster(cluster);
                        setPrimaryUserId(cluster.users[0]?.id || '');
                        setDuplicateUserId(cluster.users[1]?.id || '');
                      }}
                      style={styles.primaryButton}
                    >
                      Merge Cluster
                    </button>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>User ID</th>
                          <th style={styles.th}>Name</th>
                          <th style={styles.th}>Email</th>
                          <th style={styles.th}>University ID</th>
                          <th style={styles.th}>Cohort</th>
                          <th style={styles.th}>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cluster.users.map((u) => (
                          <tr key={u.id}>
                            <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '11px' }}>{u.id}</td>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{u.name}</td>
                            <td style={styles.td}>{u.email}</td>
                            <td style={styles.td}>{u.universityId || '—'}</td>
                            <td style={styles.td}>{u.branch} • {u.batch}</td>
                            <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Correction Modal */}
      {selectedCorrection && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Review Correction Request</h3>
            <p style={styles.modalSubtitle}>
              Student: <strong>{selectedCorrection.student?.user.name}</strong>
            </p>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
                Field: <strong>{selectedCorrection.fieldRequested}</strong>
              </p>
              <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
                Requested Value: <strong>{selectedCorrection.requestedValue}</strong>
              </p>
              <p style={{ margin: '0', fontSize: '13px' }}>
                Reason: {selectedCorrection.reason}
              </p>
            </div>
            <form onSubmit={handleReviewCorrectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.formLabel}>Decision</label>
                <select
                  value={correctionAction}
                  onChange={(e) => setCorrectionAction(e.target.value as 'approved' | 'rejected')}
                  style={styles.formInput}
                >
                  <option value="approved">Approve & Apply Value Instantly</option>
                  <option value="rejected">Reject Request</option>
                </select>
              </div>
              {correctionAction === 'rejected' && (
                <div>
                  <label style={styles.formLabel}>Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this correction is rejected..."
                    required
                    rows={2}
                    style={styles.formInput}
                  />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedCorrection(null)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.primaryButton}>
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Initiate Student Transfer</h3>
            <p style={styles.modalSubtitle}>Reassign student to a new branch and batch.</p>
            <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.formLabel}>Student User ID (UUID)</label>
                <input
                  type="text"
                  value={transferStudentId}
                  onChange={(e) => setTransferStudentId(e.target.value)}
                  placeholder="Paste student UUID"
                  required
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.formLabel}>Destination Branch ID</label>
                <input
                  type="number"
                  value={toBranchId}
                  onChange={(e) => setToBranchId(parseInt(e.target.value, 10))}
                  required
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.formLabel}>Destination Batch ID</label>
                <input
                  type="number"
                  value={toBatchId}
                  onChange={(e) => setToBatchId(parseInt(e.target.value, 10))}
                  required
                  style={styles.formInput}
                />
              </div>
              <div>
                <label style={styles.formLabel}>Reason for Transfer</label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Administrative branch change sanctioned by Dean"
                  required
                  rows={2}
                  style={styles.formInput}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.primaryButton}>
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {mergeCluster && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Merge Duplicate Accounts</h3>
            <p style={styles.modalSubtitle}>
              Select the primary account to keep. Applications, assessments, and resumes from the duplicate account will be migrated into the primary account, and the duplicate will be deleted.
            </p>
            <form onSubmit={handleMergeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.formLabel}>Primary Account (To Keep)</label>
                <select
                  value={primaryUserId}
                  onChange={(e) => setPrimaryUserId(e.target.value)}
                  style={styles.formInput}
                >
                  {mergeCluster.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) - {u.universityId || 'No Univ ID'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={styles.formLabel}>Duplicate Account (To Merge & Delete)</label>
                <select
                  value={duplicateUserId}
                  onChange={(e) => setDuplicateUserId(e.target.value)}
                  style={styles.formInput}
                >
                  {mergeCluster.users
                    .filter((u) => u.id !== primaryUserId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {u.universityId || 'No Univ ID'}
                      </option>
                    ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setMergeCluster(null)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={{ ...styles.primaryButton, backgroundColor: '#dc2626' }}>
                  Execute Transactional Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '28px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '6px',
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '8px',
    overflowX: 'auto',
  },
  tabButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    fontWeight: 600,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
  },
  clusterCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e2e8f0',
  },
  clusterTag: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginTop: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '12px',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '13px',
    color: '#1e293b',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    borderRadius: '8px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    borderRadius: '8px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 600,
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
  },
  smallButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    fontSize: '12px',
    fontWeight: 600,
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '9px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
  },
  formLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#334155',
    marginBottom: '6px',
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '28px',
    width: '100%',
    maxWidth: '520px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '4px',
    marginBottom: '16px',
  },
};
