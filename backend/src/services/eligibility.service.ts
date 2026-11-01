/**
 * SINGLE SOURCE OF TRUTH for eligibility.
 * Used by: student drive listing, eligible-student preview, and the
 * apply endpoint (server-side enforcement). Never duplicated in frontend
 * logic beyond display of the reasons returned here.
 */

export interface DriveEligibilityData {
  status: string;
  minCgpa: number | null;
  maxBacklogs: number | null;
  registrationDeadline: Date | null;
  registrationClosedAt: Date | null;
  eligibleBranches: Array<{ branchId: number; branch?: { name: string } }>;
  eligibleBatches: Array<{ batchId: number; batch?: { name: string } }>;
}

export interface StudentEligibilityData {
  cgpa?: number | null;
  branchId?: number | null;
  batchId?: number | null;
  branch?: { name: string } | null;
  batch?: { name: string } | null;
  activeBacklogs?: number | null;
  cgpaVerified?: boolean;
  academicStatus?: string;
  isProfileComplete?: boolean;
  missingFields?: string[];
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];          // Hard ineligibility reasons (shown to student)
  missingProfileInfo: string[]; // Actionable profile gaps (Challenge 3)
}

export function evaluateEligibility(
  drive: DriveEligibilityData,
  profile: StudentEligibilityData | null
): EligibilityResult {
  const reasons: string[] = [];
  const missing: string[] = [];

  if (!profile) {
    return { eligible: false, reasons: ['Student profile not found'], missingProfileInfo: [] };
  }

  // CGPA (missing CGPA = actionable gap, not silent exclusion)
  if (drive.minCgpa != null) {
    if (profile.cgpa == null) {
      missing.push(`CGPA not set on your profile (this drive requires ${drive.minCgpa}+) — update your profile`);
    } else if (profile.cgpa < drive.minCgpa) {
      reasons.push(`CGPA ${profile.cgpa} is below the required ${drive.minCgpa}`);
    }
  }

  // Branch
  if (drive.eligibleBranches.length > 0) {
    if (profile.branchId == null) {
      missing.push('Branch not set on your profile — update your profile');
    } else if (!drive.eligibleBranches.some((eb) => eb.branchId === profile.branchId)) {
      const names = drive.eligibleBranches.map((eb) => eb.branch?.name).filter(Boolean).join(', ');
      reasons.push(`Your branch is not eligible for this drive (allowed: ${names})`);
    }
  }

  // Batch / graduation year
  if (drive.eligibleBatches.length > 0) {
    if (profile.batchId == null) {
      missing.push('Batch not set on your profile — update your profile');
    } else if (!drive.eligibleBatches.some((eb) => eb.batchId === profile.batchId)) {
      const names = drive.eligibleBatches.map((eb) => eb.batch?.name).filter(Boolean).join(', ');
      reasons.push(`Your batch is not eligible for this drive (allowed: ${names})`);
    }
  }

  // Backlogs (Challenge 27: Backlog criteria enforcement)
  if (drive.maxBacklogs != null && profile.activeBacklogs != null) {
    if (profile.activeBacklogs > drive.maxBacklogs) {
      reasons.push(
        `You have ${profile.activeBacklogs} active backlog(s), which exceeds the drive limit of ${drive.maxBacklogs}`
      );
    }
  }

  // Profile completeness (Challenge 33: Placement required fields gate)
  if (profile.isProfileComplete === false && profile.missingFields && profile.missingFields.length > 0) {
    for (const f of profile.missingFields) {
      missing.push(`Required profile field not completed: ${f}`);
    }
  }

  return {
    eligible: reasons.length === 0 && missing.length === 0,
    reasons,
    missingProfileInfo: missing,
  };
}

/**
 * Registration open check (Challenges 7, 19).
 * Compares against the server clock only — never a client-supplied time.
 */
export function checkRegistrationOpen(
  drive: {
    status: string;
    registrationDeadline: Date | null;
    registrationClosedAt: Date | null;
    registrationCloseReason: string | null;
    vacancies: number | null;
  },
  activeApplicantCount: number
): { open: boolean; reason: string | null } {
  if (['cancelled', 'withdrawn', 'archived', 'closed'].includes(drive.status)) {
    return { open: false, reason: drive.status };
  }
  if (drive.status !== 'published' && drive.status !== 'active') {
    return { open: false, reason: 'not_published' };
  }
  if (drive.registrationClosedAt) {
    return { open: false, reason: drive.registrationCloseReason || 'closed' };
  }
  if (drive.registrationDeadline && drive.registrationDeadline.getTime() <= Date.now()) {
    return { open: false, reason: 'deadline' };
  }
  if (drive.vacancies != null && activeApplicantCount >= drive.vacancies) {
    return { open: false, reason: 'capacity_full' };
  }
  return { open: true, reason: null };
}

/**
 * Publication readiness checklist (Challenges 2, 16).
 * Includes contradiction checks so invalid eligibility can never publish.
 */
export function getPublicationChecklist(drive: {
  companyId: string | null;
  title: string | null;
  jobRole: string | null;
  jobDescription: string | null;
  vacancies: number | null;
  eligibleBranches: unknown[];
  eligibleBatches: unknown[];
  registrationDeadline: Date | null;
  ctcMax: number | null;
  monthlySalary: number | null;
  stipend: number | null;
  rounds: unknown;
  minCgpa: number | null;
  maxBacklogs: number | null;
}) {
  const roundsArr = Array.isArray(drive.rounds) ? (drive.rounds as any[]) : [];
  return [
    { field: 'companyId',      label: 'Company linked',                 ok: !!drive.companyId },
    { field: 'title',          label: 'Drive title',                    ok: !!drive.title },
    { field: 'jobRole',        label: 'Job role',                       ok: !!drive.jobRole },
    { field: 'jobDescription', label: 'Job description',                ok: !!drive.jobDescription },
    { field: 'vacancies',      label: 'Vacancies (> 0)',                ok: drive.vacancies != null && drive.vacancies > 0 },
    { field: 'branches',       label: 'At least one eligible branch',   ok: drive.eligibleBranches.length > 0 },
    { field: 'batches',        label: 'At least one eligible batch',    ok: drive.eligibleBatches.length > 0 },
    { field: 'deadline',       label: 'Future registration deadline',   ok: drive.registrationDeadline != null && drive.registrationDeadline.getTime() > Date.now() },
    { field: 'compensation',   label: 'Compensation (CTC / salary / stipend)', ok: drive.ctcMax != null || drive.monthlySalary != null || drive.stipend != null },
    { field: 'rounds',         label: 'At least one recruitment round', ok: roundsArr.length > 0 },
    // Contradiction / sanity checks (Challenge 2):
    { field: 'cgpaValid',      label: 'Min CGPA within 0–10',           ok: drive.minCgpa == null || (drive.minCgpa >= 0 && drive.minCgpa <= 10) },
    { field: 'backlogsValid',  label: 'Max backlogs ≥ 0',               ok: drive.maxBacklogs == null || drive.maxBacklogs >= 0 },
  ];
}

/** Status transition state machine (Challenges 9, 16, 19). */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft:     ['published'],
  published: ['active', 'closed', 'cancelled', 'withdrawn', 'draft'],
  active:    ['closed', 'cancelled', 'withdrawn'],
  closed:    ['archived'],
  cancelled: ['archived'],
  withdrawn: ['archived'],
  archived:  ['draft'], // admin restore only
};

export function isTransitionAllowed(from: string, to: string): boolean {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

