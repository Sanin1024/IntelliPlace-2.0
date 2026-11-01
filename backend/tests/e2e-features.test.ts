import { describe, test, before as beforeAll, after as afterAll } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { prisma } from '../src/config/prisma.js';

const expect = (actual: any) => ({
  toBe: (expected: any) => assert.strictEqual(actual, expected),
  toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
  toContain: (expected: any) => {
    if (typeof actual === 'string') assert.ok(actual.includes(expected), `Expected "${actual}" to contain "${expected}"`);
    else if (Array.isArray(actual)) assert.ok(actual.includes(expected), `Expected array to contain ${expected}`);
  },
  toBeGreaterThan: (expected: any) => assert.ok(actual > expected, `Expected ${actual} > ${expected}`),
  toBeLessThanOrEqual: (expected: any) => assert.ok(actual <= expected, `Expected ${actual} <= ${expected}`),
  toBeNull: () => assert.strictEqual(actual, null),
  toBeDefined: () => assert.notStrictEqual(actual, undefined),
  not: {
    toContain: (expected: any) => {
      if (typeof actual === 'string') assert.ok(!actual.includes(expected), `Expected "${actual}" not to contain "${expected}"`);
      else if (Array.isArray(actual)) assert.ok(!actual.includes(expected), `Expected array not to contain ${expected}`);
    },
    toBe: (expected: any) => assert.notStrictEqual(actual, expected),
  },
});

const BASE_URL = 'http://localhost:4000/api';
let studentToken: string;
let otherStudentToken: string;
let e2eStudentId: string;
let e2eOtherStudentId: string;
let testCompanyId: string;
let testTopicId: number;
let testQuestionIds: string[] = [];

// Helper: login
const login = async (email: string, password: string) => {
  const res = await request(BASE_URL)
    .post('/auth/login')
    .send({ email, password });
  return { token: res.body.data?.token, userId: res.body.data?.user?.id };
};

