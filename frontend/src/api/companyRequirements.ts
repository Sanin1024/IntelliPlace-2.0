import api from './client';

export type DatasetApprovalStatus =
  | 'NOT_GENERATED'
  | 'GENERATED'
  | 'INCOMPLETE'
  | 'UNDER_REVIEW'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'SHARED'
  | 'REVOKED';

export interface FieldCatalogItem {
  key: string;
  section: string;
  label: string;
  isMandatory: boolean;
}

export interface FieldCatalogResponse {
  fields: FieldCatalogItem[];
  sections: string[];
}

export interface RequestedFieldConfig {
  fieldKey: string;
  label: string;
  customColumnName?: string;
  order: number;
  required?: boolean;
}

export interface RequirementTemplate {
  id: string;
  name: string;
  description?: string;
  fields: RequestedFieldConfig[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlacementDriveRequirement {
  id: string;
  driveId: string;
  templateId?: string;
  fields: RequestedFieldConfig[];
  updatedAt: string;
  template?: RequirementTemplate;
  drive?: {
    id: string;
    title: string;
    companyId: string;
    company?: { id: string; name: string };
  };
}

export interface GeneratedDatasetRecord {
  studentId: string;
  studentName: string;
  ktuid: string;
  isVerified: boolean;
  fields: Record<string, any>;
  missingFields: string[];
  isComplete: boolean;
}

export interface GeneratedPlacementDataset {
  id: string;
  requirementId: string;
  driveId: string;
  version: number;
  status: DatasetApprovalStatus;
  scope: string;
  totalStudents: number;
  completeCount: number;
  missingCount: number;
  data: GeneratedDatasetRecord[];
  reviewComments?: string;
  reviewedById?: string;
  reviewedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  createdAt: string;
  drive?: {
    id: string;
    title: string;
    company?: { id: string; name: string };
  };
  requirement?: PlacementDriveRequirement;
  reviewer?: { id: string; name: string };
  approver?: { id: string; name: string };
  exportHistory?: Array<{
    id: string;
    format: string;
    exportedAt: string;
    sharedWith?: string;
  }>;
}

export const companyRequirementsApi = {
  // Field Catalog
  getFieldCatalog: async (): Promise<FieldCatalogResponse> => {
    const res = await api.get('/company-requirements/catalog');
    return res.data.data;
  },

  // Requirement Templates
  createTemplate: async (data: {
    name: string;
    description?: string;
    fields: RequestedFieldConfig[];
  }): Promise<RequirementTemplate> => {
    const res = await api.post('/company-requirements/templates', data);
    return res.data.data;
  },

  listTemplates: async (): Promise<RequirementTemplate[]> => {
    const res = await api.get('/company-requirements/templates');
    return res.data.data;
  },

  getTemplate: async (id: string): Promise<RequirementTemplate> => {
    const res = await api.get(`/company-requirements/templates/${id}`);
    return res.data.data;
  },

  // Placement Drive Requirements Configuration
  configureDriveRequirements: async (
    driveId: string,
    data: { templateId?: string; fields: RequestedFieldConfig[] }
  ): Promise<PlacementDriveRequirement> => {
    const res = await api.post(`/company-requirements/drives/${driveId}`, data);
    return res.data.data;
  },

  getDriveRequirements: async (driveId: string): Promise<PlacementDriveRequirement> => {
    const res = await api.get(`/company-requirements/drives/${driveId}`);
    return res.data.data;
  },

  // Dataset Generation & Review
  generateDataset: async (
    driveId: string,
    scope: 'applied_students' | 'eligible_pool' = 'applied_students'
  ): Promise<GeneratedPlacementDataset> => {
    const res = await api.post(`/company-requirements/drives/${driveId}/generate`, { scope });
    return res.data.data;
  },

  listDriveDatasets: async (driveId: string): Promise<GeneratedPlacementDataset[]> => {
    const res = await api.get(`/company-requirements/drives/${driveId}/datasets`);
    return res.data.data;
  },

  getDataset: async (datasetId: string): Promise<GeneratedPlacementDataset> => {
    const res = await api.get(`/company-requirements/datasets/${datasetId}`);
    return res.data.data;
  },

  reviewDataset: async (
    datasetId: string,
    action: {
      status: 'APPROVED' | 'REVISION_REQUIRED' | 'UNDER_REVIEW' | 'REVOKED';
      comments?: string;
    }
  ): Promise<GeneratedPlacementDataset> => {
    const res = await api.post(`/company-requirements/datasets/${datasetId}/review`, action);
    return res.data.data;
  },

  // Export Download Helper
  downloadDatasetExport: async (datasetId: string, format: 'xlsx' | 'csv' | 'pdf', sharedWith?: string) => {
    const res = await api.get(`/company-requirements/datasets/${datasetId}/export`, {
      params: { format, sharedWith },
      responseType: 'blob',
    });
    return res.data;
  },
};

export default companyRequirementsApi;

