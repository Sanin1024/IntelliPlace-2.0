import api from './client';

export interface MockTest {
  id: string;
  title: string;
  description: string | null;
  durationMins: number;
  questionCount: number;
  maxAttempts: number;
  attemptsUsed: number;
  remainingAttempts: number;
  available: boolean;
  batch: { id: number; name: string } | null;
  myAttempts: Array<{ id: string; status: string; score: number | null; totalMarks: number | null }>;
}

export interface StartAttemptResponse {
  attemptId: string;
  resumed: boolean;
  test: { id: string; title: string; durationMins: number };
  questions: Array<{
    id: string;
    questionText: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    difficulty: string;
    topic: { id: number; name: string };
  }>;
  savedAnswers: Array<{ questionId: string; selectedOption: string }>;
  remainingSeconds: number;
  startTime: string;
}

export interface AttemptResult {
  attemptId: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  durationSecs: number;
  review: Array<{
    questionId: string;
    questionText: string;
    options: { A: string; B: string; C: string; D: string };
    topic: { id: number; name: string };
    myAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string | null;
  }>;
}

export const testApi = {
  // Student
  getAvailableTests: () =>
    api.get<{ data: MockTest[] }>('/tests').then(r => r.data.data),
  startAttempt: (testId: string) =>
    api.post<{ data: StartAttemptResponse }>(`/tests/${testId}/start`).then(r => r.data.data),
  saveAnswer: (attemptId: string, questionId: string, selectedOption: string) =>
    api.patch<{ data: { message: string; remainingSeconds: number } }>(`/tests/attempts/${attemptId}/answer`, {
      questionId, selectedOption,
    }).then(r => r.data.data),
  submitAttempt: (attemptId: string) =>
    api.post<{ data: AttemptResult }>(`/tests/attempts/${attemptId}/submit`).then(r => r.data.data),
  getResult: (attemptId: string) =>
    api.get<{ data: AttemptResult }>(`/tests/attempts/${attemptId}/result`).then(r => r.data.data),
  getMyAttempts: () =>
    api.get<{ data: any[] }>('/tests/my-attempts').then(r => r.data.data),

  // Trainer
  createTest: (data: {
    title: string;
    description?: string;
    durationMins: number;
    batchId?: number | null;
    maxAttempts?: number;
    questionIds: string[];
  }) =>
    api.post<{ data: any }>('/tests', data).then(r => r.data.data),
  deleteTest: (testId: string) =>
    api.delete(`/tests/${testId}`),
  getTestResults: (testId: string) =>
    api.get<{ data: any }>(`/tests/${testId}/results`).then(r => r.data.data),
};