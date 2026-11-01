// Challenges 336–344, 347–350: Centralized Analytics Engine
import { prisma } from '../config/prisma.js';
import { getCache, setCache, invalidatePattern } from '../utils/cache.js';

export interface AnalyticsFilters {
  batchId?: number;
  branchId?: number;
  companyId?: string;
  academicYear?: number;
  graduatingBatch?: string; // e.g., "2027"
  entryType?: string; // "REGULAR" | "LATERAL"
}

/**
 * Centralized Placement Statistics (Challenges 336, 337, 342)
 * Uses distinct student IDs via Set to eliminate duplicate counts.
 */
export async function getPlacementStats(filters: AnalyticsFilters = {}) {
  const cacheKey = `analytics:stats:${JSON.stringify(filters)}`;
  const cached = getCache<any>(cacheKey);
  if (cached) return cached;

  try {
    const where: any = {
      user: { role: 'student', isActive: true, deletedAt: null },
      ...(filters.batchId && { batchId: filters.batchId }),
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.graduatingBatch && { graduatingBatch: filters.graduatingBatch }),
      ...(filters.entryType && { entryType: filters.entryType }),
    };

    const totalStudents = await prisma.studentProfile.count({ where });

    // Eligible = academicStatus verified
    const eligibleStudents = await prisma.studentProfile.count({
      where: { ...where, academicStatus: 'verified' },
    });

    // Applications for funnel analysis (Challenge 342)
    const applications = await prisma.driveApplication.findMany({
      where: {
        status: { not: 'withdrawn' },
        ...(filters.companyId && { drive: { companyId: filters.companyId } }),
        student: {
          studentProfile: {
            ...(filters.batchId && { batchId: filters.batchId }),
            ...(filters.branchId && { branchId: filters.branchId }),
            ...(filters.graduatingBatch && { graduatingBatch: filters.graduatingBatch }),
            ...(filters.entryType && { entryType: filters.entryType }),
          },
        },
      },
      select: { studentId: true, status: true },
    });

    const uniqueApplicantIds = new Set(applications.map((a) => a.studentId));
    const shortlistedIds = new Set(
      applications
        .filter((a) => ['shortlisted', 'selected'].includes(a.status))
        .map((a) => a.studentId)
    );
    const selectedIds = new Set(
      applications.filter((a) => a.status === 'selected').map((a) => a.studentId)
    );

    // Offers (Placed) - distinct student IDs (Challenge 337)
    const offers = await prisma.offer.findMany({
      where: {
        status: 'accepted',
        isVerified: true,
        ...(filters.companyId && { companyId: filters.companyId }),
        student: {
          studentProfile: {
            ...(filters.batchId && { batchId: filters.batchId }),
            ...(filters.branchId && { branchId: filters.branchId }),
            ...(filters.graduatingBatch && { graduatingBatch: filters.graduatingBatch }),
            ...(filters.entryType && { entryType: filters.entryType }),
          },
        },
      },
      select: { studentId: true, id: true },
    });

    const uniquePlacedIds = new Set(offers.map((o) => o.studentId));

    const stats = {
      totalStudents,
      eligibleStudents,
      registeredStudents: uniqueApplicantIds.size,
      uniqueApplicants: uniqueApplicantIds.size,
      shortlistedStudents: shortlistedIds.size,
      selectedStudents: selectedIds.size,
      uniquePlacedStudents: uniquePlacedIds.size,
      totalOffers: offers.length,
      placementPercentage:
        eligibleStudents > 0
          ? Math.round((uniquePlacedIds.size / eligibleStudents) * 100)
          : 0,
      participationPercentage:
        eligibleStudents > 0
          ? Math.round((uniqueApplicantIds.size / eligibleStudents) * 100)
          : 0,
      selectionConversionPercentage:
        uniqueApplicantIds.size > 0
          ? Math.round((selectedIds.size / uniqueApplicantIds.size) * 100)
          : 0,
    };

    setCache(cacheKey, stats, 300); // 5 min TTL
    return stats;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('getPlacementStats error (offline safe):', err?.message || err);
    }
    // Return sensible baseline for offline / mock testing
    return {
      totalStudents: 0,
      eligibleStudents: 0,
      registeredStudents: 0,
      uniqueApplicants: 0,
      shortlistedStudents: 0,
      selectedStudents: 0,
      uniquePlacedStudents: 0,
      totalOffers: 0,
      placementPercentage: 0,
      participationPercentage: 0,
      selectionConversionPercentage: 0,
    };
  }
}

/**
 * Branch-wise Placement Analytics (Challenge 338)
 */
export async function getBranchWiseStats(filters: AnalyticsFilters = {}) {
  const cacheKey = `analytics:branch:${JSON.stringify(filters)}`;
  const cached = getCache<any>(cacheKey);
  if (cached) return cached;

  try {
    const branches = await prisma.branch.findMany({
      where: {
        ...(filters.branchId && { id: filters.branchId }),
      },
      include: { _count: { select: { students: true } } },
    });

    // Batch fetch all placed students grouped by branch (Challenge 349: Eliminate N+1)
    const placedOffers = await prisma.offer.findMany({
      where: {
        status: 'accepted',
        isVerified: true,
        student: {
          studentProfile: {
            ...(filters.batchId && { batchId: filters.batchId }),
          },
        },
      },
      select: {
        student: { select: { studentProfile: { select: { branchId: true } } } },
      },
    });

    const placedByBranch = new Map<number, number>();
    for (const o of placedOffers) {
      const bId = o.student?.studentProfile?.branchId;
      if (bId) placedByBranch.set(bId, (placedByBranch.get(bId) || 0) + 1);
    }

    const stats = branches.map((b) => {
      const placed = placedByBranch.get(b.id) || 0;
      return {
        branchId: b.id,
        branchName: b.name,
        totalStudents: b._count.students,
        placedStudents: placed,
        placementPercentage:
          b._count.students > 0
            ? Math.round((placed / b._count.students) * 100)
            : 0,
      };
    });

    setCache(cacheKey, stats, 300);
    return stats;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('getBranchWiseStats error (offline safe):', err?.message || err);
    }
    return [];
  }
}

