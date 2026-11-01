import React, { useEffect, useState } from 'react';
import {
  Shield,
  Lock,
  Eye,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  privacyApi,
  ConsentRecord,
  ConsentType,
  DataRequest,
  DataRequestType,
  DataAccessLog,
} from '../../api/privacy';
import { toast } from '../../context/ToastContext';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

const CONSENT_CONFIGS: {
  type: ConsentType;
  title: string;
  description: string;
  impact: string;
}[] = [
  {
    type: 'placement_sharing',
    title: 'Recruiter & Placement Sharing',
    description:
      'Authorize sharing your verified academic records, resume, and application history with registered partner companies for active drives.',
    impact: 'Required to be shortlisted or contacted by visiting employers.',
  },
  {
    type: 'data_processing',
    title: 'Automated Profiling & AI Readiness Analysis',
    description:
      'Allow algorithmic scoring, readiness radar computations, and automated practice problem recommendations based on your test results.',
    impact: 'Enables tailored skill recommendations and placement readiness index.',
  },
  {
    type: 'marketing_communications',
    title: 'Career Guidance & Optional Updates',
    description:
      'Receive informational emails about external webinars, guest lectures, hackathons, and career development initiatives.',
    impact: 'Optional. Does not impact drive alerts or essential placement notices.',
  },
];

