import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

// APJKTU 2019 Scheme Department Codes for LBS College of Engineering, Kasaragod
export const DEPARTMENT_MAP: Record<string, { name: string; validFromYear?: number }> = {
  CS: { name: 'Computer Science and Engineering' },
  ME: { name: 'Mechanical Engineering' },
  CE: { name: 'Civil Engineering' },
  EC: { name: 'Electronics and Communication Engineering' },
  EE: { name: 'Electrical and Electronics Engineering' },
  IT: { name: 'Information Technology' },
  CSBS: { name: 'Computer Science and Business Systems', validFromYear: 2024 },
  CAID: { name: 'Artificial Intelligence and Data Science', validFromYear: 2024 },
};

export interface ParsedKTUID {
  isLateral: boolean;
  collegeCode: string;
  admissionYear: number;
  departmentCode: string;
  departmentName: string;
  studentNumber: string;
  fullKTUID: string;
}

/**
 * Validates and parses a KTU Register Number (KTUID) for LBS College of Engineering.
 * Format: [Optional L][KSD][YY][DEPT_CODE][STUDENT_NUMBER]
 * Examples: KSD23CS007, LKSD23CS134, KSD24CAID049
 */
export function parseKTUID(ktuid: string): ParsedKTUID {
  if (!ktuid) throw ApiError.badRequest('KTUID is required.');

  const normalized = ktuid.toUpperCase().trim();

  // Regex: ^(L?)(KSD)(\d{2})(CSBS|CAID|CS|ME|CE|EC|EE|IT)(\d{3,4})$
  // Note: CSBS and CAID must be matched before CS to prevent partial prefix matches.
  const regex = /^(L?)(KSD)(\d{2})(CSBS|CAID|CS|ME|CE|EC|EE|IT)(\d{3,4})$/;
  const match = normalized.match(regex);

  if (!match) {
    throw ApiError.badRequest(
      `Invalid KTUID format: ${ktuid}. Expected format: KSDYYDEPT### (e.g., KSD23CS007) or LKSDYYDEPT### for lateral entry.`
    );
  }

  const [, lateralPrefix, collegeCode, yearStr, deptCode, studentNum] = match;
  const isLateral = lateralPrefix === 'L';
  const admissionYear = 2000 + parseInt(yearStr, 10);

  const deptInfo = DEPARTMENT_MAP[deptCode];
  if (!deptInfo) {
    throw ApiError.badRequest(`Unknown department code in KTUID: ${deptCode}`);
  }

  // Validate department introduction year (e.g., CSBS & CAID available from 2024)
  if (deptInfo.validFromYear && admissionYear < deptInfo.validFromYear) {
    throw ApiError.badRequest(
      `Department ${deptInfo.name} (${deptCode}) is only available from ${deptInfo.validFromYear} admission batch onwards.`
    );
  }

  return {
    isLateral,
    collegeCode,
    admissionYear,
    departmentCode: deptCode,
    departmentName: deptInfo.name,
    studentNumber: studentNum,
    fullKTUID: normalized,
  };
}

/**
 * Validates KTUID against the database for uniqueness and consistency.
 */
export async function validateAndParseKTUID(ktuid: string, providedBranchId?: number) {
  const parsed = parseKTUID(ktuid);

  // Check if branch exists in DB
  const branch = await prisma.branch.findFirst({
    where: {
      OR: [
        { code: parsed.departmentCode },
        { name: parsed.departmentCode },
        { name: parsed.departmentName },
      ],
    },
  });

  if (!branch) {
    throw ApiError.badRequest(
      `Department ${parsed.departmentName} (${parsed.departmentCode}) is not configured in the system.`
    );
  }

  // If branchId is provided during registration, ensure it matches the KTUID
  if (providedBranchId && providedBranchId !== branch.id) {
    throw ApiError.badRequest(
      `KTUID department (${parsed.departmentCode}) does not match the selected department.`
    );
  }

  // Check for duplicate KTUID
  const existing = await prisma.studentProfile.findFirst({
    where: { ktuid: parsed.fullKTUID },
  });
  if (existing) {
    throw ApiError.conflict(`Student with KTUID ${parsed.fullKTUID} is already registered.`);
  }

  // Calculate graduating batch (4 years for regular, 3 years for lateral entry)
  const gradYear = parsed.isLateral ? parsed.admissionYear + 3 : parsed.admissionYear + 4;
  const graduatingBatch = String(gradYear);

  return {
    ...parsed,
    branchId: branch.id,
    graduatingBatch,
  };
}
