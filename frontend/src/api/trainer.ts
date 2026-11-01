import api from './client';

export interface TrainerBatchAssignment {
  id: string;
  trainerId: string;
  batchId: number;
  role: 'primary' | 'assistant';
  assignedBy: string;
  assignedAt: string;
  isActive: boolean;
  batch: {
    id: number;
    name: string;
    graduationYear: number;
  };
}

export interface TrainerTask {
  id: string;
  trainerId: string;
  title: string;
  description?: string;
  deadline?: string;
  status: 'pending' | 'acknowledged' | 'completed';
  acknowledgedAt?: string;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface StudentPerformance {
  studentId: string;
  name: string;
  email: string;
  avgScore: number | null;
  completedModules: number;
  attendance: number;
}

export interface BatchPerformanceResponse {
  performance: StudentPerformance[];
  struggling: StudentPerformance[];
}

export interface TrainerFeedbackItem {
  id: string;
  ratings: Record<string, number>;
  comments?: string;
  createdAt: string;
  isAnonymous: boolean;
  student: {
    name: string;
  };
}

export const trainerApi = {
  assignTrainerToBatch: (data: { trainerId: string; batchId: number; role?: string }) =>
    api.post('/trainers/assign-batch', data).then((r) => r.data),

  getMyBatches: () =>
    api.get<{ success: boolean; data: TrainerBatchAssignment[] }>('/trainers/my-batches').then((r) => r.data),

  getBatchPerformance: (batchId: number) =>
    api.get<{ success: boolean; data: BatchPerformanceResponse }>(`/trainers/batch/${batchId}/performance`).then((r) => r.data),

  createIntervention: (data: {
    studentId: string;
    severity: 'low' | 'medium' | 'high';
    reason: string;
    action?: string;
    followUpDate?: string;
  }) => api.post('/trainers/interventions', data).then((r) => r.data),

  submitFeedback: (data: {
    trainerId: string;
    sessionId?: string;
    ratings: Record<string, number>;
    comments?: string;
    isAnonymous?: boolean;
  }) => api.post('/trainers/feedback', data).then((r) => r.data),

  getMyFeedback: () =>
    api.get<{ success: boolean; data: TrainerFeedbackItem[] }>('/trainers/my-feedback').then((r) => r.data),

  getMyTasks: () =>
    api.get<{ success: boolean; data: TrainerTask[] }>('/trainers/my-tasks').then((r) => r.data),

  acknowledgeTask: (id: string) =>
    api.patch(`/trainers/tasks/${id}/acknowledge`).then((r) => r.data),

  checkConflicts: (data: {
    batchId: number;
    trainerId: string;
    startTime: string;
    endTime: string;
  }) => api.post('/trainers/check-conflicts', data).then((r) => r.data),

  getTrainerEvaluation: (trainerId: string, period?: string) =>
    api.get(`/trainers/${trainerId}/evaluation`, { params: { period } }).then((r) => r.data),
};

