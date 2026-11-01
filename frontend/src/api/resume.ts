import api from './client';

export interface ResumeData {
  summary: string | null;
  education: Array<{ institution: string; degree: string; year: string; score?: string }> | null;
  skills: string[];
  projects: Array<{ title: string; description: string; techStack?: string; link?: string }> | null;
  links: Array<{ label: string; url: string }> | null;
}

export const resumeApi = {
  get: () =>
    api.get<{ data: ResumeData | null }>('/students/me/resume-data').then(r => r.data.data),
  save: (data: ResumeData) =>
    api.put<{ data: ResumeData }>('/students/me/resume-data', data).then(r => r.data.data),
  getPdfUrl: () => `${api.defaults.baseURL}/students/me/resume.pdf`,
};