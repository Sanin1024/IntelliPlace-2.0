import api from './client';

export type ConsentType = 'placement_sharing' | 'marketing_communications' | 'data_processing';
export type DataRequestType = 'correction' | 'deletion' | 'data_export';
export type DataRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface ConsentRecord {
  id: string;
  studentId: string;
  type: ConsentType;
  isGranted: boolean;
  grantedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataRequest {
  id: string;
  studentId: string;
  type: DataRequestType;
  details: string;
  status: DataRequestStatus;
  resolution?: string | null;
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataAccessLog {
  id: string;
  actorId: string;
  targetUserId: string;
  resourceType: string;
  action: string;
  requestId?: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
}

export const privacyApi = {
  // Challenge 329: Consent management
  getMyConsents: () =>
    api.get<{ success: boolean; data: ConsentRecord[] }>('/privacy/me/consents').then((r) => r.data.data),

  updateConsent: (type: ConsentType, isGranted: boolean) =>
    api.put<{ success: boolean; data: ConsentRecord }>('/privacy/me/consents', { type, isGranted }).then((r) => r.data.data),

  // Challenge 331: Data subject requests
  getMyDataRequests: () =>
    api.get<{ success: boolean; data: DataRequest[] }>('/privacy/me/data-requests').then((r) => r.data.data),

  createDataRequest: (data: { type: DataRequestType; details: string }) =>
    api.post<{ success: boolean; data: DataRequest }>('/privacy/me/data-requests', data).then((r) => r.data.data),

  // Challenge 333: Access transparency
  getMyAccessLogs: () =>
    api.get<{ success: boolean; data: DataAccessLog[] }>('/privacy/me/access-logs').then((r) => r.data.data),
};
