import { prisma } from './config/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding IntelliPlace database...');

  // WARNING: This removes existing application data before reseeding.
  // Run only against a development database.

  // ============ CLEAR (FK-safe order) ============
  await prisma.notificationRecipient.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.testAttempt.deleteMany();
  await prisma.codingSubmission.deleteMany();
  await prisma.mockTestQuestion.deleteMany();
  await prisma.mockTest.deleteMany();
  await prisma.codingTestCase.deleteMany();
  await prisma.codingProblem.deleteMany();
  await prisma.aptitudeQuestion.deleteMany();
  await prisma.studentTargetCompany.deleteMany();
  await prisma.companyTopic.deleteMany();
  await prisma.companyEligibleBranch.deleteMany();
  await prisma.company.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.branch.deleteMany();

  // ============ BRANCHES & BATCHES ============
  const cse = await prisma.branch.create({
    data: { name: 'CSE' },
  });

  const it = await prisma.branch.create({
    data: { name: 'IT' },
  });

  const ece = await prisma.branch.create({
    data: { name: 'ECE' },
  });

  console.log('  ✅ Branches: CSE, IT, ECE');

  const batch2025 = await prisma.batch.create({
    data: { name: '2025', graduationYear: 2025 },
  });

  const batch2026 = await prisma.batch.create({
    data: { name: '2026', graduationYear: 2026 },
  });

  console.log('  ✅ Batches: 2025, 2026');

  // ============ TOPICS ============
  const quant = await prisma.topic.create({
    data: {
      name: 'Quantitative Aptitude',
      type: 'aptitude',
    },
  });

  const logical = await prisma.topic.create({
    data: {
      name: 'Logical Reasoning',
      type: 'aptitude',
    },
  });

  const verbal = await prisma.topic.create({
    data: {
      name: 'Verbal Ability',
      type: 'aptitude',
    },
  });

  const arrays = await prisma.topic.create({
    data: {
      name: 'Arrays',
      type: 'coding',
    },
  });

  const strings = await prisma.topic.create({
    data: {
      name: 'Strings',
      type: 'coding',
    },
  });

  console.log('  ✅ Topics: Quant, Logical, Verbal, Arrays, Strings');

  // ============ USERS ============
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const poHash = await bcrypt.hash('Po@12345', 10);
  const trainerHash = await bcrypt.hash('Trainer@123', 10);
  const studentHash = await bcrypt.hash('Student@123', 10);

  await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@intelliplace.edu',
      passwordHash: adminHash,
      role: 'admin',
    },
  });

  const po = await prisma.user.create({
    data: {
      name: 'Placement Officer',
      email: 'po@intelliplace.edu',
      passwordHash: poHash,
      role: 'po',
    },
  });

  // Store trainer1 because the mock test uses trainer1.id.
  const trainer1 = await prisma.user.create({
    data: {
      name: 'Rahul Trainer',
      email: 'trainer1@intelliplace.edu',
      passwordHash: trainerHash,
      role: 'trainer',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Priya Trainer',
      email: 'trainer2@intelliplace.edu',
      passwordHash: trainerHash,
      role: 'trainer',
    },
  });

  console.log('  ✅ Staff: 1 admin, 1 PO, 2 trainers');

  const studentData = [
    {
      name: 'Alice Johnson',
      email: 'alice@student.edu',
      level: 'advanced' as const,
      cgpa: 9.1,
      branchId: cse.id,
      batchId: batch2025.id,
      status: 'not_placed' as const,
    },
    {
      name: 'Bob Smith',
      email: 'bob@student.edu',
      level: 'intermediate' as const,
      cgpa: 7.8,
      branchId: cse.id,
      batchId: batch2025.id,
      status: 'not_placed' as const,
    },
    {
      name: 'Carol Williams',
      email: 'carol@student.edu',
      level: 'beginner' as const,
      cgpa: 6.5,
      branchId: it.id,
      batchId: batch2026.id,
      status: 'not_placed' as const,
    },
    {
      name: 'Dave Brown',
      email: 'dave@student.edu',
      level: 'intermediate' as const,
      cgpa: 8.2,
      branchId: ece.id,
      batchId: batch2025.id,
      status: 'in_process' as const,
    },
    {
      name: 'Eve Davis',
      email: 'eve@student.edu',
      level: 'advanced' as const,
      cgpa: 8.9,
      branchId: it.id,
      batchId: batch2026.id,
      status: 'placed' as const,
    },
  ];

  const students: { id: string }[] = [];

  for (const s of studentData) {
    const student = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        passwordHash: studentHash,
        role: 'student',
        studentProfile: {
          create: {
            knowledgeLevel: s.level,
            cgpa: s.cgpa,
            branchId: s.branchId,
            batchId: s.batchId,
            placementStatus: s.status,
          },
        },
      },
    });

    students.push(student);
  }

  console.log(
    '  ✅ Students: 5 (mixed levels, branches, batches, statuses)'
  );

  // ============ APTITUDE QUESTIONS ============
  console.log('  Seeding aptitude questions...');

  const quantQuestions = [
    {
      topicId: quant.id,
      difficulty: 'easy' as const,
      questionText:
        'A train travels 120 km in 2 hours. What is its average speed?',
      optionA: '40 km/h',
      optionB: '50 km/h',
      optionC: '60 km/h',
      optionD: '70 km/h',
      correctOption: 'C',
      explanation: 'Speed = Distance/Time = 120/2 = 60 km/h',
    },
    {
      topicId: quant.id,
      difficulty: 'easy' as const,
      questionText: 'What is 15% of 240?',
      optionA: '32',
      optionB: '36',
      optionC: '38',
      optionD: '40',
      correctOption: 'B',
      explanation: '15% of 240 = (15/100)×240 = 36',
    },
    {
      topicId: quant.id,
      difficulty: 'easy' as const,
      questionText: 'If x + 5 = 12, what is the value of x?',
      optionA: '5',
      optionB: '6',
      optionC: '7',
      optionD: '8',
      correctOption: 'C',
      explanation: 'x = 12 - 5 = 7',
    },
    {
      topicId: quant.id,
      difficulty: 'medium' as const,
      questionText:
        'A shopkeeper buys an item for ₹500 and sells it for ₹600. What is his profit percentage?',
      optionA: '15%',
      optionB: '18%',
      optionC: '20%',
      optionD: '25%',
      correctOption: 'C',
      explanation: 'Profit = 100, Profit% = (100/500)×100 = 20%',
    },
    {
      topicId: quant.id,
      difficulty: 'medium' as const,
      questionText:
        "The ratio of ages of A and B is 3:4. After 5 years, the ratio becomes 4:5. What is A's present age?",
      optionA: '12',
      optionB: '15',
      optionC: '18',
      optionD: '21',
      correctOption: 'B',
      explanation:
        '3x+5 / 4x+5 = 4/5 → 15x+25 = 16x+20 → x=5, A = 15',
    },
    {
      topicId: quant.id,
      difficulty: 'hard' as const,
      questionText:
        'A can do a work in 10 days, B in 15 days. Working together, how many days?',
      optionA: '5',
      optionB: '6',
      optionC: '7',
      optionD: '8',
      correctOption: 'B',
      explanation: 'Rate = 1/10 + 1/15 = 1/6, so 6 days',
    },
  ] as const;

  const logicalQuestions = [
    {
      topicId: logical.id,
      difficulty: 'easy' as const,
      questionText: 'Find the next number: 2, 4, 8, 16, ?',
      optionA: '24',
      optionB: '30',
      optionC: '32',
      optionD: '36',
      correctOption: 'C',
      explanation:
        'Each term doubles: 2×2=4, 4×2=8, 8×2=16, 16×2=32',
    },
    {
      topicId: logical.id,
      difficulty: 'easy' as const,
      questionText: 'If CAT is coded as 3-1-20, how is DOG coded?',
      optionA: '4-15-7',
      optionB: '5-14-8',
      optionC: '4-14-7',
      optionD: '5-15-7',
      correctOption: 'A',
      explanation: 'D=4, O=15, G=7',
    },
    {
      topicId: logical.id,
      difficulty: 'medium' as const,
      questionText:
        'A is taller than B. C is shorter than B. D is taller than A. Who is tallest?',
      optionA: 'A',
      optionB: 'B',
      optionC: 'C',
      optionD: 'D',
      correctOption: 'D',
      explanation: 'D > A > B > C',
    },
    {
      topicId: logical.id,
      difficulty: 'medium' as const,
      questionText:
        'Find the odd one out: Rectangle, Square, Triangle, Circle',
      optionA: 'Rectangle',
      optionB: 'Square',
      optionC: 'Triangle',
      optionD: 'Circle',
      correctOption: 'D',
      explanation: 'Circle has no straight edges/sides',
    },
    {
      topicId: logical.id,
      difficulty: 'hard' as const,
      questionText:
        'If all roses are flowers and some flowers fade quickly, then:',
      optionA: 'All roses fade quickly',
      optionB: 'Some roses fade quickly',
      optionC: 'No roses fade quickly',
      optionD: 'None of the above necessarily follows',
      correctOption: 'D',
      explanation:
        'We cannot conclude any specific relationship between roses and fading',
    },
  ] as const;

  const verbalQuestions = [
    {
      topicId: verbal.id,
      difficulty: 'easy' as const,
      questionText: 'Choose the correct spelling:',
      optionA: 'Recieve',
      optionB: 'Receive',
      optionC: 'Receeve',
      optionD: 'Recive',
      correctOption: 'B',
      explanation: 'Receive follows "i before e except after c"',
    },
    {
      topicId: verbal.id,
      difficulty: 'easy' as const,
      questionText: 'Synonym of "Abundant":',
      optionA: 'Scarce',
      optionB: 'Plentiful',
      optionC: 'Limited',
      optionD: 'Rare',
      correctOption: 'B',
      explanation:
        'Abundant means existing in large quantities = plentiful',
    },
    {
      topicId: verbal.id,
      difficulty: 'medium' as const,
      questionText:
        'Choose the word opposite in meaning to "Benevolent":',
      optionA: 'Kind',
      optionB: 'Generous',
      optionC: 'Malicious',
      optionD: 'Caring',
      correctOption: 'C',
      explanation:
        'Benevolent = kind/well-meaning; opposite = malicious',
    },
    {
      topicId: verbal.id,
      difficulty: 'medium' as const,
      questionText:
        'Identify the error: "She have been working here since 2019."',
      optionA: 'She',
      optionB: 'have been',
      optionC: 'working',
      optionD: 'since',
      correctOption: 'B',
      explanation:
        'Subject "She" requires "has been", not "have been"',
    },
    {
      topicId: verbal.id,
      difficulty: 'hard' as const,
      questionText: 'Choose the correct sentence:',
      optionA: 'He is senior than me',
      optionB: 'He is senior to me',
      optionC: 'He is more senior than me',
      optionD: 'He is senior from me',
      correctOption: 'B',
      explanation: '"Senior" is followed by "to", not "than"',
    },
  ] as const;

  const allQuestions = [
    ...quantQuestions,
    ...logicalQuestions,
    ...verbalQuestions,
  ];

  for (const q of allQuestions) {
    await prisma.aptitudeQuestion.create({
      data: q,
    });
  }

  console.log(`  ✅ ${allQuestions.length} aptitude questions seeded`);

  // ============ CODING PROBLEMS ============
  console.log('  Seeding coding problems...');

  const problems = [
    {
      topicId: arrays.id,
      difficulty: 'easy' as const,
      title: 'Find Maximum in Array',
      description:
        'Given an array of integers, find and print the maximum element.\n\nInput Format:\nFirst line: N (size of array)\nSecond line: N space-separated integers\n\nOutput Format:\nPrint the maximum element.',
      sampleInput: '5\n3 7 1 9 4',
      sampleOutput: '9',
      tags: ['arrays', 'basics'],
      testCases: [
        {
          input: '5\n3 7 1 9 4',
          expectedOutput: '9',
          isHidden: false,
        },
        {
          input: '3\n-5 -2 -10',
          expectedOutput: '-2',
          isHidden: true,
        },
        {
          input: '1\n42',
          expectedOutput: '42',
          isHidden: true,
        },
      ],
    },
    {
      topicId: arrays.id,
      difficulty: 'medium' as const,
      title: 'Reverse Array In-Place',
      description:
        'Reverse the given array without using extra space and print the result.\n\nInput Format:\nFirst line: N\nSecond line: N space-separated integers\n\nOutput Format:\nN space-separated integers (reversed)',
      sampleInput: '5\n1 2 3 4 5',
      sampleOutput: '5 4 3 2 1',
      tags: ['arrays', 'two-pointer'],
      testCases: [
        {
          input: '5\n1 2 3 4 5',
          expectedOutput: '5 4 3 2 1',
          isHidden: false,
        },
        {
          input: '4\n10 20 30 40',
          expectedOutput: '40 30 20 10',
          isHidden: true,
        },
      ],
    },
    {
      topicId: strings.id,
      difficulty: 'easy' as const,
      title: 'Check Palindrome',
      description:
        'Given a string, check if it reads the same forwards and backwards. Print "Yes" or "No".\n\nInput Format:\nA single string (lowercase letters only)\n\nOutput Format:\n"Yes" if palindrome, "No" otherwise.',
      sampleInput: 'racecar',
      sampleOutput: 'Yes',
      tags: ['strings', 'basics'],
      testCases: [
        {
          input: 'racecar',
          expectedOutput: 'Yes',
          isHidden: false,
        },
        {
          input: 'hello',
          expectedOutput: 'No',
          isHidden: true,
        },
        {
          input: 'a',
          expectedOutput: 'Yes',
          isHidden: true,
        },
      ],
    },
    {
      topicId: strings.id,
      difficulty: 'medium' as const,
      title: 'Count Vowels',
      description:
        'Given a string, count the number of vowels (a, e, i, o, u).\n\nInput Format:\nA single string\n\nOutput Format:\nAn integer representing the vowel count.',
      sampleInput: 'programming',
      sampleOutput: '3',
      tags: ['strings', 'counting'],
      testCases: [
        {
          input: 'programming',
          expectedOutput: '3',
          isHidden: false,
        },
        {
          input: 'aeiou',
          expectedOutput: '5',
          isHidden: true,
        },
        {
          input: 'xyz',
          expectedOutput: '0',
          isHidden: true,
        },
      ],
    },
    {
      topicId: arrays.id,
      difficulty: 'easy' as const,
      title: 'Sum of Array Elements',
      description:
        'Given an array of integers, calculate and print the sum of its elements.\n\nInput Format:\nFirst line: N (size of array)\nSecond line: N space-separated integers\n\nOutput Format:\nPrint the sum of the array elements.',
      sampleInput: '4\n1 2 3 4',
      sampleOutput: '10',
      tags: ['arrays', 'math'],
      testCases: [
        {
          input: '4\n1 2 3 4',
          expectedOutput: '10',
          isHidden: false,
        },
        {
          input: '3\n10 20 30',
          expectedOutput: '60',
          isHidden: true,
        },
        {
          input: '5\n-1 -2 -3 4 5',
          expectedOutput: '3',
          isHidden: true,
        },
      ],
    },
    {
      topicId: arrays.id,
      difficulty: 'medium' as const,
      title: 'Fibonacci Number',
      description:
        'Given an integer N, find and print the N-th Fibonacci number where F(0) = 0, F(1) = 1, and F(N) = F(N-1) + F(N-2).\n\nInput Format:\nA single integer N\n\nOutput Format:\nPrint the N-th Fibonacci number.',
      sampleInput: '6',
      sampleOutput: '8',
      tags: ['arrays', 'dp'],
      testCases: [
        {
          input: '6',
          expectedOutput: '8',
          isHidden: false,
        },
        {
          input: '0',
          expectedOutput: '0',
          isHidden: true,
        },
        {
          input: '1',
          expectedOutput: '1',
          isHidden: true,
        },
        {
          input: '10',
          expectedOutput: '55',
          isHidden: true,
        },
      ],
    },
  ];

  for (const p of problems) {
    const { testCases, ...problemData } = p;

    await prisma.codingProblem.create({
      data: {
        ...problemData,
        testCases: {
          create: testCases,
        },
      },
    });
  }

  console.log(`  ✅ ${problems.length} coding problems seeded`);

  // ============ NOTIFICATION ============
  console.log('  Seeding notification...');

  const notification = await prisma.notification.create({
    data: {
      title: 'Welcome to IntelliPlace!',
      message:
        'Start your placement preparation today. Practice aptitude questions, solve coding problems, and track your progress. Check back regularly for new mock tests and company announcements.',
      createdBy: po.id,
    },
  });

  await prisma.notificationRecipient.createMany({
    data: students.map((s) => ({
      notificationId: notification.id,
      userId: s.id,
    })),
  });

  console.log('  ✅ Welcome notification sent to all students');

  // ============ PHASE 3: MOCK TEST ============
  console.log('  Seeding mock test...');

  const allQuestionIds = await prisma.aptitudeQuestion.findMany({
    select: { id: true },
  });

  if (allQuestionIds.length === 0) {
    throw new Error(
      'Cannot create mock test: no aptitude questions found.'
    );
  }

  const mockTest = await prisma.mockTest.create({
    data: {
      title: 'Aptitude Assessment Test #1',
      description:
        'Mixed-topic test covering quantitative aptitude, logical reasoning, and verbal ability.',
      durationMins: 15,
      maxAttempts: 2,
      createdBy: trainer1.id,
      questions: {
        create: allQuestionIds.map((q) => ({
          questionId: q.id,
        })),
      },
    },
  });

  console.log(
    `  ✅ Mock test created with ${allQuestionIds.length} questions (ID: ${mockTest.id})`
  );

  // ============ COMPANIES ============
  console.log('  Seeding companies...');

  const futureDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const infosys = await prisma.company.create({
    data: {
      name: 'Infosys',
      description:
        'Global leader in next-generation digital services and consulting.',
      jobRole: 'Systems Engineer',
      package: 3.5,
      eligibilityCgpa: 7.0,
      driveDate: futureDate(14),
      syllabusText:
        'Round 1: Online Test (Quant + Logical + Verbal, 60 mins)\nRound 2: Technical Interview\nRound 3: HR Interview',
      eligibleBranches: {
        create: [
          { branchId: cse.id },
          { branchId: it.id },
        ],
      },
      topics: {
        create: [
          { topicId: quant.id },
          { topicId: logical.id },
          { topicId: verbal.id },
        ],
      },
    },
  });

  const tcs = await prisma.company.create({
    data: {
      name: 'TCS',
      description:
        'Tata Consultancy Services — IT services, consulting and business solutions.',
      jobRole: 'Assistant System Engineer',
      package: 3.36,
      eligibilityCgpa: 6.0,
      driveDate: futureDate(7),
      syllabusText:
        'Round 1: NQT (Aptitude + Coding)\nRound 2: Technical + HR Interview',
      eligibleBranches: {
        create: [
          { branchId: cse.id },
          { branchId: it.id },
          { branchId: ece.id },
        ],
      },
      topics: {
        create: [
          { topicId: quant.id },
          { topicId: logical.id },
          { topicId: arrays.id },
        ],
      },
    },
  });

  const accenture = await prisma.company.create({
    data: {
      name: 'Accenture',
      description:
        'Global professional services company with capabilities in digital, cloud and security.',
      jobRole: 'Associate Software Engineer',
      package: 4.5,
      eligibilityCgpa: 7.5,
      driveDate: futureDate(30),
      syllabusText:
        'Round 1: Cognitive + Technical Assessment\nRound 2: Coding Round\nRound 3: Interview',
      eligibleBranches: {
        create: [
          { branchId: cse.id },
          { branchId: it.id },
        ],
      },
      topics: {
        create: [
          { topicId: quant.id },
          { topicId: arrays.id },
          { topicId: strings.id },
        ],
      },
    },
  });

  // Mark Alice's target company.
  await prisma.studentTargetCompany.create({
    data: {
      userId: students[0].id,
      companyId: infosys.id,
    },
  });

  console.log(
    `  ✅ 3 companies seeded: ${infosys.name}, ${tcs.name}, ${accenture.name}`
  );
  console.log('  ✅ Alice added Infosys to her target companies');

  // ============ COMPLETION ============
  console.log('\n✅ Seeding complete!');

  console.log('\n📋 Login credentials:');
  console.log('  Admin:    admin@intelliplace.edu / Admin@123');
  console.log('  PO:       po@intelliplace.edu / Po@12345');
  console.log('  Trainer1: trainer1@intelliplace.edu / Trainer@123');
  console.log('  Trainer2: trainer2@intelliplace.edu / Trainer@123');
  console.log(
    '  Students: [alice|bob|carol|dave|eve]@student.edu / Student@123'
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });