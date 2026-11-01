import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';

export interface MasterFieldDefinition {
  key: string;
  section:
    | 'personal'
    | 'academic'
    | 'qualifications'
    | 'backlogs'
    | 'skills'
    | 'projects'
    | 'internships'
    | 'certifications'
    | 'professional'
    | 'documents';
  label: string;
  isMandatory: boolean;
  extractor: (profile: any) => any;
}

/**
 * Complete Field Registry mapping all supported student master profile attributes (Sections A - J).
 * Used for dynamic dataset extraction, field validation, and company requirement configuration.
 */
export const MASTER_PROFILE_FIELDS: Record<string, MasterFieldDefinition> = {
  // Section A: Personal Information
  fullName: {
    key: 'fullName',
    section: 'personal',
    label: 'Full Name',
    isMandatory: true,
    extractor: (p) => p.user?.name || '',
  },
  universityId: {
    key: 'universityId',
    section: 'personal',
    label: 'University Reg Number',
    isMandatory: false,
    extractor: (p) => p.universityId || p.ktuid || '',
  },
  ktuid: {
    key: 'ktuid',
    section: 'personal',
    label: 'KTU Register Number (KTUID)',
    isMandatory: true,
    extractor: (p) => p.ktuid || '',
  },
  dob: {
    key: 'dob',
    section: 'personal',
    label: 'Date of Birth',
    isMandatory: false,
    extractor: (p) => (p.dob ? new Date(p.dob).toISOString().split('T')[0] : ''),
  },
  gender: {
    key: 'gender',
    section: 'personal',
    label: 'Gender',
    isMandatory: false,
    extractor: (p) => p.gender || '',
  },
  personalEmail: {
    key: 'personalEmail',
    section: 'personal',
    label: 'Personal Email',
    isMandatory: true,
    extractor: (p) => p.personalEmail || p.user?.email || '',
  },
  collegeEmail: {
    key: 'collegeEmail',
    section: 'personal',
    label: 'College Email',
    isMandatory: false,
    extractor: (p) => p.collegeEmail || p.user?.email || '',
  },
  phone: {
    key: 'phone',
    section: 'personal',
    label: 'Primary Mobile Number',
    isMandatory: true,
    extractor: (p) => p.phone || '',
  },
  alternatePhone: {
    key: 'alternatePhone',
    section: 'personal',
    label: 'Alternate Mobile Number',
    isMandatory: false,
    extractor: (p) => p.alternatePhone || '',
  },
  residentialAddress: {
    key: 'residentialAddress',
    section: 'personal',
    label: 'Current Address',
    isMandatory: false,
    extractor: (p) => p.residentialAddress || '',
  },
  permanentAddress: {
    key: 'permanentAddress',
    section: 'personal',
    label: 'Permanent Address',
    isMandatory: false,
    extractor: (p) => p.permanentAddress || '',
  },
  city: {
    key: 'city',
    section: 'personal',
    label: 'City',
    isMandatory: false,
    extractor: (p) => p.city || '',
  },
  district: {
    key: 'district',
    section: 'personal',
    label: 'District',
    isMandatory: false,
    extractor: (p) => p.district || '',
  },
  state: {
    key: 'state',
    section: 'personal',
    label: 'State',
    isMandatory: false,
    extractor: (p) => p.state || '',
  },
  pincode: {
    key: 'pincode',
    section: 'personal',
    label: 'PIN Code',
    isMandatory: false,
    extractor: (p) => p.pincode || '',
  },
  photoUrl: {
    key: 'photoUrl',
    section: 'personal',
    label: 'Photograph URL',
    isMandatory: false,
    extractor: (p) => p.photoUrl || '',
  },

  // Section B: Academic Information
  collegeName: {
    key: 'collegeName',
    section: 'academic',
    label: 'College Name',
    isMandatory: true,
    extractor: (p) => p.collegeName || 'LBS College of Engineering, Kasaragod',
  },
  universityAffiliation: {
    key: 'universityAffiliation',
    section: 'academic',
    label: 'University Affiliation',
    isMandatory: true,
    extractor: (p) => p.universityAffiliation || 'APJ Abdul Kalam Technological University',
  },
  degree: {
    key: 'degree',
    section: 'academic',
    label: 'Degree',
    isMandatory: true,
    extractor: (p) => p.degree || 'B.Tech',
  },
  department: {
    key: 'department',
    section: 'academic',
    label: 'Department / Branch',
    isMandatory: true,
    extractor: (p) => p.branch?.name || '',
  },
  branch: {
    key: 'branch',
    section: 'academic',
    label: 'Branch / Specialization',
    isMandatory: false,
    extractor: (p) => p.branch?.name || '',
  },
  departmentCode: {
    key: 'departmentCode',
    section: 'academic',
    label: 'Department Code',
    isMandatory: true,
    extractor: (p) => p.branch?.code || '',
  },
  admissionYear: {
    key: 'admissionYear',
    section: 'academic',
    label: 'Admission Year',
    isMandatory: true,
    extractor: (p) => p.admissionYear ?? '',
  },
  expectedGraduationYear: {
    key: 'expectedGraduationYear',
    section: 'academic',
    label: 'Expected Graduation Year',
    isMandatory: true,
    extractor: (p) => p.graduatingBatch || (p.batch?.graduationYear ? String(p.batch.graduationYear) : ''),
  },
  currentSemester: {
    key: 'currentSemester',
    section: 'academic',
    label: 'Current Semester',
    isMandatory: true,
    extractor: (p) => p.currentSemester ?? '',
  },
  currentCgpa: {
    key: 'currentCgpa',
    section: 'academic',
    label: 'Current CGPA',
    isMandatory: true,
    extractor: (p) => (p.cgpa != null ? Number(p.cgpa) : ''),
  },
  overallPercentage: {
    key: 'overallPercentage',
    section: 'academic',
    label: 'Overall Percentage',
    isMandatory: false,
    extractor: (p) => (p.overallPercentage != null ? Number(p.overallPercentage) : p.cgpa != null ? Number((p.cgpa * 10).toFixed(1)) : ''),
  },
  academicStatus: {
    key: 'academicStatus',
    section: 'academic',
    label: 'Academic Verification Status',
    isMandatory: false,
    extractor: (p) => p.academicStatus || 'pending',
  },

  // Section C: Previous Educational Qualifications
  tenthSchool: {
    key: 'tenthSchool',
    section: 'qualifications',
    label: '10th School Name',
    isMandatory: true,
    extractor: (p) => p.tenthSchool || '',
  },
  tenthBoard: {
    key: 'tenthBoard',
    section: 'qualifications',
    label: '10th Board',
    isMandatory: true,
    extractor: (p) => p.tenthBoard || '',
  },
  tenthYear: {
    key: 'tenthYear',
    section: 'qualifications',
    label: '10th Passing Year',
    isMandatory: true,
    extractor: (p) => p.tenthYear ?? '',
  },
  tenthPercentage: {
    key: 'tenthPercentage',
    section: 'qualifications',
    label: '10th Percentage / CGPA',
    isMandatory: true,
    extractor: (p) => (p.tenthPercentage != null ? Number(p.tenthPercentage) : ''),
  },
  twelfthSchool: {
    key: 'twelfthSchool',
    section: 'qualifications',
    label: '12th School Name',
    isMandatory: false, // Optional if student came through Diploma lateral entry
    extractor: (p) => p.twelfthSchool || '',
  },
  twelfthBoard: {
    key: 'twelfthBoard',
    section: 'qualifications',
    label: '12th Board',
    isMandatory: false,
    extractor: (p) => p.twelfthBoard || '',
  },
  twelfthStream: {
    key: 'twelfthStream',
    section: 'qualifications',
    label: '12th Stream',
    isMandatory: false,
    extractor: (p) => p.twelfthStream || '',
  },
  twelfthYear: {
    key: 'twelfthYear',
    section: 'qualifications',
    label: '12th Passing Year',
    isMandatory: false,
    extractor: (p) => p.twelfthYear ?? '',
  },
  twelfthPercentage: {
    key: 'twelfthPercentage',
    section: 'qualifications',
    label: '12th Percentage / CGPA',
    isMandatory: false,
    extractor: (p) => (p.twelfthPercentage != null ? Number(p.twelfthPercentage) : ''),
  },
  diplomaInstitution: {
    key: 'diplomaInstitution',
    section: 'qualifications',
    label: 'Diploma Institution',
    isMandatory: false,
    extractor: (p) => p.diplomaInstitution || '',
  },
  diplomaBranch: {
    key: 'diplomaBranch',
    section: 'qualifications',
    label: 'Diploma Branch',
    isMandatory: false,
    extractor: (p) => p.diplomaBranch || '',
  },
  diplomaYear: {
    key: 'diplomaYear',
    section: 'qualifications',
    label: 'Diploma Passing Year',
    isMandatory: false,
    extractor: (p) => p.diplomaYear ?? '',
  },
  diplomaPercentage: {
    key: 'diplomaPercentage',
    section: 'qualifications',
    label: 'Diploma Percentage',
    isMandatory: false,
    extractor: (p) => (p.diplomaPercentage != null ? Number(p.diplomaPercentage) : ''),
  },

  // Section D: Academic Backlog & Gap Information
  activeBacklogs: {
    key: 'activeBacklogs',
    section: 'backlogs',
    label: 'Active Backlog Count',
    isMandatory: true,
    extractor: (p) => p.activeBacklogs ?? 0,
  },
  historicalBacklogs: {
    key: 'historicalBacklogs',
    section: 'backlogs',
    label: 'Historical Backlogs',
    isMandatory: false,
    extractor: (p) => p.historicalBacklogs ?? 0,
  },
  clearedBacklogs: {
    key: 'clearedBacklogs',
    section: 'backlogs',
    label: 'Cleared Backlogs',
    isMandatory: false,
    extractor: (p) => p.clearedBacklogs ?? 0,
  },
  academicGaps: {
    key: 'academicGaps',
    section: 'backlogs',
    label: 'Academic Gaps',
    isMandatory: false,
    extractor: (p) => (p.hasAcademicGaps ? `${p.gapDurationMonths || 0} months (${p.gapReason || 'Reason provided'})` : 'None'),
  },

  // Section E: Technical Skills
  programmingLanguages: {
    key: 'programmingLanguages',
    section: 'skills',
    label: 'Programming Languages',
    isMandatory: false,
    extractor: (p) => {
      const skills = (p.technicalSkills || []).filter((s: any) => s.category === 'programming_language').map((s: any) => s.name);
      return skills.length > 0 ? skills.join(', ') : '';
    },
  },
  frameworks: {
    key: 'frameworks',
    section: 'skills',
    label: 'Frameworks & Libraries',
    isMandatory: false,
    extractor: (p) => {
      const skills = (p.technicalSkills || []).filter((s: any) => ['framework', 'library'].includes(s.category)).map((s: any) => s.name);
      return skills.length > 0 ? skills.join(', ') : '';
    },
  },
  databases: {
    key: 'databases',
    section: 'skills',
    label: 'Databases',
    isMandatory: false,
    extractor: (p) => {
      const skills = (p.technicalSkills || []).filter((s: any) => s.category === 'database').map((s: any) => s.name);
      return skills.length > 0 ? skills.join(', ') : '';
    },
  },
  allTechnicalSkills: {
    key: 'allTechnicalSkills',
    section: 'skills',
    label: 'All Technical Skills',
    isMandatory: false,
    extractor: (p) => {
      const skills = (p.technicalSkills || []).map((s: any) => s.name);
      return skills.length > 0 ? skills.join(', ') : '';
    },
  },

  // Section F: Projects
  projectsSummary: {
    key: 'projectsSummary',
    section: 'projects',
    label: 'Projects',
    isMandatory: false,
    extractor: (p) => {
      const projects = p.projects || [];
      return projects.map((proj: any) => `${proj.title} (${proj.technologies?.join(', ') || 'N/A'})`).join(' | ');
    },
  },

  // Section G: Internship and Work Experience
  internshipExperience: {
    key: 'internshipExperience',
    section: 'internships',
    label: 'Internship / Work Experience',
    isMandatory: false,
    extractor: (p) => {
      if (p.internshipNotApplicable) return 'Not Applicable';
      const internships = p.internships || [];
      return internships.map((i: any) => `${i.role} at ${i.organization} (${i.durationMonths || 0} mos)`).join(' | ');
    },
  },

  // Section H: Certifications
  certificationsList: {
    key: 'certificationsList',
    section: 'certifications',
    label: 'Certifications',
    isMandatory: false,
    extractor: (p) => {
      const certs = p.certifications || [];
      return certs.map((c: any) => `${c.title} (${c.issuer})`).join(', ');
    },
  },

  // Section I: Professional Information
  careerInterests: {
    key: 'careerInterests',
    section: 'professional',
    label: 'Career Interests',
    isMandatory: false,
    extractor: (p) => (p.careerInterests || []).join(', '),
  },
  preferredRoles: {
    key: 'preferredRoles',
    section: 'professional',
    label: 'Preferred Job Roles',
    isMandatory: false,
    extractor: (p) => (p.preferredRoles || []).join(', '),
  },
  githubUrl: {
    key: 'githubUrl',
    section: 'professional',
    label: 'GitHub Profile',
    isMandatory: false,
    extractor: (p) => p.githubUrl || '',
  },
  linkedinUrl: {
    key: 'linkedinUrl',
    section: 'professional',
    label: 'LinkedIn Profile',
    isMandatory: false,
    extractor: (p) => p.linkedinUrl || '',
  },
  portfolioUrl: {
    key: 'portfolioUrl',
    section: 'professional',
    label: 'Portfolio Website',
    isMandatory: false,
    extractor: (p) => p.portfolioUrl || '',
  },

  // Section J: Resume & Documents
  resumeUrl: {
    key: 'resumeUrl',
    section: 'documents',
    label: 'Latest Resume URL',
    isMandatory: true,
    extractor: (p) => p.resumeUrl || p.documents?.find((d: any) => d.type === 'resume')?.fileUrl || '',
  },
};

