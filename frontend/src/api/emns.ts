import api from './client';

export interface EMNSDriveMetric {
  driveId: string;
  companyName: string;
  jobTitle: string;
  deadline: string | null;
  totalApplications: number;
  eligibleNonApplicants: number;
  nextReminder: {
    type: string;
    scheduledAt: string;
  } | null;
  status: string;
}

export const emnsApi = {
  getDashboard: () => api.get<{ success: boolean; data: EMNSDriveMetric[] }>('/emns/dashboard'),
  triggerManualReminder: (driveId: string, reminderType?: string) =>
    api.post<{ success: boolean; data: any }>(`/emns/trigger/${driveId}`, { reminderType }),
};

export default emnsApi;

