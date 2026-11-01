import { prisma } from '../src/config/prisma.js';

/**
 * Global teardown — runs once after all test suites complete.
 * Cleans up any remaining e2e- prefixed test data.
 */
export default async function globalTeardown() {
  try {
    // Clean up e2e test data
    const e2eUsers = await prisma.user.findMany({
      where: { email: { contains: 'e2e-' } },
      select: { id: true },
    }).catch(() => []);

    for (const user of e2eUsers) {
      await prisma.studentAnswer.deleteMany({ where: { attempt: { studentId: user.id } } }).catch(() => {});
      await prisma.testAttempt.deleteMany({ where: { studentId: user.id } }).catch(() => {});
      await prisma.codingSubmission.deleteMany({ where: { studentId: user.id } }).catch(() => {});
      await prisma.driveApplication.deleteMany({ where: { studentId: user.id } }).catch(() => {});
      await prisma.offer.deleteMany({ where: { studentId: user.id } }).catch(() => {});
      await prisma.resumeVersion.deleteMany({ where: { studentId: user.id } }).catch(() => {});
      await prisma.studentProfile.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }

    // Clean up e2e companies
    await prisma.company.deleteMany({ where: { name: { contains: 'e2e-' } } }).catch(() => {});
  } catch {
    // Offline safe
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

