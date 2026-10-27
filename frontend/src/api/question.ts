import api from './client';

export interface Question {
  id: string;
  topicId: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation?: string | null;
  createdAt: string;
  topic: { id: number; name: string };
}

export const questionApi = {
  getAll: (params?: { topicId?: number; difficulty?: string; search?: string }) =>
    api.get<{ data: Question[]; meta: any }>('/questions', { params }).then(r => r.data),
  getById: (id: string) =>
    api.get<{ data: Question }>(`/questions/${id}`).then(r => r.data.data),
  create: (data: Omit<Question, 'id' | 'createdAt' | 'topic'>) =>
    api.post<{ data: Question }>('/questions', data).then(r => r.data.data),
  update: (id: string, data: any) =>
    api.put<{ data: Question }>(`/questions/${id}`, data).then(r => r.data.data),
  delete: (id: string) =>
    api.delete(`/questions/${id}`),
};