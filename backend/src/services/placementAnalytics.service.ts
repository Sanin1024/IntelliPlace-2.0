import { prisma } from '../config/prisma.js';
import { getCache, setCache } from '../utils/cache.js';

/**
 * Accurate Placement Analytics (Challenges 170, 174, 175).
 * Uses unique student counts (Set) to prevent multiple offer inflation.
 * Challenge 282: In-memory TTL caching for expensive analytics computation.
 */
export async function getPlacementStats(filters: { branchId?: number; batchId?: number }) {
  const cacheKey = `stats:placement:branch_${filters.branchId ?? 'all'}:batch_${filters.batchId ?? 'all'}`;
  const cached = getCache<any>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const profileWhere: any = {};
    if (filters.branchId) profileWhere.branchId = filters.branchId;
    if (filters.batchId) profileWhere.batchId = filters.batchId;

    const totalStudents = await prisma.studentProfile.count({
      where: {
        ...profileWhere,
        user: { role: 'student', isActive: true },
      },
    });

    const offers = await prisma.offer.findMany({
      where: {
        student: {
          role: 'student',
          isActive: true,
          studentProfile: profileWhere,
        },
      },
      select: {
        studentId: true,
        status: true,
        isVerified: true,
        employmentType: true,
        source: true,
        companyId: true,
        ctc: true,
      },
    });

    const uniqueStudentsWithOffers = new Set(
      offers.filter((o) => o.status !== 'rejected' && o.status !== 'revoked').map((o) => o.studentId)
    );
    const uniqueAccepted = new Set(offers.filter((o) => o.status === 'accepted').map((o) => o.studentId));
    const uniqueVerifiedPlaced = new Set(
      offers.filter((o) => o.status === 'accepted' && o.isVerified).map((o) => o.studentId)
    );
    const uniqueInternship = new Set(
      offers.filter((o) => o.status === 'accepted' && o.employmentType.includes('internship')).map((o) => o.studentId)
    );
    const uniqueFullTime = new Set(
      offers.filter((o) => o.status === 'accepted' && o.employmentType === 'full_time').map((o) => o.studentId)
    );
    const uniqueOffCampus = new Set(
      offers.filter((o) => o.status === 'accepted' && o.source === 'off_campus').map((o) => o.studentId)
    );

    // CTC stats for accepted offers
    const acceptedCtcs = offers
      .filter((o) => o.status === 'accepted' && typeof o.ctc === 'number' && o.ctc > 0)
      .map((o) => o.ctc as number);

    const highestCtc = acceptedCtcs.length > 0 ? Math.max(...acceptedCtcs) : 0;
    const averageCtc =
      acceptedCtcs.length > 0
        ? Math.round((acceptedCtcs.reduce((a, b) => a + b, 0) / acceptedCtcs.length) * 100) / 100
        : 0;

    // Company-wise distribution - Challenge 286: Batched company lookup to eliminate N+1 queries
    const companyCountMap = new Map<string, number>();
    offers
      .filter((o) => o.status === 'accepted')
      .forEach((o) => {
        companyCountMap.set(o.companyId, (companyCountMap.get(o.companyId) || 0) + 1);
      });

    const companyIds = Array.from(companyCountMap.keys());
    const companies = companyIds.length > 0
      ? await prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, name: true },
        })
      : [];
    const companyNameMap = new Map(companies.map((c) => [c.id, c.name]));

    const companyWise = companyIds.map((companyId) => ({
      companyId,
      companyName: companyNameMap.get(companyId) || 'Unknown Company',
      acceptedOffers: companyCountMap.get(companyId) || 0,
    }));

    const result = {
      totalStudents,
      studentsWithOffers: uniqueStudentsWithOffers.size,
      studentsAccepted: uniqueAccepted.size,
      studentsVerifiedPlaced: uniqueVerifiedPlaced.size,
      studentsInternship: uniqueInternship.size,
      studentsFullTime: uniqueFullTime.size,
      studentsOffCampus: uniqueOffCampus.size,
      highestCtc,
      averageCtc,
      placementPercentage:
        totalStudents > 0 ? Math.round((uniqueVerifiedPlaced.size / totalStudents) * 100) : 0,
      companyWise,
    };

    // Cache computed stats for 300 seconds (5 minutes)
    setCache(cacheKey, result, 300);

    return result;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('getPlacementStats error:', err?.message || err);
    }
    const fallback = {
      totalStudents: 0,
      studentsWithOffers: 0,
      studentsAccepted: 0,
      studentsVerifiedPlaced: 0,
      studentsInternship: 0,
      studentsFullTime: 0,
      studentsOffCampus: 0,
      highestCtc: 0,
      averageCtc: 0,
      placementPercentage: 0,
      companyWise: [],
    };
    // Cache fallback to protect offline/failing database from repeated storms
    setCache(cacheKey, fallback, 300);
    return fallback;
  }
}

