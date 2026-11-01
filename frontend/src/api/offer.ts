import api from './client';

export interface OfferHistoryItem {
  id: string;
  offerId: string;
  action: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  actorId: string;
  details?: any;
  createdAt: string;
}

export interface OfferItem {
  id: string;
  studentId: string;
  companyId: string;
  driveId?: string | null;
  applicationId?: string | null;
  jobRole: string;
  employmentType: string;
  offerDate: string;
  joiningDate?: string | null;
  acceptanceDeadline?: string | null;
  ctc?: number | null;
  fixedSalary?: number | null;
  variablePay?: number | null;
  monthlySalary?: number | null;
  stipend?: number | null;
  currency: string;
  offerLetterUrl?: string | null;
  offerRefNumber?: string | null;
  source: string;
  status: 'issued' | 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired' | 'revoked';
  isVerified: boolean;
  rejectionReason?: string | null;
  withdrawalReason?: string | null;
  company: {
    id: string;
    name: string;
    hqLocation?: string | null;
    website?: string | null;
  };
  drive?: {
    id: string;
    title: string;
  } | null;
  history: OfferHistoryItem[];
}

export const offerApi = {
  getMyOffers: () =>
    api.get<{ success: boolean; data: OfferItem[] }>('/offers/my-offers').then((r) => r.data.data),

  submitOffCampus: (data: {
    companyId: string;
    jobRole: string;
    employmentType: string;
    offerDate?: string;
    joiningDate?: string;
    ctc?: number;
    fixedSalary?: number;
    variablePay?: number;
    monthlySalary?: number;
    stipend?: number;
    currency?: string;
    offerLetterUrl?: string;
    offerRefNumber?: string;
  }) => api.post<{ success: boolean; data: OfferItem }>('/offers/off-campus', data).then((r) => r.data.data),

  decide: (id: string, action: 'accepted' | 'rejected', reason?: string) =>
    api.post<{ success: boolean; data: OfferItem }>(`/offers/${id}/decide`, { action, reason }).then((r) => r.data.data),

  getStats: (params?: { branchId?: number; batchId?: number }) =>
    api.get<{ success: boolean; data: any }>('/offers/stats', { params }).then((r) => r.data.data),
};

