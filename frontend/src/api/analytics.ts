import api from './client';

export interface TopicAccuracy {
  topicId: number;
  topicName: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface ReadinessScore {
  readinessScore: number;
  readinessLevel: string;
  breakdown: {
    aptitude: { points: number; maxPoints: number; mockTestsTaken: number; note: string };
    coding: { points: number; maxPoints: number; problemsAttempted: number; note: string };
    profile: { points: number; maxPoints: number; note: string };
  };
}

export interface Recommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action: { label: string; link: string };
}

export interface ProgressPoint {
  attemptNumber: number;
  testTitle: string;
  percentage: number;
  date: string;
}

export const analyticsApi = {
  getTopicAccuracy: (studentId: string) =>
    api.get<{ data: TopicAccuracy[] }>(`/analytics/student/${studentId}/topic-accuracy`)
      .then(r => r.data.data),
  getWeakTopics: (studentId: string) =>
    api.get<{ data: TopicAccuracy[] }>(`/analytics/student/${studentId}/weak-topics`)
      .then(r => r.data.data),
  getProgress: (studentId: string) =>
    api.get<{ data: ProgressPoint[] }>(`/analytics/student/${studentId}/progress`)
      .then(r => r.data.data),
  getReadiness: (studentId: string) =>
    api.get<{ data: ReadinessScore }>(`/analytics/student/${studentId}/readiness`)
      .then(r => r.data.data),
  getRecommendations: (studentId: string) =>
    api.get<{ data: Recommendation[] }>(`/analytics/student/${studentId}/recommendations`)
      .then(r => r.data.data),
  getBatchAnalytics: (batchId?: number) =>
    api.get<{ data: any[] }>('/analytics/batch', { params: batchId ? { batchId } : {} })
      .then(r => r.data.data),
};