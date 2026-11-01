import React, { useEffect, useState } from 'react';
import { drivesApi, PlacementDrive } from '../../api/drives';
import { Link } from 'react-router-dom';
import EligibilityBreakdown from '../../components/EligibilityBreakdown';

export default function DrivesPage() {
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'eligible' | 'applied'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [withdrawingDriveId, setWithdrawingDriveId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [applyingDriveId, setApplyingDriveId] = useState<string | null>(null);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});

  const toggleBreakdown = (driveId: string) => {
    setExpandedBreakdowns((prev) => ({ ...prev, [driveId]: !prev[driveId] }));
  };

  const loadDrives = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await drivesApi.getAll();
      setDrives(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load placement drives');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrives();
  }, []);

  const handleApply = async (driveId: string) => {
    try {
      setApplyingDriveId(driveId);
      await drivesApi.apply(driveId);
      setActionSuccess('Application submitted successfully!');
      setTimeout(() => setActionSuccess(null), 3000);
      loadDrives();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to apply for drive');
    } finally {
      setApplyingDriveId(null);
    }
  };

  const handleWithdraw = async (driveId: string) => {
    try {
      await drivesApi.withdrawApplication(driveId, withdrawReason);
      setWithdrawingDriveId(null);
      setWithdrawReason('');
      setActionSuccess('Application withdrawn.');
      setTimeout(() => setActionSuccess(null), 3000);
      loadDrives();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to withdraw application');
    }
  };

  const formatDeadline = (dateStr?: string | null) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredDrives = drives.filter((d) => {
    if (filterTab === 'eligible' && !d.myEligibility?.eligible) return false;
    if (filterTab === 'applied' && (!d.myApplication || d.myApplication.status === 'withdrawn')) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(term);
      const matchCompany = d.company?.name.toLowerCase().includes(term);
      const matchRole = d.jobRole.toLowerCase().includes(term);
      return matchTitle || matchCompany || matchRole;
    }
    return true;
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Placement Drives</h1>
          <p style={subtitleStyle}>
            Explore campus recruitment drives, verify your eligibility, and track your application status.
          </p>
        </div>
      </div>

      {actionSuccess && <div style={successAlertStyle}>{actionSuccess}</div>}
      {error && <div style={errorAlertStyle}>{error}</div>}

      {/* Filters & Search */}
      <div style={controlsRowStyle}>
        <div style={tabsContainerStyle}>
          <button
            onClick={() => setFilterTab('all')}
            style={filterTab === 'all' ? activeTabStyle : tabStyle}
          >
            All Drives ({drives.length})
          </button>
          <button
            onClick={() => setFilterTab('eligible')}
            style={filterTab === 'eligible' ? activeTabStyle : tabStyle}
          >
            Eligible for Me ({drives.filter((d) => d.myEligibility?.eligible).length})
          </button>
          <button
            onClick={() => setFilterTab('applied')}
            style={filterTab === 'applied' ? activeTabStyle : tabStyle}
          >
            My Applications (
            {drives.filter((d) => d.myApplication && d.myApplication.status !== 'withdrawn').length}
            )
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by company, role, or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
      </div>

      {isLoading ? (
        <div style={loadingBoxStyle}>Loading placement drives...</div>
      ) : filteredDrives.length === 0 ? (
        <div style={emptyCardStyle}>
          <h3>No Placement Drives Found</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            {searchTerm
              ? 'No drives match your search criteria.'
              : filterTab === 'eligible'
              ? 'You do not currently meet the eligibility criteria for any open drives. Check your profile settings to ensure your CGPA and branch are up-to-date.'
              : filterTab === 'applied'
              ? 'You have not submitted applications to any drives yet.'
              : 'There are no active placement drives published at this moment.'}
          </p>
          {filterTab === 'eligible' && (
            <Link to="/profile" style={btnLinkStyle}>
              Update Profile
            </Link>
          )}
        </div>
      ) : (
        <div style={driveListStyle}>
          {filteredDrives.map((drive) => {
            const isApplied = drive.myApplication && drive.myApplication.status !== 'withdrawn';
            const isEligible = drive.myEligibility?.eligible;
            const reasons = drive.myEligibility?.reasons || [];
            const missingInfo = drive.myEligibility?.missingProfileInfo || [];
            const isClosed = !drive.registrationOpen;

            return (
              <div key={drive.id} style={driveCardStyle}>
                {/* Cancellation / Withdrawal Warning Banners */}
                {drive.status === 'cancelled' && (
                  <div style={cancelledBannerStyle}>
                    ⚠️ <strong>Drive Cancelled:</strong> {drive.cancellationReason || 'Drive cancelled by placement cell.'}
                  </div>
                )}
                {drive.status === 'withdrawn' && (
                  <div style={withdrawnBannerStyle}>
                    ℹ️ <strong>Company Withdrawn:</strong> {drive.withdrawalReason || 'The company has withdrawn this drive.'}
                  </div>
                )}

                {/* Card Header */}
                <div style={cardHeaderRow}>
                  <div>
                    <span style={companyBadgeStyle}>{drive.company?.name || 'Company'}</span>
                    <h2 style={driveTitleStyle}>{drive.title}</h2>
                    <div style={roleSubtitleStyle}>{drive.jobRole} • {drive.location || 'Flexible'} • {drive.employmentType.replace('_', ' ')}</div>
                  </div>

                  <div style={statusBadgeContainer}>
                    {drive.status === 'published' || drive.status === 'active' ? (
                      isClosed ? (
                        <span style={closedBadgeStyle}>Registration Closed</span>
                      ) : (
                        <span style={openBadgeStyle}>Registration Open</span>
                      )
                    ) : drive.status === 'cancelled' ? (
                      <span style={cancelledBadgeStyle}>Cancelled</span>
                    ) : drive.status === 'withdrawn' ? (
                      <span style={withdrawnBadgeStyle}>Withdrawn</span>
                    ) : (
                      <span style={closedBadgeStyle}>{drive.status}</span>
                    )}
                  </div>
                </div>

                {/* Job Specs */}
                <div style={specsGridStyle}>
                  <div style={specItemStyle}>
                    <span style={specLabelStyle}>Compensation:</span>
                    <span style={specValueStyle}>
                      {drive.ctcMax ? `₹${drive.ctcMin ? `${drive.ctcMin} - ` : ''}${drive.ctcMax} LPA` : drive.monthlySalary ? `₹${drive.monthlySalary}/mo` : drive.stipend ? `₹${drive.stipend} Stipend` : 'As per industry standard'}
                    </span>
                  </div>

                  <div style={specItemStyle}>
                    <span style={specLabelStyle}>Deadline:</span>
                    <span style={specValueStyle}>{formatDeadline(drive.registrationDeadline)}</span>
                  </div>

                  <div style={specItemStyle}>
                    <span style={specLabelStyle}>Cutoff CGPA:</span>
                    <span style={specValueStyle}>{drive.minCgpa ? `${drive.minCgpa}+` : 'No minimum'}</span>
                  </div>

                  <div style={specItemStyle}>
                    <span style={specLabelStyle}>Vacancies:</span>
                    <span style={specValueStyle}>{drive.vacancies ?? 'Open'}</span>
                  </div>
                </div>

                {/* Eligible branches and batches */}
                <div style={tagsContainerStyle}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Branches:</span>
                  {drive.eligibleBranches?.map((b) => (
                    <span key={b.id} style={tagStyle}>{b.name}</span>
                  ))}
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginLeft: '8px' }}>Batches:</span>
                  {drive.eligibleBatches?.map((b) => (
                    <span key={b.id} style={tagStyle}>{b.name}</span>
                  ))}
                </div>

                {/* Eligibility Status Box */}
                <div style={isEligible ? eligibleBoxStyle : ineligibleBoxStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{isEligible ? '✅' : '⚠️'}</span>
                    <strong style={{ fontSize: '14px', color: isEligible ? '#065f46' : '#92400e' }}>
                      {isEligible ? 'You meet all eligibility criteria for this drive' : 'You do not meet one or more criteria'}
                    </strong>
                  </div>

                  {!isEligible && reasons.length > 0 && (
                    <ul style={reasonsListStyle}>
                      {reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}

                  {missingInfo.length > 0 && (
                    <div style={missingInfoBoxStyle}>
                      {missingInfo.map((m, i) => (
                        <div key={i} style={{ marginBottom: '4px' }}>
                          💡 {m}{' '}
                          <Link to="/profile" style={{ color: '#2563eb', fontWeight: 600 }}>
                            Edit Profile &rarr;
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Institutional Eligibility Engine Analysis Toggle */}
                <div style={{ margin: '8px 0 14px 0' }}>
                  <button
                    type="button"
                    onClick={() => toggleBreakdown(drive.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '4px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {expandedBreakdowns[drive.id]
                      ? '▲ Hide Detailed Criteria Analysis'
                      : '▼ View Detailed Criteria Analysis (Eligibility Engine)'}
                  </button>
                  {expandedBreakdowns[drive.id] && (
                    <div style={{ marginTop: '8px' }}>
                      <EligibilityBreakdown driveId={drive.id} compact />
                    </div>
                  )}
                </div>

                {/* Rounds Summary */}
                {drive.rounds && drive.rounds.length > 0 && (
                  <div style={roundsSectionStyle}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Recruitment Rounds ({drive.rounds.length}):
                    </div>
                    <div style={roundsGridStyle}>
                      {drive.rounds.map((round, idx) => (
                        <div key={idx} style={roundCardStyle}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                            {round.name || `Round ${idx + 1}`}
                          </div>
                          {round.date && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              📅 {formatDeadline(round.date)}
                            </div>
                          )}
                          {round.venue && (
                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                              📍 {round.venue}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Application Actions */}
                <div style={actionsRowStyle}>
                  {isApplied ? (
                    <div style={appliedStatusRowStyle}>
                      <span style={appliedPillStyle}>
                        Application Status: <strong style={{ textTransform: 'capitalize' }}>{drive.myApplication?.status}</strong>
                      </span>
                      {drive.myApplication?.status !== 'selected' && (
                        <button
                          onClick={() => setWithdrawingDriveId(drive.id)}
                          style={withdrawBtnStyle}
                        >
                          Withdraw Application
                        </button>
                      )}
                    </div>
                  ) : (
                    <div>
                      {isClosed ? (
                        <button disabled style={disabledBtnStyle}>
                          Registration Closed ({drive.registrationClosedReason || 'Closed'})
                        </button>
                      ) : !isEligible ? (
                        <button disabled style={disabledBtnStyle}>
                          Ineligible to Apply
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApply(drive.id)}
                          disabled={applyingDriveId === drive.id}
                          style={applyBtnStyle}
                        >
                          {applyingDriveId === drive.id ? 'Submitting...' : 'Apply for Drive'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Withdraw Modal Dialog */}
                {withdrawingDriveId === drive.id && (
                  <div style={withdrawDialogStyle}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
                      Are you sure you want to withdraw your application?
                    </p>
                    <input
                      type="text"
                      placeholder="Optional reason for withdrawal..."
                      value={withdrawReason}
                      onChange={(e) => setWithdrawReason(e.target.value)}
                      style={withdrawInputStyle}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        onClick={() => handleWithdraw(drive.id)}
                        style={confirmWithdrawBtnStyle}
                      >
                        Confirm Withdrawal
                      </button>
                      <button
                        onClick={() => {
                          setWithdrawingDriveId(null);
                          setWithdrawReason('');
                        }}
                        style={cancelWithdrawBtnStyle}
                      >
                        Keep Application
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Styling (Strictly responsive & 375px overflow free)
const containerStyle: React.CSSProperties = {
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '16px',
  boxSizing: 'border-box',
  width: '100%',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 800,
  color: '#0f172a',
  margin: '0 0 6px 0',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  margin: 0,
};

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
  marginBottom: '20px',
};

const tabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const tabStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  background: 'var(--nav-active-bg)',
  borderColor: 'var(--nav-active-bg)',
  color: 'var(--nav-active-text)',
};

const searchInputStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  minWidth: '220px',
  maxWidth: '100%',
  boxSizing: 'border-box',
};

const driveListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const driveCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  padding: '20px',
  boxShadow: 'var(--shadow-card)',
  boxSizing: 'border-box',
  width: '100%',
};

const cardHeaderRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '10px',
  marginBottom: '14px',
};

const companyBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#2563eb',
  backgroundColor: '#eff6ff',
  padding: '3px 8px',
  borderRadius: '6px',
  marginBottom: '4px',
};

const driveTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#0f172a',
  margin: '2px 0 4px 0',
};

const roleSubtitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
};

const statusBadgeContainer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const openBadgeStyle: React.CSSProperties = {
  backgroundColor: '#ecfdf5',
  color: '#059669',
  border: '1px solid #a7f3d0',
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 600,
};

const closedBadgeStyle: React.CSSProperties = {
  backgroundColor: '#f1f5f9',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 600,
};

const cancelledBadgeStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  border: '1px solid #fecaca',
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 600,
};

const withdrawnBadgeStyle: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  color: '#d97706',
  border: '1px solid #fde68a',
  padding: '4px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 600,
};

const specsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
  padding: '12px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  marginBottom: '14px',
};

const specItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const specLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#64748b',
  fontWeight: 600,
  textTransform: 'uppercase',
};

const specValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#0f172a',
  fontWeight: 700,
  marginTop: '2px',
};

const tagsContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '6px',
  marginBottom: '14px',
};

const tagStyle: React.CSSProperties = {
  backgroundColor: '#e2e8f0',
  color: '#334155',
  fontSize: '12px',
  padding: '2px 8px',
  borderRadius: '4px',
  fontWeight: 500,
};

const eligibleBoxStyle: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '14px',
};

const ineligibleBoxStyle: React.CSSProperties = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fef3c7',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '14px',
};

const reasonsListStyle: React.CSSProperties = {
  margin: '8px 0 0 16px',
  padding: 0,
  fontSize: '13px',
  color: '#b45309',
};

const missingInfoBoxStyle: React.CSSProperties = {
  marginTop: '8px',
  fontSize: '13px',
  color: '#1e40af',
  borderTop: '1px dashed #bfdbfe',
  paddingTop: '6px',
};

const roundsSectionStyle: React.CSSProperties = {
  marginBottom: '16px',
};

const roundsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '10px',
};

const roundCardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 10px',
  backgroundColor: 'var(--surface)',
};

const actionsRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  paddingTop: '10px',
  borderTop: '1px solid #f1f5f9',
};

const applyBtnStyle: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
};

const disabledBtnStyle: React.CSSProperties = {
  backgroundColor: '#e2e8f0',
  color: '#94a3b8',
  border: 'none',
  padding: '10px 18px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'not-allowed',
};

const appliedStatusRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '12px',
};

const appliedPillStyle: React.CSSProperties = {
  backgroundColor: '#ecfdf5',
  color: '#059669',
  border: '1px solid #a7f3d0',
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '13px',
};

const withdrawBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#dc2626',
  border: '1px solid #fecaca',
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const withdrawDialogStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '12px',
  backgroundColor: '#fef2f2',
  border: '1px solid #fee2e2',
  borderRadius: '8px',
};

const withdrawInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #fca5a5',
  borderRadius: '6px',
  fontSize: '13px',
  boxSizing: 'border-box',
};

const confirmWithdrawBtnStyle: React.CSSProperties = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const cancelWithdrawBtnStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '12px',
  cursor: 'pointer',
};

const cancelledBannerStyle: React.CSSProperties = {
  backgroundColor: 'var(--error-bg)',
  color: 'var(--error-text)',
  border: '1px solid var(--error-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  fontSize: '13px',
  marginBottom: '12px',
};

const withdrawnBannerStyle: React.CSSProperties = {
  backgroundColor: 'var(--warning-bg)',
  color: 'var(--warning-text)',
  border: '1px solid var(--warning-border)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  fontSize: '13px',
  marginBottom: '12px',
};

const loadingBoxStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px',
  color: 'var(--text-muted)',
};

const emptyCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  padding: '40px',
  textAlign: 'center',
};

const btnLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '12px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '8px 16px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '13px',
};

const successAlertStyle: React.CSSProperties = {
  backgroundColor: '#ecfdf5',
  color: '#065f46',
  border: '1px solid #a7f3d0',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '14px',
  marginBottom: '16px',
};

const errorAlertStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  color: '#991b1b',
  border: '1px solid #fecaca',
  padding: '10px 14px',
  borderRadius: '8px',
  fontSize: '14px',
  marginBottom: '16px',
};

