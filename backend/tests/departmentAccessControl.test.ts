/**
 * departmentAccessControl.test.ts
 * ------------------------------------------------------------
 * End-to-end verification of department-based access control.
 *
 * Proves that a student can access ONLY the content assigned to
 * their own department (plus global content), and that content of
 * OTHER departments is invisible in lists AND blocked on direct
 * by-id API requests — even when the request is crafted manually.
 *
 * Run:  npx tsx --test tests/departmentAccessControl.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const RUN = Date.now().toString(36);

test('Department-Based Access Control Suite', async (t) => {
  let trainerToken = '';
  let csToken = '';
  let meToken = '';
  let ecToken = '';
  let noBranchToken = '';

  const csBranch = await prisma.branch.findFirst({ where: { code: 'CS' } });
  const meBranch = await prisma.branch.findFirst({ where: { code: 'ME' } });
  const ecBranch = await prisma.branch.findFirst({ where: { code: 'EC' } });
  if (!csBranch || !meBranch || !ecBranch) {
    console.warn('    (branches missing — run `npm run seed` first; suite aborted)');
    return;
  }

  // Purge leftovers from any earlier interrupted run of this suite (FK-safe order)
  await prisma.studentAnswer.deleteMany({
    where: { attempt: { student: { email: { contains: 'dept-test-' } }, attemptType: 'practice' } },
  });
  await prisma.testAttempt.deleteMany({
    where: { student: { email: { contains: 'dept-test-' } } },
  });
  const leftovers = await prisma.user.findMany({
    where: { email: { contains: 'dept-test-' } },
    select: { id: true },
  });
  for (const u of leftovers) {
    await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }

  // Fixtures created during the run (cleaned up at the end)
  const created = {
    userIds: [] as string[],
    questionIds: [] as string[],
    problemIds: [] as string[],
    testIds: [] as string[],
    resourceIds: [] as string[],
    trainingResourceIds: [] as string[],
    moduleIds: [] as string[],
    planIds: [] as string[],
    topicId: null as number | null,
    codingTopicId: null as number | null,
  };

  await t.test('0. Setup: register students of three departments + one without a department', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'trainer1@intelliplace.edu', password: 'Trainer@123' });
    if (login.status !== 200) throw new Error('Trainer login failed — is the base seed present?');
    trainerToken = login.body.data.token;

    const registerStudent = async (ktuid: string | null) => {
      const email = `dept-test-${RUN}-${ktuid ?? 'nobranch'}@test.local`;
      const res = await request(app).post('/api/auth/register').send({
        name: `Dept Test ${ktuid ?? 'NoBranch'}`,
        email,
        password: 'Test@12345',
        ...(ktuid ? { ktuid } : {}),
      });
      assert.ok(res.status === 201 || res.status === 200, `register ${ktuid} failed: ${res.status} ${JSON.stringify(res.body)}`);
      created.userIds.push(res.body.data?.user?.id ?? res.body.data?.id);
      const li = await request(app).post('/api/auth/login').send({ email, password: 'Test@12345' });
      assert.equal(li.status, 200, `login ${ktuid} failed: ${JSON.stringify(li.body)}`);
      return li.body.data.token as string;
    };

    // Unique but format-valid student numbers: KSDYYDEPT####
    const seq = (suffix: string) => String(1000 + (Date.now() % 9000)).slice(0, 3) + suffix;

    csToken = await registerStudent(`KSD23CS${seq('1')}`);
    meToken = await registerStudent(`KSD23ME${seq('2')}`);
    ecToken = await registerStudent(`KSD23EC${seq('3')}`);
    noBranchToken = await registerStudent(null);

    // Confirm branch mapping (KTUID -> branch). NB: the API lowercases emails.
    const csUser = await prisma.user.findFirst({
      where: { role: 'student', email: { contains: `dept-test-${RUN}-ksd23cs` } },
      include: { studentProfile: { select: { branchId: true } } },
    });
    assert.equal(csUser?.studentProfile?.branchId, csBranch.id, 'CS student must map to CS branch');
  });

  let csQuestionId = '';
  let meQuestionId = '';
  let meProblemId = '';
  let csTest: { id: string; questionId: string } | null = null;
  let meTestId = '';

  await t.test('1. Trainer creates department-scoped content via API', async () => {
    // Topic fixtures (global taxonomy)
    const topicName = `DeptACL Topic ${RUN}`;
    const topic = await prisma.topic.create({ data: { name: topicName, type: 'aptitude' } });
    created.topicId = topic.id;
    const codingTopic = await prisma.topic.create({ data: { name: `DeptACL Coding Topic ${RUN}`, type: 'coding' } });
    created.codingTopicId = codingTopic.id;

    // CS-only + ME-only questions
    const mkQuestion = async (branchId: number, tag: string) => {
      const res = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          topicId: topic.id,
          difficulty: 'easy',
          questionText: `[${tag}] Department-scoped question (${RUN})`,
          optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D',
          correctOption: 'A',
          explanation: 'x',
          branchId,
        });
      assert.equal(res.status, 201, `question create failed: ${JSON.stringify(res.body)}`);
      return res.body.data.id as string;
    };
    csQuestionId = await mkQuestion(csBranch.id, 'CS-ONLY');
    meQuestionId = await mkQuestion(meBranch.id, 'ME-ONLY');
    created.questionIds.push(csQuestionId, meQuestionId);

    // ME-only coding problem
    const problemRes = await request(app)
      .post('/api/problems')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        topicId: codingTopic.id,
        difficulty: 'easy',
        title: `[ME-ONLY] Dept problem ${RUN}`,
        description: 'A problem only mechanical students may solve.',
        sampleInput: '1',
        sampleOutput: '1',
        tags: [],
        testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
        branchId: meBranch.id,
      });
    assert.equal(problemRes.status, 201, `problem create failed: ${JSON.stringify(problemRes.body)}`);
    meProblemId = problemRes.body.data.id;
    created.problemIds.push(meProblemId);

    // CS-only + ME-only mock tests
    const mkTest = async (branchId: number, tag: string, questionId: string) => {
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${trainerToken}`)
        .send({
          title: `[${tag}] Dept test ${RUN}`,
          description: 'x',
          durationMins: 10,
          questionIds: [questionId],
          maxAttempts: 1,
          status: 'published',
          branchId,
        });
      assert.equal(res.status, 201, `test create failed: ${JSON.stringify(res.body)}`);
      return res.body.data.id as string;
    };
    const csTestId = await mkTest(csBranch.id, 'CS-ONLY', csQuestionId);
    meTestId = await mkTest(meBranch.id, 'ME-ONLY', meQuestionId);
    created.testIds.push(csTestId, meTestId);
    csTest = { id: csTestId, questionId: csQuestionId };
  });

  await t.test('2. Trainer creates remaining scoped fixtures directly (resources/modules/plans)', async () => {
    const trainer = await prisma.user.findFirst({ where: { role: 'trainer' } });

    const meRes = await prisma.resource.create({
      data: {
        title: `[ME-ONLY] Dept study resource ${RUN}`,
        description: 'Mechanical-only material',
        fileUrl: '/uploads/does-not-exist.pdf',
        topicId: created.topicId,
        branchId: meBranch.id,
        uploadedBy: trainer!.id,
        visibility: 'institution',
      },
    });
    created.resourceIds.push(meRes.id);

    const meTr = await prisma.trainingResource.create({
      data: {
        title: `[ME-ONLY] Hub resource ${RUN}`,
        description: 'Mechanical-only hub entry',
        resourceType: 'course',
        category: 'ME',
        status: 'published',
        branchId: meBranch.id,
        createdBy: trainer!.id,
      },
    });
    created.trainingResourceIds.push(meTr.id);

    const meModule = await prisma.learningModule.create({
      data: {
        title: `[ME-ONLY] Learning module ${RUN}`,
        level: 'beginner',
        topicId: created.topicId,
        branchId: meBranch.id,
        createdBy: trainer!.id,
      },
    });
    created.moduleIds.push(meModule.id);

    const mePlan = await prisma.interviewPreparationPlan.create({
      data: {
        title: `[ME-ONLY] Interview plan ${RUN}`,
        durationDays: 7,
        targetRole: 'Design Engineer',
        status: 'published',
        branchId: meBranch.id,
      },
    });
    created.planIds.push(mePlan.id);
  });

  await t.test('3. LIST endpoints filter out other departments\' content for students', async () => {
    // Aptitude questions: CS student sees CS question, not ME question
    const qs = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${csToken}`)
      .query({ search: `(${RUN})` })
      .query({ limit: 100 });
    assert.equal(qs.status, 200);
    const qIds: string[] = qs.body.data.map((q: { id: string }) => q.id);
    assert.ok(qIds.includes(csQuestionId), 'CS student must see their own department question');
    assert.ok(!qIds.includes(meQuestionId), 'CS student must NOT see ME-only question in list');

    // Coding problems
    const ps = await request(app)
      .get('/api/problems')
      .set('Authorization', `Bearer ${csToken}`)
      .query({ limit: 100 });
    assert.equal(ps.status, 200);
    const pIds: string[] = ps.body.data.map((p: { id: string }) => p.id);
    assert.ok(!pIds.includes(meProblemId), 'CS student must NOT see ME-only coding problem in list');

    // Mock tests
    const ts = await request(app)
      .get('/api/tests')
      .set('Authorization', `Bearer ${csToken}`);
    assert.equal(ts.status, 200);
    const tIds: string[] = ts.body.data.map((x: { id: string }) => x.id);
    assert.ok(tIds.includes(csTest!.id), 'CS student must see their own department test');
    assert.ok(!tIds.includes(meTestId), 'CS student must NOT see ME-only test in list');

    // Study resources
    const rs = await request(app)
      .get('/api/resources')
      .set('Authorization', `Bearer ${csToken}`);
    assert.equal(rs.status, 200);
    const rIds: string[] = rs.body.data.map((r: { id: string }) => r.id);
    assert.ok(!rIds.includes(created.resourceIds[0]), 'CS student must NOT see ME-only study resource');

    // Training resource hub
    const trs = await request(app)
      .get('/api/training/resources')
      .set('Authorization', `Bearer ${csToken}`)
      .query({ limit: 100 });
    assert.equal(trs.status, 200);
    const trIds: string[] = trs.body.data.map((r: { id: string }) => r.id);
    assert.ok(!trIds.includes(created.trainingResourceIds[0]), 'CS student must NOT see ME-only hub resource');

    // Learning modules
    const mods = await request(app)
      .get('/api/training/learning/modules')
      .set('Authorization', `Bearer ${csToken}`);
    assert.equal(mods.status, 200);
    const mIds: string[] = mods.body.data.map((m: { id: string }) => m.id);
    assert.ok(!mIds.includes(created.moduleIds[0]), 'CS student must NOT see ME-only learning module');
  });

  await t.test('4. DIRECT by-id API requests for other departments\' content are blocked (403)', async () => {
    // Question
    const q = await request(app)
      .get(`/api/questions/${meQuestionId}`)
      .set('Authorization', `Bearer ${csToken}`);
    assert.equal(q.status, 403, `expected 403, got ${q.status}`);

    // Coding problem
    const p = await request(app)
      .get(`/api/problems/${meProblemId}`)
      .set('Authorization', `Bearer ${csToken}`);
    assert.equal(p.status, 403, `expected 403, got ${p.status}`);

    // Mock test metadata
    const mt = await request(app)
      .get(`/api/tests/${meTestId}`)
      .set('Authorization', `Bearer ${csToken}`);
    assert.equal(mt.status, 403, `expected 403, got ${mt.status}`);

    // Mock test attempt start (the most sensitive action)
    const st = await request(app)
      .post(`/api/tests/${meTestId}/start`)
      .set('Authorization', `Bearer ${csToken}`)
      .set('x-bypass-submit-rate-limit', 'true');
    assert.equal(st.status, 403, `expected 403, got ${st.status}`);

    // Resource download
    const dl = await request(app)
      .get(`/api/resources/${created.resourceIds[0]}/download`)
      .set('Authorization', `Bearer ${csToken}`);
    assert.equal(dl.status, 403, `expected 403, got ${dl.status}`);
  });

  await t.test('5. Practice sessions only draw from the student\'s own department (+ global)', async () => {
    const pr = await request(app)
      .post('/api/practice/start')
      .set('Authorization', `Bearer ${csToken}`)
      .send({ topicId: created.topicId, count: 10 });
    assert.equal(pr.status, 201, JSON.stringify(pr.body));
    const ids: string[] = pr.body.data.questions.map((x: { id: string }) => x.id);
    assert.ok(ids.includes(csQuestionId), 'practice must include own-department question');
    assert.ok(!ids.includes(meQuestionId), 'practice must NOT include other-department question');

    // Answering another department's question directly is also blocked
    const ans = await request(app)
      .post('/api/practice/answer')
      .set('Authorization', `Bearer ${csToken}`)
      .send({ attemptId: pr.body.data.attemptId, questionId: meQuestionId, selectedOption: 'A' });
    assert.equal(ans.status, 403, `expected 403, got ${ans.status}`);
  });

  await t.test('6. Department-exclusive training modules reject students of other departments', async () => {
    const cases: Array<[string, string, number]> = [
      ['CS student -> mechanical-training', '/api/mechanical-training/questions', 403],
      ['CS student -> civil-training', '/api/civil-training/questions', 403],
      ['CS student -> eee-training', '/api/eee-training/questions', 403],
      ['CS student -> it-training', '/api/it-training/questions', 403],
      ['CS student -> ece-training', '/api/ece-training/questions', 403],
      ['ME student -> mechanical-training', '/api/mechanical-training/questions', 200],
      ['EC student -> ece-training', '/api/ece-training/questions', 200],
      ['EC student -> mechanical-training', '/api/mechanical-training/questions', 403],
    ];
    for (const [label, url, expected] of cases) {
      const token = label.startsWith('CS') ? csToken : label.startsWith('ME') ? meToken : ecToken;
      const res = await request(app).get(url).set('Authorization', `Bearer ${token}`);
      assert.equal(res.status, expected, `${label} (${url}): expected ${expected}, got ${res.status}`);
    }
  });

  await t.test('7. Students without a department see only global content and are blocked from dept modules', async () => {
    const qs = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${noBranchToken}`)
      .query({ search: `(${RUN})` })
      .query({ limit: 100 });
    assert.equal(qs.status, 200);
    const qIds: string[] = qs.body.data.map((q: { id: string }) => q.id);
    assert.ok(!qIds.includes(csQuestionId) && !qIds.includes(meQuestionId),
      'branchless student must not see department-scoped questions');

    const mech = await request(app)
      .get('/api/mechanical-training/questions')
      .set('Authorization', `Bearer ${noBranchToken}`);
    assert.equal(mech.status, 403, 'branchless student must be blocked from department modules');
  });

  await t.test('8. Staff (trainer) bypass department scoping and still manage all content', async () => {
    const qs = await request(app)
      .get('/api/questions')
      .set('Authorization', `Bearer ${trainerToken}`)
      .query({ search: `(${RUN})` })
      .query({ limit: 100 });
    assert.equal(qs.status, 200);
    const qIds: string[] = qs.body.data.map((q: { id: string }) => q.id);
    assert.ok(qIds.includes(csQuestionId) && qIds.includes(meQuestionId),
      'trainer must see questions of all departments');

    const meQ = await request(app)
      .get(`/api/questions/${meQuestionId}`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.equal(meQ.status, 200, 'trainer must access any question directly');

    const ps = await request(app)
      .get('/api/problems')
      .set('Authorization', `Bearer ${trainerToken}`)
      .query({ limit: 100 });
    const pIds: string[] = ps.body.data.map((p: { id: string }) => p.id);
    assert.ok(pIds.includes(meProblemId), 'trainer must see all coding problems');
  });

  await t.test('9. Validation: creating content with an invalid branchId is rejected', async () => {
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        topicId: created.topicId!,
        difficulty: 'easy',
        questionText: `Invalid branch test (${RUN})`,
        optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D',
        correctOption: 'A',
        branchId: 999999,
      });
    assert.equal(res.status, 400, `expected 400, got ${res.status}`);
  });

  // ------------------------------------------------------------
  // CLEANUP — remove everything this suite created
  // ------------------------------------------------------------
  await t.test('10. Cleanup fixtures', async () => {
    await prisma.interviewPreparationPlan.deleteMany({ where: { id: { in: created.planIds } } });
    await prisma.learningModule.deleteMany({ where: { id: { in: created.moduleIds } } });
    await prisma.trainingResource.deleteMany({ where: { id: { in: created.trainingResourceIds } } });
    await prisma.resource.deleteMany({ where: { id: { in: created.resourceIds } } });
    for (const testId of created.testIds) {
      await prisma.mockTest.delete({ where: { id: testId } }).catch(() => {});
    }
    await prisma.codingProblem.deleteMany({ where: { id: { in: created.problemIds } } });
    await prisma.aptitudeQuestion.deleteMany({ where: { id: { in: created.questionIds } } });
    if (created.topicId) await prisma.topic.delete({ where: { id: created.topicId } }).catch(() => {});
    if (created.codingTopicId) await prisma.topic.delete({ where: { id: created.codingTopicId } }).catch(() => {});
    // FK-safe removal of this run's students (answers -> attempts -> users)
    await prisma.studentAnswer.deleteMany({
      where: { attempt: { student: { email: { contains: `dept-test-${RUN}` } } } },
    });
    await prisma.testAttempt.deleteMany({
      where: { student: { email: { contains: `dept-test-${RUN}` } } },
    });
    for (const userId of created.userIds) {
      if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    console.log('    (cleanup complete)');
  });
});