describe('E2E: Resume Builder + Prep Plan', () => {
  beforeAll(async () => {
    // Create e2e test data with unique prefix
    const timestamp = Date.now();

    // Create two e2e students
    for (const suffix of ['a', 'b']) {
      const res = await request(BASE_URL)
        .post('/auth/register')
        .send({
          name: `e2e-student-${suffix}-${timestamp}`,
          email: `e2e-${suffix}-${timestamp}@test.com`,
          password: 'E2ETest@12345',
          knowledgeLevel: 'beginner',
        });
      if (suffix === 'a') {
        studentToken = res.body.data.token;
        e2eStudentId = res.body.data.user.id;
      } else {
        otherStudentToken = res.body.data.token;
        e2eOtherStudentId = res.body.data.user.id;
      }
    }

    // Get a topic and questions (from seed)
    const topics = await prisma.topic.findMany({ where: { type: 'aptitude' }, take: 1 });
    testTopicId = topics[0].id;

    const questions = await prisma.aptitudeQuestion.findMany({
      where: { topicId: testTopicId },
      take: 6,
    });
    testQuestionIds = questions.map(q => q.id);

    // Create a practice attempt and answer 6 questions (4 correct, 2 wrong = 66.67%)
    const attempt = await prisma.testAttempt.create({
      data: {
        studentId: e2eStudentId,
        attemptType: 'practice',
        status: 'submitted',
        totalMarks: 6,
        score: 4,
        endTime: new Date(),
      },
    });
    for (let i = 0; i < questions.length; i++) {
      await prisma.studentAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId: questions[i].id,
          selectedOption: i < 4 ? questions[i].correctOption : 'A', // First 4 correct, last 2 wrong
          isCorrect: i < 4,
        },
      });
    }

    // Create a company linked to this topic
    const branch = await prisma.branch.findFirst();
    if (!branch) throw new Error('No branch found for e2e test');
    const company = await prisma.company.create({
      data: {
        name: `e2e-company-${timestamp}`,
        jobRole: 'Test Engineer',
        eligibilityCgpa: 6.0,
        driveDate: new Date(Date.now() + 86400000 * 30),
        eligibleBranches: { create: [{ branchId: branch.id }] },
        topics: { create: [{ topicId: testTopicId }] },
      },
    });
    testCompanyId = company.id;

    // Create a resource for the topic
    await prisma.resource.create({
      data: {
        title: `e2e-resource-${timestamp}`,
        description: 'Test resource',
        fileUrl: '/uploads/test.pdf',
        topicId: testTopicId,
        uploadedBy: (await prisma.user.findFirst({ where: { role: 'trainer' } }))!.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up all e2e data
    const timestamp = Date.now();
    const users = await prisma.user.findMany({
      where: { email: { contains: 'e2e-' } },
      select: { id: true },
    });
    for (const user of users) {
      await prisma.studentAnswer.deleteMany({
        where: { attempt: { studentId: user.id } },
      });
      await prisma.testAttempt.deleteMany({ where: { studentId: user.id } });
      await (prisma as any).studentResumeData?.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.resource.deleteMany({ where: { title: { contains: 'e2e-' } } });
    await prisma.company.deleteMany({ where: { name: { contains: 'e2e-' } } });
    await prisma.$disconnect();
  });

  // ================================================================
  // RESUME BUILDER TESTS
  // ================================================================

  describe('Resume Builder', () => {
    test('save resume data returns 200', async () => {
      const res = await request(BASE_URL)
        .put('/students/me/resume-data')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          summary: 'Final year CSE student passionate about web development',
          education: [{ institution: 'e2e-college', degree: 'B.Tech CSE', year: '2022-2026', score: '8.5' }],
          skills: ['React', 'Node.js', 'PostgreSQL'],
          projects: [{ title: 'IntelliPlace', description: 'Placement training platform', techStack: 'React, Node.js' }],
          links: [{ label: 'GitHub', url: 'https://github.com/e2e-test' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toContain('Final year');
    });

    test('fetch resume data returns saved data', async () => {
      const res = await request(BASE_URL)
        .get('/students/me/resume-data')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toContain('Final year');
      expect(res.body.data.skills).toContain('React');
    });

    test('PDF download returns 200 with %PDF header', async () => {
      const res = await request(BASE_URL)
        .get('/students/me/resume.pdf')
        .set('Authorization', `Bearer ${studentToken}`)
        .buffer()
        .parse((res: any, cb: any) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: any) => chunks.push(chunk));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      // Check PDF magic number
      const body = res.body as Buffer;
      expect(body.slice(0, 4).toString()).toBe('%PDF');
    });

    test('other student cannot read my resume data', async () => {
      // Other student tries to access first student's resume via their own endpoint
      // (they should only see their own null data, not the other student's)
      const res = await request(BASE_URL)
        .get('/students/me/resume-data')
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull(); // Other student has no resume data
    });

    test('oversized summary returns 400', async () => {
      const res = await request(BASE_URL)
        .put('/students/me/resume-data')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          summary: 'A'.repeat(1001), // Exceeds 1000 char limit
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    test('oversized skills array returns 400', async () => {
      const res = await request(BASE_URL)
        .put('/students/me/resume-data')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          skills: Array(31).fill('skill'), // Exceeds 30 item limit
        });

      expect(res.status).toBe(400);
    });

    test('HTML in fields is escaped in PDF', async () => {
      // Save with HTML injection attempt
      await request(BASE_URL)
        .put('/students/me/resume-data')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          summary: '<script>alert("xss")</script>Test summary',
        });

      const res = await request(BASE_URL)
        .get('/students/me/resume.pdf')
        .set('Authorization', `Bearer ${studentToken}`)
        .buffer()
        .parse((res: any, cb: any) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: any) => chunks.push(chunk));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      const pdfText = (res.body as Buffer).toString('binary');
      expect(pdfText).not.toContain('<script>');
      expect(pdfText).not.toContain('alert');
    });
  });

  // ================================================================
  // PREP PLAN TESTS
  // ================================================================

  describe('Company Prep Plan', () => {
    test('student with data gets correct accuracy and gap flags', async () => {
      const res = await request(BASE_URL)
        .get(`/companies/${testCompanyId}/prep-plan`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const topic = res.body.data.topics[0];

      // Hand calculation:
      // We answered 6 questions: 4 correct, 2 wrong
      // Accuracy = 4/6 = 66.67% → rounds to 67%
      // 67% >= 60% → NOT a gap
      console.log('=== HAND CALCULATION VERIFICATION ===');
      console.log(`Correct: 4, Total: 6`);
      console.log(`Expected accuracy: ${Math.round((4/6)*100)}%`);
      console.log(`Actual accuracy:   ${topic.accuracy}%`);
      console.log(`Expected hasGap: false (67% >= 60%)`);
      console.log(`Actual hasGap:     ${topic.hasGap}`);
      console.log('=====================================');

      expect(topic.accuracy).toBe(Math.round((4 / 6) * 100));
      expect(topic.accuracy).toBe(67);
      expect(topic.hasGap).toBe(false);
      expect(topic.status).toBe('strong');
    });

    test('new student gets "not enough data"', async () => {
      const res = await request(BASE_URL)
        .get(`/companies/${testCompanyId}/prep-plan`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(200);
      const topic = res.body.data.topics[0];
      expect(topic.status).toBe('not_enough_data');
      expect(topic.accuracy).toBeNull();
      expect(topic.totalAnswered).toBe(0);
    });

    test('response contains no correctOption or explanation', async () => {
      const res = await request(BASE_URL)
        .get(`/companies/${testCompanyId}/prep-plan`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain('correctOption');
      expect(responseStr).not.toContain('explanation');
      expect(responseStr).not.toContain('correct_option');
    });

    test('gap topic includes practice action link', async () => {
      // Create a student with low accuracy (1 correct out of 6 = 16.67% < 60% = gap)
      // Reuse otherStudentId — give them answers
      const questions = await prisma.aptitudeQuestion.findMany({
        where: { topicId: testTopicId },
        take: 6,
      });
      const attempt = await prisma.testAttempt.create({
        data: {
          studentId: e2eOtherStudentId,
          attemptType: 'practice',
          status: 'submitted',
          totalMarks: 6,
          score: 1,
          endTime: new Date(),
        },
      });
      for (let i = 0; i < questions.length; i++) {
        await prisma.studentAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: questions[i].id,
            selectedOption: i === 0 ? questions[i].correctOption : 'A', // Only 1st correct
            isCorrect: i === 0,
          },
        });
      }

      const res = await request(BASE_URL)
        .get(`/companies/${testCompanyId}/prep-plan`)
        .set('Authorization', `Bearer ${otherStudentToken}`);

      expect(res.status).toBe(200);
      const topic = res.body.data.topics[0];

      // Hand calculation: 1/6 = 16.67% → 17%, < 60% → gap
      console.log('=== GAP TOPIC VERIFICATION ===');
      console.log(`Correct: 1, Total: 6`);
      console.log(`Expected accuracy: ${Math.round((1/6)*100)}%`);
      console.log(`Actual accuracy:   ${topic.accuracy}%`);
      console.log(`Expected hasGap: true (17% < 60%)`);
      console.log(`Actual hasGap:     ${topic.hasGap}`);
      console.log('==============================');

      expect(topic.accuracy).toBe(17);
      expect(topic.hasGap).toBe(true);
      expect(topic.status).toBe('gap');
      expect(topic.actions.length).toBeGreaterThan(0);
      expect(topic.actions.length).toBeLessThanOrEqual(3);
      // Verify practice action exists
      const hasPracticeAction = topic.actions.some((a: any) => a.link.includes('/practice'));
      expect(hasPracticeAction).toBe(true);
    });
  });
});