/**
 * Calculates student master profile completion metrics and identifies missing required fields.
 */
export function calculateProfileCompletion(profile: any): {
  percentage: number;
  isComplete: boolean;
  missingFields: string[];
  missingSections: string[];
} {
  const missingFields: string[] = [];
  const sectionMissingMap: Record<string, boolean> = {};

  // 1. Check Mandatory Fields
  for (const field of Object.values(MASTER_PROFILE_FIELDS)) {
    if (!field.isMandatory) continue;

    // Conditional bypass for 12th if lateral diploma is verified
    if (field.key === 'twelfthSchool' || field.key === 'twelfthPercentage') {
      if (profile.hasDiploma && profile.diplomaInstitution && profile.diplomaPercentage) {
        continue;
      }
    }

    const val = field.extractor(profile);
    const isEmpty = val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
    if (isEmpty) {
      missingFields.push(field.label);
      sectionMissingMap[field.section] = true;
    }
  }

  // 2. Section F: Projects requires at least one project entry
  if (!profile.projects || profile.projects.length === 0) {
    if (!missingFields.includes('Projects')) {
      missingFields.push('Projects');
      sectionMissingMap['projects'] = true;
    }
  }

  // 3. Section E: Technical Skills requires at least one skill entry
  if (!profile.technicalSkills || profile.technicalSkills.length === 0) {
    if (!missingFields.includes('Technical Skills')) {
      missingFields.push('Technical Skills');
      sectionMissingMap['skills'] = true;
    }
  }

  // 4. Section G: Internship check (must have entries or explicit not applicable flag)
  if (!profile.internshipNotApplicable && (!profile.internships || profile.internships.length === 0)) {
    missingFields.push('Internships (or mark as Not Applicable)');
    sectionMissingMap['internships'] = true;
  }

  const totalChecks = 16;
  const passedChecks = Math.max(0, totalChecks - missingFields.length);
  const percentage = Math.round((passedChecks / totalChecks) * 100);

  return {
    percentage,
    isComplete: missingFields.length === 0,
    missingFields,
    missingSections: Object.keys(sectionMissingMap),
  };
}

