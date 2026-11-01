// Challenge 193: Placement Reporting & CSV Export Service
import { prisma } from '../config/prisma.js';

/**
 * Formula injection prevention (CSV Injection guard)
 */
export const csvCell = (v: unknown): string => {
  const s = String(v ?? '');
  // Sanitize formula triggers (=, +, -, @, \t, \r)
  const escaped = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  // If cell contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped.replace(/"/g, '""')}"`;
  }
  return escaped;
};

export async function generatePlacementReportCsv(filters: { batchId?: number; branchId?: number }) {
  try {
    const students = await prisma.studentProfile.findMany({
      where: {
        user: { role: 'student', isActive: true, deletedAt: null },
        ...(filters.batchId && { batchId: filters.batchId }),
        ...(filters.branchId && { branchId: filters.branchId }),
      },
      include: {
        user: { select: { name: true, email: true } },
        branch: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });

    const rows: string[][] = [
      [
        'Student Name',
        'Email',
        'Branch',
        'Batch',
        'CGPA',
        'Placement Status',
        'Company',
        'Job Role',
        'CTC Annual',
      ],
    ];

    // Challenge 286: Eliminate N+1 query by batch fetching offers for all students
    const studentUserIds = students.map((s) => s.userId);
    const acceptedOffers = studentUserIds.length > 0
      ? await prisma.offer.findMany({
          where: {
            studentId: { in: studentUserIds },
            status: 'accepted',
            isVerified: true,
          },
          include: { company: { select: { name: true } } },
        })
      : [];

    const offersByStudent = new Map<string, (typeof acceptedOffers)[0]>();
    for (const offer of acceptedOffers) {
      if (!offersByStudent.has(offer.studentId)) {
        offersByStudent.set(offer.studentId, offer);
      }
    }

    for (const s of students) {
      const acceptedOffer = offersByStudent.get(s.userId);

      rows.push([
        csvCell(s.user.name),
        csvCell(s.user.email),
        csvCell(s.branch?.name),
        csvCell(s.batch?.name),
        csvCell(s.cgpa ?? 'N/A'),
        csvCell(s.placementStatus),
        csvCell(acceptedOffer?.company?.name || 'N/A'),
        csvCell(acceptedOffer?.jobRole || 'N/A'),
        csvCell(acceptedOffer?.ctc ?? 'N/A'),
      ]);
    }

    return rows.map((r) => r.join(',')).join('\n');
  } catch (err) {
    console.warn('generatePlacementReportCsv error (offline safe):', (err as Error).message);
    // Return header row in offline mode
    return 'Student Name,Email,Branch,Batch,CGPA,Placement Status,Company,Job Role,CTC Annual';
  }
}
