import api from './client';

export interface MockInterviewSummary {
  id: string;
  studentId: string;
  interviewerId: string;
  type: 'technical' | 'hr' | 'aptitude' | 'group_discussion' | 'managerial';
  status:
    | 'scheduled'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'interrupted'
    | 'failed'
    | 'cancelled'
    | 'rescheduled';
  startTime: string;
  endTime: string;
  meetingLink?: string;
  rubricId?: string;
  cancellationReason?: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  interviewer: {
    id: string;
    name: string;
    email: string;
  };
  rubric?: {
    id: string;
    name: string;
    version: number;
    criteria: Array<{
      key: string;
      label: string;
      maxScore: number;
      studentVisible?: boolean;
    }>;
  };
  feedback?: {
    id: string;
    isFinalized: boolean;
    evaluatedAt: string;
    studentComments?: string;
    confidentialNotes?: string;
    scores?: Record<string, number>;
  };
}

export interface InterviewGrowthData {
  history: Array<{
    interviewId: string;
    date: string;
    type: string;
    percentage: number;
    scores: Record<string, number>;
  }>;
  trends: Record<string, 'improving' | 'declining' | 'stable'>;
  summary: {
    totalInterviews: number;
    averagePercentage: number;
  };
}

export interface ConflictItem {
  type: 'academic_exam' | 'student_interview' | 'interviewer_busy';
  details: string;
}

export const interviewApi = {
  getMySchedule: (params?: { status?: string; studentId?: string }) =>
    api
      .get<{ success: boolean; data: MockInterviewSummary[] }>('/interviews/my-schedule', { params })
      .then((r) => r.data.data),

  getMyGrowth: (studentId?: string) =>
    api
      .get<{ success: boolean; data: InterviewGrowthData }>('/interviews/my-growth', {
        params: studentId ? { studentId } : undefined,
      })
      .then((r) => r.data.data),

  createInterview: (payload: {
    studentId: string;
    interviewerId: string;
    type: string;
    startTime: string;
    endTime: string;
    meetingLink?: string;
    rubricId?: string;
    overrideConflict?: boolean;
  }) => api.post('/interviews', payload).then((r) => r.data),

  changeStatus: (id: string, status: string, reason?: string) =>
    api.patch(`/interviews/${id}/status`, { status, reason }).then((r) => r.data),

  reschedule: (id: string, newStartTime: string, newEndTime: string, reason: string) =>
    api
      .post(`/interviews/${id}/reschedule`, { newStartTime, newEndTime, reason })
      .then((r) => r.data),

  checkConflicts: (params: {
    studentId: string;
    interviewerId: string;
    startTime: string;
    endTime: string;
    excludeInterviewId?: string;
  }) =>
    api
      .get<{ success: boolean; data: { conflicts: ConflictItem[]; hasConflict: boolean } }>(
        '/interviews/conflicts',
        { params }
      )
      .then((r) => r.data.data),

  setAvailability: (slots: Array<{ startTime: string; endTime: string }>) =>
    api.post('/interviews/availability', { slots }).then((r) => r.data),

  getMyAvailability: () =>
    api.get<{ success: boolean; data: any[] }>('/interviews/availability').then((r) => r.data.data),

  addAcademicExam: (payload: { subject: string; startTime: string; endTime: string }) =>
    api.post('/interviews/exams', payload).then((r) => r.data.data),

  getMyAcademicExams: () =>
    api.get<{ success: boolean; data: any[] }>('/interviews/exams').then((r) => r.data.data),

  createRubric: (payload: {
    name: string;
    criteria: Array<{
      key: string;
      label: string;
      maxScore: number;
      studentVisible?: boolean;
    }>;
  }) => api.post('/interviews/rubrics', payload).then((r) => r.data.data),

  listRubrics: () =>
    api.get<{ success: boolean; data: any[] }>('/interviews/rubrics').then((r) => r.data.data),

  submitFeedback: (
    id: string,
    payload: {
      scores: Record<string, number>;
      studentComments: string;
      confidentialNotes?: string;
      isFinalized: boolean;
    }
  ) => api.post(`/interviews/${id}/feedback`, payload).then((r) => r.data),

  getFeedback: (id: string) =>
    api.get<{ success: boolean; data: any }>(`/interviews/${id}/feedback`).then((r) => r.data.data),
};