/**
 * Fetch full Student Master Profile with all relational child sections.
 */
export async function getStudentMasterProfile(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
      branch: true,
      batch: true,
      technicalSkills: { orderBy: { createdAt: 'desc' } },
      projects: { orderBy: { createdAt: 'desc' } },
      internships: { orderBy: { createdAt: 'desc' } },
      certifications: { orderBy: { createdAt: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      masterVerificationHistory: {
        orderBy: { createdAt: 'desc' },
        include: { officer: { select: { id: true, name: true, role: true } } },
      },
      verifier: { select: { id: true, name: true, role: true } },
    },
  });

  if (!profile) throw ApiError.notFound('Student master profile not found.');

  const completion = calculateProfileCompletion(profile);

  return {
    ...profile,
    completionMetrics: completion,
  };
}

/**
 * Save / Update student master profile draft or sections.
 */
export async function updateStudentMasterProfile(userId: string, data: any) {
  const current = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      technicalSkills: true,
      projects: true,
      internships: true,
      certifications: true,
      documents: true,
      branch: true,
      batch: true,
    },
  });

  if (!current) throw ApiError.notFound('Student profile not found.');

  // If already VERIFIED and core academic/identity fields change, require re-verification
  let nextStatus = current.masterStatus;
  const isVerified = current.masterStatus === 'VERIFIED';
  const academicFieldsChanged =
    data.cgpa !== undefined && data.cgpa !== current.cgpa ||
    data.activeBacklogs !== undefined && data.activeBacklogs !== current.activeBacklogs ||
    data.tenthPercentage !== undefined && data.tenthPercentage !== current.tenthPercentage;

  if (isVerified && academicFieldsChanged) {
    nextStatus = 'REVISION_REQUIRED';
  } else if (current.masterStatus === 'NOT_STARTED') {
    nextStatus = 'IN_PROGRESS';
  }

  // Update base profile fields
  const updated = await prisma.studentProfile.update({
    where: { userId },
    data: {
      masterStatus: nextStatus,
      dob: data.dob ? new Date(data.dob) : undefined,
      gender: data.gender,
      personalEmail: data.personalEmail,
      collegeEmail: data.collegeEmail,
      phone: data.phone,
      alternatePhone: data.alternatePhone,
      residentialAddress: data.residentialAddress,
      permanentAddress: data.permanentAddress,
      city: data.city,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
      photoUrl: data.photoUrl,

      collegeName: data.collegeName,
      universityAffiliation: data.universityAffiliation,
      degree: data.degree,
      overallPercentage: data.overallPercentage != null ? Number(data.overallPercentage) : undefined,
      cgpa: data.cgpa != null ? Number(data.cgpa) : undefined,
      currentSemester: data.currentSemester != null ? Number(data.currentSemester) : undefined,

      tenthSchool: data.tenthSchool,
      tenthBoard: data.tenthBoard,
      tenthYear: data.tenthYear != null ? Number(data.tenthYear) : undefined,
      tenthPercentage: data.tenthPercentage != null ? Number(data.tenthPercentage) : undefined,

      twelfthSchool: data.twelfthSchool,
      twelfthBoard: data.twelfthBoard,
      twelfthStream: data.twelfthStream,
      twelfthYear: data.twelfthYear != null ? Number(data.twelfthYear) : undefined,
      twelfthPercentage: data.twelfthPercentage != null ? Number(data.twelfthPercentage) : undefined,

      hasDiploma: data.hasDiploma,
      diplomaInstitution: data.diplomaInstitution,
      diplomaBranch: data.diplomaBranch,
      diplomaYear: data.diplomaYear != null ? Number(data.diplomaYear) : undefined,
      diplomaPercentage: data.diplomaPercentage != null ? Number(data.diplomaPercentage) : undefined,

      activeBacklogs: data.activeBacklogs != null ? Number(data.activeBacklogs) : undefined,
      historicalBacklogs: data.historicalBacklogs != null ? Number(data.historicalBacklogs) : undefined,
      clearedBacklogs: data.clearedBacklogs != null ? Number(data.clearedBacklogs) : undefined,
      hasAcademicGaps: data.hasAcademicGaps,
      gapDurationMonths: data.gapDurationMonths != null ? Number(data.gapDurationMonths) : undefined,
      gapReason: data.gapReason,

      internshipNotApplicable: data.internshipNotApplicable,
      careerInterests: data.careerInterests,
      preferredRoles: data.preferredRoles,
      preferredDomains: data.preferredDomains,
      preferredLocations: data.preferredLocations,
      willingToRelocate: data.willingToRelocate,
      githubUrl: data.githubUrl,
      linkedinUrl: data.linkedinUrl,
      portfolioUrl: data.portfolioUrl,
      resumeUrl: data.resumeUrl,
    },
    include: {
      technicalSkills: true,
      projects: true,
      internships: true,
      certifications: true,
      documents: true,
      branch: true,
      batch: true,
    },
  });

  // Calculate and persist new completion percentage
  const metrics = calculateProfileCompletion(updated);
  await prisma.studentProfile.update({
    where: { userId },
    data: { completionPercentage: metrics.percentage },
  });

  return { ...updated, completionPercentage: metrics.percentage, completionMetrics: metrics };
}

