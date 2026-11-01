/**
 * seed-dept-content.ts
 * ------------------------------------------------------------
 * Seeds department-scoped demo content so the new branch-based
 * access control is demonstrable end-to-end:
 *
 *   For each department (CS, ME, CE, EC, EE, IT):
 *     - 2 aptitude questions (branch-scoped)
 *     - 1 coding problem (branch-scoped)
 *     - 1 mock test (branch-scoped)
 *     - 1 study Resource (branch-scoped, institution visibility)
 *     - 1 TrainingResource hub entry (branch-scoped)
 *     - 1 learning module (branch-scoped)
 *     - 1 interview preparation plan (branch-scoped)
 *
 *   Plus one GLOBAL row of each type (branchId = null) to prove
 *   global content stays visible to every department.
 *
 * Idempotent: safe to run repeatedly — skips rows that already exist.
 * Run:  npx tsx scripts/seed-dept-content.ts
 */
import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';

const DEPARTMENTS = ['CS', 'ME', 'CE', 'EC', 'EE', 'IT'] as const;

async function main() {
  console.log('Seeding department-scoped content...\n');

  // Staff accounts that own the content
  const trainer = await prisma.user.findFirst({ where: { role: 'trainer' } });
  if (!trainer) throw new Error('No trainer user found. Run `npm run seed` first.');
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const owner = admin ?? trainer;

  const branches = await prisma.branch.findMany({ where: { code: { in: DEPARTMENTS as unknown as string[] } } });
  const byCode = new Map(branches.map((b) => [b.code as string, b]));
  console.log(`Found ${branches.length} department branches: ${branches.map((b) => b.code).join(', ')}`);

  // A dedicated topic (shared taxonomy; questions are what get scoped)
  const topicName = 'Departmental Aptitude Practice';
  let topic = await prisma.topic.findUnique({ where: { name: topicName } });
  if (!topic) {
    topic = await prisma.topic.create({ data: { name: topicName, type: 'aptitude' } });
    console.log('  + topic created');
  }

  const codingTopicName = 'Departmental Coding Practice';
  let codingTopic = await prisma.topic.findUnique({ where: { name: codingTopicName } });
  if (!codingTopic) {
    codingTopic = await prisma.topic.create({ data: { name: codingTopicName, type: 'coding' } });
    console.log('  + coding topic created');
  }

  const summary = { questions: 0, problems: 0, tests: 0, resources: 0, trainingResources: 0, modules: 0, plans: 0 };

  for (const code of DEPARTMENTS) {
    const branch = byCode.get(code);
    if (!branch) {
      console.log(`  ! branch ${code} not found — skipping`);
      continue;
    }

    // ---- Aptitude questions ----
    for (let i = 1; i <= 2; i++) {
      const text = `[${code}] Department-scoped aptitude question ${i}: ${branch.name} specific reasoning problem.`;
      const existing = await prisma.aptitudeQuestion.findFirst({ where: { questionText: text } });
      if (!existing) {
        await prisma.aptitudeQuestion.create({
          data: {
            topicId: topic.id,
            branchId: branch.id,
            difficulty: i === 1 ? 'easy' : 'medium',
            questionText: text,
            optionA: 'Option A', optionB: 'Option B', optionC: 'Option C', optionD: 'Option D',
            correctOption: 'A',
            explanation: `Specific to ${branch.name}.`,
          },
        });
        summary.questions++;
      }
    }

    // ---- Coding problem ----
    const slug = `dept-${code.toLowerCase()}-signature-problem`;
    const existingProblem = await prisma.codingProblem.findUnique({ where: { slug } });
    if (!existingProblem) {
      await prisma.codingProblem.create({
        data: {
          topicId: codingTopic.id,
          branchId: branch.id,
          difficulty: 'medium',
          title: `[${code}] Department Signature Challenge`,
          slug,
          description: `A ${branch.name} flavored coding challenge. Visible only to ${code} students.`,
          sampleInput: '3\n1 2 3',
          sampleOutput: '6',
          tags: [code, 'department'],
          testCases: {
            create: [
              { input: '3\n1 2 3', expectedOutput: '6', isHidden: false },
              { input: '2\n10 20', expectedOutput: '30', isHidden: true },
            ],
          },
        },
      });
      summary.problems++;
    }

    // ---- Mock test ----
    const testTitle = `[${code}] Department Placement Readiness Test`;
    const existingTest = await prisma.mockTest.findFirst({ where: { title: testTitle } });
    if (!existingTest) {
      const qs = await prisma.aptitudeQuestion.findMany({
        where: { branchId: branch.id, topicId: topic.id },
        select: { id: true },
      });
      if (qs.length > 0) {
        await prisma.mockTest.create({
          data: {
            title: testTitle,
            description: `Timed assessment for ${branch.name} students only.`,
            durationMins: 15,
            branchId: branch.id,
            maxAttempts: 2,
            status: 'published',
            createdBy: owner.id,
            questions: { create: qs.map((q) => ({ questionId: q.id })) },
          },
        });
        summary.tests++;
      }
    }

    // ---- Study Resource (upload library) ----
    const resTitle = `[${code}] Department Study Pack — Core Concepts`;
    const existingRes = await prisma.resource.findFirst({ where: { title: resTitle } });
    if (!existingRes) {
      await prisma.resource.create({
        data: {
          title: resTitle,
          description: `Curated study material for ${branch.name}.`,
          fileUrl: `/uploads/dept-${code.toLowerCase()}-study-pack.pdf`,
          topicId: topic.id,
          branchId: branch.id,
          uploadedBy: trainer.id,
          visibility: 'institution',
        },
      });
      summary.resources++;
    }

    // ---- TrainingResource (hub) ----
    const trTitle = `[${code}] Department Learning Path — Interview Track`;
    const existingTr = await prisma.trainingResource.findFirst({ where: { title: trTitle } });
    if (!existingTr) {
      await prisma.trainingResource.create({
        data: {
          title: trTitle,
          description: `Interview preparation track tailored to ${branch.name}.`,
          resourceType: 'course',
          provider: 'Internal',
          category: code,
          difficulty: 'Intermediate',
          tags: [code, 'interview'],
          status: 'published',
          branchId: branch.id,
          createdBy: owner.id,
        },
      });
      summary.trainingResources++;
    }

    // ---- Learning module ----
    const modTitle = `[${code}] Department Foundations Module`;
    const existingMod = await prisma.learningModule.findFirst({ where: { title: modTitle } });
    if (!existingMod) {
      await prisma.learningModule.create({
        data: {
          title: modTitle,
          description: `Foundational module for ${branch.name} placement prep.`,
          level: 'beginner',
          topicId: topic.id,
          branchId: branch.id,
          createdBy: owner.id,
        },
      });
      summary.modules++;
    }

    // ---- Interview preparation plan ----
    const planTitle = `[${code}] 14-Day Interview Preparation Plan`;
    const existingPlan = await prisma.interviewPreparationPlan.findUnique({ where: { title: planTitle } });
    if (!existingPlan) {
      await prisma.interviewPreparationPlan.create({
        data: {
          title: planTitle,
          durationDays: 14,
          targetRole: `${branch.name} Graduate Trainee`,
          difficulty: 'medium',
          description: `Interview preparation plan exclusive to ${branch.name} students.`,
          status: 'published',
          branchId: branch.id,
        },
      });
      summary.plans++;
    }
  }

  // ---- One GLOBAL row of each type (branchId = null) ----
  const globalQ = '[GLOBAL] Cross-department aptitude warm-up';
  if (!(await prisma.aptitudeQuestion.findFirst({ where: { questionText: globalQ } }))) {
    await prisma.aptitudeQuestion.create({
      data: {
        topicId: topic.id,
        branchId: null,
        difficulty: 'easy',
        questionText: globalQ,
        optionA: 'Option A', optionB: 'Option B', optionC: 'Option C', optionD: 'Option D',
        correctOption: 'B',
      },
    });
    summary.questions++;
  }

  const globalSlug = 'global-cross-department-warmup';
  if (!(await prisma.codingProblem.findUnique({ where: { slug: globalSlug } }))) {
    await prisma.codingProblem.create({
      data: {
        topicId: codingTopic.id,
        branchId: null,
        difficulty: 'easy',
        title: '[GLOBAL] Cross-Department Warm-up',
        slug: globalSlug,
        description: 'A global warm-up challenge visible to every department.',
        sampleInput: '2\n1 2',
        sampleOutput: '3',
        tags: ['global'],
        testCases: { create: [{ input: '2\n1 2', expectedOutput: '3', isHidden: false }] },
      },
    });
    summary.problems++;
  }

  console.log(
    `\n✅ Done. Created: ${summary.questions} questions, ${summary.problems} problems, ` +
    `${summary.tests} tests, ${summary.resources} resources, ${summary.trainingResources} hub resources, ` +
    `${summary.modules} modules, ${summary.plans} plans. ` +
    `(Existing rows were skipped — the script is idempotent.)`
  );
  console.log('\nYou can now verify: a CS student calling GET /api/questions will NOT see [ME]/[CE]/[EC]/[EE]/[IT] rows.');
}

main()
  .catch((e) => { console.error('SEED FAILED:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
