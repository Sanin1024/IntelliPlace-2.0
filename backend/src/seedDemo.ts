import { prisma } from './config/prisma.js';
import { demoAptitudeQuestions } from './fixtures/demoAptitude.js';
import { demoCodingProblems } from './fixtures/demoProblems.js';
import { generateDemoPdfs } from './generateDemoPdfs.js';
import { calculateStudentReadiness } from './services/readiness.js';

async function seedDemo() {
  console.log('================================================================');
  console.log('🌟 Seeding IntelliPlace Realistic Demo Content & Activity');
  console.log('================================================================\n');

  // Verify base seed is present
  const cse = await prisma.branch.findUnique({ where: { name: 'CSE' } });
  const it = await prisma.branch.findUnique({ where: { name: 'IT' } });
  const ece = await prisma.branch.findUnique({ where: { name: 'ECE' } });
  const batch2025 = await prisma.batch.findUnique({ where: { name: '2025' } });
  const batch2026 = await prisma.batch.findUnique({ where: { name: '2026' } });

  const admin = await prisma.user.findUnique({ where: { email: 'admin@intelliplace.edu' } });
  const po = await prisma.user.findUnique({ where: { email: 'po@intelliplace.edu' } });
  const trainer1 = await prisma.user.findUnique({ where: { email: 'trainer1@intelliplace.edu' } });
  const trainer2 = await prisma.user.findUnique({ where: { email: 'trainer2@intelliplace.edu' } });

  const alice = await prisma.user.findUnique({ where: { email: 'alice@student.edu' } });
  const bob = await prisma.user.findUnique({ where: { email: 'bob@student.edu' } });
  const carol = await prisma.user.findUnique({ where: { email: 'carol@student.edu' } });
  const dave = await prisma.user.findUnique({ where: { email: 'dave@student.edu' } });
  const eve = await prisma.user.findUnique({ where: { email: 'eve@student.edu' } });

  if (!cse || !it || !ece || !batch2025 || !batch2026 || !admin || !po || !trainer1 || !alice || !bob || !carol || !dave || !eve) {
    throw new Error('Base seed missing! Please run "npm run seed:reset" first before running demo seed.');
  }

  // Fetch topics
  const quantTopic = await prisma.topic.findUnique({ where: { name: 'Quantitative Aptitude' } });
  const logicalTopic = await prisma.topic.findUnique({ where: { name: 'Logical Reasoning' } });
  const verbalTopic = await prisma.topic.findUnique({ where: { name: 'Verbal Ability' } });
  const arraysTopic = await prisma.topic.findUnique({ where: { name: 'Arrays' } });
  const stringsTopic = await prisma.topic.findUnique({ where: { name: 'Strings' } });

  const topicIdMap: Record<string, number> = {
    'Quantitative Aptitude': quantTopic!.id,
    'Logical Reasoning': logicalTopic!.id,
    'Verbal Ability': verbalTopic!.id,
    'Arrays': arraysTopic!.id,
    'Strings': stringsTopic!.id,
  };

  // =========================================================================
  // 1. GENERATE & SEED STUDY RESOURCES (6 PDFs)
  // =========================================================================
  console.log('1. Generating and seeding PDF study resources...');
  await generateDemoPdfs();

  const demoResources = [
    {
      title: 'Quantitative Aptitude Formula Guide',
      description: 'Comprehensive quick-reference formulas for time, speed, profit, interest, and mixtures.',
      fileUrl: '/uploads/quant_mastery_guide.pdf',
      topicId: quantTopic!.id,
      uploadedBy: trainer1.id,
    },
    {
      title: 'Logical Reasoning & Deduction Cheatsheet',
      description: 'Systematic approaches for placement syllogisms, blood relations, and seating arrangements.',
      fileUrl: '/uploads/logical_reasoning_cheatsheet.pdf',
      topicId: logicalTopic!.id,
      uploadedBy: trainer1.id,
    },
    {
      title: 'Verbal Ability & Grammar Essentials',
      description: 'Core rules for subject-verb agreement, prepositions, conditionals, and corporate communication.',
      fileUrl: '/uploads/verbal_ability_prep.pdf',
      topicId: verbalTopic!.id,
      uploadedBy: trainer2?.id || trainer1.id,
    },
    {
      title: 'Array Algorithms Handbook',
      description: 'Two-pointer, sliding window, prefix sum, and partitioning patterns for coding tests.',
      fileUrl: '/uploads/array_algorithms_handbook.pdf',
      topicId: arraysTopic!.id,
      uploadedBy: trainer1.id,
    },
    {
      title: 'String Algorithms & Character Hashing',
      description: 'Palindrome checking, frequency counting, anagrams, and ASCII manipulation notes.',
      fileUrl: '/uploads/string_manipulation_notes.pdf',
      topicId: stringsTopic!.id,
      uploadedBy: trainer2?.id || trainer1.id,
    },
    {
      title: 'Engineering Campus Placement Playbook',
      description: 'Technical interview tips, behavioral STAR framework, and resume best practices.',
      fileUrl: '/uploads/placement_interview_playbook.pdf',
      topicId: quantTopic!.id,
      uploadedBy: trainer1.id,
    },
  ];

  for (const r of demoResources) {
    const existing = await prisma.resource.findFirst({ where: { fileUrl: r.fileUrl } });
    if (!existing) {
      await prisma.resource.create({ data: r });
    }
  }
  console.log('  ✅ 6 PDF study resources seeded');

  // =========================================================================
  // 2. SEED APTITUDE QUESTIONS (51 questions)
  // =========================================================================
  console.log('2. Seeding 51 original aptitude questions...');
  const seededQuestions: Record<string, any> = {};

  for (const q of demoAptitudeQuestions) {
    const existing = await prisma.aptitudeQuestion.findFirst({
      where: { questionText: q.questionText },
    });

    if (existing) {
      seededQuestions[q.questionText] = existing;
    } else {
      const created = await prisma.aptitudeQuestion.create({
        data: {
          topicId: topicIdMap[q.topicName],
          difficulty: q.difficulty,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          explanation: q.explanation,
        },
      });
      seededQuestions[q.questionText] = created;
    }
  }
  const totalAptitudeCount = await prisma.aptitudeQuestion.count();
  console.log(`  ✅ Aptitude questions in database: ${totalAptitudeCount} (added 51 demo questions)`);

  // =========================================================================
  // 3. SEED CODING PROBLEMS (10 problems + test cases)
  // =========================================================================
  console.log('3. Seeding 10 demo coding problems with sample and hidden test cases...');
  const seededProblems: Record<string, any> = {};

  for (const p of demoCodingProblems) {
    let problem = await prisma.codingProblem.findFirst({
      where: { title: p.title },
      include: { testCases: true },
    });

    if (!problem) {
      problem = await prisma.codingProblem.create({
        data: {
          topicId: topicIdMap[p.topicName],
          difficulty: p.difficulty,
          title: p.title,
          description: p.description,
          sampleInput: p.sampleInput,
          sampleOutput: p.sampleOutput,
          tags: p.tags,
          testCases: {
            create: p.testCases.map((tc) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden,
            })),
          },
        },
        include: { testCases: true },
      });
    }
    seededProblems[p.slug] = problem;
  }
  const totalCodingCount = await prisma.codingProblem.count();
  console.log(`  ✅ Coding problems in database: ${totalCodingCount} (added 10 demo problems)`);

  // =========================================================================
  // 4. SEED COMPANY DRIVES (5 drives)
  // =========================================================================
  console.log('4. Seeding 5 company drives with eligibility rules & syllabus...');
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const demoCompanies = [
    {
      name: 'Nexora Cloud Technologies',
      description: 'Tier-1 cloud infrastructure and enterprise distributed systems provider.',
      jobRole: 'Cloud Solutions Engineer',
      package: 12.0,
      eligibilityCgpa: 8.5, // High cutoff
      driveDate: new Date(now + 14 * dayMs), // in 2 weeks
      syllabusText: 'Round 1: Online Aptitude & Coding (60 mins); Round 2: Technical Interview (Data Structures & Systems); Round 3: HR & Cultural Fit.',
      eligibleBranchIds: [cse.id, it.id],
      topicIds: [quantTopic!.id, logicalTopic!.id, arraysTopic!.id],
    },
    {
      name: 'Apex Embedded Systems',
      description: 'Automotive and industrial IoT semiconductor firmware engineering firm.',
      jobRole: 'Firmware Systems Engineer',
      package: 9.5,
      eligibilityCgpa: 7.5,
      driveDate: new Date(now + 21 * dayMs), // in 3 weeks
      syllabusText: 'Round 1: Core Electronics & C/Python Coding; Round 2: Embedded Systems & Architecture; Round 3: HR.',
      eligibleBranchIds: [ece.id], // Single branch only
      topicIds: [logicalTopic!.id, arraysTopic!.id],
    },
    {
      name: 'Strata Analytics Labs',
      description: 'Enterprise data science, machine learning models, and big data consulting.',
      jobRole: 'Data Analytics Engineer',
      package: 7.5,
      eligibilityCgpa: 7.0,
      driveDate: new Date(now + 28 * dayMs), // in 4 weeks
      syllabusText: 'Round 1: Quantitative & Logical Assessment; Round 2: Python / SQL Problem Solving; Round 3: Technical Interview.',
      eligibleBranchIds: [cse.id, it.id, ece.id],
      topicIds: [quantTopic!.id, logicalTopic!.id, stringsTopic!.id],
    },
    {
      name: 'Velox Fintech Solutions',
      description: 'High-frequency algorithmic trading and modern digital banking infrastructure.',
      jobRole: 'Full-Stack Software Engineer',
      package: 14.0,
      eligibilityCgpa: 8.0,
      driveDate: new Date(now + 35 * dayMs), // in 5 weeks
      syllabusText: 'Round 1: Coding Challenge (Arrays & Strings) + Aptitude; Round 2: System Design & Algorithms; Round 3: Leadership.',
      eligibleBranchIds: [cse.id, it.id],
      topicIds: [quantTopic!.id, arraysTopic!.id, stringsTopic!.id],
    },
    {
      name: 'Prism Global Services',
      description: 'Multinational technology consulting and application development services.',
      jobRole: 'Graduate Trainee Engineer',
      package: 5.0,
      eligibilityCgpa: 6.0,
      driveDate: new Date(now - 14 * dayMs), // Past drive (2 weeks ago)
      syllabusText: 'Round 1: General Aptitude & Verbal English; Round 2: Core Programming Basics; Round 3: HR Interview.',
      eligibleBranchIds: [cse.id, it.id, ece.id],
      topicIds: [quantTopic!.id, verbalTopic!.id, stringsTopic!.id],
    },
  ];

  const seededCompanyMap: Record<string, any> = {};

  for (const c of demoCompanies) {
    let company = await prisma.company.findUnique({ where: { name: c.name } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: c.name,
          description: c.description,
          jobRole: c.jobRole,
          package: c.package,
          eligibilityCgpa: c.eligibilityCgpa,
          driveDate: c.driveDate,
          syllabusText: c.syllabusText,
          eligibleBranches: {
            create: c.eligibleBranchIds.map((bid) => ({ branchId: bid })),
          },
          topics: {
            create: c.topicIds.map((tid) => ({ topicId: tid })),
          },
        },
      });
    }
    seededCompanyMap[c.name] = company;
  }
  console.log('  ✅ 5 company drives seeded');

  // =========================================================================
  // 5. SEED MOCK TESTS (3 tests: Batch 2025 open, Batch 2026 open, Future)
  // =========================================================================
  console.log('5. Seeding 3 placement mock tests (Batch 2025, Batch 2026, Future)...');

  const allAptitudeQuestions = await prisma.aptitudeQuestion.findMany({ take: 50 });

  const mockTestDefs = [
    {
      title: 'Campus Placement Mock Test - 2025',
      description: 'Official comprehensive placement mock test for graduating batch 2025.',
      durationMins: 30,
      batchId: batch2025.id,
      availableFrom: new Date(now - 3 * dayMs),
      availableUntil: new Date(now + 7 * dayMs),
      maxAttempts: 2,
      createdBy: trainer1.id,
      questionIds: allAptitudeQuestions.slice(0, 20).map((q) => q.id),
    },
    {
      title: 'Placement Readiness Assessment - 2026',
      description: 'Mid-term aptitude benchmark test for batch 2026 students.',
      durationMins: 25,
      batchId: batch2026.id,
      availableFrom: new Date(now - 2 * dayMs),
      availableUntil: new Date(now + 7 * dayMs),
      maxAttempts: 2,
      createdBy: trainer2?.id || trainer1.id,
      questionIds: allAptitudeQuestions.slice(15, 30).map((q) => q.id),
    },
    {
      title: 'National Level Pre-Placement Mock 2026-2027',
      description: 'Upcoming scheduled full-length national placement practice test.',
      durationMins: 40,
      batchId: null, // Open to all batches
      availableFrom: new Date(now + 10 * dayMs),
      availableUntil: new Date(now + 20 * dayMs),
      maxAttempts: 1,
      createdBy: trainer1.id,
      questionIds: allAptitudeQuestions.slice(25, 50).map((q) => q.id),
    },
  ];

  const seededMockTests: Record<string, any> = {};

  for (const m of mockTestDefs) {
    let test = await prisma.mockTest.findFirst({ where: { title: m.title } });
    if (!test) {
      test = await prisma.mockTest.create({
        data: {
          title: m.title,
          description: m.description,
          durationMins: m.durationMins,
          batchId: m.batchId,
          availableFrom: m.availableFrom,
          availableUntil: m.availableUntil,
          maxAttempts: m.maxAttempts,
          createdBy: m.createdBy,
          questions: {
            create: m.questionIds.map((qid) => ({ questionId: qid, marks: 1 })),
          },
        },
        include: { questions: true },
      });
    }
    seededMockTests[m.title] = test;
  }
  console.log('  ✅ 3 mock tests seeded');

  // =========================================================================
  // 6. SEED NOTIFICATIONS (4 announcements with mix of read/unread)
  // =========================================================================
  console.log('6. Seeding 4 placement announcements from PO and Admin...');

  const announcementDefs = [
    {
      title: 'Upcoming Drive: Nexora Cloud Technologies campus registration open',
      message: 'Nexora Cloud Technologies has scheduled their virtual campus drive on the portal. Review syllabus and ensure your CGPA meets the 8.5 cutoff.',
      createdBy: po.id,
      recipients: [
        { userId: alice.id, isRead: true, readAt: new Date(now - 2 * dayMs) },
        { userId: bob.id, isRead: true, readAt: new Date(now - 1 * dayMs) },
        { userId: carol.id, isRead: false },
        { userId: dave.id, isRead: false },
        { userId: eve.id, isRead: false },
      ],
    },
    {
      title: 'Campus Aptitude Mock Test Series 2025-2026 Live',
      message: 'The mid-term placement mock tests are now accessible under the Tests tab. All students in batches 2025 and 2026 are advised to take their test.',
      createdBy: admin.id,
      recipients: [
        { userId: alice.id, isRead: true, readAt: new Date(now - 3 * dayMs) },
        { userId: bob.id, isRead: true, readAt: new Date(now - 2 * dayMs) },
        { userId: carol.id, isRead: true, readAt: new Date(now - 1 * dayMs) },
        { userId: dave.id, isRead: false },
        { userId: eve.id, isRead: false },
      ],
    },
    {
      title: 'Placement Training Schedule & Topic Resources Updated',
      message: 'New PDF cheatsheets and study guides have been uploaded for Quantitative Aptitude, Logical Reasoning, and Algorithms.',
      createdBy: po.id,
      recipients: [
        { userId: alice.id, isRead: true, readAt: new Date(now - 4 * dayMs) },
        { userId: bob.id, isRead: false },
        { userId: carol.id, isRead: false },
        { userId: dave.id, isRead: false },
        { userId: eve.id, isRead: false },
      ],
    },
    {
      title: 'Important: Complete your target companies and resume profile',
      message: 'Placement cell requests all students to update their target roles, upload resumes, and mark target companies to enable recommendation analytics.',
      createdBy: admin.id,
      recipients: [
        { userId: alice.id, isRead: false },
        { userId: bob.id, isRead: false },
        { userId: carol.id, isRead: false },
        { userId: dave.id, isRead: false },
        { userId: eve.id, isRead: false },
      ],
    },
  ];

  for (const an of announcementDefs) {
    let notif = await prisma.notification.findFirst({ where: { title: an.title } });
    if (!notif) {
      notif = await prisma.notification.create({
        data: {
          title: an.title,
          message: an.message,
          createdBy: an.createdBy,
          recipients: {
            create: an.recipients.map((r) => ({
              userId: r.userId,
              isRead: r.isRead,
              readAt: r.readAt,
            })),
          },
        },
      });
    }
  }
  console.log('  ✅ 4 announcements seeded with read/unread statuses');

  // =========================================================================
  // 7. SEED DETERMINISTIC ACTIVITY HISTORY & CODING SUBMISSIONS FOR PERSONAS
  // =========================================================================
  console.log('7. Seeding deterministic persona activity history over past 6 weeks...');

  // Clean existing test attempts & submissions for seeded students to ensure clean idempotent demo numbers
  await prisma.studentAnswer.deleteMany({
    where: { attempt: { studentId: { in: [alice.id, bob.id, carol.id, dave.id, eve.id] } } },
  });
  await prisma.codingSubmission.deleteMany({
    where: { studentId: { in: [alice.id, bob.id, carol.id, dave.id, eve.id] } },
  });
  await prisma.testAttempt.deleteMany({
    where: { studentId: { in: [alice.id, bob.id, carol.id, dave.id, eve.id] } },
  });
  await prisma.studentTargetCompany.deleteMany({
    where: { userId: { in: [alice.id, bob.id, carol.id, dave.id, eve.id] } },
  });

  const test2025 = seededMockTests['Campus Placement Mock Test - 2025'];
  const test2026 = seededMockTests['Placement Readiness Assessment - 2026'];
  const test2025Questions = await prisma.mockTestQuestion.findMany({
    where: { testId: test2025.id },
    include: { question: true },
  });
  const test2026Questions = await prisma.mockTestQuestion.findMany({
    where: { testId: test2026.id },
    include: { question: true },
  });

  // --- PERSONA 1: ALICE ---
  // Strong: 75-90% accuracy, several mock attempts, 5 coding problems solved, target companies, in_process
  await prisma.studentProfile.update({
    where: { userId: alice.id },
    data: {
      cgpa: 9.1,
      resumeUrl: 'https://storage.intelliplace.edu/resumes/alice_resume.pdf',
      targetRole: 'Full-Stack Developer',
      placementStatus: 'in_process',
      knowledgeLevel: 'advanced',
    },
  });

  // Target companies for Alice
  await prisma.studentTargetCompany.createMany({
    data: [
      { userId: alice.id, companyId: seededCompanyMap['Nexora Cloud Technologies'].id },
      { userId: alice.id, companyId: seededCompanyMap['Velox Fintech Solutions'].id },
    ],
  });

  // Alice Attempt 1 (4 weeks ago): 17/20 (85%)
  const aliceAtt1 = await prisma.testAttempt.create({
    data: {
      testId: test2025.id,
      studentId: alice.id,
      attemptType: 'mock',
      status: 'submitted',
      score: 17,
      totalMarks: 20,
      startTime: new Date(now - 28 * dayMs),
      endTime: new Date(now - 28 * dayMs + 24 * 60 * 1000),
    },
  });
  for (let i = 0; i < test2025Questions.length; i++) {
    const q = test2025Questions[i].question;
    const isCorrect = ![0, 7, 14].includes(i);
    await prisma.studentAnswer.create({
      data: {
        attemptId: aliceAtt1.id,
        questionId: q.id,
        selectedOption: isCorrect ? q.correctOption : (q.correctOption === 'A' ? 'B' : 'A'),
        isCorrect,
      },
    });
  }

  // Alice Attempt 2 (2 weeks ago): 17/20 (85%)
  const aliceAtt2 = await prisma.testAttempt.create({
    data: {
      testId: test2025.id,
      studentId: alice.id,
      attemptType: 'mock',
      status: 'submitted',
      score: 17,
      totalMarks: 20,
      startTime: new Date(now - 14 * dayMs),
      endTime: new Date(now - 14 * dayMs + 22 * 60 * 1000),
    },
  });
  for (let i = 0; i < test2025Questions.length; i++) {
    const q = test2025Questions[i].question;
    const isCorrect = ![1, 8, 15].includes(i);
    await prisma.studentAnswer.create({
      data: {
        attemptId: aliceAtt2.id,
        questionId: q.id,
        selectedOption: isCorrect ? q.correctOption : (q.correctOption === 'A' ? 'B' : 'A'),
        isCorrect,
      },
    });
  }

  // Alice Attempt 3 (3 days ago): 18/20 (90%)
  const aliceAtt3 = await prisma.testAttempt.create({
    data: {
      testId: test2025.id,
      studentId: alice.id,
      attemptType: 'mock',
      status: 'submitted',
      score: 18,
      totalMarks: 20,
      startTime: new Date(now - 3 * dayMs),
      endTime: new Date(now - 3 * dayMs + 21 * 60 * 1000),
    },
  });
  for (let i = 0; i < test2025Questions.length; i++) {
    const q = test2025Questions[i].question;
    const isCorrect = ![2, 9].includes(i);
    await prisma.studentAnswer.create({
      data: {
        attemptId: aliceAtt3.id,
        questionId: q.id,
        selectedOption: isCorrect ? q.correctOption : (q.correctOption === 'A' ? 'B' : 'A'),
        isCorrect,
      },
    });
  }

  // Alice Coding Submissions: 5 distinct problems solved
  const aliceSolvedSlugs = [
    'array-sum', 'find-maximum', 'second-largest', 'move-zeroes', 'contains-duplicate'
  ];
  for (const slug of aliceSolvedSlugs) {
    const prob = seededProblems[slug];
    if (prob) {
      await prisma.codingSubmission.create({
        data: {
          problemId: prob.id,
          studentId: alice.id,
          language: 'python',
          code: `# Solution for ${prob.title}\nprint("Accepted")`,
          passedTestCases: prob.testCases.length,
          totalTestCases: prob.testCases.length,
          isPassed: true,
          createdAt: new Date(now - 10 * dayMs),
        },
      });
    }
  }

  // --- PERSONA 2: BOB ---
  // Clearly weak in Verbal Ability (<50% with at least 8 answered questions), decent in Quant/Logical, placed status
  await prisma.studentProfile.update({
    where: { userId: bob.id },
    data: {
      cgpa: 7.8,
      resumeUrl: 'https://storage.intelliplace.edu/resumes/bob_resume.pdf',
      targetRole: 'Systems Engineer',
      placementStatus: 'placed',
      knowledgeLevel: 'intermediate',
    },
  });

  await prisma.studentTargetCompany.createMany({
    data: [
      { userId: bob.id, companyId: seededCompanyMap['Apex Embedded Systems'].id },
      { userId: bob.id, companyId: seededCompanyMap['Strata Analytics Labs'].id },
    ],
  });

  // Bob Practice Sessions designed to test weak-topic detection:
  // 10 Verbal Ability questions answered, exactly 3 correct (30% accuracy, below 50% and >= 8 questions)
  const verbalQuestions = await prisma.aptitudeQuestion.findMany({
    where: { topicId: verbalTopic!.id },
    take: 10,
  });
  const bobPracticeVerbal = await prisma.testAttempt.create({
    data: {
      studentId: bob.id,
      attemptType: 'practice',
      status: 'submitted',
      score: 3,
      totalMarks: 10,
      startTime: new Date(now - 20 * dayMs),
      endTime: new Date(now - 20 * dayMs + 15 * 60 * 1000),
    },
  });
  for (let i = 0; i < verbalQuestions.length; i++) {
    const q = verbalQuestions[i];
    const isCorrect = i < 3; // 30% accuracy
    await prisma.studentAnswer.create({
      data: {
        attemptId: bobPracticeVerbal.id,
        questionId: q.id,
        selectedOption: isCorrect ? q.correctOption : (q.correctOption === 'A' ? 'B' : 'A'),
        isCorrect,
      },
    });
  }

  // Quant: 10 answered, 8 correct (80% accuracy)
  const quantQuestions = await prisma.aptitudeQuestion.findMany({
    where: { topicId: quantTopic!.id },
    take: 10,
  });
  const bobPracticeQuant = await prisma.testAttempt.create({
    data: {
      studentId: bob.id,
      attemptType: 'practice',
      status: 'submitted',
      score: 8,
      totalMarks: 10,
      startTime: new Date(now - 18 * dayMs),
      endTime: new Date(now - 18 * dayMs + 18 * 60 * 1000),
    },
  });
  for (let i = 0; i < quantQuestions.length; i++) {
    const q = quantQuestions[i];
    const isCorrect = i < 8; // 80% accuracy
    await prisma.studentAnswer.create({
      data: {
        attemptId: bobPracticeQuant.id,
        questionId: q.id,
        selectedOption: isCorrect ? q.correctOption : (q.correctOption === 'A' ? 'B' : 'A'),
        isCorrect,
      },
    });
  }

  // Logical: 10 answered, 7 correct (70% accuracy)
  const logicalQuestions = await prisma.aptitudeQuestion.findMany({
    where: { topicId: logicalTopic!.id },
    take: 10,
  });
  const bobPracticeLogical = await prisma.testAttempt.create({
    data: {
      studentId: bob.id,
      attemptType: 'practice',
      status: 'submitted',
      score: 7,
      totalMarks: 10,
      startTime: new Date(now - 15 * dayMs),
      endTime: new Date(now - 15 * dayMs + 17 * 60 * 1000),
    },
  });
  for (let i = 0; i < logicalQuestions.length; i++) {
    const q = logicalQuestions[i];
    const isCorrect = i < 7; // 70% accuracy
    await prisma.studentAnswer.create({
      data: {
        attemptId: bobPracticeLogical.id,
        questionId: q.id,
        selectedOption: isCorrect ? q.correctOption : (q.correctOption === 'A' ? 'B' : 'A'),
        isCorrect,
      },
    });
  }

  // Bob Mock Attempts: 12/20 (60%)
  const bobMock = await prisma.testAttempt.create({
    data: {
      testId: test2025.id,
      studentId: bob.id,
      attemptType: 'mock',
      status: 'submitted',
      score: 12,
      totalMarks: 20,
      startTime: new Date(now - 7 * dayMs),
      endTime: new Date(now - 7 * dayMs + 26 * 60 * 1000),
    },
  });
  for (let i = 0; i < test2025Questions.length; i++) {
    const q = test2025Questions[i].question;
    const isCorrect = i < 12;
    await prisma.studentAnswer.create({
      data: {
        attemptId: bobMock.id,
        questionId: q.id,
        selectedOption: isCorrect ? q.correctOption : (q.correctOption === 'A' ? 'B' : 'A'),
        isCorrect,
      },
    });
  }

  // Bob Solved Coding Problems: 4 distinct problems solved
  const bobSolvedSlugs = ['array-sum', 'contains-duplicate', 'reverse-string', 'find-maximum'];
  for (const slug of bobSolvedSlugs) {
    const prob = seededProblems[slug];
    if (prob) {
      await prisma.codingSubmission.create({
        data: {
          problemId: prob.id,
          studentId: bob.id,
          language: 'python',
          code: `# Bob Solution for ${prob.title}`,
          passedTestCases: prob.testCases.length,
          totalTestCases: prob.testCases.length,
          isPassed: true,
          createdAt: new Date(now - 8 * dayMs),
        },
      });
    }
  }

  // --- PERSONA 3: CAROL ---
  // Improving trend: scores rising from ~40% to ~70% across 5 attempts over 6 weeks
  await prisma.studentProfile.update({
    where: { userId: carol.id },
    data: {
      cgpa: 6.5,
      resumeUrl: null,
      targetRole: null,
      placementStatus: 'not_placed',
      knowledgeLevel: 'beginner',
    },
  });

  const carolScores = [
    { daysAgo: 38, score: 6, total: 15 }, // 40%
    { daysAgo: 28, score: 7, total: 15 }, // ~47%
    { daysAgo: 19, score: 8, total: 15 }, // ~53%
    { daysAgo: 10, score: 10, total: 15 }, // ~67%
    { daysAgo: 2, score: 11, total: 15 }, // ~73%
  ];

  for (const cs of carolScores) {
    const att = await prisma.testAttempt.create({
      data: {
        testId: test2026.id,
        studentId: carol.id,
        attemptType: 'mock',
        status: 'submitted',
        score: cs.score,
        totalMarks: cs.total,
        startTime: new Date(now - cs.daysAgo * dayMs),
        endTime: new Date(now - cs.daysAgo * dayMs + 22 * 60 * 1000),
      },
    });

    for (let i = 0; i < test2026Questions.length; i++) {
      const q = test2026Questions[i].question;
      const isCorrect = i < cs.score;
      await prisma.studentAnswer.create({
        data: {
          attemptId: att.id,
          questionId: q.id,
          selectedOption: isCorrect ? q.correctOption : (q.correctOption === 'A' ? 'B' : 'A'),
          isCorrect,
        },
      });
    }
  }

  // Carol solved coding problems: 2 distinct problems
  const carolSolvedSlugs = ['array-sum', 'reverse-string'];
  for (const slug of carolSolvedSlugs) {
    const prob = seededProblems[slug];
    await prisma.codingSubmission.create({
      data: {
        problemId: prob.id,
        studentId: carol.id,
        language: 'python',
        code: `# Carol Solution for ${prob.title}`,
        passedTestCases: prob.testCases.length,
        totalTestCases: prob.testCases.length,
        isPassed: true,
        createdAt: new Date(now - 5 * dayMs),
      },
    });
  }

  // --- PERSONA 4: DAVE ---
  // Beginner level: 1 practice session, no mock tests, 1 coding problem attempted but not solved
  await prisma.studentProfile.update({
    where: { userId: dave.id },
    data: {
      cgpa: 8.2,
      resumeUrl: null,
      targetRole: null,
      placementStatus: 'not_placed',
      knowledgeLevel: 'beginner',
    },
  });

  const davePractice = await prisma.testAttempt.create({
    data: {
      studentId: dave.id,
      attemptType: 'practice',
      status: 'submitted',
      score: 2,
      totalMarks: 5,
      startTime: new Date(now - 12 * dayMs),
      endTime: new Date(now - 12 * dayMs + 10 * 60 * 1000),
    },
  });
  for (let i = 0; i < 5; i++) {
    const q = quantQuestions[i];
    const isCorrect = i < 2;
    await prisma.studentAnswer.create({
      data: {
        attemptId: davePractice.id,
        questionId: q.id,
        selectedOption: isCorrect ? q.correctOption : (q.correctOption === 'A' ? 'B' : 'A'),
        isCorrect,
      },
    });
  }

  // Dave attempted 1 coding problem but failed
  const daveProb = seededProblems['array-sum'];
  await prisma.codingSubmission.create({
    data: {
      problemId: daveProb.id,
      studentId: dave.id,
      language: 'python',
      code: 'print(0)',
      passedTestCases: 0,
      totalTestCases: daveProb.testCases.length,
      isPassed: false,
      createdAt: new Date(now - 11 * dayMs),
    },
  });

  // --- PERSONA 5: EVE ---
  // No activity at all! Demonstrates empty states and appears in PO attention list
  await prisma.studentProfile.update({
    where: { userId: eve.id },
    data: {
      cgpa: 8.9,
      resumeUrl: null,
      targetRole: null,
      placementStatus: 'not_placed',
      knowledgeLevel: 'intermediate',
    },
  });

  console.log('  ✅ 5 student personas configured with verified activity');

  // =========================================================================
  // 8. VERIFICATION OUTPUT & HAND-VERIFICATION OF WEIGHTS
  // =========================================================================
  console.log('\n================================================================');
  console.log('📋 PERSONA SUMMARY TABLE & READINESS VERIFICATION');
  console.log('================================================================');

  const personas = [
    { name: 'Alice', id: alice.id },
    { name: 'Bob', id: bob.id },
    { name: 'Carol', id: carol.id },
    { name: 'Dave', id: dave.id },
    { name: 'Eve', id: eve.id },
  ];

  const totalCodingProblemsCount = await prisma.codingProblem.count();

  for (const p of personas) {
    const [mockAttempts, practiceAttempts, allCodingSubmissions, codingSolved, profile, answers, readiness] = await Promise.all([
      prisma.testAttempt.findMany({ where: { studentId: p.id, attemptType: 'mock', status: 'submitted' } }),
      prisma.testAttempt.findMany({ where: { studentId: p.id, attemptType: 'practice', status: 'submitted' } }),
      prisma.codingSubmission.findMany({ where: { studentId: p.id } }),
      prisma.codingSubmission.findMany({ where: { studentId: p.id, isPassed: true }, distinct: ['problemId'] }),
      prisma.studentProfile.findUnique({ where: { userId: p.id } }),
      prisma.studentAnswer.findMany({
        where: { attempt: { studentId: p.id, status: 'submitted' } },
        include: { question: { include: { topic: true } } },
      }),
      calculateStudentReadiness(p.id),
    ]);

    // Unique attempted problems
    const attemptedProblemIds = new Set(allCodingSubmissions.map(s => s.problemId));
    const solvedProblemIds = new Set(codingSolved.map(s => s.problemId));
    const attemptedUnsolvedCount = Array.from(attemptedProblemIds).filter(id => !solvedProblemIds.has(id)).length;

    // Independent hand calculation
    const avgMockPct = mockAttempts.length > 0
      ? mockAttempts.reduce((s, a) => s + ((a.score || 0) / (a.totalMarks || 1)) * 100, 0) / mockAttempts.length
      : 0;
    const handAptitude = (avgMockPct / 100) * 60;
    const handCoding = totalCodingProblemsCount > 0 ? (solvedProblemIds.size / totalCodingProblemsCount) * 30 : 0;
    let handProfile = 0;
    if (profile?.cgpa !== null && profile?.cgpa !== undefined) handProfile += 3;
    if (profile?.resumeUrl) handProfile += 3;
    if (profile?.branchId) handProfile += 2;
    if (profile?.targetRole) handProfile += 2;
    const handTotal = Math.round(handAptitude + handCoding + handProfile);
    const handBand =
      handTotal > 70 ? 'Ready (>70)' :
      handTotal >= 40 ? 'Almost Ready (40-70)' :
      'Not Ready (<40)';

    const match = handTotal === readiness.score && handBand === readiness.band;

    console.log(`\n• ${p.name.toUpperCase()} (${profile?.placementStatus}):`);
    console.log(`   Readiness Score:  ${readiness.score} / 100 [${readiness.band}] (Hand Calc: ${handTotal} [${handBand}] -> Match: ${match ? 'EXACT' : 'MISMATCH'})`);
    console.log(`   Breakdown (API):  Aptitude=${readiness.breakdown.aptitude}/60, Coding=${readiness.breakdown.coding}/30, Profile=${readiness.breakdown.profile}/10`);
    console.log(`   Breakdown (Hand): Aptitude=${handAptitude.toFixed(2)}/60, Coding=${handCoding.toFixed(2)}/30, Profile=${handProfile}/10`);
    console.log(`   Coding Stats:     Attempted=${attemptedProblemIds.size}, Solved=${solvedProblemIds.size}, Attempted-But-Unsolved=${attemptedUnsolvedCount}`);
    console.log(`   Mock Attempts:    ${mockAttempts.length} (Avg Mock %: ${avgMockPct.toFixed(2)}%)`);
    console.log(`   Profile Inputs:   CGPA=${profile?.cgpa ?? 'None'}, Resume=${Boolean(profile?.resumeUrl)}, Branch=${Boolean(profile?.branchId)}, TargetRole=${Boolean(profile?.targetRole)}`);
  }

  console.log('\n----------------------------------------------------------------');
  console.log('🔍 FORMULA EXPLANATION & GAP RESOLUTION (84 vs 80 and 53 vs 54):');
  console.log('----------------------------------------------------------------');
  console.log('  Earlier gaps occurred because:');
  console.log('  1. po.controller.ts getStudents previously omitted coding score and used 75/50/25 thresholds.');
  console.log('  2. analytics.controller.ts and student.controller.ts computed coding score differently with divergent band labels ("Preparing" vs "Not Ready").');
  console.log('  3. Unified readiness.ts is now the single source of truth across all endpoints:');
  console.log('     Formula: round( Aptitude(avgMock% * 0.60) + Coding(30 * distinctSolved / totalProblems) + Profile(CGPA:3, Resume:3, Branch:2, Role:2) )');
  console.log('     Bands: Not Ready (<40), Almost Ready (40-70), Ready (>70)');
  console.log('================================================================\n');

  console.log('\x1b[32m✅ DEMO SEED COMPLETED SUCCESSFULLY!\x1b[0m\n');
}

seedDemo().catch((err) => {
  console.error('Fatal demo seed error:', err);
  process.exit(1);
});
