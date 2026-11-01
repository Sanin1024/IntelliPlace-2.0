import api from './client';

export const itTrainingApi = {
  getQuestions: (params?: any) => api.get('/it-training/questions', { params }).then(r => r.data.data),
  getPracticalAssessments: () => api.get('/it-training/practical-assessments').then(r => r.data.data),
  submitPractical: (assessmentId: string, formData: FormData) => api.post(`/it-training/practical-assessments/${assessmentId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data.data),
  getCompanies: (params?: any) => api.get('/it-training/companies', { params }).then(r => r.data.data),
  getCompanyById: (id: string) => api.get(`/it-training/companies/${id}`).then(r => r.data.data),
  getDashboard: () => api.get('/it-training/me/dashboard').then(r => r.data.data),
};

export default itTrainingApi;

