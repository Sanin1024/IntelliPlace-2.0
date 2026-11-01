import api from './client';

export interface ApplicationActivityLog {
  id: string;
  applicationId: string;
  action: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  actorId: string;
  details?: any;
  createdAt: string;
}

export interface ApplicationRoundProgress {
  id: string;
  applicationId: string;
  roundId: string;
  status: 'pending' | 'qualified' | 'rejected' | 'skipped';
  scheduledAt?: string | null;
  updatedAt: string;
  round: {
    id: string;
    driveId: string;
    name: string;
    order: number;
  };
}

export interface DriveApplicationItem {
  id: string;
  driveId: string;
  studentId: string;
  status: 'applied' | 'shortlisted' | 'selected' | 'rejected' | 'withdrawn';
  appliedAt: string;
  withdrawnAt?: string | null;
  withdrawalReason?: string | null;
  drive: {
    id: string;
    title: string;
    company: {
      id: string;
      name: string;
      hqLocation?: string;
    };
    registrationDeadline?: string | null;
    status: string;
  };
  activities: ApplicationActivityLog[];
  rounds: ApplicationRoundProgress[];
}

export const applicationApi = {
  getMyApplications: () =>
    api.get<{ success: boolean; data: DriveApplicationItem[] }>('/applications/my-applications').then((r) => r.data.data),

  withdraw: (id: string, reason?: string) =>
    api.post<{ success: boolean; data: any }>(`/applications/${id}/withdraw`, { reason }).then((r) => r.data.data),

  changeStatus: (id: string, status: string, reason?: string) =>
    api.patch<{ success: boolean; data: any }>(`/applications/${id}/status`, { status, reason }).then((r) => r.data.data),

  getApplicants: (driveId: string) =>
    api.get<{ success: boolean; data: any[] }>(`/applications/drive/${driveId}/applicants`).then((r) => r.data.data),

  addRound: (driveId: string, name: string, order: number) =>
    api.post<{ success: boolean; data: any }>(`/applications/drive/${driveId}/rounds`, { name, order }).then((r) => r.data.data),

  updateRound: (applicationId: string, roundId: string, status: 'qualified' | 'rejected') =>
    api.patch<{ success: boolean; data: any }>(`/applications/${applicationId}/rounds/${roundId}`, { status }).then((r) => r.data.data),

  scheduleInterview: (applicationId: string, data: any) =>
    api.post<{ success: boolean; data: any }>(`/applications/${applicationId}/schedule-interview`, data).then((r) => r.data.data),

  getPendingReport: () =>
    api.get<{ success: boolean; data: any[] }>('/applications/pending-report').then((r) => r.data.data),
};

