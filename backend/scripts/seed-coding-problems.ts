import { prisma } from '../src/config/prisma.js';

async function main() {
  console.log('🌱 Seeding Global Coding Interview Problems...');

  // Get or create topics
  const arrayTopic = await prisma.topic.upsert({
    where: { name: 'Arrays' },
    update: {},
    create: { name: 'Arrays', type: 'coding' }
  });
  const stringTopic = await prisma.topic.upsert({
    where: { name: 'Strings' },
    update: {},
    create: { name: 'Strings', type: 'coding' }
  });
  const sqlTopic = await prisma.topic.upsert({
    where: { name: 'SQL' },
    update: {},
    create: { name: 'SQL', type: 'coding' }
  });

  const problems = [
    {
      title: 'Two Sum',
      slug: 'two-sum',
      topicId: arrayTopic.id,
      difficulty: 'easy' as const,
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
      inputFormat: 'First line: N (size of array)\nSecond line: N space-separated integers\nThird line: target',
      outputFormat: 'Two space-separated indices',
      constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.',
      sampleInput: '4\n2 7 11 15\n9',
      sampleOutput: '0 1',
      tags: ['Array', 'Hash Table'],
      companyTags: ['Amazon', 'Google', 'Adobe', 'Apple'],
      testCases: [
        { input: '4\n2 7 11 15\n9', expectedOutput: '0 1', isHidden: false },
        { input: '3\n3 2 4\n6', expectedOutput: '1 2', isHidden: true },
        { input: '2\n3 3\n6', expectedOutput: '0 1', isHidden: true }
      ]
    },
    {
      title: 'Valid Parentheses',
      slug: 'valid-parentheses',
      topicId: stringTopic.id,
      difficulty: 'easy' as const,
      description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: 1. Open brackets must be closed by the same type of brackets. 2. Open brackets must be closed in the correct order.",
      inputFormat: 'A single string s',
      outputFormat: 'true if valid, false otherwise',
      constraints: "1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'.",
      sampleInput: '()[]{}',
      sampleOutput: 'true',
      tags: ['String', 'Stack'],
      companyTags: ['Microsoft', 'Amazon', 'Google'],
      testCases: [
        { input: '()', expectedOutput: 'true', isHidden: false },
        { input: '(]', expectedOutput: 'false', isHidden: true }
      ]
    },
    {
      title: 'Second Highest Salary (SQL)',
      slug: 'second-highest-salary',
      topicId: sqlTopic.id,
      difficulty: 'medium' as const,
      description: 'Write a SQL query to get the second highest salary from the Employee table. If there is no second highest salary, then the query should return null.',
      inputFormat: 'SQL execution environment',
      outputFormat: 'Second highest salary or null',
      constraints: 'Table Employee(id, salary)',
      sampleInput: 'Employee table:\n1 100\n2 200\n3 300',
      sampleOutput: '200',
      tags: ['SQL', 'Database'],
      companyTags: ['Amazon', 'Oracle', 'Microsoft'],
      testCases: []
    }
  ];

  for (const p of problems) {
    const { testCases, ...problemData } = p;
    const problem = await prisma.codingProblem.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...problemData, status: 'published', license: 'Original' }
    });

    for (const tc of testCases) {
      const existingTc = await prisma.codingTestCase.findFirst({
        where: { problemId: problem.id, input: tc.input }
      });
      if (!existingTc) {
        await prisma.codingTestCase.create({
          data: { ...tc, problemId: problem.id }
        });
      }
    }
  }
  console.log(`  ✅ ${problems.length} Coding problems seeded`);

  // Create a 7-Day Prep Plan
  const plan = await prisma.interviewPreparationPlan.upsert({
    where: { title: '7-Day Coding Interview Crash Course' },
    update: {},
    create: {
      title: '7-Day Coding Interview Crash Course',
      durationDays: 7,
      targetRole: 'Software Engineer',
      difficulty: 'easy',
      description: 'A fast-paced plan covering arrays, strings, and basic SQL.'
    }
  });

  const twoSum = await prisma.codingProblem.findUnique({ where: { slug: 'two-sum' } });
  const validParens = await prisma.codingProblem.findUnique({ where: { slug: 'valid-parentheses' } });

  const existingTask1 = await prisma.interviewPreparationTask.findFirst({
    where: { planId: plan.id, dayNumber: 1 }
  });
  if (!existingTask1 && twoSum) {
    await prisma.interviewPreparationTask.create({
      data: { planId: plan.id, dayNumber: 1, problemId: twoSum.id, title: 'Solve Two Sum' }
    });
  }

  const existingTask2 = await prisma.interviewPreparationTask.findFirst({
    where: { planId: plan.id, dayNumber: 2 }
  });
  if (!existingTask2 && validParens) {
    await prisma.interviewPreparationTask.create({
      data: { planId: plan.id, dayNumber: 2, problemId: validParens.id, title: 'Solve Valid Parentheses' }
    });
  }

  console.log('  ✅ Preparation Plan seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

