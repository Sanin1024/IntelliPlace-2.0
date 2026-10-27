import api from './client';

export interface Company {
  id: string;
  name: string;
  description: string | null;
  jobRole: string;
  package: number | null;
  eligibilityCgpa: number;
  driveDate: string;
  daysUntilDrive: number | null;
  syllabusText: string | null;
  eligibleBranches: Array<{ id: number; name: string }>;
  topics: Array<{ id: number; name: string }>;
  targetCount?: number;
  _count?: { targetStudents: number };
  myEligibility?: { eligible: boolean; reasons: string[] };
}

export interface TargetCompany {
  companyId: string;
  id: string;
  name: string;
  jobRole: string;
  driveDate: string;
  package: number | null;
  daysUntilDrive: number | null;
}

export const companyApi = {
  getAll: () =>
    api.get<{ data: Company[] }>('/companies').then(r => r.data.data),
  getById: (id: string) =>
    api.get<{ data: Company }>(`/companies/${id}`).then(r => r.data.data),
  create: (data: {
    name: string;
    description?: string;
    jobRole: string;
    package?: number;
    eligibilityCgpa: number;
    driveDate: string;
    syllabusText?: string;
    eligibleBranchIds: number[];
    topicIds?: number[];
  }) =>
    api.post<{ data: Company }>('/companies', data).then(r => r.data.data),
  update: (id: string, data: any) =>
    api.put<{ data: Company }>(`/companies/${id}`, data).then(r => r.data.data),
  delete: (id: string) =>
    api.delete(`/companies/${id}`),
  toggleTarget: (companyId: string) =>
    api.post<{ data: { isTarget: boolean } }>(`/companies/${companyId}/target`)
      .then(r => r.data.data),
  getMyTargets: () =>
    api.get<{ data: TargetCompany[] }>('/companies/my-targets').then(r => r.data.data),
};