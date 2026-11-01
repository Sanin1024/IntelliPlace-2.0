import api from './client';

export const recoApi = {
  mySkills: () => api.get('/reco/skills').then((r) => r.data.data),
  saveDeclaredSkills: (skills: Array<{ skill: string; declaredLevel: string }>) =>
    api.post('/reco/skills/declared', { skills }).then((r) => r.data.data),
  deleteDeclaredSkill: (skill: string) =>
    api.delete(`/reco/skills/declared/${encodeURIComponent(skill)}`).then((r) => r.data.data),
  careerGoal: () => api.get('/reco/career-goal').then((r) => r.data.data),
  setCareerGoal: (role: string) =>
    api.post('/reco/career-goal', { role }).then((r) => r.data.data),
  recommendations: () => api.get('/reco/recommendations').then((r) => r.data.data),
  dismissRecommendation: (resourceId: string) =>
    api.post(`/reco/recommendations/${resourceId}/dismiss`).then((r) => r.data.data),
  regenerateRecommendations: () => api.post('/reco/regenerate').then((r) => r.data.data),
  readiness: () => api.get('/reco/readiness').then((r) => r.data.data),
  readinessHistory: () => api.get('/reco/readiness/history').then((r) => r.data.data),
  growth: () => api.get('/reco/growth').then((r) => r.data.data),
  integrityFlags: (params?: { status?: string }) =>
    api.get('/reco/integrity-flags', { params }).then((r) => r.data.data),
  reviewIntegrityFlag: (id: string, status: 'reviewed' | 'dismissed', note?: string) =>
    api.patch(`/reco/integrity-flags/${id}`, { status, note }).then((r) => r.data.data),
  coverage: () => api.get('/reco/coverage').then((r) => r.data.data),
};

