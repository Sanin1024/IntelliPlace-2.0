import { prisma } from '../config/prisma.js';

export interface CgpaComputationResult {
  conclusive: boolean;
  effectiveCgpa: number | null;
  computedCgpa: number | null;
  profileCgpa: number | null;
  publishedSemesters: number;
  totalSemestersRecorded: number;
  missingSemesters: number[];
  reasons: string[];
}

export interface CompletenessResult {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
  requiredFields: string[];
}

export interface FreshnessResult {
  isStale: boolean;
  daysSinceUpdate: number;
  lastUpdated: Date;
}

const DEFAULT_REQUIRED_FIELDS = [
  'universityId',
  'branchId',
  'batchId',
  'cgpa',
  'resumeUrl',
];

/**
 * Challenge 23 & 26: Verified-first, never-zero-filled CGPA calculation.
 * Computes credits-weighted GPA from published semester results.
 * If semesters are missing or unverified, conclusive = false.
 */
export async function computeCgpa(studentId: string): Promise<CgpaComputationResult> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: {
      cgpa: true,
      cgpaVerified: true,
      academicStatus: true,
      admissionYear: true,
    },
  });

  const semesters = await prisma.semesterResult.findMany({
    where: { studentId },
    orderBy: { semesterNumber: 'asc' },
  });

  const published = semesters.filter(
    (s: any) => s.status === 'published' && s.gpa !== null
  );

  const reasons: string[] = [];
  const missingSemesters: number[] = [];

  if (published.length === 0) {
    if (profile?.cgpa != null) {
      return {
        conclusive: false,
        effectiveCgpa: profile.cgpa,
        computedCgpa: null,
        profileCgpa: profile.cgpa,
        publishedSemesters: 0,
        totalSemestersRecorded: semesters.length,
        missingSemesters: [],
        reasons: ['No published semester results. Using self-reported CGPA (unverified).'],
      };
    }
    return {
      conclusive: false,
      effectiveCgpa: null,
      computedCgpa: null,
      profileCgpa: null,
      publishedSemesters: 0,
      totalSemestersRecorded: semesters.length,
      missingSemesters: [],
      reasons: ['No academic records or CGPA available.'],
    };
  }

  // Check sequence up to max published semester (never zero-fill missing semesters)
  const maxSem = Math.max(...published.map((s: any) => s.semesterNumber));
  const publishedSemNums = new Set(published.map((s: any) => s.semesterNumber));

  for (let sem = 1; sem <= maxSem; sem++) {
    if (!publishedSemNums.has(sem)) {
      missingSemesters.push(sem);
    }
  }

  if (missingSemesters.length > 0) {
    reasons.push(`Missing published results for semester(s): ${missingSemesters.join(', ')}.`);
  }

  // Calculate credits-weighted CGPA
  let totalWeighted = 0;
  let totalCredits = 0;
  let sumGpa = 0;

  for (const s of published) {
    const credits = s.creditsEarned ?? s.creditsAttempted ?? 0;
    if (credits > 0 && s.gpa !== null) {
      totalWeighted += s.gpa * credits;
      totalCredits += credits;
    }
    if (s.gpa !== null) {
      sumGpa += s.gpa;
    }
  }

  const computedRaw = totalCredits > 0
    ? totalWeighted / totalCredits
    : sumGpa / published.length;

  const computedCgpa = Math.round(computedRaw * 100) / 100;

  if (profile?.academicStatus !== 'verified') {
    reasons.push('Academic profile status is not verified by institution.');
  }

  const conclusive = missingSemesters.length === 0 && profile?.academicStatus === 'verified';
  const effectiveCgpa = profile?.cgpaVerified ? (profile.cgpa ?? computedCgpa) : computedCgpa;

  return {
    conclusive,
    effectiveCgpa,
    computedCgpa,
    profileCgpa: profile?.cgpa ?? null,
    publishedSemesters: published.length,
    totalSemestersRecorded: semesters.length,
    missingSemesters,
    reasons,
  };
}

/**
 * Challenge 27: Active backlog calculation.
 */