/**
 * Submit Master Profile for Placement Training Officer Review.
 */
export async function submitStudentMasterProfile(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      technicalSkills: true,
      projects: true,
      internships: true,
      certifications: true,
      documents: true,
      branch: true,
      batch: true,
    },
  });

  if (!profile) throw ApiError.notFound('Student master profile not found.');

  const metrics = calculateProfileCompletion(profile);
  if (!metrics.isComplete) {
    throw ApiError.badRequest(
      `Cannot submit incomplete profile (${metrics.percentage}% complete). Missing required items: ${metrics.missingFields.join(', ')}`,
      metrics.missingFields
    );
  }

  const updated = await prisma.studentProfile.update({
    where: { userId },
    data: {
      masterStatus: 'SUBMITTED',
      submittedAt: new Date(),
      completionPercentage: 100,
    },
  });

  await audit(userId, 'student.master_profile_submitted', 'student_profile', userId, 'success', {
    completionPercentage: 100,
  });

  return updated;
}

/**
 * Placement Training Officer Review & Verification Action.
 */
export async function reviewStudentMasterProfile(
  officerId: string,
  studentId: string,
  action: {
    status: 'VERIFIED' | 'REVISION_REQUIRED' | 'UNDER_REVIEW';
    comments?: string;
    sectionApprovals?: Record<string, boolean>;
  }
) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
  });

  if (!profile) throw ApiError.notFound('Student profile not found.');

  const isApproval = action.status === 'VERIFIED';

  const updated = await prisma.studentProfile.update({
    where: { userId: studentId },
    data: {
      masterStatus: action.status,
      verifiedBy: isApproval ? officerId : profile.verifiedBy,
      verifiedAt: isApproval ? new Date() : undefined,
      verificationComments: action.comments || null,
      cgpaVerified: isApproval ? true : profile.cgpaVerified,
    },
  });

  // Log in verification history
  await prisma.studentProfileVerificationHistory.create({
    data: {
      studentId,
      status: action.status,
      officerId,
      comments: action.comments,
      sections: action.sectionApprovals || {},
    },
  });

  await audit(officerId, 'officer.profile_verification', 'student_profile', studentId, 'success', {
    status: action.status,
    comments: action.comments,
  });

  return updated;
}

/**
 * List Student Profiles with verification filters for Placement Training Officers.
 */
export async function getProfilesForVerification(filters: {
  status?: string;
  branchId?: number;
  batchId?: number;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {
    user: { role: 'student', isActive: true, deletedAt: null },
    ...(filters.status && { masterStatus: filters.status }),
    ...(filters.branchId && { branchId: filters.branchId }),
    ...(filters.batchId && { batchId: filters.batchId }),
    ...(filters.search && {
      OR: [
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { ktuid: { contains: filters.search, mode: 'insensitive' } },
        { universityId: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, profiles] = await Promise.all([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, graduationYear: true } },
        verifier: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    profiles,
  };
}
