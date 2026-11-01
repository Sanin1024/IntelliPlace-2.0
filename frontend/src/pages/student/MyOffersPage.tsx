import { useEffect, useState } from 'react';
import { offerApi } from '../../api/offer';
import type { OfferItem } from '../../api/offer';
import {
  Award,
  Building,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  issued: { label: 'Offer Issued', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  pending: { label: 'Decision Pending', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  accepted: { label: 'Accepted', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected: { label: 'Declined', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  withdrawn: { label: 'Withdrawn', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
  expired: { label: 'Expired', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300' },
  revoked: { label: 'Revoked by PO', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export default function MyOffersPage() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideAction, setDecideAction] = useState<'accepted' | 'rejected'>('accepted');
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [showOffCampusModal, setShowOffCampusModal] = useState(false);
  const [offCampusForm, setOffCampusForm] = useState({
    companyId: '',
    jobRole: '',
    employmentType: 'full_time',
    ctc: '',
    offerDate: new Date().toISOString().split('T')[0],
    offerLetterUrl: '',
  });

  const load = () => {
    setLoading(true);
    offerApi
      .getMyOffers()
      .then((data) => setOffers(data))
      .catch((err) => console.error('Failed to load offers', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDecision = async (offerId: string) => {
    setActionError(null);
    try {
      await offerApi.decide(offerId, decideAction, rejectReason);
      setDecidingId(null);
      setRejectReason('');
      load();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to submit decision');
    }
  };

  const handleSubmitOffCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await offerApi.submitOffCampus({
        companyId: offCampusForm.companyId,
        jobRole: offCampusForm.jobRole,
        employmentType: offCampusForm.employmentType,
        ctc: offCampusForm.ctc ? Number(offCampusForm.ctc) : undefined,
        offerDate: offCampusForm.offerDate,
        offerLetterUrl: offCampusForm.offerLetterUrl || undefined,
      });
      setShowOffCampusModal(false);
      load();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Failed to submit off-campus offer');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading placement offers...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            Placement Offers & Verifications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review employment offers, accept or decline opportunities, and submit external off-campus offers for institutional verification.
          </p>
        </div>
        <button
          onClick={() => setShowOffCampusModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Add Off-Campus Offer
        </button>
      </div>

      {offers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Offers Issued Yet</h3>
          <p className="text-sm text-slate-500 mt-1">
            Active placement offers from campus recruitment and off-campus submissions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const statusConfig = STATUS_CONFIG[offer.status] || STATUS_CONFIG['issued'];

            return (
              <div
                key={offer.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900">{offer.jobRole}</h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          {statusConfig.label}
                        </span>
                        {offer.status === 'accepted' && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              offer.isVerified
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {offer.isVerified ? '✓ Officially Verified' : '⏳ Pending PO Verification'}
                          </span>
                        )}
                        {offer.source === 'off_campus' && (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-medium">
                            Off-Campus
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {offer.company.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          CTC:{' '}
                          <strong className="text-slate-800">
                            {offer.ctc ? `₹${offer.ctc} LPA` : offer.stipend ? `₹${offer.stipend}/mo` : 'Disclosed in letter'}
                          </strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Offered: {new Date(offer.offerDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {['issued', 'pending'].includes(offer.status) && (
                        <>
                          <button
                            onClick={() => {
                              setDecidingId(offer.id);
                              setDecideAction('accepted');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              setDecidingId(offer.id);
                              setDecideAction('rejected');
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Decline
                          </button>
                        </>
                      )}
                      {offer.offerLetterUrl && (
                        <a
                          href={offer.offerLetterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Offer Letter
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Decision Modal / Prompt Inline */}
                  {decidingId === offer.id && (
                    <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <h4 className="text-sm font-bold text-slate-800">
                        Confirm {decideAction === 'accepted' ? 'Acceptance' : 'Rejection'}
                      </h4>
                      {decideAction === 'accepted' ? (
                        <p className="text-xs text-slate-600 mt-1">
                          Accepting this full-time offer will trigger automated institutional policy (Challenge 173): any other active accepted full-time offers will be safely auto-withdrawn.
                        </p>
                      ) : (
                        <div className="mt-2">
                          <p className="text-xs text-slate-600 mb-1.5">
                            Please provide a brief reason for declining this offer (placement cell will be notified):
                          </p>
                          <input
                            type="text"
                            placeholder="e.g., Decided to pursue higher studies / Accepted another position"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                          />
                        </div>
                      )}

                      {actionError && <p className="text-xs text-rose-600 mt-2 font-semibold">{actionError}</p>}

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleDecision(offer.id)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold text-white ${
                            decideAction === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                          }`}
                        >
                          Confirm {decideAction === 'accepted' ? 'Acceptance' : 'Decline'}
                        </button>
                        <button
                          onClick={() => {
                            setDecidingId(null);
                            setActionError(null);
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Off-Campus Offer Modal */}
      {showOffCampusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Submit Off-Campus Offer
              </h3>
              <button
                onClick={() => setShowOffCampusModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitOffCampus} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company UUID / Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Company UUID"
                  value={offCampusForm.companyId}
                  onChange={(e) => setOffCampusForm({ ...offCampusForm, companyId: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Role</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineer"
                    value={offCampusForm.jobRole}
                    onChange={(e) => setOffCampusForm({ ...offCampusForm, jobRole: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={offCampusForm.employmentType}
                    onChange={(e) => setOffCampusForm({ ...offCampusForm, employmentType: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="internship">Internship</option>
                    <option value="internship_ppo">Internship + PPO</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CTC (LPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 14.5"
                    value={offCampusForm.ctc}
                    onChange={(e) => setOffCampusForm({ ...offCampusForm, ctc: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Offer Date</label>
                  <input
                    type="date"
                    required
                    value={offCampusForm.offerDate}
                    onChange={(e) => setOffCampusForm({ ...offCampusForm, offerDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Offer Letter Document Link (URL)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={offCampusForm.offerLetterUrl}
                  onChange={(e) => setOffCampusForm({ ...offCampusForm, offerLetterUrl: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {actionError && <p className="text-xs text-rose-600 font-semibold">{actionError}</p>}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOffCampusModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