export async function getActiveBacklogs(studentId: string) {
  const records = await prisma.backlogRecord.findMany({
    where: { studentId },
    orderBy: { semester: 'asc' },
  });

  const activeRecords = records.filter((r: any) => r.status === 'active');
  const clearedRecords = records.filter((r: any) => r.status === 'cleared');

  return {
    activeCount: activeRecords.length,
    clearedCount: clearedRecords.length,
    allVerified: records.every((r: any) => r.isVerified),
    records,
  };
}

/**
 * Challenge 33: Profile completeness gate for drive application.
 * Reads configured PLACEMENT_REQUIRED_FIELDS or falls back to standard fields.
 */
export async function getProfileCompleteness(studentId: string): Promise<CompletenessResult> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
  });

  let requiredFields = DEFAULT_REQUIRED_FIELDS;
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'PLACEMENT_REQUIRED_FIELDS' },
    });
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        requiredFields = parsed;
      }
    }
  } catch {
    // Keep default
  }

  if (!profile) {
    return {
      isComplete: false,
      percentage: 0,
      missingFields: requiredFields,
      requiredFields,
    };
  }

  const missingFields: string[] = [];
  for (const field of requiredFields) {
    const val = (profile as any)[field];
    if (val === undefined || val === null || val === '') {
      missingFields.push(field);
    }
  }

  const filledCount = requiredFields.length - missingFields.length;
  const percentage = Math.round((filledCount / requiredFields.length) * 100);

  return {
    isComplete: missingFields.length === 0,
    percentage,
    missingFields,
    requiredFields,
  };
}

/**
 * Challenge 24: Profile freshness check (180-day staleness).
 */
export async function getProfileFreshness(studentId: string): Promise<FreshnessResult> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: {
      academicUpdatedAt: true,
      profileUpdatedAt: true,
      updatedAt: true,
    },
  });

  const lastUpdated = profile?.academicUpdatedAt || profile?.profileUpdatedAt || profile?.updatedAt || new Date();
  const diffMs = Date.now() - new Date(lastUpdated).getTime();
  const daysSinceUpdate = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const isStale = daysSinceUpdate > 180;

  return {
    isStale,
    daysSinceUpdate,
    lastUpdated: new Date(lastUpdated),
  };
}

/**
 * Challenge 22 & 35: Branch / Batch mapping & graduation year duration validation (2–6 years).
 */
export async function validateAcademicMapping(input: {
  branchId: number;
  batchId: number;
  admissionYear?: number;
}) {
  const [branch, batch] = await Promise.all([
    prisma.branch.findUnique({ where: { id: input.branchId } }),
    prisma.batch.findUnique({ where: { id: input.batchId } }),
  ]);

  if (!branch) {
    return { valid: false, error: `Branch with ID ${input.branchId} does not exist.` };
  }
  if (!batch) {
    return { valid: false, error: `Batch with ID ${input.batchId} does not exist.` };
  }

  if (input.admissionYear != null) {
    const currentYear = new Date().getFullYear();
    if (input.admissionYear < 2000 || input.admissionYear > currentYear + 1) {
      return { valid: false, error: `Admission year ${input.admissionYear} is invalid.` };
    }

    const duration = batch.graduationYear - input.admissionYear;
    if (duration < 2 || duration > 6) {
      return {
        valid: false,
        error: `Graduation year (${batch.graduationYear}) must be 2 to 6 years after admission year (${input.admissionYear}).`,
      };
    }
  }

  return { valid: true, branch, batch };
}

/**
 * Consolidated academic context for student eligibility evaluation.
 */
export async function getAcademicContext(studentId: string) {
  const [profile, cgpaInfo, backlogs, completeness, freshness] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: {
        branch: true,
        batch: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    computeCgpa(studentId),
    getActiveBacklogs(studentId),
    getProfileCompleteness(studentId),
    getProfileFreshness(studentId),
  ]);

  return {
    profile,
    cgpaInfo,
    backlogs,
    completeness,
    freshness,
  };
}