export default function PrivacyDashboardPage() {
  const [activeTab, setActiveTab] = useState<'consents' | 'requests' | 'accessLogs'>('consents');
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [accessLogs, setAccessLogs] = useState<DataAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [togglingConsent, setTogglingConsent] = useState<string | null>(null);

  // New Request Form State
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [newRequestType, setNewRequestType] = useState<DataRequestType>('correction');
  const [newRequestDetails, setNewRequestDetails] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [consentsData, requestsData, logsData] = await Promise.all([
        privacyApi.getMyConsents().catch(() => []),
        privacyApi.getMyDataRequests().catch(() => []),
        privacyApi.getMyAccessLogs().catch(() => []),
      ]);
      setConsents(consentsData);
      setDataRequests(requestsData);
      setAccessLogs(logsData);
    } catch (err: any) {
      toast.error('Failed to load privacy and compliance settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleToggleConsent = async (type: ConsentType, currentVal: boolean) => {
    setTogglingConsent(type);
    try {
      const updated = await privacyApi.updateConsent(type, !currentVal);
      setConsents((prev) => {
        const idx = prev.findIndex((c) => c.type === type);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
      toast.success(`Consent for ${type.replace('_', ' ')} updated successfully.`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update consent.');
    } finally {
      setTogglingConsent(null);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRequestDetails.trim().length < 10) {
      toast.error('Please provide at least 10 characters explaining your request.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const created = await privacyApi.createDataRequest({
        type: newRequestType,
        details: newRequestDetails.trim(),
      });
      setDataRequests((prev) => [created, ...prev]);
      setShowNewRequestModal(false);
      setNewRequestDetails('');
      toast.success('Your privacy request has been submitted for administrative review.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const getConsentStatus = (type: ConsentType) => {
    const item = consents.find((c) => c.type === type);
    return item ? item.isGranted : false;
  };

  const getConsentRecord = (type: ConsentType) => {
    return consents.find((c) => c.type === type);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <LoadingSpinner size={40} />
        <p className="text-sm text-slate-500">Loading privacy settings and audit ledger...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <Shield className="w-3.5 h-3.5" />
              <span>Data Protection & Compliance</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Privacy & Consent Governance
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              Exercise your data rights, control recruitment data-sharing permissions, and inspect real-time audit logs of administrative and recruiter access to your records.
            </p>
          </div>
          <button
            onClick={loadAllData}
            className="self-start md:self-center inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Ledger
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-6 -mb-2 gap-8 text-sm">
          <button
            onClick={() => setActiveTab('consents')}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'consents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            Consent Preferences ({consents.filter((c) => c.isGranted).length}/3 Granted)
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Data Subject Requests ({dataRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('accessLogs')}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'accessLogs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            Access Transparency ({accessLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: CONSENTS */}
      {activeTab === 'consents' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5">
            {CONSENT_CONFIGS.map((config) => {
              const isGranted = getConsentStatus(config.type);
              const record = getConsentRecord(config.type);
              const isProcessing = togglingConsent === config.type;

              return (
                <div
                  key={config.type}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-slate-900">{config.title}</h3>
                      {isGranted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Granted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Revoked
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{config.description}</p>
                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                      <span className="text-indigo-600 font-medium">Impact: {config.impact}</span>
                      {record?.grantedAt && (
                        <span>
                          Granted on {new Date(record.grantedAt).toLocaleDateString()} at{' '}
                          {new Date(record.grantedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {record?.revokedAt && (
                        <span>
                          Revoked on {new Date(record.revokedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleToggleConsent(config.type, isGranted)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                        isGranted ? 'bg-indigo-600' : 'bg-slate-300'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isGranted ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-sm font-medium text-slate-700">
                      {isGranted ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>Notice:</strong> Revoking "Recruiter & Placement Sharing" blocks new company applications and halts live profile discovery by employers. Academic history remains archived for official degree audits under institutional statutory retention policies.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATA REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Data Subject Rights (GDPR)</h2>
              <p className="text-xs text-slate-500">
                Submit requests for academic correction, complete profile deletion, or full data package export.
              </p>
            </div>
            <button
              onClick={() => setShowNewRequestModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Submit Privacy Request
            </button>
          </div>

          {dataRequests.length === 0 ? (
            <EmptyState
              title="No Data Requests Submitted"
              description="You have not submitted any data deletion, correction, or export requests."
            />
          ) : (
            <div className="space-y-4">
              {dataRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize bg-slate-100 text-slate-700 border border-slate-200">
                        {req.type.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${
                          req.status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : req.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : req.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Requested {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {req.details}
                  </p>

                  {(req.resolution || req.adminNote) && (
                    <div className="text-xs text-indigo-900 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-1">
                      <span className="font-semibold block">Administrative Resolution Note:</span>
                      <p>{req.resolution || req.adminNote}</p>
                      {(req.reviewedAt || (req as any).resolvedAt) && (
                        <span className="text-indigo-400 block pt-1">
                          Resolved on {new Date((req.reviewedAt || (req as any).resolvedAt)!).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCESS TRANSPARENCY LOGS */}
      {activeTab === 'accessLogs' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Access Transparency Ledger</h2>
              <p className="text-xs text-slate-500">
                Audited real-time log of every administrator, trainer, and recruiter who inspected your academic record or downloaded your files.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Total Recorded Events: {accessLogs.length}
            </span>
          </div>

          {accessLogs.length === 0 ? (
            <EmptyState
              title="No Access Activity Recorded"
              description="No external viewing or downloading of your profile has been logged yet."
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">Authorized User</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Resource Accessed</th>
                      <th className="py-3.5 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {log.actor?.name || 'System / Batch Worker'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {log.actor?.role || 'System'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-indigo-600">
                          {log.resourceType}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`capitalize px-2 py-0.5 rounded-md text-xs font-medium ${
                              log.action === 'download'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: New Data Request */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Submit Data Privacy Request</h3>
              <button
                onClick={() => setShowNewRequestModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Request Type
                </label>
                <select
                  value={newRequestType}
                  onChange={(e) => setNewRequestType(e.target.value as DataRequestType)}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="correction">Data Correction (Academic / Profile rectification)</option>
                  <option value="deletion">Data Deletion (Right to be Forgotten)</option>
                  <option value="data_export">Data Export (Machine-readable personal archive)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Details & Justification
                </label>
                <textarea
                  rows={4}
                  value={newRequestDetails}
                  onChange={(e) => setNewRequestDetails(e.target.value)}
                  placeholder="Describe your request in detail (min 10 characters)..."
                  className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
