import api from './client';

export interface PracticeQuestion {
  id: string;
  topicId: number;
  difficulty: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface PracticeStartResponse {
  attemptId: string;
  totalQuestions: number;
  questions: PracticeQuestion[];
}

export interface AnswerFeedback {
  isCorrect: boolean;
  correctOption: string;
  explanation: string | null;
  currentScore: number;
  totalAnswered: number;
}

export interface PracticeSummary {
  attemptId: string;
  totalAnswered: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  duration: number;
}

export const practiceApi = {
  start: (data: { topicId: number; difficulty?: string; count?: number }) =>
    api.post<{ data: PracticeStartResponse }>('/practice/start', data).then(r => r.data.data),
  submitAnswer: (data: { attemptId: string; questionId: string; selectedOption: string }) =>
    api.post<{ data: AnswerFeedback }>('/practice/answer', data).then(r => r.data.data),
  finish: (attemptId: string) =>
    api.post<{ data: PracticeSummary }>('/practice/finish', { attemptId }).then(r => r.data.data),
};