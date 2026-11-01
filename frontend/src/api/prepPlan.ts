import api from './client';

export interface PrepPlanTopic {
  topicId: number;
  topicName: string;
  totalAnswered: number;
  correct: number;
  accuracy: number | null;
  hasGap: boolean | null;
  status: 'gap' | 'strong' | 'not_enough_data';
  message?: string;
  actions: Array<{ label: string; link: string }>;
}

export interface PrepPlan {
  companyId: string;
  companyName: string;
  gapCount: number;
  totalTopics: number;
  topics: PrepPlanTopic[];
  message?: string;
}

export const prepPlanApi = {
  get: (companyId: string) =>
    api.get<{ data: PrepPlan }>(`/companies/${companyId}/prep-plan`).then(r => r.data.data),
};