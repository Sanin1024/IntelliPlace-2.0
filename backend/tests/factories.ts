import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

/**
 * Centralized test data factories.
 * Challenge 316: Realistic, consistent test fixtures with referential integrity.
 */

let counter = 0;
const unique = () => `${Date.now()}-${counter++}`;

export async function createStudent(overrides: Partial<{
  name: string;
  email: string;
  password: string;
  branchName: string;
  batchName: string;
  cgpa: number;
  cgpaVerified: boolean;
  academicStatus: string;
  knowledgeLevel: string;
}> = {}) {
  const id = unique();
  const branch = await prisma.branch.findFirst({
    where: { name: overrides.branchName || 'CSE' },
  }).catch(() => null);

  const batch = await prisma.batch.findFirst({
    where: { name: overrides.batchName || '2025' },
  }).catch(() => null);

  const passwordHash = await bcrypt.hash(overrides.password || 'E2ETest@12345', 10);
  const user = await prisma.user.create({
    data: {
      name: overrides.name || `Test Student ${id}`,
      email: overrides.email || `test-student-${id}@e2e.com`,
      passwordHash,
      role: 'student',
      studentProfile: {
        create: {
          branchId: branch?.id,
          batchId: batch?.id,
          cgpa: overrides.cgpa ?? 8.0,
          cgpaVerified: overrides.cgpaVerified ?? true,
          academicStatus: (overrides.academicStatus as any) ?? 'verified',
          knowledgeLevel: (overrides.knowledgeLevel as any) ?? 'intermediate',
          profileUpdatedAt: new Date(),
          academicUpdatedAt: new Date(),
        },
      },
    },
    include: { studentProfile: true },
  });

  return user;
}

export async function createCompany(overrides: Partial<{
  name: string;
  jobRole: string;
  eligibilityCgpa: number;
  driveDate: Date;
}> = {}) {
  return prisma.company.create({
    data: {
      name: overrides.name || `Test Company ${unique()}`,
      jobRole: overrides.jobRole || 'Software Engineer',
      eligibilityCgpa: overrides.eligibilityCgpa ?? 6.0,
      driveDate: overrides.driveDate || new Date(Date.now() + 30 * 86400000),
    },
  });
}

export async function createDrive(overrides: Partial<{
  companyId: string;
  title: string;
  jobRole: string;
  vacancies: number;
  status: string;
  registrationDeadline: Date;
  branchIds: number[];
  batchIds: number[];
  minCgpa: number;
  createdBy: string;
}> = {}) {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const company = overrides.companyId
    ? await prisma.company.findUnique({ where: { id: overrides.companyId } })
    : await createCompany();

  const branches = overrides.branchIds
    ? await prisma.branch.findMany({ where: { id: { in: overrides.branchIds } } })
    : await prisma.branch.findMany({ take: 1 });

  const batches = overrides.batchIds
    ? await prisma.batch.findMany({ where: { id: { in: overrides.batchIds } } })
    : await prisma.batch.findMany({ take: 1 });

  return prisma.placementDrive.create({
    data: {
      companyId: company!.id,
      title: overrides.title || `Test Drive ${unique()}`,
      jobRole: overrides.jobRole || 'SDE',
      jobDescription: 'Test description',
      vacancies: overrides.vacancies ?? 10,
      status: (overrides.status as any) ?? 'published',
      isActive: true,
      registrationDeadline: overrides.registrationDeadline || new Date(Date.now() + 7 * 86400000),
      createdBy: overrides.createdBy || admin?.id || 'admin-test',
      minCgpa: overrides.minCgpa ?? 6.0,
      eligibleBranches: {
        create: branches.map(b => ({ branchId: b.id })),
      },
      eligibleBatches: {
        create: batches.map(b => ({ batchId: b.id })),
      },
    },
    include: {
      eligibleBranches: true,
      eligibleBatches: true,
    },
  });
}

export async function createMockTest(overrides: Partial<{
  title: string;
  durationMins: number;
  status: string;
  questionCount: number;
  createdBy: string;
}> = {}) {
  const trainer = await prisma.user.findFirst({ where: { role: 'trainer' } });
  const topic = await prisma.topic.findFirst({ where: { type: 'aptitude' } });
  const questions = topic
    ? await prisma.aptitudeQuestion.findMany({
        where: { topicId: topic.id },
        take: overrides.questionCount ?? 3,
      })
    : [];

  return prisma.mockTest.create({
    data: {
      title: overrides.title || `Test Mock ${unique()}`,
      durationMins: overrides.durationMins ?? 30,
      status: (overrides.status as any) ?? 'published',
      isActive: true,
      createdBy: overrides.createdBy || trainer?.id || 'trainer-test',
      questions: {
        create: questions.map(q => ({ questionId: q.id, marks: 1 })),
      },
    },
    include: { questions: { include: { question: true } } },
  });
}

export async function loginAndGetToken(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body?.data?.token || '';
}

export async function loginAsAdmin(): Promise<string> {
  return loginAndGetToken('admin@intelliplace.edu', 'Admin@123');
}

export async function loginAsPO(): Promise<string> {
  return loginAndGetToken('po@intelliplace.edu', 'Po@12345');
}

export async function loginAsTrainer(): Promise<string> {
  return loginAndGetToken('trainer1@intelliplace.edu', 'Trainer@123');
}

