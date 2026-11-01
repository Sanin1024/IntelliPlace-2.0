import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  eligibilityApi,
  EligibilityEvaluation,
  CriterionResult,
} from '../api/eligibility';
import { Link } from 'react-router-dom';

interface EligibilityBreakdownProps {
  driveId: string;
  evaluation?: EligibilityEvaluation | null;
  compact?: boolean;
}

export default function EligibilityBreakdown({
  driveId,
  evaluation: initialEvaluation,
  compact = false,
}: EligibilityBreakdownProps) {
  const [evaluation, setEvaluation] = useState<EligibilityEvaluation | null>(initialEvaluation || null);
  const [loading, setLoading] = useState<boolean>(!initialEvaluation);
  const [error, setError] = useState<string | null>(null);

  const fetchEligibility = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eligibilityApi.getMyEligibility(driveId);
      setEvaluation(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to evaluate eligibility');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEvaluation) {
      setEvaluation(initialEvaluation);
    } else if (driveId) {
      fetchEligibility();
    }
  }, [driveId, initialEvaluation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mr-2" />
        <span className="text-sm text-gray-600 dark:text-gray-300">Evaluating your eligibility...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={fetchEligibility}
            className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!evaluation) return null;

  const getStatusBadge = () => {
    switch (evaluation.status) {
      case 'ELIGIBLE':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-lg text-sm font-semibold border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Eligible to Apply
          </div>
        );
      case 'MANUAL_OVERRIDE':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200 rounded-lg text-sm font-semibold border border-purple-300 dark:border-purple-800">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Manual PO Override
          </div>
        );
      case 'PENDING_VERIFICATION':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-lg text-sm font-semibold border border-amber-300 dark:border-amber-800">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Verification Pending
          </div>
        );
      case 'INELIGIBLE':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 rounded-lg text-sm font-semibold border border-rose-300 dark:border-rose-800">
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Not Eligible
          </div>
        );
    }
  };

  const getCriterionBadge = (mode: CriterionResult['mode']) => {
    switch (mode) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Met
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'fail':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
            <XCircle className="w-3 h-3" /> Not Met
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4 shadow-sm">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-3">
        <div>
          <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Placement Eligibility Analysis
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
              (Criteria v{evaluation.criteriaVersion})
            </span>
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Evaluated on {new Date(evaluation.evaluatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
            {evaluation.percentageMethod && ` • ${evaluation.percentageMethod}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <button
            onClick={fetchEligibility}
            title="Re-evaluate"
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Manual Override Note */}
      {evaluation.status === 'MANUAL_OVERRIDE' && evaluation.overrideReason && (
        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-xs text-purple-900 dark:text-purple-200">
          <span className="font-semibold">Placement Officer Override Note:</span> {evaluation.overrideReason}
        </div>
      )}

      {/* Pending Action Callout */}
      {evaluation.status === 'PENDING_VERIFICATION' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Verification Action Required</p>
            <p className="mt-0.5">
              One or more of your academic credentials has not yet been verified by the placement office, or required records are missing.
              Please update your profile or contact the placement cell to unblock your application.
            </p>
            <Link
              to="/student/academic"
              className="inline-flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Go to Academic Profile & Verification <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Criteria Breakdown Grid */}
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {evaluation.criteriaResults.map((c) => (
          <div
            key={c.key}
            className={`p-3 rounded-lg border text-xs transition ${
              c.mode === 'pass'
                ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40'
                : c.mode === 'pending'
                ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40'
                : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-gray-800 dark:text-gray-200">{c.label}</span>
              {getCriterionBadge(c.mode)}
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{c.explanation}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
              <span>Required: <strong className="text-gray-700 dark:text-gray-300">{String(c.requiredValue ?? 'N/A')}</strong></span>
              <span>Your record: <strong className="text-gray-700 dark:text-gray-300">{String(c.actualValue ?? 'None / Unset')}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Warnings List */}
      {evaluation.warnings && evaluation.warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/40 rounded-lg text-xs text-yellow-800 dark:text-yellow-300">
          <p className="font-semibold flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
            Advisory Notes:
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            {evaluation.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
