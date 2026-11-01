import api from './client';

export interface StudentRow {
  studentId: string;
  ktuid?: string | null;
  name: string;
  email: string;
  branch: string | null;
  batch: string | null;
  cgpa: number | null;
  knowledgeLevel: string;
  placementStatus: string;
  targetRole: string | null;
  totalAttempts: number;
  mockTestsTaken: number;
  practiceSessions: number;
  avgMockScore: number | null;
  codingProblemsAttempted: number;
  readinessScore: number;
  readinessLevel: string;
}

export interface StudentSummary {
  totalStudents: number;
  placed: number;
  inProcess: number;
  notPlaced: number;
  avgReadiness: number;
}

export interface StudentDetail {
  profile: {
    studentId: string;
    name: string;
    email: string;
    branch: string | null;
    batch: string | null;
    cgpa: number | null;
    knowledgeLevel: string;
    placementStatus: string;
    targetRole: string | null;
    resumeUrl: string | null;
  };
  targetCompanies: Array<{ id: string; name: string; driveDate: string }>;
  attempts: Array<{
    attemptId: string;
    testTitle: string;
    attemptType: string;
    score: number | null;
    totalMarks: number | null;
    percentage: number;
    endTime: string;
  }>;
  topicAccuracy: Array<{
    topicId: number;
    topicName: string;
    total: number;
    correct: number;
    accuracy: number;
  }>;
}

export const poApi = {
  getAllStudents: (params?: {
    branchId?: number;
    batchId?: number;
    placementStatus?: string;
    knowledgeLevel?: string;
    search?: string;
  }) =>
    api.get<{ data: { students: StudentRow[]; summary: StudentSummary } }>('/po/students', { params })
      .then(r => r.data.data),
  getStudentDetail: (studentId: string) =>
    api.get<{ data: StudentDetail }>(`/po/students/${studentId}`).then(r => r.data.data),
  updatePlacementStatus: (studentId: string, placementStatus: string) =>
    api.patch<{ data: any }>(`/po/students/${studentId}/status`, { placementStatus })
      .then(r => r.data.data),
};