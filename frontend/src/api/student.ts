import api from './client';
import type { StudentProfile } from '../types';

export const studentApi = {
  getMyProfile: () =>
    api.get<{ data: any }>('/students/me').then(r => r.data.data),
  updateMyProfile: (data: Partial<{
    name: string;
    branchId: number;
    batchId: number;
    knowledgeLevel: string;
    cgpa: number;
    resumeUrl: string;
    targetRole: string;
  }>) =>
    api.put<{ data: StudentProfile }>('/students/me', data).then(r => r.data.data),
};