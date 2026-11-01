import api from './client';

export const eeeTrainingApi = {
  getQuestions: (params?: any) => api.get('/eee-training/questions', { params }).then(r => r.data.data),
  getPracticalAssessments: () => api.get('/eee-training/practical-assessments').then(r => r.data.data),
  submitPractical: (assessmentId: string, formData: FormData) => api.post(`/eee-training/practical-assessments/${assessmentId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data.data),
  getCompanies: (params?: any) => api.get('/eee-training/companies', { params }).then(r => r.data.data),
  getCompanyById: (id: string) => api.get(`/eee-training/companies/${id}`).then(r => r.data.data),
  getDashboard: () => api.get('/eee-training/me/dashboard').then(r => r.data.data),
};

export default eeeTrainingApi;

