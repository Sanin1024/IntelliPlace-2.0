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

export interface UserListParams {
  search?: string;
  role?: string;
  batch?: string;
  department?: string;
  section?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUsersResponse {
  data: AdminUser[];
  meta: {
    page: number;
    totalPages: number;
    total: number;
    limit?: number;
  };
}

export const userApi = {
  getAll: (params?: { 
    search?: string; 
    role?: string; 
    batch?: string; 
    department?: string; 
    section?: string;
    page?: number; 
    limit?: number; 
  }) =>
    api.get<{ data: AdminUser[]; meta: any }>('/admin/users', { params }).then(r => r.data),
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

export interface SystemSetting {
  key: string;
  value: string;
  updatedBy: string;
  updatedAt: string;
}

export interface BulkImportStudentRow {
  name: string;
  email: string;
  universityId?: string;
  branchName: string;
  batchName: string;
  admissionYear?: number;
  cgpa?: number;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; email: string; error: string }>;
}

export const adminManagementApi = {
  getSettings: () => api.get<{ data: SystemSetting[] }>('/admin/settings').then((r) => r.data.data),
  updateSetting: (key: string, value: string) =>
    api.put<{ data: { key: string; value: string } }>('/admin/settings', { key, value }).then((r) => r.data.data),
  bulkImportStudents: (students: BulkImportStudentRow[]) =>
    api.post<{ data: BulkImportResult }>('/admin/students/bulk-import', { students }).then((r) => r.data.data),
  softDeleteEntity: (entity: 'user' | 'company' | 'drive', id: string) =>
    api.delete(`/admin/${entity}/${id}`).then((r) => r.data),
  restoreEntity: (entity: 'user' | 'company' | 'drive', id: string) =>
    api.post(`/admin/${entity}/${id}/restore`).then((r) => r.data),
};