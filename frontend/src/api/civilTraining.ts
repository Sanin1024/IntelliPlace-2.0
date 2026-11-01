import api from './client';

export const civilTrainingApi = {
  getQuestions: (params?: any) => api.get('/civil-training/questions', { params }).then(r => r.data.data),
  getCompanies: (params?: any) => api.get('/civil-training/companies', { params }).then(r => r.data.data),
  getCompanyById: (id: string) => api.get(`/civil-training/companies/${id}`).then(r => r.data.data),
  getDashboard: () => api.get('/civil-training/me/dashboard').then(r => r.data.data),
};

export default civilTrainingApi;

