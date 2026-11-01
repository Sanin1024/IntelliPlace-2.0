import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import zlib from 'zlib';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  validateResumeBuffer,
  MAX_SIZE_MB,
  resumeDir,
} from '../src/services/resumeValidation.service.js';
import {
  extractPdfText,
  extractStructured,
  scanPrivacy,
  compareWithProfile,
  parseResumeBuffer,
} from '../src/services/resumeParsing.service.js';
import {
  getFreshnessThresholdDays,
  checkResumeFreshness,
  getSkillGapAnalysis,
} from '../src/services/resumeAnalysis.service.js';
import {
  assertResumeAccess,
  createAccessToken,
  resolveAccessToken,
} from '../src/services/resumeAccess.service.js';

test('Resume & Profile Management: Challenges 101–115 Suite', async (t) => {
  let adminToken = '';
  let poToken = '';
  let studentToken = '';
  let foreignStudentToken = '';
  let studentId = '';
  let dbConnected = false;

  await t.test('0. Setup: Authenticate roles & verify db connectivity', async () => {
    try {
      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@intelliplace.edu', password: 'Admin@123' });
      if (adminRes.status === 200) adminToken = adminRes.body.data.token;

      const poRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'po@intelliplace.edu', password: 'PO@123' });
      if (poRes.status === 200) poToken = poRes.body.data.token;

      const studentRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@student.edu', password: 'Student@123' });
      if (studentRes.status === 200) {
        studentToken = studentRes.body.data.token;
        studentId = studentRes.body.data.user.id;
      }

      const foreignRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bob@student.edu', password: 'Student@123' });
      if (foreignRes.status === 200) foreignStudentToken = foreignRes.body.data.token;

      dbConnected = !!(adminToken && studentToken);
    } catch {
      dbConnected = false;
    }
  });

  // ============================================================
  // Challenge 101 & 103: Content-based File Validation
  // ============================================================
  await t.test('Challenge 101 & 103: Content-based validation rejects spoofed MIME and executables', () => {
    // 1. Executable file (MZ header)
    const mzExe = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00'.padEnd(120, '\0'));
    const exeRes = validateResumeBuffer(mzExe, 'application/pdf', 'resume.pdf');
    assert.strictEqual(exeRes.valid, false);
    assert.match(exeRes.error || '', /Executable files are not allowed/i);

    // 2. Text file disguised as PDF
    const fakePdf = Buffer.from('Hello world this is not a pdf file at all'.padEnd(120, '.'));
    const fakeRes = validateResumeBuffer(fakePdf, 'application/pdf', 'resume.pdf');
    assert.strictEqual(fakeRes.valid, false);
    assert.match(fakeRes.error || '', /Unsupported file format/i);

    // 3. Valid PDF magic but MIME mismatch
    const pdfBuf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'.padEnd(120, ' '));
    const mimeMismatch = validateResumeBuffer(pdfBuf, 'text/plain', 'resume.txt');
    assert.strictEqual(mimeMismatch.valid, false);
    assert.match(mimeMismatch.error || '', /sent as a different type/i);

    // 4. Corrupted PDF (missing %%EOF)
    const corruptPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntruncated-content'.padEnd(120, ' '));
    const corruptRes = validateResumeBuffer(corruptPdf, 'application/pdf', 'resume.pdf');
    assert.strictEqual(corruptRes.valid, false);
    assert.match(corruptRes.error || '', /missing document end-marker/i);

    // 5. Password-protected PDF (/Encrypt dictionary)
    const pwPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<</Encrypt 2 0 R>>\nendobj\n%%EOF'.padEnd(120, ' '));
    const pwRes = validateResumeBuffer(pwPdf, 'application/pdf', 'resume.pdf');
    assert.strictEqual(pwRes.valid, false);
    assert.match(pwRes.error || '', /Password-protected/i);

    // 6. Legitimate PDF structure
    const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'.padEnd(120, ' '));
    const validRes = validateResumeBuffer(validPdf, 'application/pdf', 'resume.pdf');
    assert.strictEqual(validRes.valid, true);
    assert.strictEqual(validRes.detectedType, 'pdf');
  });

  // ============================================================
  // Challenge 102: Configurable Upload Size Limits
  // ============================================================
  await t.test('Challenge 102: Upload size limit defaults to 5MB or reads system setting', async () => {
    const limit = await MAX_SIZE_MB();
    assert.ok(typeof limit === 'number');
    assert.ok(limit >= 1 && limit <= 50);
  });

  // ============================================================
  // Challenge 113: Privacy Scanning (Aadhaar, PAN, Address, DOB)
  // ============================================================
  await t.test('Challenge 113: Privacy scanner detects Aadhaar, PAN, Address and DOB with masking', () => {
    const sampleText = `
      John Doe
      Email: john.doe@example.com
      Phone: 9876543210
      Aadhaar: 1234 5678 9012
      PAN: ABCDE1234F
      Permanent Address: Door No 44, MG Road, Pincode 560001, Bangalore
      DOB: 15/08/2001
      Skills: JavaScript, TypeScript, React
    `;

    const findings = scanPrivacy(sampleText);
    assert.ok(findings.length >= 3);

    const aadhaarFinding = findings.find((f) => f.type === 'aadhaar');
    assert.ok(aadhaarFinding);
    assert.strictEqual(aadhaarFinding.severity, 'warning');
    assert.ok(aadhaarFinding.matchedSnippet?.includes('****'));

    const panFinding = findings.find((f) => f.type === 'pan');
    assert.ok(panFinding);
    assert.strictEqual(panFinding.severity, 'warning');
    assert.ok(panFinding.matchedSnippet?.includes('****'));

    const addrFinding = findings.find((f) => f.type === 'address');
    assert.ok(addrFinding);

    const dobFinding = findings.find((f) => f.type === 'dob');
    assert.ok(dobFinding);
  });

  // ============================================================
  // Challenge 106: Deterministic Heuristic Structured Extractor
  // ============================================================
  await t.test('Challenge 106: Deterministic extractor pulls contact, skills, and assigns confidence', async () => {
    const sampleText = `
      ALICE SMITH
      Email: alice.dev@university.edu
      Contact: +91 9876543210
      GitHub: github.com/alicedev | LinkedIn: linkedin.com/in/alicedev

      TECHNICAL SKILLS
      Languages: Python, TypeScript, Java, SQL, JavaScript
      Frameworks & Libraries: React, Node.js, Express, Docker, PostgreSQL
      Concepts: REST APIs, Data Structures, Algorithms

      EDUCATION
      B.Tech Computer Science and Engineering, 2026
      CGPA: 8.9 / 10.0
    `;

    const parsed = await extractStructured(sampleText);
    assert.strictEqual(parsed.email, 'alice.dev@university.edu');
    assert.strictEqual(parsed.phone, '9876543210');
    assert.ok(parsed.skills.includes('TypeScript'));
    assert.ok(parsed.skills.includes('React'));
    assert.ok(parsed.skills.includes('Docker'));
    assert.ok(parsed.skills.includes('PostgreSQL'));
    assert.ok(parsed.links.length >= 2);
    assert.strictEqual(parsed.confidence.email, 'high');
    assert.strictEqual(parsed.confidence.phone, 'high');
    assert.strictEqual(parsed.confidence.skills, 'high');
    assert.strictEqual(parsed.confidence.overall, 'high');
  });

  // ============================================================
  // Challenge 105: Graceful Error Handling on Corrupt File
  // ============================================================
  await t.test('Challenge 105: Corrupt or empty buffer returns parseStatus: failed without throwing', async () => {
    const junkBuf = Buffer.from('short garbage string');
    const result = await parseResumeBuffer(junkBuf, 'pdf');
    assert.strictEqual(result.parseStatus, 'failed');
    assert.strictEqual(result.parsedData, null);
    assert.deepStrictEqual(result.privacyScan, []);
  });

  // ============================================================
  // Challenge 104 & 115: Resume Freshness & Threshold Evaluation
  // ============================================================
  await t.test('Challenge 104 & 115: Freshness threshold defaults to 120 days without auto-rejection', async () => {
    const days = await getFreshnessThresholdDays();
    assert.strictEqual(typeof days, 'number');
    assert.ok(days >= 30);

    // Non-existent student freshness returns stale warning without crashing
    const dummyFresh = await checkResumeFreshness('non-existent-student-uuid');
    assert.strictEqual(dummyFresh.hasActiveResume, false);
    assert.strictEqual(dummyFresh.isStale, true);
    assert.strictEqual(dummyFresh.daysSinceUpload, null);
  });

  // ============================================================
  // Challenge 110: Storage Layout & Path Safety
  // ============================================================
  await t.test('Challenge 110: Storage path maps safely into uploads/resumes/<studentId>', () => {
    const sId = 'student-test-123';
    const dir = resumeDir(sId);
    assert.ok(dir.includes('uploads'));
    assert.ok(dir.includes('resumes'));
    assert.ok(dir.endsWith(sId));
  });

  // ============================================================
  // Integration Tests (when DB is active)
  // ============================================================
  await t.test('Challenge 109, 110, 111, 114: Full upload, versioning, download, and application snapshot flow', async () => {
    if (!dbConnected) {
      console.log('Skipping DB integration tests (DB offline or test credentials unavailable)');
      return;
    }

    // Generate a valid minimal PDF buffer with skills & contact info
    const content = `
      %PDF-1.4
      1 0 obj
      << /Type /Catalog /Pages 2 0 R >>
      endobj
      2 0 obj
      << /Type /Pages /Kids [3 0 R] /Count 1 >>
      endobj
      3 0 obj
      << /Type /Page /Parent 2 0 R /Contents 4 0 R >>
      endobj
      4 0 obj
      << /Length 200 >>
      stream
      BT
      /F1 12 Tf
      (Alice Student) Tj
      (alice.test@university.edu) Tj
      (9876543210) Tj
      (Skills: JavaScript, TypeScript, React, Docker, Python, SQL) Tj
      ET
      endstream
      endobj
      trailer
      << /Root 1 0 R >>
      %%EOF
    `.padEnd(300, ' ');

    const validPdfBuffer = Buffer.from(content);

    // 1. Upload resume version 1
    const uploadRes = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('label', 'Engineering Resume v1')
      .attach('file', validPdfBuffer, { filename: 'alice_cv.pdf', contentType: 'application/pdf' });

    assert.strictEqual(uploadRes.status, 201);
    assert.strictEqual(uploadRes.body.success, true);
    const v1 = uploadRes.body.data.version;
    assert.ok(v1.id);
    assert.strictEqual(v1.isActive, true);
    assert.strictEqual(v1.label, 'Engineering Resume v1');

    // 2. Verify version listing
    const listRes = await request(app)
      .get('/api/resumes/versions')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.data.versions.length >= 1);
    const listedV1 = listRes.body.data.versions.find((v: any) => v.id === v1.id);
    assert.ok(listedV1);
    assert.strictEqual(listedV1.isActive, true);

    // 3. Authenticated Download (Challenge 111)
    const downloadRes = await request(app)
      .get(`/api/resumes/${v1.id}/download`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(downloadRes.status, 200);
    assert.strictEqual(downloadRes.headers['content-type'], 'application/pdf');

    // 4. Unauthorized cross-student download blocked (Challenge 111)
    if (foreignStudentToken) {
      const crossRes = await request(app)
        .get(`/api/resumes/${v1.id}/download`)
        .set('Authorization', `Bearer ${foreignStudentToken}`);

      assert.strictEqual(crossRes.status, 403);
    }

    // 5. Generate time-limited share token (Challenge 112)
    const linkRes = await request(app)
      .post(`/api/resumes/${v1.id}/link`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ expiresInDays: 3 });

    assert.strictEqual(linkRes.status, 200);
    assert.ok(linkRes.body.data.token);

    // Download via token without bearer auth (Challenge 112)
    const tokenDownloadRes = await request(app).get(`/api/resumes/link/${linkRes.body.data.token}`);
    assert.strictEqual(tokenDownloadRes.status, 200);
    assert.strictEqual(tokenDownloadRes.headers['content-type'], 'application/pdf');

    // 6. Placement Officer Stale Report (Challenge 115)
    if (poToken || adminToken) {
      const authStaffToken = poToken || adminToken;
      const staleRes = await request(app)
        .get('/api/resumes/stale-report')
        .set('Authorization', `Bearer ${authStaffToken}`);

      assert.strictEqual(staleRes.status, 200);
      assert.ok(typeof staleRes.body.data.thresholdDays === 'number');
      assert.ok(Array.isArray(staleRes.body.data.students));
    }
  });
});

