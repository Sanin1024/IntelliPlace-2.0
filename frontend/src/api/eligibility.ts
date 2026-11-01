import api from './client';

export type CriterionMode = 'pass' | 'fail' | 'pending';
export type EvaluationStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING_VERIFICATION' | 'MANUAL_OVERRIDE';
export type ShortlistAction = 'shortlist' | 'select' | 'reject';

export interface CriterionResult {
  key: string;
  label: string;
  mode: CriterionMode;
  actualValue: any;
  requiredValue: any;
  explanation: string;
}

export interface EligibilityEvaluation {
  id?: string;
  studentId: string;
  driveId: string;
  criteriaVersion: number;
  status: EvaluationStatus;
  criteriaResults: CriterionResult[];
  warnings: string[];
  evaluatedAt: string;
  percentageMethod?: string;
  overrideReason?: string | null;
  overriddenBy?: string | null;
}

export interface DriveCriteria {
  minCgpa?: number | null;
  minPercentage?: number | null;
  maxActiveBacklogs?: number | null;
  maxHistoricalBacklogs?: number | null;
  allowPendingSupplementary?: boolean;
  maxGapYears?: number | null;
  requiresGapDocumentation?: boolean;
  eligibleBranchIds?: number[];
  eligibleBatchIds?: number[];
  branchCgpaOverrides?: Record<string, number>;
}

export interface CriteriaVersionRecord {
  id: string;
  driveId: string;
  version: number;
  criteria: DriveCriteria;
  changeReason?: string | null;
  createdBy: string;
  createdAt: string;
  supersededAt?: string | null;
}

export interface StudentEligibilityPreview {
  studentId: string;
  name: string;
  email: string;
  universityId: string | null;
  branch: string | null;
  batch: string | null;
  cgpa: number | null;
  cgpaVerified: boolean;
  status: EvaluationStatus;
  criteriaResults: CriterionResult[];
  applicationStatus: string | null;
  shortlistAction: ShortlistAction | null;
  hasScheduleConflict?: boolean;
  conflictDetails?: Array<{ driveTitle: string; otherRound: string; thisRound: string; scheduledAt: string }>;
}

export interface EligibilityPreviewResponse {
  driveId: string;
  criteriaVersion: number;
  summary: {
    totalEligible: number;
    totalIneligible: number;
    totalPending: number;
    totalOverridden: number;
    totalEvaluated: number;
  };
  results: StudentEligibilityPreview[];
}

export interface SupplementaryExam {
  id: string;
  studentId: string;
  subject: string;
  semesterNumber: number;
  attemptNumber: number;
  result: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

export interface EducationHistory {
  id: string;
  studentId: string;
  level: string;
  institutionName: string | null;
  startYear: number | null;
  endYear: number | null;
  gapExplanation: string | null;
  gapDocVerified: boolean;
  isVerified: boolean;
  verifiedBy: string | null;
}

export const eligibilityApi = {
  getMyEligibility: async (driveId: string): Promise<EligibilityEvaluation> => {
    const res = await api.get(`/drives/${driveId}/eligibility/me`);
    return res.data.data;
  },

  getEligibilityPreview: async (driveId: string): Promise<EligibilityPreviewResponse> => {
    const res = await api.get(`/drives/${driveId}/eligibility/preview`);
    return res.data.data;
  },

  updateCriteria: async (
    driveId: string,
    data: { criteria: DriveCriteria; changeReason: string }
  ): Promise<CriteriaVersionRecord> => {
    const res = await api.put(`/drives/${driveId}/criteria`, data);
    return res.data.data;
  },

  getCriteriaHistory: async (driveId: string): Promise<CriteriaVersionRecord[]> => {
    const res = await api.get(`/drives/${driveId}/criteria/history`);
    return res.data.data;
  },

  shortlistCandidates: async (
    driveId: string,
    data: { studentIds: string[]; action: ShortlistAction; conflictOverrideReason?: string }
  ) => {
    const res = await api.post(`/drives/${driveId}/shortlist`, data);
    return res.data;
  },

  overrideEligibility: async (
    driveId: string,
    studentId: string,
    data: { reason: string }
  ) => {
    const res = await api.post(`/drives/${driveId}/eligibility/${studentId}/override`, data);
    return res.data;
  },

  getOverrideHistory: async (driveId: string) => {
    const res = await api.get(`/drives/${driveId}/eligibility/overrides`);
    return res.data.data;
  },

  getReportUrl: (driveId: string): string => {
    const baseUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api';
    const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${trimmed}/drives/${driveId}/eligibility/report`;
  },

  recordSupplementaryExam: async (data: {
    studentId?: string;
    subject: string;
    semesterNumber: number;
    attemptNumber?: number;
    result: string;
  }): Promise<SupplementaryExam> => {
    const res = await api.post('/drives/supplementary', data);
    return res.data.data;
  },

  upsertEducationHistory: async (data: {
    studentId?: string;
    level: string;
    institutionName?: string;
    startYear?: number;
    endYear?: number;
    gapExplanation?: string;
  }): Promise<EducationHistory> => {
    const res = await api.post('/drives/education-history', data);
    return res.data.data;
  },

  verifyEducationHistory: async (
    id: string,
    data: { isVerified: boolean; gapDocVerified?: boolean }
  ): Promise<EducationHistory> => {
    const res = await api.put(`/drives/education-history/${id}/verify`, data);
    return res.data.data;
  },
};

