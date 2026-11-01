import { prisma } from '../src/config/prisma.js';

async function runDiagnostics() {
  console.log('================================================================');
  console.log('🔍 INTELLIPLACE DATABASE INTEGRITY & ORPHAN DIAGNOSTIC');
  console.log('================================================================\n');

  // 1. Connection check
  const dbUrl = process.env.DATABASE_URL || '';
  const sanitizedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`[OK] Connected via Prisma to: ${sanitizedUrl}`);

  // 2. Inspect all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`\n📋 Users in Database (${users.length}):`);
  for (const u of users) {
    console.log(`  - ${u.role.padEnd(8)} | ${u.email.padEnd(35)} | "${u.name}" | Active: ${u.isActive} | ${u.id}`);
  }

  // 3. Duplicate checks
  console.log('\n🔍 Checking for Duplicates:');
  const emailCounts = new Map<string, number>();
  for (const u of users) {
    emailCounts.set(u.email.toLowerCase(), (emailCounts.get(u.email.toLowerCase()) || 0) + 1);
  }
  const duplicateEmails = Array.from(emailCounts.entries()).filter(([_, count]) => count > 1);
  console.log(`  - Duplicate User Emails: ${duplicateEmails.length === 0 ? 'None (PASS ✅)' : JSON.stringify(duplicateEmails)}`);

  const branches = await prisma.branch.findMany();
  const branchNames = new Set<string>();
  const dupBranches = branches.filter(b => {
    if (branchNames.has(b.name.toLowerCase())) return true;
    branchNames.add(b.name.toLowerCase());
    return false;
  });
  console.log(`  - Duplicate Branch Names: ${dupBranches.length === 0 ? 'None (PASS ✅)' : dupBranches.length}`);

  const batches = await prisma.batch.findMany();
  const batchNames = new Set<string>();
  const dupBatches = batches.filter(b => {
    if (batchNames.has(b.name.toLowerCase())) return true;
    batchNames.add(b.name.toLowerCase());
    return false;
  });
  console.log(`  - Duplicate Batch Names: ${dupBatches.length === 0 ? 'None (PASS ✅)' : dupBatches.length}`);

  // 4. Orphan checks
  console.log('\n🔍 Checking for Orphaned Records:');

  // Student Profiles
  const profiles = await prisma.studentProfile.findMany({
    include: { user: true, branch: true, batch: true },
  });
  const orphanProfiles = profiles.filter(p => !p.user);
  const profilesWithNonStudentUser = profiles.filter(p => p.user && p.user.role !== 'student');
  const profilesWithMissingBranch = profiles.filter(p => p.branchId && !p.branch);
  const profilesWithMissingBatch = profiles.filter(p => p.batchId && !p.batch);

  console.log(`  - Profiles without User: ${orphanProfiles.length}`);
  console.log(`  - Profiles attached to non-student: ${profilesWithNonStudentUser.length}`);
  console.log(`  - Profiles with invalid Branch ID: ${profilesWithMissingBranch.length}`);
  console.log(`  - Profiles with invalid Batch ID: ${profilesWithMissingBatch.length}`);

  // Mock Tests
  const tests = await prisma.mockTest.findMany({
    include: { creator: true, batch: true, questions: { include: { question: true } } },
  });
  const orphanTests = tests.filter(t => !t.creator);
  const testsWithMissingBatch = tests.filter(t => t.batchId && !t.batch);
  const testsWithMissingQuestions = tests.filter(t => t.questions.some(q => !q.question));
  console.log(`  - MockTests without Creator: ${orphanTests.length}`);
  console.log(`  - MockTests with invalid Batch: ${testsWithMissingBatch.length}`);
  console.log(`  - MockTests with invalid Question refs: ${testsWithMissingQuestions.length}`);

  console.log(`\n📋 Mock Tests in Database (${tests.length}):`);
  for (const t of tests) {
    console.log(`  - [${t.isActive ? 'ACTIVE' : 'INACTIVE'}] "${t.title}" | Creator: ${t.creator?.email || 'ORPHAN'} | Batch: ${t.batch?.name || 'All'} | Questions: ${t.questions.length} | ID: ${t.id}`);
  }

  // Test Attempts
  const attempts = await prisma.testAttempt.findMany({
    include: { student: true, test: true, answers: { include: { question: true } } },
  });
  const orphanAttemptsStudent = attempts.filter(a => !a.student);
  const orphanAttemptsTest = attempts.filter(a => a.attemptType === 'mock' && !a.test);
  const attemptsWithMissingQuestions = attempts.filter(a => a.answers.some(ans => !ans.question));
  console.log(`  - Attempts without Student: ${orphanAttemptsStudent.length}`);
  console.log(`  - Mock Attempts without Test: ${orphanAttemptsTest.length}`);
  console.log(`  - Answers with missing Question: ${attemptsWithMissingQuestions.length}`);

  // 5. Invalid Field Values
  console.log('\n🔍 Checking for Invalid Field Values:');
  const invalidScores = attempts.filter(a => (a.score !== null && a.score < 0) || (a.totalMarks !== null && a.totalMarks < 0) || (a.score !== null && a.totalMarks !== null && a.score > a.totalMarks));
  console.log(`  - Attempts with out-of-range score: ${invalidScores.length}`);

  const invalidDurations = tests.filter(t => t.durationMins <= 0 || t.durationMins > 300);
  console.log(`  - Tests with invalid duration: ${invalidDurations.length}`);

  const invalidDateRanges = tests.filter(t => t.availableFrom && t.availableUntil && t.availableFrom > t.availableUntil);
  console.log(`  - Tests with availableFrom > availableUntil: ${invalidDateRanges.length}`);

  // 6. Resumes
  const resumes = await (prisma as any).studentResumeData.findMany({
    include: { user: true },
  });
  const orphanResumes = resumes.filter((r: any) => !r.user);
  console.log(`\n📋 Resume Records (${resumes.length}):`);
  console.log(`  - Resumes without User: ${orphanResumes.length}`);

  console.log('\n================================================================');
  console.log('✅ DIAGNOSTIC RUN COMPLETED SAFELY (NO DATA MODIFIED)');
  console.log('================================================================');

  await prisma.$disconnect();
}

runDiagnostics().catch(e => {
  console.error('Diagnostic error:', e);
  process.exit(1);
});
