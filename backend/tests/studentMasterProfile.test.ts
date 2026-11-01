// Centralized Student Master Profile & Dynamic Company-Specific Data Generation Test Suite
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  MASTER_PROFILE_FIELDS,
  calculateProfileCompletion,
} from '../src/services/studentMasterProfile.service.js';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  '038ed8a689d234bbc6fecc18d199ac3808ab4d2e6f9aad074c81212918461198c6503bf00a8bf1862689486ee74282dda5460eddf7d9eb3598119ce013dfac85';
process.env.JWT_SECRET = JWT_SECRET;

function createMockToken(userId: string, role: string, tokenVersion: number = 1): string {
  return jwt.sign({ userId, role, tv: tokenVersion }, JWT_SECRET, { expiresIn: '1h' });
}

test('Centralized Student Master Profile & Company Requirements Suite', async (t) => {
  const TS = Date.now();
  const studentId = `stu-master-${TS}`;
  const poId = `po-master-${TS}`;
  const driveId = `drive-master-${TS}`;
  const companyId = `comp-master-${TS}`;

  // In-memory test state
  const mockUsers: Record<string, any> = {
    [studentId]: {
      id: studentId,
      name: 'Anandhu S',
      email: `anandhu-${TS}@lbscek.ac.in`,
      role: 'student',
      isActive: true,
      tokenVersion: 1,
    },
    [poId]: {
      id: poId,
      name: 'Placement Officer Manoj',
      email: `po-${TS}@lbscek.ac.in`,
      role: 'po',
      isActive: true,
      tokenVersion: 1,
    },
  };

  let mockProfile: any = {
    userId: studentId,
    ktuid: 'KSD23CS042',
    currentSemester: 7,
    cgpa: 8.85,
    entryType: 'REGULAR',
    admissionYear: 2021,
    graduatingBatch: '2025',
    tenthSchool: 'St. Thomas HSS',
    tenthBoard: 'Kerala State Board',
    tenthYear: 2019,
    tenthPercentage: 94.5,
    twelfthSchool: 'St. Thomas HSS',
    twelfthBoard: 'Kerala State Higher Secondary',
    twelfthStream: 'Computer Science',
    twelfthYear: 2021,
    twelfthPercentage: 92.0,
    hasDiploma: false,
    activeBacklogs: 0,
    historicalBacklogs: 0,
    clearedBacklogs: 0,
    hasAcademicGaps: false,
    personalEmail: `anandhu.personal-${TS}@gmail.com`,
    phone: '9847123456',
    dob: new Date('2003-05-14'),
    gender: 'Male',
    masterStatus: 'IN_PROGRESS',
    completionPercentage: 30,
    resumeUrl: 'https://cdn.intelliplace.edu/resumes/anandhu.pdf',
    user: mockUsers[studentId],
    branch: { id: 1, name: 'Computer Science and Engineering', code: 'CS' },
    batch: { id: 2025, name: '2021-2025' },
    technicalSkills: [] as any[],
    projects: [] as any[],
    internships: [] as any[],
    certifications: [] as any[],
    documents: [] as any[],
    masterVerificationHistory: [] as any[],
  };

  const mockTemplates: any[] = [];
  let mockDriveRequirement: any = null;
  const mockGeneratedDatasets: Record<string, any> = {};
  const mockExportHistory: any[] = [];
  const mockAuditLogs: any[] = [];
  const mockShareLogs: any[] = [];

  const mockDrive: any = {
    id: driveId,
    title: 'Infosys Specialist Programmer 2025',
    companyId,
    status: 'published',
    company: { id: companyId, name: 'Infosys Limited' },
    eligibleBranches: [{ branchId: 1 }],
    eligibleBatches: [{ batchId: 2025 }],
    applications: [
      {
        id: `app-${TS}-1`,
        studentId,
        driveId,
        status: 'applied',
        student: mockProfile,
      },
    ],
  };

  const studentToken = createMockToken(studentId, 'student');
  const poToken = createMockToken(poId, 'po');

  // Intercept Prisma operations
  const origUserFindUnique = prisma.user.findUnique.bind(prisma);
  const origProfileFindUnique = prisma.studentProfile.findUnique.bind(prisma);
  const origProfileUpdate = prisma.studentProfile.update.bind(prisma);
  const origProfileFindMany = prisma.studentProfile.findMany.bind(prisma);
  const origProfileCount = prisma.studentProfile.count.bind(prisma);
  const origDriveFindUnique = prisma.placementDrive.findUnique.bind(prisma);
  const origPrelimFindUnique = prisma.preliminaryAssessment.findUnique.bind(prisma);
  const origAppFindMany = prisma.driveApplication.findMany.bind(prisma);

  // Install mocks
  (prisma.user as any).findUnique = async ({ where }: any) => {
    if (where?.id && mockUsers[where.id]) return mockUsers[where.id];
    return origUserFindUnique({ where });
  };

  (prisma.studentProfile as any).findUnique = async ({ where }: any) => {
    if (where?.userId === studentId) {
      return {
        ...mockProfile,
        user: mockUsers[studentId],
      };
    }
    return origProfileFindUnique({ where });
  };

  (prisma.studentProfile as any).update = async ({ where, data }: any) => {
    if (where?.userId === studentId) {
      mockProfile = {
        ...mockProfile,
        ...data,
      };
      return mockProfile;
    }
    return origProfileUpdate({ where, data });
  };

  (prisma.studentProfile as any).count = async () => 1;

  (prisma.studentProfile as any).findMany = async (args: any) => {
    return [mockProfile];
  };

  (prisma.driveApplication as any).findMany = async () => {
    return [{ studentId, driveId }];
  };

  (prisma.placementDrive as any).findUnique = async ({ where }: any) => {
    if (where?.id === driveId) return mockDrive;
    return origDriveFindUnique({ where });
  };

  (prisma.preliminaryAssessment as any).findUnique = async ({ where }: any) => {
    if (where?.studentId === studentId) {
      return {
        id: `assess-${TS}`,
        studentId,
        status: 'pending_scheduling',
        deadline: new Date(Date.now() + 86400000),
        slot: null,
      };
    }
    return origPrelimFindUnique({ where });
  };

  // Skill / Project / Internship / Cert / Doc child model mocks
  (prisma.studentTechnicalSkill as any).create = async ({ data }: any) => {
    const item = { id: `skill-${Date.now()}-${Math.random()}`, ...data };
    mockProfile.technicalSkills.push(item);
    return item;
  };
  (prisma.studentTechnicalSkill as any).deleteMany = async ({ where }: any) => {
    mockProfile.technicalSkills = mockProfile.technicalSkills.filter((s: any) => s.id !== where.id);
    return { count: 1 };
  };

  (prisma.studentProject as any).create = async ({ data }: any) => {
    const item = { id: `proj-${Date.now()}-${Math.random()}`, ...data };
    mockProfile.projects.push(item);
    return item;
  };
  (prisma.studentProject as any).deleteMany = async ({ where }: any) => {
    mockProfile.projects = mockProfile.projects.filter((p: any) => p.id !== where.id);
    return { count: 1 };
  };

  (prisma.studentInternship as any).create = async ({ data }: any) => {
    const item = { id: `intern-${Date.now()}-${Math.random()}`, ...data };
    mockProfile.internships.push(item);
    return item;
  };
  (prisma.studentInternship as any).deleteMany = async ({ where }: any) => {
    mockProfile.internships = mockProfile.internships.filter((i: any) => i.id !== where.id);
    return { count: 1 };
  };

  (prisma.studentCertification as any).create = async ({ data }: any) => {
    const item = { id: `cert-${Date.now()}-${Math.random()}`, ...data };
    mockProfile.certifications.push(item);
    return item;
  };
  (prisma.studentCertification as any).deleteMany = async ({ where }: any) => {
    mockProfile.certifications = mockProfile.certifications.filter((c: any) => c.id !== where.id);
    return { count: 1 };
  };

  (prisma.studentDocument as any).create = async ({ data }: any) => {
    const item = { id: `doc-${Date.now()}-${Math.random()}`, ...data };
    mockProfile.documents.push(item);
    return item;
  };
  (prisma.studentDocument as any).deleteMany = async ({ where }: any) => {
    mockProfile.documents = mockProfile.documents.filter((d: any) => d.id !== where.id);
    return { count: 1 };
  };

  // Verification history mock
  (prisma.studentProfileVerificationHistory as any).create = async ({ data }: any) => {
    const hist = { id: `hist-${Date.now()}`, ...data, createdAt: new Date() };
    mockProfile.masterVerificationHistory.push(hist);
    return hist;
  };

  // Company Data Requirements mocks
  (prisma.companyDataRequirementTemplate as any).create = async ({ data }: any) => {
    const tmpl = { id: `tmpl-${Date.now()}`, ...data, createdAt: new Date() };
    mockTemplates.push(tmpl);
    return tmpl;
  };
  (prisma.companyDataRequirementTemplate as any).findMany = async () => mockTemplates;
  (prisma.companyDataRequirementTemplate as any).findUnique = async ({ where }: any) =>
    mockTemplates.find((t) => t.id === where.id) || null;

  (prisma.placementDriveDataRequirement as any).upsert = async ({ create, update }: any) => {
    mockDriveRequirement = {
      id: `dreq-${Date.now()}`,
      ...(mockDriveRequirement ? update : create),
      driveId,
      drive: mockDrive,
      template: null,
    };
    return mockDriveRequirement;
  };
  (prisma.placementDriveDataRequirement as any).findUnique = async ({ where }: any) => {
    if (where?.driveId === driveId) {
      return {
        ...mockDriveRequirement,
        drive: mockDrive,
      };
    }
    return null;
  };

  // Generated Datasets mocks
  (prisma.generatedPlacementDataset as any).create = async ({ data }: any) => {
    const dataset = {
      id: `dset-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      drive: mockDrive,
      requirement: mockDriveRequirement,
      reviewer: null,
      approver: null,
      exportHistory: [],
    };
    mockGeneratedDatasets[dataset.id] = dataset;
    return dataset;
  };
  (prisma.generatedPlacementDataset as any).findUnique = async ({ where }: any) => {
    const ds = mockGeneratedDatasets[where.id];
    if (ds) {
      return {
        ...ds,
        drive: mockDrive,
        requirement: mockDriveRequirement,
      };
    }
    return null;
  };
  (prisma.generatedPlacementDataset as any).findMany = async () => Object.values(mockGeneratedDatasets);
  (prisma.generatedPlacementDataset as any).update = async ({ where, data }: any) => {
    if (mockGeneratedDatasets[where.id]) {
      mockGeneratedDatasets[where.id] = {
        ...mockGeneratedDatasets[where.id],
        ...data,
      };
      return {
        ...mockGeneratedDatasets[where.id],
        drive: mockDrive,
        requirement: mockDriveRequirement,
      };
    }
    return null;
  };

  (prisma.datasetExportHistory as any).create = async ({ data }: any) => {
    const entry = { id: `exp-${Date.now()}`, ...data, exportedAt: new Date() };
    mockExportHistory.push(entry);
    return entry;
  };

  (prisma.auditLog as any).create = async ({ data }: any) => {
    mockAuditLogs.push(data);
    return data;
  };

  (prisma.dataShareLog as any).create = async ({ data }: any) => {
    mockShareLogs.push(data);
    return data;
  };

  (prisma.consentRecord as any).findUnique = async () => {
    return { isGranted: true, studentId, type: 'placement_sharing' };
  };

  t.after(() => {
    (prisma.user as any).findUnique = origUserFindUnique;
    (prisma.studentProfile as any).findUnique = origProfileFindUnique;
    (prisma.studentProfile as any).update = origProfileUpdate;
    (prisma.studentProfile as any).findMany = origProfileFindMany;
    (prisma.studentProfile as any).count = origProfileCount;
    (prisma.placementDrive as any).findUnique = origDriveFindUnique;
    (prisma.preliminaryAssessment as any).findUnique = origPrelimFindUnique;
    (prisma.driveApplication as any).findMany = origAppFindMany;
  });

  // ============================================================
  // TEST 1: Pure Function Profile Completion Calculation
  // ============================================================
  await t.test('1. calculateProfileCompletion correctly assesses missing sections and conditional exemptions', async () => {
    // Empty profile test
    const emptyResult = calculateProfileCompletion({});
    assert.strictEqual(emptyResult.isComplete, false);
    assert.ok(emptyResult.percentage < 50, 'Empty profile should have low completion %');
    assert.ok(emptyResult.missingFields.includes('Full Name'));
    assert.ok(emptyResult.missingFields.includes('KTU Register Number (KTUID)'));
    assert.ok(emptyResult.missingFields.includes('Technical Skills'));
    assert.ok(emptyResult.missingFields.includes('Projects'));

    // Lateral entry diploma exemption test:
    const diplomaStudent = {
      user: { name: 'Diploma Student', email: 'diploma@lbscek.ac.in' },
      personalEmail: 'diploma@lbscek.ac.in',
      phone: '9847000000',
      ktuid: 'LKSD23CS101',
      branch: { name: 'Computer Science and Engineering', code: 'CS' },
      admissionYear: 2021,
      graduatingBatch: '2025',
      currentSemester: 5,
      cgpa: 8.2,
      tenthSchool: 'GHSS',
      tenthBoard: 'State',
      tenthYear: 2020,
      tenthPercentage: 88,
      hasDiploma: true,
      diplomaInstitution: 'Govt Poly Kasaragod',
      diplomaPercentage: 85,
      activeBacklogs: 0,
      internshipNotApplicable: true,
      resumeUrl: 'https://cdn.intelliplace.edu/resumes/diploma.pdf',
      technicalSkills: [{ name: 'Python' }],
      projects: [{ title: 'IoT Weather' }],
    };
    const diplomaResult = calculateProfileCompletion(diplomaStudent);
    assert.strictEqual(diplomaResult.isComplete, true, 'Diploma student with N/A internship should be 100% complete');
    assert.strictEqual(diplomaResult.percentage, 100);
    assert.strictEqual(diplomaResult.missingFields.length, 0);
  });

  // ============================================================
  // TEST 2: Company Requirements Field Catalog
  // ============================================================
  await t.test('2. GET /api/company-requirements/catalog returns catalog of student fields grouped by section', async () => {
    const res = await request(app)
      .get('/api/company-requirements/catalog')
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.fields));
    assert.ok(res.body.data.fields.length >= 25, 'Catalog should include at least 25 fields across Sections A-J');

    const sections = res.body.data.sections;
    assert.ok(sections.includes('personal'));
    assert.ok(sections.includes('academic'));
    assert.ok(sections.includes('qualifications'));
    assert.ok(sections.includes('backlogs'));
    assert.ok(sections.includes('skills'));
    assert.ok(sections.includes('projects'));
    assert.ok(sections.includes('internships'));
    assert.ok(sections.includes('certifications'));
    assert.ok(sections.includes('professional'));
    assert.ok(sections.includes('documents'));
  });

  // ============================================================
  // TEST 3: Student Master Profile Fetch & Incomplete Submission Block
  // ============================================================
  await t.test('3. Student profile retrieval and validation on submission', async () => {
    // 3a. Retrieve profile
    const getRes = await request(app)
      .get('/api/master-profile/me')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.success, true);
    assert.strictEqual(getRes.body.data.userId, studentId);
    assert.strictEqual(getRes.body.data.masterStatus, 'IN_PROGRESS');
    assert.ok(getRes.body.data.completionMetrics.missingFields.length > 0);

    // 3b. Attempt submit while incomplete (missing skills, projects, internships) -> 400 Bad Request
    const submitRes = await request(app)
      .post('/api/master-profile/me/submit')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(submitRes.status, 400);
    assert.strictEqual(submitRes.body.success, false);
    assert.ok(
      submitRes.body.error && submitRes.body.error.includes('Cannot submit incomplete profile'),
      'Should report incomplete profile error'
    );
  });

  // ============================================================
  // TEST 4: Backend Guard Blocks Unverified Assessment
  // ============================================================
  await t.test('4. GET /api/students/me/assessment blocks students with unverified master profile', async () => {
    // masterStatus is IN_PROGRESS
    const res = await request(app)
      .get('/api/students/me/assessment')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 403, 'Should reject with 403 Forbidden');
    assert.ok(
      res.body.error && res.body.error.includes('complete and verified Student Master Profile'),
      'Must contain explanation message'
    );
  });

  // ============================================================
  // TEST 5: Complete Profile Child Sections & Successful Submission
  // ============================================================
  await t.test('5. Add required child entries and successfully submit master profile', async () => {
    // Add technical skill
    const skillRes = await request(app)
      .post('/api/master-profile/skills')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        category: 'programming_language',
        name: 'TypeScript',
        proficiency: 'advanced',
      });
    assert.strictEqual(skillRes.status, 201);

    // Add project
    const projRes = await request(app)
      .post('/api/master-profile/projects')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'IntelliPlace Campus Portal',
        description: 'Automated placement and campus drive platform',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
        projectUrl: 'https://github.com/anandhu/intelliplace',
      });
    assert.strictEqual(projRes.status, 201);

    // Add internship
    const internRes = await request(app)
      .post('/api/master-profile/internships')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        organization: 'Kerala Startup Mission',
        role: 'Full Stack Intern',
        startDate: '2024-05-01',
        endDate: '2024-07-31',
        responsibilities: 'Built dashboard widgets',
      });
    assert.strictEqual(internRes.status, 201);

    // Submit profile -> should now succeed and change status to SUBMITTED
    const submitSuccessRes = await request(app)
      .post('/api/master-profile/me/submit')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(submitSuccessRes.status, 200);
    assert.strictEqual(submitSuccessRes.body.success, true);
    assert.strictEqual(submitSuccessRes.body.data.masterStatus, 'SUBMITTED');
  });

  // ============================================================
  // TEST 6: PTO Verification Workflow & Assessment Unlocking
  // ============================================================
  await t.test('6. PTO review queue, revision request, approval, and assessment unlock', async () => {
    // 6a. Check PTO queue
    const queueRes = await request(app)
      .get('/api/master-profile/verification/queue?status=SUBMITTED')
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(queueRes.status, 200);
    assert.strictEqual(queueRes.body.success, true);
    assert.ok(queueRes.body.data.profiles.length >= 1);
    assert.strictEqual(queueRes.body.data.profiles[0].userId, studentId);

    // 6b. Request revision first
    const revRes = await request(app)
      .post(`/api/master-profile/verification/${studentId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        status: 'REVISION_REQUIRED',
        comments: 'Please verify 12th percentage against marksheet.',
      });

    assert.strictEqual(revRes.status, 200);
    assert.strictEqual(revRes.body.data.masterStatus, 'REVISION_REQUIRED');

    // 6c. Assessment remains blocked while REVISION_REQUIRED
    const assessBlockedRes = await request(app)
      .get('/api/students/me/assessment')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(assessBlockedRes.status, 403);

    // 6d. PTO verifies and approves profile
    const approveRes = await request(app)
      .post(`/api/master-profile/verification/${studentId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        status: 'VERIFIED',
        comments: 'All documents and academic marks cross-checked and verified.',
      });

    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.body.data.masterStatus, 'VERIFIED');
    assert.ok(approveRes.body.data.verifiedAt != null);

    // 6e. Assessment is NOW unlocked!
    const assessUnlockedRes = await request(app)
      .get('/api/students/me/assessment')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(assessUnlockedRes.status, 200, 'Assessment should now succeed');
    assert.strictEqual(assessUnlockedRes.body.success, true);
  });

  // ============================================================
  // TEST 7: Company Requirement Configuration & Template
  // ============================================================
  await t.test('7. PO configures reusable template and drive requirements', async () => {
    // 7a. Create template
    const templateRes = await request(app)
      .post('/api/company-requirements/templates')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        name: 'Standard IT Services Requirement',
        description: 'Common schema for Mass Hiring (TCS, Infosys, CTS)',
        fields: [
          { fieldKey: 'fullName', label: 'Full Name', customColumnName: 'Candidate Name', order: 1 },
          { fieldKey: 'ktuid', label: 'KTU Register Number', customColumnName: 'KTUID', order: 2 },
          { fieldKey: 'branch', label: 'Branch / Specialization', customColumnName: 'Discipline', order: 3 },
          { fieldKey: 'cgpa', label: 'B.Tech CGPA', customColumnName: 'CGPA', order: 4 },
          { fieldKey: 'activeBacklogs', label: 'Active Backlog Count', customColumnName: 'Current Backlogs', order: 5 },
          { fieldKey: 'resumeUrl', label: 'Latest Resume URL', customColumnName: 'Resume Link', order: 6 },
        ],
      });

    assert.strictEqual(templateRes.status, 201);
    assert.strictEqual(templateRes.body.success, true);
    assert.strictEqual(templateRes.body.data.name, 'Standard IT Services Requirement');

    // 7b. Configure drive requirement
    const driveReqRes = await request(app)
      .post(`/api/company-requirements/drives/${driveId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        templateId: templateRes.body.data.id,
        fields: [
          { fieldKey: 'fullName', label: 'Full Name', customColumnName: 'Candidate Name', order: 1 },
          { fieldKey: 'ktuid', label: 'KTU Register Number', customColumnName: 'KTUID', order: 2 },
          { fieldKey: 'branch', label: 'Branch / Specialization', customColumnName: 'Branch', order: 3 },
          { fieldKey: 'cgpa', label: 'B.Tech CGPA', customColumnName: 'UG CGPA', order: 4 },
          { fieldKey: 'programmingLanguages', label: 'Programming Languages', customColumnName: 'Tech Stack', order: 5 },
          { fieldKey: 'resumeUrl', label: 'Resume URL', customColumnName: 'Profile Link', order: 6 },
        ],
      });

    assert.strictEqual(driveReqRes.status, 200);
    assert.strictEqual(driveReqRes.body.success, true);
    assert.strictEqual(driveReqRes.body.data.driveId, driveId);
  });

  // ============================================================
  // TEST 8: One-Click Dataset Generation & Data Minimization Enforced
  // ============================================================
  let datasetId = '';
  await t.test('8. One-click dataset generation with strict data minimization', async () => {
    const genRes = await request(app)
      .post(`/api/company-requirements/drives/${driveId}/generate`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ scope: 'applied_students' });

    assert.strictEqual(genRes.status, 201);
    assert.strictEqual(genRes.body.success, true);
    datasetId = genRes.body.data.id;
    assert.ok(datasetId);
    assert.strictEqual(genRes.body.data.totalStudents, 1);
    assert.strictEqual(genRes.body.data.status, 'GENERATED');

    const record = genRes.body.data.data[0];
    assert.strictEqual(record.studentId, studentId);

    // VERIFY DATA MINIMIZATION:
    // Only the 6 requested customColumnNames must exist in record.fields!
    const fields = record.fields;
    assert.strictEqual(fields['Candidate Name'], 'Anandhu S');
    assert.strictEqual(fields['KTUID'], 'KSD23CS042');
    assert.strictEqual(fields['Branch'], 'Computer Science and Engineering');
    assert.strictEqual(fields['UG CGPA'], 8.85);
    assert.strictEqual(fields['Profile Link'], 'https://cdn.intelliplace.edu/resumes/anandhu.pdf');

    // Critical: Internal assessment scores, password hashes, and unrequested fields MUST NEVER be present!
    assert.strictEqual(fields['assessmentScore'], undefined);
    assert.strictEqual(fields['internalNotes'], undefined);
    assert.strictEqual(fields['passwordHash'], undefined);
    assert.strictEqual(fields['personalEmail'], undefined);
  });

  // ============================================================
  // TEST 9: PTO Dataset Review & Approval Gate
  // ============================================================
  await t.test('9. Unapproved export is rejected, then succeeds after PTO review & approval', async () => {
    // 9a. Attempt export while in GENERATED status -> 403 Forbidden
    const unapprovedExportRes = await request(app)
      .get(`/api/company-requirements/datasets/${datasetId}/export?format=csv`)
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(unapprovedExportRes.status, 403);
    assert.ok(
      unapprovedExportRes.body.error &&
        unapprovedExportRes.body.error.includes('Dataset must be approved'),
      'Must explain dataset approval requirement'
    );

    // 9b. PTO approves dataset
    const reviewRes = await request(app)
      .post(`/api/company-requirements/datasets/${datasetId}/review`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        status: 'APPROVED',
        comments: 'Verified dataset fields against Infosys recruiter request specification.',
      });

    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.body.data.status, 'APPROVED');
  });

  // ============================================================
  // TEST 10: Multi-Format Export (Excel, CSV, PDF) & Compliance Audit
  // ============================================================
  await t.test('10. Multi-format export (xlsx, csv, pdf) and compliance data share logging', async () => {
    // 10a. CSV Export
    const csvRes = await request(app)
      .get(`/api/company-requirements/datasets/${datasetId}/export?format=csv`)
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.text.includes('"Candidate Name"'));
    assert.ok(csvRes.text.includes('"KTUID"'));
    assert.ok(csvRes.text.includes('"Anandhu S"'));

    // 10b. Excel Export
    const xlsxRes = await request(app)
      .get(`/api/company-requirements/datasets/${datasetId}/export?format=xlsx`)
      .set('Authorization', `Bearer ${poToken}`)
      .buffer(true);

    assert.strictEqual(xlsxRes.status, 200);
    assert.strictEqual(
      xlsxRes.headers['content-type'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    assert.ok(xlsxRes.headers['content-disposition'].includes('.xlsx'));

    // 10c. PDF Export
    const pdfRes = await request(app)
      .get(`/api/company-requirements/datasets/${datasetId}/export?format=pdf`)
      .set('Authorization', `Bearer ${poToken}`)
      .buffer(true);

    assert.strictEqual(pdfRes.status, 200);
    assert.strictEqual(pdfRes.headers['content-type'], 'application/pdf');
    assert.ok(pdfRes.headers['content-disposition'].includes('.pdf'));

    // 10d. Verify Audit and DataShare logs were recorded
    assert.ok(mockExportHistory.length >= 3, 'Export history must record all 3 exports');
    assert.ok(mockShareLogs.length >= 1, 'Data share log must be generated for compliance');
  });
});
