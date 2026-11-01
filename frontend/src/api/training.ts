import api from './client';

export const trainingApi = {
  // New Training Resource Hub & Discovery
  getResources: (params?: any) => api.get('/training/resources', { params }).then(r => r.data.data),
  getDashboard: () => api.get('/training/dashboard').then(r => r.data.data),
  toggleBookmark: (resourceId: string) => api.post(`/training/resources/${resourceId}/bookmark`).then(r => r.data.data),
  updateProgress: (resourceId: string, body: any) => api.patch(`/training/resources/${resourceId}/progress`, body).then(r => r.data.data),
  ingestResources: (resources: any[]) => api.post('/training/ingest', { resources }).then(r => r.data.data),

  // Student Schedule & Learning Modules
  mySchedule: () => api.get('/training/my-schedule').then(r => r.data.data),
  completeAssignment: (assignmentId: string) => 
    api.patch(`/training/assignments/${assignmentId}/status`, { status: 'completed' }).then(r => r.data.data),
  myRecommendations: () => api.get('/training/learning/my-recommendations').then(r => r.data.data),
  myCompetencies: (studentId?: string) => 
    api.get(studentId ? `/training/learning/competencies/${studentId}` : '/training/learning/my-competencies').then(r => r.data.data),
  enroll: (moduleId: string) => api.post(`/training/learning/modules/${moduleId}/enroll`).then(r => r.data.data),
  evaluate: (moduleId: string) => api.post(`/training/learning/modules/${moduleId}/evaluate`).then(r => r.data.data),
  getModules: (params?: any) => api.get('/training/learning/modules', { params }).then(r => r.data.data),

  // Trainer / Admin Session & Module Management
  createSession: (body: any) => api.post('/training/sessions', body).then(r => r.data.data),
  assignStudents: (sessionId: string, body: any) => api.post(`/training/sessions/${sessionId}/assign`, body).then(r => r.data.data),
  reschedule: (sessionId: string, newScheduledAt: string | any, reason?: string) => 
    api.post(`/training/sessions/${sessionId}/reschedule`, typeof newScheduledAt === 'string' ? { newScheduledAt, reason } : newScheduledAt).then(r => r.data.data),
  cancelSession: (sessionId: string) => api.post(`/training/sessions/${sessionId}/cancel`).then(r => r.data.data),
  adherence: (params?: any) => api.get('/training/adherence', { params }).then(r => r.data.data),
  grantPrereqException: (moduleId: string, studentIdOrBody: any, reason?: string) => 
    api.post(`/training/learning/modules/${moduleId}/prereq-exception`, typeof studentIdOrBody === 'string' ? { studentId: studentIdOrBody, reason } : studentIdOrBody).then(r => r.data.data),
  trainerVerifyModule: (moduleId: string, studentId: string, passedOrBody: any, note?: string) => 
    api.patch(`/training/learning/modules/${moduleId}/verify/${studentId}`, typeof passedOrBody === 'boolean' ? { passed: passedOrBody, note } : passedOrBody).then(r => r.data.data),

  // Resource Files & Video
  checkDuplicate: (body: any) => api.post('/training/resources/check-duplicate', body).then(r => r.data.data),
  downloadUrl: (resourceId: string) => `/api/training/resources/${resourceId}/download`,
  getVideoProgress: (resourceId: string) => api.get(`/training/resources/${resourceId}/video-progress`).then(r => r.data.data),
  saveVideoProgress: (resourceId: string, body: any) => api.put(`/training/resources/${resourceId}/video-progress`, body).then(r => r.data.data),

  // Training Analytics
  effectiveness: (params?: any) => api.get('/training/analytics/effectiveness', { params }).then(r => r.data.data),
  contentRelevance: (params?: any) => api.get('/training/analytics/content-relevance', { params }).then(r => r.data.data),
};
export default trainingApi;
