import { prisma } from '../config/prisma.js';

// ============================================================
// PRECISION UTILITIES (Challenge 36)
// ============================================================
/**
 * All CGPA arithmetic is done in integer hundredths to avoid
 * floating-point drift (0.1 + 0.2 !== 0.3). One rounding rule
 * everywhere: half-up at 2 decimal places.
 */
export const toHundredths = (x: number): number => Math.round(x * 100);
export const round2 = (x: number): number => Math.round(x * 100) / 100;

export interface CgpaComputation {
  cgpa: number | null;
  conclusive: boolean;
  computedFrom: number;
  totalCredits: number | null;
  missingSemesters: number[];
  method: 'credit_weighted' | 'simple_average' | 'none';
}

export function computeCgpaPreciseFromResults(
  results: any[],
  admissionYear?: number | null
): CgpaComputation {
  if (!results || results.length === 0) {
    return {
      cgpa: null,
      conclusive: false,
      computedFrom: 0,
      totalCredits: null,
      missingSemesters: [],
      method: 'none',
    };
  }

  // Validate ranges defensively (0.0 to 10.0)
  const valid = results
    .map((r: any) => ({
      ...r,
      resolvedSgpa: r.sgpa ?? r.gpa,
      resolvedCredits: r.credits ?? (r.creditsEarned != null ? Number(r.creditsEarned) : null),
    }))
    .filter((r: any) => r.resolvedSgpa !== null && r.resolvedSgpa >= 0 && r.resolvedSgpa <= 10);

  if (valid.length === 0) {
    return {
      cgpa: null,
      conclusive: false,
      computedFrom: 0,
      totalCredits: null,
      missingSemesters: [],
      method: 'none',
    };
  }

  let cgpa: number;
  let totalCredits: number | null = null;
  let method: CgpaComputation['method'];

  const creditRows = valid.filter((r: any) => r.resolvedCredits != null && r.resolvedCredits > 0);
  if (creditRows.length === valid.length && creditRows.length > 0) {
    // Credit-weighted, integer-scaled: Σ(sgpa×100 × credits×10) / Σ(credits×10)
    const totalPoints = creditRows.reduce(
      (s: number, r: any) => s + toHundredths(r.resolvedSgpa) * Math.round(r.resolvedCredits * 10),
      0
    );
    const totalWeight = creditRows.reduce(
      (s: number, r: any) => s + Math.round(r.resolvedCredits * 10),
      0
    );
    cgpa = round2(totalPoints / totalWeight / 100);
    totalCredits = round2(creditRows.reduce((s: number, r: any) => s + r.resolvedCredits, 0));
    method = 'credit_weighted';
  } else {
    const totalHundredths = valid.reduce(
      (s: number, r: any) => s + toHundredths(r.resolvedSgpa),
      0
    );
    cgpa = round2(totalHundredths / valid.length / 100);
    method = 'simple_average';
  }

  // Missing-semester detection (never zero-filled — Module 2, Ch 26)
  const maxHave = Math.max(...valid.map((r: any) => r.semesterNumber || 0));
  const effectiveExpected = admissionYear
    ? Math.min(8, Math.max(0, (new Date().getFullYear() - admissionYear) * 2))
    : maxHave;

  const have = new Set(valid.map((r: any) => r.semesterNumber));
  const missingSemesters: number[] = [];
  for (let s = 1; s <= effectiveExpected; s++) {
    if (!have.has(s)) missingSemesters.push(s);
  }

  return {
    cgpa,
    conclusive: missingSemesters.length === 0,
    computedFrom: valid.length,
    totalCredits,
    missingSemesters,
    method,
  };
}

/**
 * SINGLE application-wide CGPA calculation (Challenge 36).
 * Uses ONLY published + verified semester results (Module 2 policy).
 */
export async function computeCgpaPrecise(studentId: string): Promise<CgpaComputation> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { admissionYear: true },
  });

  const results = await prisma.semesterResult.findMany({
    where: {
      studentId,
      status: 'published',
      OR: [
        { sgpa: { not: null } },
        { gpa: { not: null } },
      ],
    },
  });

  return computeCgpaPreciseFromResults(results, profile?.admissionYear);
}

// ============================================================
// CGPA → PERCENTAGE CONVERSION (Challenge 44)
// ============================================================
export type PercentageFormula = 'cgpa_x_9.5' | 'cgpa_x_10' | 'minus_0.75_x_10';

export const FORMULA_DESCRIPTIONS: Record<PercentageFormula, string> = {
  'cgpa_x_9.5': 'Percentage = CGPA × 9.5 (CBSE-style)',
  'cgpa_x_10': 'Percentage = CGPA × 10 (simple 10-point scale)',
  'minus_0.75_x_10': 'Percentage = (CGPA − 0.75) × 10 (VTU-style)',
};

export async function getPercentageFormula(): Promise<{ formula: PercentageFormula; description: string }> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'PERCENTAGE_FORMULA' } });
  const formula = (setting?.value as PercentageFormula) || 'cgpa_x_9.5';
  return { formula, description: FORMULA_DESCRIPTIONS[formula] || FORMULA_DESCRIPTIONS['cgpa_x_9.5'] };
}

export function convertCgpaToPercentage(cgpa: number, formula: PercentageFormula): number {
  let pct: number;
  switch (formula) {
    case 'cgpa_x_10':
      pct = cgpa * 10;
      break;
    case 'minus_0.75_x_10':
      pct = (cgpa - 0.75) * 10;
      break;
    case 'cgpa_x_9.5':
    default:
      pct = cgpa * 9.5;
      break;
  }
  return round2(Math.max(0, Math.min(100, pct)));
}
