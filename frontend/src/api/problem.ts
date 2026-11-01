import api from './client';

export interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface CodingProblem {
  id: string;
  topicId: number;
  difficulty: 'easy' | 'medium' | 'hard';
  title: string;
  description: string;
  sampleInput: string;
  sampleOutput: string;
  tags: string[];
  createdAt: string;
  topic: { id: number; name: string };
  testCases: TestCase[];
  _count?: { submissions: number };
}

export const problemApi = {
  getAll: (params?: { topicId?: number; difficulty?: string; search?: string }) =>
    api.get<{ data: CodingProblem[] }>('/problems', { params }).then(r => r.data.data),
  getById: (id: string) =>
    api.get<{ data: CodingProblem }>(`/problems/${id}`).then(r => r.data.data),
  create: (data: Omit<CodingProblem, 'id' | 'createdAt' | 'topic' | '_count'>) =>
    api.post<{ data: CodingProblem }>('/problems', data).then(r => r.data.data),
  update: (id: string, data: any) =>
    api.put<{ data: CodingProblem }>(`/problems/${id}`, data).then(r => r.data.data),
  delete: (id: string) =>
    api.delete(`/problems/${id}`),
  getRunnerStatus: () =>
    api.get<{ data: { enabled: boolean; languages: string[] } }>('/problems/runner-status').then(r => r.data.data),
  run: (id: string, data: { language: string; code: string }) =>
    api.post<{ data: any }>(`/problems/${id}/run`, data).then(r => r.data.data),
  submit: (id: string, data: { language: string; code: string }) =>
    api.post<{ data: any }>(`/problems/${id}/submit`, data).then(r => r.data.data),
  getSubmissions: (id: string) =>
    api.get<{ data: any[] }>(`/problems/${id}/submissions`).then(r => r.data.data),
};