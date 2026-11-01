import api from './client';

export interface ResumeVersionSummary {
  id: string;
  version: number;
  label: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  isActive: boolean;
  parseStatus: 'pending' | 'parsed' | 'failed' | 'needs_review';
  uploadedAt: string;
  applicationsCount: number;
  isLocked: boolean;
  privacyScan?: Array<{
    type: 'aadhaar' | 'pan' | 'address' | 'dob';
    severity: 'warning' | 'info';
    description: string;
    matchedSnippet?: string;
  }>;
}

export interface ResumeFreshnessInfo {
  hasActiveResume: boolean;
  isStale: boolean;
  daysSinceUpload: number | null;
  thresholdDays: number;
  uploadedAt: string | null;
  version?: number;
  label?: string;
  message?: string;
}

export interface SkillGapItem {
  skill: string;
  state: 'demonstrated' | 'declared_not_on_resume' | 'missing' | 'on_resume_unverified';
  drivesDemanding: number;
  driveTitles: string[];
  evidence?: any;
}

export interface DriveSkillMatch {
  driveId: string;
  driveTitle: string;
  companyName: string;
  requiredSkills: string[];
  matchedResumeSkills: string[];
  demonstratedSkills: string[];
  matchPercentage: number;
}

export interface SkillGapAnalysisResult {
  hasActiveResume: boolean;
  activeResumeVersionId?: string;
  activeResumeLabel?: string;
  resumeSkills: string[];
  declaredSkills: string[];
  demonstratedSkills: string[];
  categorizedSkills: SkillGapItem[];
  driveMatches: DriveSkillMatch[];
  recommendations: Array<{
    type: 'add_to_resume' | 'demonstrate_competency' | 'learn_skill';
    skill: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface StaleStudentResume {
  studentId: string;
  name: string;
  email: string;
  branch: string | null;
  batch: string | null;
  placementStatus: string;
  hasResume: boolean;
  daysSinceUpload: number | null;
  isStale: boolean;
  activeVersion?: {
    id: string;
    version: number;
    label: string;
    uploadedAt: string;
  } | null;
}

export const resumeManagerApi = {
  listMyResumes: () =>
    api.get<{ success: boolean; data: { versions: ResumeVersionSummary[]; freshness: ResumeFreshnessInfo } }>(
      '/resumes/versions'
    ).then((r) => r.data.data),

  uploadResume: (formData: FormData) =>
    api.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  activateVersion: (id: string) =>
    api.patch(`/resumes/${id}/activate`).then((r) => r.data),

  setLabel: (id: string, label: string) =>
    api.patch(`/resumes/${id}/label`, { label }).then((r) => r.data),

  getAnalysis: (id: string) =>
    api.get(`/resumes/${id}/analysis`).then((r) => r.data.data),

  getMyRecommendations: () =>
    api.get<{ success: boolean; data: SkillGapAnalysisResult }>('/resumes/recommendations').then((r) => r.data.data),

  confirmParsedData: (id: string, payload: { skills?: string[]; summary?: string; links?: any }) =>
    api.post(`/resumes/${id}/confirm-parsed`, payload).then((r) => r.data),

  downloadVersion: async (id: string, filename?: string) => {
    const res = await api.get(`/resumes/${id}/download`, { responseType: 'blob' });
    const contentType = (res.headers['content-type'] as string) || 'application/pdf';
    const url = window.URL.createObjectURL(new Blob([res.data], { type: contentType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'resume.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  generateShareLink: (id: string, expiresInDays: number = 7) =>
    api.post<{ success: boolean; data: { token: string; shareUrl: string; expiresAt: string }; message: string }>(
      `/resumes/${id}/link`,
      { expiresInDays }
    ).then((r) => r.data.data),

  getStaleResumes: () =>
    api.get<{
      success: boolean;
      data: {
        thresholdDays: number;
        totalStale: number;
        students: StaleStudentResume[];
      };
    }>('/resumes/stale-report').then((r) => r.data.data),

  remindStudent: (studentId: string) =>
    api.post<{ success: boolean; message: string }>(`/resumes/${studentId}/remind`).then((r) => r.data),
};
