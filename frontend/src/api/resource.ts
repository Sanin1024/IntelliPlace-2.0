import api from './client';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  topicId: number | null;
  createdAt: string;
  topic: { id: number; name: string } | null;
  uploader: { id: string; name: string };
}

export const resourceApi = {
  getAll: (params?: { topicId?: number; search?: string }) =>
    api.get<{ data: Resource[] }>('/resources', { params }).then(r => r.data.data),
  upload: (formData: FormData) =>
    api.post<{ data: Resource }>('/resources', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data),
  delete: (id: string) =>
    api.delete(`/resources/${id}`),
};