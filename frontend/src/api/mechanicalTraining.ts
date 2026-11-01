import api from './client';

export const mechTrainingApi = {
  // Career Tracks
  getCareerTracks: () => api.get('/mechanical-training/career-tracks').then(r => r.data.data),
  enrollInTrack: (trackId: string) => api.post(`/mechanical-training/career-tracks/${trackId}/enroll`).then(r => r.data.data),
  getMyCareerTracks: () => api.get('/mechanical-training/me/career-tracks').then(r => r.data.data),

  // Subjects
  getSubjects: () => api.get('/mechanical-training/subjects').then(r => r.data.data),

  // Questions
  getQuestions: (params?: any) => api.get('/mechanical-training/questions', { params }).then(r => r.data.data),

  // Projects
  getProjects: (params?: any) => api.get('/mechanical-training/projects', { params }).then(r => r.data.data),
  submitProject: (projectId: string, formData: FormData) => api.post(`/mechanical-training/projects/${projectId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data.data),

  // Practical Assessments
  getPracticalAssessments: () => api.get('/mechanical-training/practical-assessments').then(r => r.data.data),
  submitPractical: (assessmentId: string, formData: FormData) => api.post(`/mechanical-training/practical-assessments/${assessmentId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data.data),

  // Companies
  getCompanies: (params?: any) => api.get('/mechanical-training/companies', { params }).then(r => r.data.data),
  getCompanyById: (id: string) => api.get(`/mechanical-training/companies/${id}`).then(r => r.data.data),

  // Mock Interviews
  getMyMockInterviews: () => api.get('/mechanical-training/me/mock-interviews').then(r => r.data.data),

  // Software
  getSoftware: (params?: any) => api.get('/mechanical-training/software', { params }).then(r => r.data.data),

  // Dashboard
  getDashboard: () => api.get('/mechanical-training/me/dashboard').then(r => r.data.data),
};

export default mechTrainingApi;

