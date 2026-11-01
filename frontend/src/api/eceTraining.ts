import api from './client';

export const eceTrainingApi = {
  getQuestions: (params?: any) => api.get('/ece-training/questions', { params }).then(r => r.data.data),
  createQuestion: (data: any) => api.post('/ece-training/questions', data).then(r => r.data.data),
  getPracticalAssessments: (params?: any) => api.get('/ece-training/practical-assessments', { params }).then(r => r.data.data),
  getCompanies: (params?: any) => api.get('/ece-training/companies', { params }).then(r => r.data.data),
  getCompanyById: (id: string) => api.get(`/ece-training/companies/${id}`).then(r => r.data.data),
  getDashboard: () => api.get('/ece-training/me/dashboard').then(r => r.data.data),
};

export default eceTrainingApi;

