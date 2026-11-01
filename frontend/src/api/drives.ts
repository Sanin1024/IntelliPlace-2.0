import api from './client';

export interface DriveRound {
  name?: string;
  date?: string;
  venue?: string;
  meetingLink?: string;
  description?: string;
}

export interface DriveApplication {
  id: string;
  driveId: string;
  studentId: string;
  status: 'applied' | 'shortlisted' | 'selected' | 'rejected' | 'withdrawn';
  eligibilityOverrideReason?: string | null;
  overriddenBy?: string | null;
  appliedAt: string;
  withdrawnAt?: string | null;
  withdrawalReason?: string | null;
  name?: string;
  email?: string;
  cgpa?: number | null;
  branch?: string | null;
  batch?: string | null;
  resumeUrl?: string | null;
  knowledgeLevel?: string | null;
  placementStatus?: string | null;
}

export interface PlacementDrive {
  id: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    website?: string | null;
    hqLocation?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    description?: string | null;
  };
  title: string;
  jobRole: string;
  jobDescription?: string | null;
  responsibilities?: string | null;
  requiredSkills: string[];
  qualifications?: string | null;
  experienceRequired?: string | null;
  employmentType: string;
  location?: string | null;
  vacancies?: number | null;
  ctcMin?: number | null;
  ctcMax?: number | null;
  monthlySalary?: number | null;
  stipend?: number | null;
  benefits?: string | null;
  selectionProcess?: string | null;
  minCgpa?: number | null;
  maxBacklogs?: number | null;
  registrationDeadline?: string | null;
  registrationClosedAt?: string | null;
  registrationCloseReason?: string | null;
  status: 'draft' | 'published' | 'active' | 'closed' | 'cancelled' | 'withdrawn' | 'archived';
  rounds: DriveRound[];
  duplicateOverrideReason?: string | null;
  conflictOverrideReason?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  withdrawnAt?: string | null;
  withdrawnBy?: string | null;
  withdrawalReason?: string | null;
  archivedAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  eligibleBranches: Array<{ id: number; name: string }>;
  eligibleBatches: Array<{ id: number; name: string; graduationYear?: number }>;
  applicantCount: number;
  myEligibility?: {
    eligible: boolean;
    reasons: string[];
    missingProfileInfo: string[];
  };
  registrationOpen?: boolean;
  registrationClosedReason?: string | null;
  myApplication?: DriveApplication | null;
  checklist?: Array<{ field: string; label: string; ok: boolean }>;
}

export const drivesApi = {
  getAll: (status?: string) =>
    api.get<{ data: PlacementDrive[] }>('/drives', { params: { status } }).then((r) => r.data.data),
  getById: (id: string) =>
    api.get<{ data: PlacementDrive }>(`/drives/${id}`).then((r) => r.data.data),
  create: (data: any) =>
    api.post<{ data: PlacementDrive }>('/drives', data).then((r) => r.data.data),
  update: (id: string, data: any) =>
    api.put<{ data: PlacementDrive }>(`/drives/${id}`, data).then((r) => r.data.data),
  publish: (id: string) =>
    api.post<{ data: PlacementDrive }>(`/drives/${id}/publish`).then((r) => r.data.data),
  cancel: (id: string, reason: string) =>
    api.post<{ data: PlacementDrive }>(`/drives/${id}/cancel`, { reason }).then((r) => r.data.data),
  withdraw: (id: string, reason: string) =>
    api.post<{ data: PlacementDrive }>(`/drives/${id}/withdraw`, { reason }).then((r) => r.data.data),
  archive: (id: string) =>
    api.delete(`/drives/${id}`).then((r) => r.data),
  restore: (id: string) =>
    api.post<{ data: PlacementDrive }>(`/drives/${id}/restore`).then((r) => r.data.data),
  getChecklist: (id: string) =>
    api.get<{ data: any[] }>(`/drives/${id}/checklist`).then((r) => r.data.data),
  getEligibleStudents: (id: string) =>
    api.get<{ data: any }>(`/drives/${id}/eligible-students`).then((r) => r.data.data),
  apply: (id: string, overrideReason?: string, resumeVersionId?: string) =>
    api.post<{ data: DriveApplication }>(`/drives/${id}/apply`, {
      eligibilityOverrideReason: overrideReason,
      resumeVersionId,
    }).then((r) => r.data.data),
  withdrawApplication: (id: string, withdrawalReason?: string) =>
    api.post<{ data: DriveApplication }>(`/drives/${id}/withdraw-application`, { withdrawalReason }).then((r) => r.data.data),
  getApplications: (id: string) =>
    api.get<{ data: DriveApplication[] }>(`/drives/${id}/applications`).then((r) => r.data.data),
  updateApplicationStatus: (id: string, applicationId: string, status: string, overrideReason?: string) =>
    api.patch<{ data: DriveApplication }>(`/drives/${id}/applications/${applicationId}`, { status, eligibilityOverrideReason: overrideReason }).then((r) => r.data.data),
  getNotificationPrefs: () =>
    api.get<{ data: { driveAlerts: boolean; deadlineReminders: boolean; trainingReminders?: boolean } }>('/students/me/notification-preferences').then((r) => r.data.data),
  updateNotificationPrefs: (prefs: { driveAlerts?: boolean; deadlineReminders?: boolean; trainingReminders?: boolean }) =>
    api.put<{ data: any }>('/students/me/notification-preferences', prefs).then((r) => r.data.data),
};