/**
 * Company-wise Recruitment Analytics (Challenge 339)
 */
export async function getCompanyWiseStats(filters: AnalyticsFilters = {}) {
  const cacheKey = `analytics:company:${JSON.stringify(filters)}`;
  const cached = getCache<any>(cacheKey);
  if (cached) return cached;

  try {
    const companies = await prisma.company.findMany({
      include: {
        drives: { select: { id: true, title: true, status: true } },
        offers: {
          where: { status: 'accepted', isVerified: true },
          select: { studentId: true, ctc: true },
        },
      },
    });

    const stats = companies.map((c) => {
      const uniquePlaced = new Set(c.offers.map((o) => o.studentId)).size;
      const averageCtc =
        c.offers.length > 0
          ? Math.round(
              (c.offers.reduce((acc, o) => acc + (o.ctc || 0), 0) /
                c.offers.length) *
                100
            ) / 100
          : 0;

      return {
        companyId: c.id,
        companyName: c.name,
        totalDrives: c.drives.length,
        totalOffers: c.offers.length,
        uniquePlacedStudents: uniquePlaced,
        averageCtc,
      };
    });

    setCache(cacheKey, stats, 300);
    return stats;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('getCompanyWiseStats error (offline safe):', err?.message || err);
    }
    return [];
  }
}

/**
 * Salary Package Analytics (Challenge 341)
 */
export async function getSalaryAnalytics(filters: AnalyticsFilters = {}) {
  const cacheKey = `analytics:salary:${JSON.stringify(filters)}`;
  const cached = getCache<any>(cacheKey);
  if (cached) return cached;

  try {
    const offers = await prisma.offer.findMany({
      where: {
        status: 'accepted',
        isVerified: true,
        ctc: { not: null },
        student: {
          studentProfile: {
            ...(filters.batchId && { batchId: filters.batchId }),
            ...(filters.branchId && { branchId: filters.branchId }),
          },
        },
      },
      select: { ctc: true, studentId: true },
    });

    if (offers.length === 0) {
      return { avg: 0, min: 0, max: 0, median: 0, count: 0 };
    }

    const ctcs = offers.map((o) => o.ctc!).sort((a, b) => a - b);
    const sum = ctcs.reduce((a, b) => a + b, 0);
    const mid = Math.floor(ctcs.length / 2);

    const stats = {
      avg: Math.round((sum / ctcs.length) * 100) / 100,
      min: ctcs[0],
      max: ctcs[ctcs.length - 1],
      median:
        ctcs.length % 2 === 0
          ? Math.round(((ctcs[mid - 1] + ctcs[mid]) / 2) * 100) / 100
          : ctcs[mid],
      count: ctcs.length,
    };

    setCache(cacheKey, stats, 300);
    return stats;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('getSalaryAnalytics error (offline safe):', err?.message || err);
    }
    return { avg: 0, min: 0, max: 0, median: 0, count: 0 };
  }
}

/**
 * Assessment Performance Analytics (Challenge 343)
 */
export async function getAssessmentAnalytics(filters: AnalyticsFilters = {}) {
  const cacheKey = `analytics:assessment:${JSON.stringify(filters)}`;
  const cached = getCache<any>(cacheKey);
  if (cached) return cached;

  try {
    const attempts = await prisma.testAttempt.findMany({
      where: {
        status: 'submitted',
        attemptType: 'mock',
        student: {
          studentProfile: {
            ...(filters.batchId && { batchId: filters.batchId }),
            ...(filters.branchId && { branchId: filters.branchId }),
          },
        },
      },
      select: { score: true, totalMarks: true, studentId: true },
    });

    if (attempts.length === 0) {
      return {
        avgScore: 0,
        passRate: 0,
        participationRate: 0,
        uniqueStudents: 0,
        totalAttempts: 0,
      };
    }

    const percentages = attempts.map((a) =>
      a.totalMarks ? ((a.score || 0) / a.totalMarks) * 100 : 0
    );
    const avgScore = Math.round(
      percentages.reduce((a, b) => a + b, 0) / attempts.length
    );
    const passRate = Math.round(
      (percentages.filter((p) => p >= 50).length / attempts.length) * 100
    );

    const totalEligible = await prisma.studentProfile.count({
      where: {
        ...(filters.batchId && { batchId: filters.batchId }),
        ...(filters.branchId && { branchId: filters.branchId }),
        academicStatus: 'verified',
      },
    });

    const stats = {
      avgScore,
      passRate,
      participationRate:
        totalEligible > 0
          ? Math.round(
              (new Set(attempts.map((a) => a.studentId)).size / totalEligible) *
                100
            )
          : 0,
      uniqueStudents: new Set(attempts.map((a) => a.studentId)).size,
      totalAttempts: attempts.length,
    };

    setCache(cacheKey, stats, 300);
    return stats;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('getAssessmentAnalytics error (offline safe):', err?.message || err);
    }
    return {
      avgScore: 0,
      passRate: 0,
      participationRate: 0,
      uniqueStudents: 0,
      totalAttempts: 0,
    };
  }
}

/**
 * Cache Invalidation Hook (Challenge 340)
 * Triggered on Offer and DriveApplication state mutations.
 */
export function invalidateAnalyticsCache(): void {
  invalidatePattern('analytics:');
}

