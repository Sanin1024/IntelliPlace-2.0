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
    api.post<{ data: any }>(`/tests/${testId}/start`).then(r => r.data.data),
  saveAnswer: (attemptId: string, body: any) =>
    api.patch(`/tests/attempts/${attemptId}/answer`, body).then(r => r.data.data),
  savePosition: (attemptId: string, questionIndex: number) =>
    api.patch(`/tests/attempts/${attemptId}/position`, { questionIndex }).then(r => r.data.data),
  recordActivity: (attemptId: string, events: any[]) =>
    api.post(`/tests/attempts/${attemptId}/activity`, { events }).then(r => r.data.data),
  submitAttempt: (attemptId: string, body?: any) =>
    api.post(`/tests/attempts/${attemptId}/submit`, body).then(r => r.data.data.result),
  getResult: (attemptId: string) =>
    api.get<{ data: AttemptResult }>(`/tests/attempts/${attemptId}/result`).then(r => r.data.data),
  getMyAttempts: () =>
    api.get<{ data: any[] }>('/tests/my-attempts').then(r => r.data.data),
  submitCode: (problemId: string, code: string, language: string = 'python') =>
    api.post(`/tests/problems/${problemId}/submit-code`, { code, language }).then(r => r.data.data),

  // Trainer / Admin
  createTest: (data: any) =>
    api.post<{ data: any }>('/tests', data).then(r => r.data.data),
  deleteTest: (testId: string) =>
    api.delete(`/tests/${testId}`),
  updateTest: (testId: string, data: any) =>
    api.put<{ data: any }>(`/tests/${testId}`, data).then(r => r.data.data),
  getTestResults: (testId: string) =>
    api.get<{ data: any }>(`/tests/${testId}/results`).then(r => r.data.data),
  checkDuplicates: (testId: string | null, questionIds: string[]) =>
    api.post('/tests/check-duplicates', { testId, questionIds }).then(r => r.data.data),
  generateQuestionSet: (rules: Array<{ topicId: number; difficulty: string; count: number }>) =>
    api.post('/tests/generate-questions', { rules }).then(r => r.data.data),
  validateProblemTestCases: (problemId: string, referenceCode: string, language: string = 'python') =>
    api.post(`/tests/problems/${problemId}/validate`, { referenceCode, language }).then(r => r.data.data),
  getAttemptActivity: (testId: string) =>
    api.get(`/tests/${testId}/activity`).then(r => r.data.data),
  grantExtraTime: (attemptId: string, extraTimeMins: number, reason: string) =>
    api.patch(`/tests/attempts/${attemptId}/extra-time`, { extraTimeMins, reason }).then(r => r.data.data),
  updateQuestionVersioned: (questionId: string, data: any) =>
    api.put(`/tests/questions/${questionId}/versioned`, data).then(r => r.data.data),
  recalculateTestResults: (testId: string) =>
    api.post(`/tests/${testId}/recalculate`).then(r => r.data.data),
  publishResults: (testId: string) =>
    api.post(`/tests/${testId}/publish-results`).then(r => r.data.data),
  getSyncStatus: () =>
    api.get('/tests/admin/sync-status').then(r => r.data.data),
  reconcileAttempt: (attemptId: string) =>
    api.post(`/tests/admin/reconcile/${attemptId}`).then(r => r.data.data),
};