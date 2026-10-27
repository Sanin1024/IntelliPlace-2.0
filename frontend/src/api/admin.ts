import api from './client';
import type { Branch, Batch, AdminUser } from '../types';

export const branchApi = {
  getAll: () => api.get<{ data: Branch[] }>('/admin/branches').then(r => r.data.data),
  create: (data: { name: string }) => api.post<{ data: Branch }>('/admin/branches', data).then(r => r.data.data),
  update: (id: number, data: { name: string }) => api.put<{ data: Branch }>(`/admin/branches/${id}`, data).then(r => r.data.data),
  delete: (id: number) => api.delete(`/admin/branches/${id}`),
};

export const batchApi = {
  getAll: () => api.get<{ data: Batch[] }>('/admin/batches').then(r => r.data.data),
  create: (data: { name: string; graduationYear: number }) => api.post<{ data: Batch }>('/admin/batches', data).then(r => r.data.data),
  update: (id: number, data: { name: string; graduationYear: number }) => api.put<{ data: Batch }>(`/admin/batches/${id}`, data).then(r => r.data.data),
  delete: (id: number) => api.delete(`/admin/batches/${id}`),
};

export const userApi = {
  getAll: (params?: { role?: string }) =>
    api.get<{ data: AdminUser[] }>('/admin/users', { params }).then(r => r.data.data),
  create: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<{ data: AdminUser }>('/admin/users', data).then(r => r.data.data),
  toggleStatus: (id: string, isActive: boolean) =>
    api.patch<{ data: AdminUser }>(`/admin/users/${id}/toggle`, { isActive }).then(r => r.data.data),
};

export const publicApi = {
  getBranches: () => api.get<{ data: Branch[] }>('/public/branches').then(r => r.data.data),
  getBatches: () => api.get<{ data: Batch[] }>('/public/batches').then(r => r.data.data),
  getTopics: () => api.get<{ data: any[] }>('/public/topics').then(r => r.data.data),
};