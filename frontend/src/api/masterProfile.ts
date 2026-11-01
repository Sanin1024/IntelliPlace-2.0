import api from './client';

export type ProfileVerificationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REVISION_REQUIRED';

export interface CompletionMetrics {
  percentage: number;
  isComplete: boolean;
  missingFields: string[];
  missingSections: string[];
}

export interface StudentTechnicalSkill {
  id: string;
  category: string;
  name: string;
  proficiency: string;
}

export interface StudentProject {
  id: string;
  title: string;
  description: string;
  domain?: string;
  technologies: string[];
  duration?: string;
  isTeam: boolean;
  contribution?: string;
  projectUrl?: string;
  githubUrl?: string;
}

export interface StudentInternship {
  id: string;
  organization: string;
  role: string;
  type: string;
  startDate: string;
  endDate?: string;
  durationMonths?: number;
  responsibilities?: string;
  technologies: string[];
  certificateUrl?: string;
}

export interface StudentCertification {
  id: string;
  title: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  certificateUrl?: string;
}

export interface StudentDocument {
  id: string;
  type: string;
  title: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

export interface VerificationHistoryEntry {
  id: string;
  status: ProfileVerificationStatus;
  comments?: string;
  createdAt: string;
  officer?: { id: string; name: string; role: string };
}

export interface StudentMasterProfileData {
  userId: string;
  ktuid?: string;
  universityId?: string;
  currentSemester?: number;
  cgpa?: number;
  entryType: string;
  admissionYear?: number;
  graduatingBatch?: string;
  academicScheme: string;
  tenthSchool?: string;
  tenthBoard?: string;
  tenthYear?: number;
  tenthPercentage?: number;
  twelfthSchool?: string;
  twelfthBoard?: string;
  twelfthStream?: string;
  twelfthYear?: number;
  twelfthPercentage?: number;
  hasDiploma: boolean;
  diplomaInstitution?: string;
  diplomaBranch?: string;
  diplomaYear?: number;
  diplomaPercentage?: number;
  activeBacklogs: number;
  historicalBacklogs: number;
  clearedBacklogs: number;
  hasAcademicGaps: boolean;
  gapDurationMonths?: number;
  gapReason?: string;
  personalEmail?: string;
  phone?: string;
  alternatePhone?: string;
  residentialAddress?: string;
  permanentAddress?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  careerInterests: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  internshipNotApplicable: boolean;
  masterStatus: ProfileVerificationStatus;
  completionPercentage: number;
  completionMetrics?: CompletionMetrics;
  submittedAt?: string;
  verifiedAt?: string;
  verificationComments?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  branch?: { id: number; name: string; code: string };
  batch?: { id: number; name: string; graduationYear: number };
  technicalSkills?: StudentTechnicalSkill[];
  projects?: StudentProject[];
  internships?: StudentInternship[];
  certifications?: StudentCertification[];
  documents?: StudentDocument[];
  masterVerificationHistory?: VerificationHistoryEntry[];
}

export const masterProfileApi = {
  // Student endpoints
  getMyMasterProfile: async (): Promise<StudentMasterProfileData> => {
    const res = await api.get('/master-profile/me');
    return res.data.data;
  },

  updateMyMasterProfile: async (data: Partial<StudentMasterProfileData>): Promise<StudentMasterProfileData> => {
    const res = await api.put('/master-profile/me', data);
    return res.data.data;
  },

  submitMyMasterProfile: async (): Promise<StudentMasterProfileData> => {
    const res = await api.post('/master-profile/me/submit');
    return res.data.data;
  },

  addSkill: async (skill: Partial<StudentTechnicalSkill>) => {
    const res = await api.post('/master-profile/skills', skill);
    return res.data.data;
  },

  deleteSkill: async (id: string) => {
    const res = await api.delete(`/master-profile/skills/${id}`);
    return res.data;
  },

  addProject: async (project: Partial<StudentProject>) => {
    const res = await api.post('/master-profile/projects', project);
    return res.data.data;
  },

  deleteProject: async (id: string) => {
    const res = await api.delete(`/master-profile/projects/${id}`);
    return res.data;
  },

  addInternship: async (internship: Partial<StudentInternship>) => {
    const res = await api.post('/master-profile/internships', internship);
    return res.data.data;
  },

  deleteInternship: async (id: string) => {
    const res = await api.delete(`/master-profile/internships/${id}`);
    return res.data;
  },

  addCertification: async (cert: Partial<StudentCertification>) => {
    const res = await api.post('/master-profile/certifications', cert);
    return res.data.data;
  },

  deleteCertification: async (id: string) => {
    const res = await api.delete(`/master-profile/certifications/${id}`);
    return res.data;
  },

  addDocument: async (doc: Partial<StudentDocument>) => {
    const res = await api.post('/master-profile/documents', doc);
    return res.data.data;
  },

  deleteDocument: async (id: string) => {
    const res = await api.delete(`/master-profile/documents/${id}`);
    return res.data;
  },

  // Placement Officer / Admin Verification Queue
  getVerificationQueue: async (params?: {
    status?: string;
    branchId?: number;
    batchId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/master-profile/verification/queue', { params });
    return res.data.data;
  },

  getProfileForVerification: async (studentId: string): Promise<StudentMasterProfileData> => {
    const res = await api.get(`/master-profile/verification/${studentId}`);
    return res.data.data;
  },

  verifyProfile: async (
    studentId: string,
    action: { status: 'VERIFIED' | 'REVISION_REQUIRED' | 'UNDER_REVIEW'; comments?: string }
  ) => {
    const res = await api.post(`/master-profile/verification/${studentId}`, action);
    return res.data.data;
  },
};

export default masterProfileApi;

