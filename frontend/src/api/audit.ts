import api from './client';

export interface AuditLog {
  id: string;
  actorId: string;
  actor: { id: string; name: string; email: string; role: string };
  action: string;
  targetType: string;
  targetId: string | null;
  outcome: string;
  metadata: any;
  createdAt: string;
}

export const auditApi = {
  getLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
    outcome?: string;
    search?: string;
    from?: string;
    to?: string;
  }) =>
    api
      .get<{
        success: boolean;
        data: AuditLog[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>('/admin/audit-logs', { params })
      .then((r) => r.data),
  getActions: () =>
    api.get<{ data: string[] }>('/admin/audit-logs/actions').then((r) => r.data.data),
};

export const dashboardApi = {
  getStats: () =>
    api.get<{ data: any }>('/admin/dashboard-stats').then((r) => r.data.data),
};
