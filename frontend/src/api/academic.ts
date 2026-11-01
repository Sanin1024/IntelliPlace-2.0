import api from './client';

export interface SemesterResult {
  id: string;
  studentId: string;
  semesterNumber: number;
  gpa: number | null;
  creditsEarned: number | null;
  creditsAttempted: number | null;
  status: 'published' | 'pending' | 'unavailable';
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
}

export interface BacklogRecord {
  id: string;
  studentId: string;
  subjectCode: string;
  subjectName: string;
  semester: number;
  status: 'active' | 'cleared';
  clearedAt: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface StudentTransfer {
  id: string;
  studentId: string;
  fromBranchId: number;
  toBranchId: number;
  fromBatchId: number;
  toBatchId: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface ProfileCorrectionRequest {
  id: string;
  studentId: string;
  fieldRequested: string;
  requestedValue: string;
  reason: string;
  documentUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  student?: {
    user: { id: string; name: string; email: string };
    branch?: { name: string };
    batch?: { name: string };
  };
}

export interface AcademicContextResponse {
  profile: any;
  cgpaInfo: {
    conclusive: boolean;
    effectiveCgpa: number | null;
    computedCgpa: number | null;
    profileCgpa: number | null;
    publishedSemesters: number;
    totalSemestersRecorded: number;
    missingSemesters: number[];
    reasons: string[];
  };
  backlogs: {
    activeCount: number;
    clearedCount: number;
    allVerified: boolean;
    records: BacklogRecord[];
  };
  completeness: {
    isComplete: boolean;
    percentage: number;
    missingFields: string[];
    requiredFields: string[];
  };
  freshness: {
    isStale: boolean;
    daysSinceUpdate: number;
    lastUpdated: string;
  };
  semesters: SemesterResult[];
  transfers: StudentTransfer[];
  correctionRequests: ProfileCorrectionRequest[];
}

export interface DuplicateCluster {
  matchType: 'university_id' | 'email_variant' | 'name_branch_batch';
  key: string;
  users: Array<{
    id: string;
    name: string;
    email: string;
    universityId: string | null;
    branch: string | null;
    batch: string | null;
    createdAt: string;
    academicStatus: string;
  }>;
}

export const academicApi = {
  // Student self-service
  getMyAcademic: async () => {
    const res = await api.get<{ success: boolean; data: AcademicContextResponse }>('/students/me/academic');
    return res.data.data;
  },

  submitCorrectionRequest: async (data: {
    fieldRequested: string;
    requestedValue: string;
    reason: string;
    documentUrl?: string | null;
  }) => {
    const res = await api.post<{ success: boolean; data: ProfileCorrectionRequest }>(
      '/students/me/correction-requests',
      data
    );
    return res.data;
  },

  getMyCorrectionRequests: async () => {
    const res = await api.get<{ success: boolean; data: ProfileCorrectionRequest[] }>(
      '/students/me/correction-requests'
    );
    return res.data.data;
  },

  recordSemester: async (data: {
    studentId?: string;
    semesterNumber: number;
    gpa?: number | null;
    creditsEarned?: number | null;
    creditsAttempted?: number | null;
    status?: 'published' | 'pending' | 'unavailable';
  }) => {
    const res = await api.post<{ success: boolean; data: any }>('/academic/semesters', data);
    return res.data;
  },

  recordBacklog: async (data: {
    studentId?: string;
    subjectCode: string;
    subjectName: string;
    semester: number;
    status?: 'active' | 'cleared';
    isVerified?: boolean;
  }) => {
    const res = await api.post<{ success: boolean; data: BacklogRecord }>('/academic/backlogs', data);
    return res.data.data;
  },

  updateBacklog: async (id: string, data: { status: 'active' | 'cleared'; isVerified?: boolean }) => {
    const res = await api.put<{ success: boolean; data: BacklogRecord }>(`/academic/backlogs/${id}`, data);
    return res.data.data;
  },

  // PO & Admin
  verifyAcademic: async (studentId: string, status: string, reason?: string | null) => {
    const res = await api.put<{ success: boolean; data: any }>(`/academic/verify/${studentId}`, {
      status,
      reason,
    });
    return res.data;
  },

  getMissingResults: async () => {
    const res = await api.get<{ success: boolean; data: any[] }>('/academic/missing-results');
    return res.data.data;
  },

  getStaleProfiles: async () => {
    const res = await api.get<{ success: boolean; data: any[] }>('/academic/stale-profiles');
    return res.data.data;
  },

  sendStaleReminders: async () => {
    const res = await api.post<{ success: boolean; message: string; recipientCount: number }>(
      '/academic/stale-profiles/remind',
      {}
    );
    return res.data;
  },

  getDuplicates: async () => {
    const res = await api.get<{ success: boolean; data: DuplicateCluster[] }>('/academic/duplicates');
    return res.data.data;
  },

  mergeAccounts: async (primaryUserId: string, duplicateUserId: string) => {
    const res = await api.post<{ success: boolean; message: string }>('/academic/merge-accounts', {
      primaryUserId,
      duplicateUserId,
    });
    return res.data;
  },

  createTransfer: async (data: {
    studentId: string;
    toBranchId: number;
    toBatchId: number;
    reason: string;
  }) => {
    const res = await api.post<{ success: boolean; message: string; data: StudentTransfer }>(
      '/academic/transfers',
      data
    );
    return res.data;
  },

  getCorrectionRequests: async () => {
    const res = await api.get<{ success: boolean; data: ProfileCorrectionRequest[] }>(
      '/academic/correction-requests'
    );
    return res.data.data;
  },

  reviewCorrectionRequest: async (
    id: string,
    status: 'approved' | 'rejected',
    rejectionReason?: string | null
  ) => {
    const res = await api.put<{ success: boolean; message: string }>(
      `/academic/correction-requests/${id}`,
      { status, rejectionReason }
    );
    return res.data;
  },

  changeRole: async (userId: string, role: string) => {
    const res = await api.post<{ success: boolean; message: string; data: any }>(
      '/academic/change-role',
      { userId, role }
    );
    return res.data;
  },
};

