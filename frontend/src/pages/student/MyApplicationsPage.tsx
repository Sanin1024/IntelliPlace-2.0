import { useEffect, useState } from 'react';
import { applicationApi } from '../../api/application';
import type { DriveApplicationItem } from '../../api/application';
import {
  Briefcase,
  Building,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  applied: { label: 'Applied', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  shortlisted: { label: 'Shortlisted', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  selected: { label: 'Selected / Placed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected: { label: 'Not Selected', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  withdrawn: { label: 'Withdrawn', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
};

export default function MyApplicationsPage() {
  const [apps, setApps] = useState<DriveApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    applicationApi
      .getMyApplications()
      .then((data) => setApps(data))
      .catch((err) => console.error('Failed to load applications', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleWithdraw = async (applicationId: string) => {
    setActionError(null);
    try {
      await applicationApi.withdraw(applicationId, withdrawReason || 'Withdrawn by student');
      setWithdrawingId(null);
      setWithdrawReason('');
      load();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to withdraw application');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading your recruitment applications...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            My Placement Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track multi-round recruitment progress, interview stages, and activity history across all applied drives.
          </p>
        </div>
      </div>

      {apps.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Applications Yet</h3>
          <p className="text-sm text-slate-500 mt-1">Explore upcoming placement drives and submit your candidacy.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG['applied'];
            const isExpanded = expandedId === app.id;

            return (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">{app.drive.title}</h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {app.drive.company.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Applied: {new Date(app.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div>
                      {['applied', 'shortlisted'].includes(app.status) && (
                        <button
                          onClick={() => setWithdrawingId(app.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-round progress timeline (Challenge 153 & 156) */}
                  {app.rounds.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Recruitment Stages
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {app.rounds.map((rp) => {
                          const isQual = rp.status === 'qualified';
                          const isRej = rp.status === 'rejected';
                          return (
                            <div
                              key={rp.id}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                                isQual
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isRej
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isQual ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : isRej ? (
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{rp.round.name}</span>
                              <span className="capitalize font-semibold">({rp.status})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expandable Activity Log (Challenge 159) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          Hide Audit Trail <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          View Activity Timeline ({app.activities.length}) <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                    {app.withdrawnAt && (
                      <span className="text-xs text-slate-400">
                        Withdrawn on {new Date(app.withdrawnAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs space-y-2 border border-slate-200">
                      <p className="font-semibold text-slate-700 mb-1">Application Lifecycle History:</p>
                      {app.activities.map((act) => (
                        <div key={act.id} className="flex items-center justify-between text-slate-600 py-0.5">
                          <span>
                            • Action: <strong className="text-slate-800">{act.action}</strong>
                            {act.previousStatus && (
                              <span className="text-slate-400"> ({act.previousStatus} → {act.newStatus})</span>
                            )}
                          </span>
                          <span className="text-slate-400">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Withdraw Confirmation Modal */}
                {withdrawingId === app.id && (
                  <div className="bg-rose-50 border-t border-rose-200 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-rose-900">Withdraw Application</h4>
                        <p className="text-xs text-rose-700 mt-0.5">
                          Are you sure you want to withdraw your application for <strong>{app.drive.title}</strong>? Placement officers will be notified and your current recruitment progress will be revoked.
                        </p>
                        <input
                          type="text"
                          placeholder="Reason for withdrawal (optional)"
                          value={withdrawReason}
                          onChange={(e) => setWithdrawReason(e.target.value)}
                          className="mt-2.5 w-full text-xs p-2 rounded border border-rose-300 focus:ring-1 focus:ring-rose-500 bg-white"
                        />
                        {actionError && <p className="text-xs text-rose-600 mt-1 font-semibold">{actionError}</p>}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleWithdraw(app.id)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                          >
                            Confirm Withdrawal
                          </button>
                          <button
                            onClick={() => {
                              setWithdrawingId(null);
                              setActionError(null);
                            }}
                            className="px-3 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-xs font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
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
