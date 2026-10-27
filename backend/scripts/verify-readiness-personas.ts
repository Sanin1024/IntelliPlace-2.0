import { prisma } from '../src/config/prisma.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function main() {
  const personas = ['alice', 'bob', 'carol', 'dave', 'eve'];
  const totalCodingProblems = await prisma.codingProblem.count();

  console.log('====================================================================================================');
  console.log(`PERSONA READINESS VERIFICATION (Total Coding Problems in DB: ${totalCodingProblems})`);
  console.log('====================================================================================================\n');

  for (const name of personas) {
    const email = `${name}@student.edu`;
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: {
          include: { branch: true },
        },
      },
    });

    if (!user) {
      console.error(`Student not found: ${email}`);
      continue;
    }

    // 1. Raw DB inputs
    const mockAttempts = await prisma.testAttempt.findMany({
      where: { studentId: user.id, status: 'submitted', attemptType: 'mock' },
    });
    const mockPcts = mockAttempts.map((a) => (a.score / (a.totalMarks || 1)) * 100);
    const avgMockPct = mockPcts.length > 0 ? mockPcts.reduce((a, b) => a + b, 0) / mockPcts.length : 0;

    const distinctSolved = await prisma.codingSubmission.findMany({
      where: { studentId: user.id, isPassed: true },
      distinct: ['problemId'],
      select: { problemId: true },
    });
    const distinctSolvedCount = distinctSolved.length;

    const allAttempts = await prisma.codingSubmission.findMany({
      where: { studentId: user.id },
      distinct: ['problemId'],
      select: { problemId: true, isPassed: true },
    });
    const totalAttemptedCount = allAttempts.length;
    const attemptedUnsolvedCount = totalAttemptedCount - distinctSolvedCount;

    const profile = user.studentProfile;
    const cgpa = profile?.cgpa ? Number(profile.cgpa) : 0;
    const hasResume = !!profile?.resumeUrl;
    const hasBranch = !!profile?.branchId;
    const hasTargetRole = !!profile?.targetRole;

    // 2. Independent hand calculation
    const handAptitude = (avgMockPct / 100) * 60;
    const handCoding = totalCodingProblems > 0 ? (distinctSolvedCount / totalCodingProblems) * 30 : 0;
    let handProfile = 0;
    if (cgpa > 0) handProfile += 3;
    if (hasResume) handProfile += 3;
    if (hasBranch) handProfile += 2;
    if (hasTargetRole) handProfile += 2;

    const handTotal = Math.round(handAptitude + handCoding + handProfile);
    const handBand = handTotal > 70 ? 'Ready (>70)' : handTotal >= 40 ? 'Almost Ready (40-70)' : 'Not Ready (<40)';

    // 3. API login and fetch readiness
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Student@123' }),
    });
    const loginData = (await loginRes.json()) as any;
    const token = loginData?.data?.token;

    const apiRes = await fetch(`${BASE_URL}/api/analytics/student/${user.id}/readiness`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const apiData = (await apiRes.json()) as any;
    const comp = apiData?.data?.components;
    const apiTotal = apiData?.data?.readinessScore;
    const apiBand = apiData?.data?.readinessBand;

    // Check dashboard API
    const dashRes = await fetch(`${BASE_URL}/api/students/me/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashData = (await dashRes.json()) as any;
    const dashTotal = dashData?.data?.readiness?.score;
    const dashBand = dashData?.data?.readiness?.band;

    const match = handTotal === apiTotal && apiTotal === dashTotal && handBand === apiBand && apiBand === dashBand;

    console.log(`📌 PERSONA: ${name.toUpperCase()} (${email})`);
    console.log(`   [Raw DB Inputs]`);
    console.log(`      Mock Attempts: ${mockAttempts.length} | Scores: ${mockAttempts.map((m) => `${m.score}/${m.totalMarks}`).join(', ')} | Avg Pct: ${avgMockPct.toFixed(2)}%`);
    console.log(`      Coding: Solved = ${distinctSolvedCount}, Attempted = ${totalAttemptedCount}, Attempted-but-unsolved = ${attemptedUnsolvedCount}`);
    console.log(`      Profile: CGPA = ${cgpa}, Resume = ${hasResume}, Branch = ${profile?.branch?.name || 'None'}, TargetRole = ${profile?.targetRole || 'None'}`);
    console.log(`   [Independent Hand Calculation]`);
    console.log(`      Aptitude (60): ${handAptitude.toFixed(2)} pts`);
    console.log(`      Coding   (30): ${handCoding.toFixed(2)} pts (${distinctSolvedCount}/${totalCodingProblems} * 30)`);
    console.log(`      Profile  (10): ${handProfile.toFixed(2)} pts`);
    console.log(`      TOTAL:         ${handTotal} pts -> Band: "${handBand}"`);
    console.log(`   [API /api/analytics/student/:id/readiness]`);
    console.log(`      Components:    Aptitude=${comp?.aptitude}, Coding=${comp?.coding}, Profile=${comp?.profile}`);
    console.log(`      API Total:     ${apiTotal} pts -> Band: "${apiBand}"`);
    console.log(`   [Student Dashboard API /api/students/me/dashboard]`);
    console.log(`      Dashboard:     ${dashTotal} pts -> Band: "${dashBand}"`);
    console.log(`   [Verification Result]: ${match ? '✅ EXACT MATCH (100%)' : '❌ MISMATCH'}\n`);

    if (!match) {
      console.error(`FAILED match for ${name}: Hand ${handTotal} vs API ${apiTotal} vs Dash ${dashTotal}`);
      process.exit(1);
    }
  }

  // Also check PO Students list & PO Summary
  const poLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'po@intelliplace.edu', password: 'Po@12345' }),
  });
  const poToken = ((await poLogin.json()) as any)?.data?.token;

  const poStudentsRes = await fetch(`${BASE_URL}/api/po/students`, {
    headers: { Authorization: `Bearer ${poToken}` },
  });
  const poStudentsData = ((await poStudentsRes.json()) as any)?.data;
  const poStudents = poStudentsData?.students || [];
  console.log('📌 PO ALL STUDENTS LIST (/api/po/students):');
  for (const st of poStudents) {
    console.log(`   Student: ${st.name.padEnd(20)} | Score: ${String(st.readinessScore).padStart(3)} | Band: ${st.readinessBand}`);
  }

  const poSummaryRes = await fetch(`${BASE_URL}/api/po/summary`, {
    headers: { Authorization: `Bearer ${poToken}` },
  });
  const poSummary = ((await poSummaryRes.json()) as any)?.data;
  console.log('\n📌 PO SUMMARY READINESS BANDS & ATTENTION STUDENTS (/api/po/summary):');
  console.log(`   Readiness Bands: Not Ready (<40): ${poSummary?.readinessBands?.notReady}, Almost Ready (40-70): ${poSummary?.readinessBands?.almostReady}, Ready (>70): ${poSummary?.readinessBands?.ready}`);
  for (const st of poSummary?.attentionStudents || []) {
    console.log(`   Attention Student: ${st.name.padEnd(16)} | Score: ${String(st.readinessScore).padStart(3)} | Band: ${st.band}`);
  }

  console.log('\n✅ ALL PERSONA READINESS CHECKS PASSED.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
