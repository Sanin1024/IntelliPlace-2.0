import React, { useEffect, useState } from 'react';
import { drivesApi, PlacementDrive, DriveApplication } from '../../api/drives';
import { companyApi, Company } from '../../api/company';
import { publicApi } from '../../api/admin';

export default function DriveManagementPage() {
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingDriveId, setEditingDriveId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    companyId: '',
    title: '',
    jobRole: '',
    jobDescription: '',
    location: '',
    employmentType: 'full_time',
    vacancies: '',
    ctcMin: '',
    ctcMax: '',
    monthlySalary: '',
    stipend: '',
    minCgpa: '7.0',
    maxBacklogs: '0',
    registrationDeadline: '',
    eligibleBranchIds: [] as number[],
    eligibleBatchIds: [] as number[],
    rounds: [{ name: 'Online Assessment', date: '', venue: '', meetingLink: '' }],
    duplicateOverrideReason: '',
    conflictOverrideReason: '',
  });

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Modal states
  const [selectedDriveForApplicants, setSelectedDriveForApplicants] = useState<PlacementDrive | null>(null);
  const [applicants, setApplicants] = useState<DriveApplication[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);

  const [activeChecklist, setActiveChecklist] = useState<any[] | null>(null);
  const [promptAction, setPromptAction] = useState<{ driveId: string; type: 'cancel' | 'withdraw' } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [drivesData, companiesData, branchesData, batchesData] = await Promise.all([
        drivesApi.getAll(),
        companyApi.getAll(),
        publicApi.getBranches().catch(() => []),
        publicApi.getBatches().catch(() => []),
      ]);
      setDrives(drivesData);
      setCompanies(companiesData);
      setBranches(branchesData);
      setBatches(batchesData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load placement drive data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDuplicateWarning(null);
    setConflictWarning(null);

    const payload: any = {
      companyId: form.companyId,
      title: form.title,
      jobRole: form.jobRole,
      jobDescription: form.jobDescription || undefined,
      location: form.location || undefined,
      employmentType: form.employmentType,
      vacancies: form.vacancies ? parseInt(form.vacancies, 10) : undefined,
      ctcMin: form.ctcMin ? parseFloat(form.ctcMin) : undefined,
      ctcMax: form.ctcMax ? parseFloat(form.ctcMax) : undefined,
      monthlySalary: form.monthlySalary ? parseFloat(form.monthlySalary) : undefined,
      stipend: form.stipend ? parseFloat(form.stipend) : undefined,
      minCgpa: form.minCgpa ? parseFloat(form.minCgpa) : undefined,
      maxBacklogs: form.maxBacklogs ? parseInt(form.maxBacklogs, 10) : undefined,
      registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : undefined,
      eligibleBranchIds: form.eligibleBranchIds,
      eligibleBatchIds: form.eligibleBatchIds,
      rounds: form.rounds.filter((r) => r.name.trim() !== ''),
      duplicateOverrideReason: form.duplicateOverrideReason || undefined,
      conflictOverrideReason: form.conflictOverrideReason || undefined,
    };

    try {
      if (editingDriveId) {
        await drivesApi.update(editingDriveId, payload);
        setSuccess('Placement drive updated successfully!');
      } else {
        await drivesApi.create(payload);
        setSuccess('Placement drive created in draft state!');
      }
      setShowForm(false);
      setEditingDriveId(null);
      resetForm();
      loadData();
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.requireOverride) {
        if (err.response?.data?.duplicateCount) {
          setDuplicateWarning(err.response.data.error);
        }
        if (err.response?.data?.conflictCount) {
          setConflictWarning(err.response.data.error);
        }
      } else {
        setError(err.response?.data?.error || 'Failed to save placement drive');
      }
    }
  };

  const resetForm = () => {
    setForm({
      companyId: companies[0]?.id || '',
      title: '',
      jobRole: '',
      jobDescription: '',
      location: '',
      employmentType: 'full_time',
      vacancies: '',
      ctcMin: '',
      ctcMax: '',
      monthlySalary: '',
      stipend: '',
      minCgpa: '7.0',
      maxBacklogs: '0',
      registrationDeadline: '',
      eligibleBranchIds: [],
      eligibleBatchIds: [],
      rounds: [{ name: 'Online Assessment', date: '', venue: '', meetingLink: '' }],
      duplicateOverrideReason: '',
      conflictOverrideReason: '',
    });
    setDuplicateWarning(null);
    setConflictWarning(null);
  };

  const handlePublish = async (driveId: string) => {
    try {
      setError(null);
      await drivesApi.publish(driveId);
      setSuccess(`Drive published successfully! Notifications enqueued for eligible students.`);
      loadData();
    } catch (err: any) {
      if (err.response?.data?.checklist) {
        setActiveChecklist(err.response.data.checklist);
        setError('Cannot publish: Checklist requirements not satisfied.');
      } else {
        setError(err.response?.data?.error || 'Failed to publish drive');
      }
    }
  };

  const handleCancelOrWithdraw = async () => {
    if (!promptAction || !actionReason.trim()) return;
    try {
      if (promptAction.type === 'cancel') {
        await drivesApi.cancel(promptAction.driveId, actionReason);
        setSuccess('Drive cancelled successfully. All applicants preserved and notified.');
      } else {
        await drivesApi.withdraw(promptAction.driveId, actionReason);
        setSuccess('Drive marked as withdrawn by company. Applicants preserved.');
      }
      setPromptAction(null);
      setActionReason('');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${promptAction.type} drive`);
    }
  };

  const handleArchive = async (driveId: string) => {
    if (!confirm('Are you sure you want to archive this drive? Applications will remain safely preserved in the database.')) {
      return;
    }
    try {
      await drivesApi.archive(driveId);
      setSuccess('Drive archived successfully.');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to archive drive');
    }
  };

  const openApplicantsModal = async (drive: PlacementDrive) => {
    setSelectedDriveForApplicants(drive);
    setIsLoadingApplicants(true);
    try {
      const data = await drivesApi.getApplications(drive.id);
      setApplicants(data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to load applications');
    } finally {
      setIsLoadingApplicants(false);
    }
  };

  const handleUpdateApplicantStatus = async (appId: string, newStatus: string) => {
    if (!selectedDriveForApplicants) return;
    try {
      await drivesApi.updateApplicationStatus(selectedDriveForApplicants.id, appId, newStatus);
      // Reload applicants
      const data = await drivesApi.getApplications(selectedDriveForApplicants.id);
      setApplicants(data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update applicant status');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <div>
          <h1 style={pageTitleStyle}>Manage Placement Drives</h1>
          <p style={pageSubtitleStyle}>
            Create, configure, publish, and monitor institutional recruitment drives with automated eligibility.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingDriveId(null);
            setShowForm(!showForm);
          }}
          style={primaryBtnStyle}
        >
          {showForm ? 'Cancel Form' : '+ New Drive'}
        </button>
      </div>

      {success && <div style={successAlertStyle}>{success}</div>}
      {error && <div style={errorAlertStyle}>{error}</div>}

      {/* Drive Creation / Edit Form */}
      {showForm && (
        <form onSubmit={handleCreateOrUpdate} style={formCardStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0' }}>
            {editingDriveId ? 'Edit Placement Drive' : 'Configure New Placement Drive'}
          </h2>

          {duplicateWarning && (
            <div style={warningBoxStyle}>
              ⚠️ <strong>Potential Duplicate Detected:</strong> {duplicateWarning}
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Override Reason (Required to proceed):</label>
                <input
                  type="text"
                  placeholder="Provide explicit committee justification..."
                  value={form.duplicateOverrideReason}
                  onChange={(e) => setForm({ ...form, duplicateOverrideReason: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
            </div>
          )}

          {conflictWarning && (
            <div style={warningBoxStyle}>
              ⚠️ <strong>Recruitment Schedule Conflict Detected:</strong> {conflictWarning}
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Conflict Override Reason:</label>
                <input
                  type="text"
                  placeholder="Justification for overlapping rounds..."
                  value={form.conflictOverrideReason}
                  onChange={(e) => setForm({ ...form, conflictOverrideReason: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
            </div>
          )}

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Company *</label>
              <select
                value={form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Drive Title *</label>
              <input
                type="text"
                placeholder="e.g. Google Campus Recruitment 2026"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Job Role *</label>
              <input
                type="text"
                placeholder="e.g. Associate Software Engineer"
                value={form.jobRole}
                onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                placeholder="e.g. Bangalore / Hyderabad / Hybrid"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Cutoff CGPA (0-10)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={form.minCgpa}
                onChange={(e) => setForm({ ...form, minCgpa: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Max Active Backlogs</label>
              <input
                type="number"
                min="0"
                value={form.maxBacklogs}
                onChange={(e) => setForm({ ...form, maxBacklogs: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Max CTC (LPA)</label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 14.5"
                value={form.ctcMax}
                onChange={(e) => setForm({ ...form, ctcMax: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Vacancies</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 20"
                value={form.vacancies}
                onChange={(e) => setForm({ ...form, vacancies: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Registration Deadline (IST)</label>
              <input
                type="datetime-local"
                value={form.registrationDeadline}
                onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <label style={labelStyle}>Job Description & Selection Notes</label>
            <textarea
              rows={3}
              placeholder="Describe core responsibilities, qualifications, and selection criteria..."
              value={form.jobDescription}
              onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
              style={textareaStyle}
            />
          </div>

          {/* Eligible Branches Multi-Select */}
          <div style={{ marginTop: '14px' }}>
            <label style={labelStyle}>Eligible Branches *</label>
            <div style={tagChoiceContainer}>
              {branches.map((b) => {
                const selected = form.eligibleBranchIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        eligibleBranchIds: selected
                          ? form.eligibleBranchIds.filter((id) => id !== b.id)
                          : [...form.eligibleBranchIds, b.id],
                      });
                    }}
                    style={selected ? tagSelectedStyle : tagChoiceStyle}
                  >
                    {selected ? '✓ ' : '+ '}
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Eligible Batches Multi-Select */}
          <div style={{ marginTop: '14px' }}>
            <label style={labelStyle}>Eligible Batches *</label>
            <div style={tagChoiceContainer}>
              {batches.map((b) => {
                const selected = form.eligibleBatchIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        eligibleBatchIds: selected
                          ? form.eligibleBatchIds.filter((id) => id !== b.id)
                          : [...form.eligibleBatchIds, b.id],
                      });
                    }}
                    style={selected ? tagSelectedStyle : tagChoiceStyle}
                  >
                    {selected ? '✓ ' : '+ '}
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rounds Builder */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={labelStyle}>Recruitment Rounds</label>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    rounds: [...form.rounds, { name: '', date: '', venue: '', meetingLink: '' }],
                  })
                }
                style={secondaryBtnSmall}
              >
                + Add Round
              </button>
            </div>

            {form.rounds.map((round, idx) => (
              <div key={idx} style={roundBuilderRow}>
                <input
                  type="text"
                  placeholder="Round Name (e.g. Coding Assessment)"
                  value={round.name}
                  onChange={(e) => {
                    const next = [...form.rounds];
                    next[idx].name = e.target.value;
                    setForm({ ...form, rounds: next });
                  }}
                  style={{ ...inputStyle, flex: 2 }}
                />
                <input
                  type="datetime-local"
                  value={round.date}
                  onChange={(e) => {
                    const next = [...form.rounds];
                    next[idx].date = e.target.value;
                    setForm({ ...form, rounds: next });
                  }}
                  style={{ ...inputStyle, flex: 2 }}
                />
                <input
                  type="text"
                  placeholder="Venue or Link"
                  value={round.venue}
                  onChange={(e) => {
                    const next = [...form.rounds];
                    next[idx].venue = e.target.value;
                    setForm({ ...form, rounds: next });
                  }}
                  style={{ ...inputStyle, flex: 2 }}
                />
                {form.rounds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ ...form, rounds: form.rounds.filter((_, i) => i !== idx) });
                    }}
                    style={dangerBtnSmall}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" style={primaryBtnStyle}>
              {editingDriveId ? 'Update Drive' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Drives Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading placement drives...
        </div>
      ) : drives.length === 0 ? (
        <div style={emptyCardStyle}>
          <h3>No Placement Drives Published</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Get started by configuring your first company recruitment drive.
          </p>
        </div>
      ) : (
        <div style={tableContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={tableHeaderRowStyle}>
                <th style={thStyle}>Drive / Role</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Cutoff CGPA</th>
                <th style={thStyle}>Applicants</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drives.map((drive) => (
                <tr key={drive.id} style={tableRowStyle}>
                  <td style={tdStyle}>
                    <strong>{drive.title}</strong>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{drive.jobRole}</div>
                  </td>
                  <td style={tdStyle}>{drive.company?.name}</td>
                  <td style={tdStyle}>
                    <span style={statusBadgeStyle(drive.status)}>{drive.status}</span>
                  </td>
                  <td style={tdStyle}>{drive.minCgpa ?? 'None'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => openApplicantsModal(drive)}
                      style={applicantLinkBtnStyle}
                    >
                      {drive.applicantCount} applicant(s)
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {drive.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(drive.id)}
                          style={publishBtnStyle}
                        >
                          Publish
                        </button>
                      )}

                      {drive.status === 'published' && (
                        <>
                          <button
                            onClick={() => {
                              setPromptAction({ driveId: drive.id, type: 'cancel' });
                              setActionReason('');
                            }}
                            style={cancelDriveBtnStyle}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setPromptAction({ driveId: drive.id, type: 'withdraw' });
                              setActionReason('');
                            }}
                            style={withdrawDriveBtnStyle}
                          >
                            Withdraw
                          </button>
                        </>
                      )}

                      {drive.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(drive.id)}
                          style={archiveBtnStyle}
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Checklist Gate Modal */}
      {activeChecklist && (
        <div style={modalBackdropStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ marginTop: 0 }}>Publication Checklist Requirements</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              A placement drive must satisfy all institutional requirements before it can be published to students.
            </p>
            <div style={{ margin: '14px 0' }}>
              {activeChecklist.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                  <span>{item.ok ? '✅' : '❌'}</span>
                  <span style={{ fontSize: '14px', color: item.ok ? '#0f172a' : '#dc2626', fontWeight: item.ok ? 400 : 600 }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveChecklist(null)} style={primaryBtnStyle}>
              Close & Complete Requirements
            </button>
          </div>
        </div>
      )}

      {/* Prompt Action Modal (Cancel / Withdraw reason) */}
      {promptAction && (
        <div style={modalBackdropStyle}>
          <div style={modalBoxStyle}>
            <h3 style={{ marginTop: 0 }}>
              {promptAction.type === 'cancel' ? 'Cancel Placement Drive' : 'Record Company Withdrawal'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              All registered applicants will receive an immediate notification, and their application history will be preserved.
            </p>
            <textarea
              rows={3}
              placeholder="State the official reason..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              style={textareaStyle}
              required
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button onClick={handleCancelOrWithdraw} style={dangerBtnStyle}>
                Confirm {promptAction.type === 'cancel' ? 'Cancellation' : 'Withdrawal'}
              </button>
              <button onClick={() => setPromptAction(null)} style={cancelBtnStyle}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applicants Management Modal */}
      {selectedDriveForApplicants && (
        <div style={modalBackdropStyle}>
          <div style={{ ...modalBoxStyle, maxWidth: '800px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedDriveForApplicants.title} — Applicants</h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{applicants.length} Total Applicants</div>
              </div>
              <button
                onClick={() => setSelectedDriveForApplicants(null)}
                style={cancelBtnStyle}
              >
                Close
              </button>
            </div>

            {isLoadingApplicants ? (
              <p>Loading applicant records...</p>
            ) : applicants.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>No students have applied to this drive yet.</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr style={tableHeaderRowStyle}>
                      <th style={thStyle}>Student</th>
                      <th style={thStyle}>Branch / Batch</th>
                      <th style={thStyle}>CGPA</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Update Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map((a) => (
                      <tr key={a.id} style={tableRowStyle}>
                        <td style={tdStyle}>
                          <strong>{a.name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{a.email}</div>
                        </td>
                        <td style={tdStyle}>
                          {a.branch || '-'} • {a.batch || '-'}
                        </td>
                        <td style={tdStyle}>{a.cgpa ?? 'N/A'}</td>
                        <td style={tdStyle}>
                          <span style={statusBadgeStyle(a.status)}>{a.status}</span>
                        </td>
                        <td style={tdStyle}>
                          <select
                            value={a.status}
                            onChange={(e) => handleUpdateApplicantStatus(a.id, e.target.value)}
                            style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px' }}
                          >
                            <option value="applied">applied</option>
                            <option value="shortlisted">shortlisted</option>
                            <option value="selected">selected</option>
                            <option value="rejected">rejected</option>
                            <option value="withdrawn">withdrawn</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '16px',
  boxSizing: 'border-box',
  width: '100%',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
  marginBottom: '20px',
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 800,
  color: '#0f172a',
  margin: '0 0 4px 0',
};

const pageSubtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  margin: 0,
};

const primaryBtnStyle: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  padding: '9px 18px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const cancelBtnStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  padding: '9px 18px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13px',
  cursor: 'pointer',
};

const formCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '20px',
  marginBottom: '24px',
  boxShadow: 'var(--shadow-card)',
  boxSizing: 'border-box',
  width: '100%',
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '14px',
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

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  boxSizing: 'border-box',
};

const tagChoiceContainer: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const tagChoiceStyle: React.CSSProperties = {
  backgroundColor: '#f1f5f9',
  color: '#475569',
  border: '1px solid #cbd5e1',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  cursor: 'pointer',
};

const tagSelectedStyle: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderColor: '#2563eb',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  cursor: 'pointer',
};

const roundBuilderRow: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '8px',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const secondaryBtnSmall: React.CSSProperties = {
  backgroundColor: '#f1f5f9',
  color: '#2563eb',
  border: '1px solid #bfdbfe',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const dangerBtnSmall: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  border: '1px solid #fecaca',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  cursor: 'pointer',
};

const dangerBtnStyle: React.CSSProperties = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  overflowX: 'auto',
  boxSizing: 'border-box',
  width: '100%',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
};

const tableHeaderRowStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
};

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: '12px',
  fontWeight: 700,
  color: '#475569',
  textTransform: 'uppercase',
};

const tableRowStyle: React.CSSProperties = {
  borderBottom: '1px solid #f1f5f9',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: '13px',
  color: '#1e293b',
};

const applicantLinkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: 0,
};

const publishBtnStyle: React.CSSProperties = {
  backgroundColor: '#059669',
  color: '#ffffff',
  border: 'none',
  padding: '4px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const cancelDriveBtnStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  border: '1px solid #fecaca',
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
};

const withdrawDriveBtnStyle: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  color: '#d97706',
  border: '1px solid #fde68a',
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
};

const archiveBtnStyle: React.CSSProperties = {
  backgroundColor: '#f1f5f9',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  cursor: 'pointer',
};

const statusBadgeStyle = (status: string): React.CSSProperties => {
  switch (status) {
    case 'published':
    case 'active':
    case 'selected':
      return { backgroundColor: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 };
    case 'draft':
      return { backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 };
    case 'cancelled':
    case 'rejected':
      return { backgroundColor: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 };
    case 'withdrawn':
      return { backgroundColor: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 };
    default:
      return { backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 };
  }
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '16px',
  boxSizing: 'border-box',
};

const modalBoxStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
  maxWidth: '500px',
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-modal)',
};

const warningBoxStyle: React.CSSProperties = {
  backgroundColor: 'var(--warning-bg)',
  border: '1px solid var(--warning-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '12px',
  color: 'var(--warning-text)',
  fontSize: '13px',
  marginBottom: '14px',
};

const successAlertStyle: React.CSSProperties = {
  backgroundColor: 'var(--success-bg)',
  color: 'var(--success-text)',
  border: '1px solid var(--success-border)',
  padding: '10px 14px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  marginBottom: '16px',
};

const errorAlertStyle: React.CSSProperties = {
  backgroundColor: 'var(--error-bg)',
  color: 'var(--error-text)',
  border: '1px solid var(--error-border)',
  padding: '10px 14px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
  marginBottom: '16px',
};

const emptyCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  padding: '40px',
  textAlign: 'center',
};
