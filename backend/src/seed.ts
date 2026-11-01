import { prisma } from './config/prisma.js';
import bcrypt from 'bcryptjs';

// Helper to parse LBS College KTUID
function parseKTUID(ktuid: string) {
  const normalized = ktuid.toUpperCase().trim();
  const regex = /^(L?)(KSD)(\d{2})(CSBS|CAID|CS|ME|CE|EC|EE|IT)(\d{3,4})$/;
  const match = normalized.match(regex);
  if (!match) throw new Error(`Invalid KTUID format: ${ktuid}`);
  
  const [, lateralPrefix, , yearStr, deptCode] = match;
  const isLateral = lateralPrefix === 'L';
  const admissionYear = 2000 + parseInt(yearStr, 10);
  const gradYear = isLateral ? admissionYear + 3 : admissionYear + 4;
  
  return {
    fullKTUID: normalized,
    isLateral,
    admissionYear,
    departmentCode: deptCode,
    graduatingBatch: String(gradYear)
  };
}

async function main() {
  console.log('🌱 Seeding IntelliPlace database...');

  // ============ CLEAR EXISTING DATA ============
  console.log('  Clearing existing data in FK-safe order...');
  await prisma.auditLog.deleteMany().catch(() => {});
  await prisma.preliminaryAssessment.deleteMany().catch(() => {});
  await prisma.studentProfileVerificationHistory.deleteMany().catch(() => {});
  await prisma.studentTechnicalSkill.deleteMany().catch(() => {});
  await prisma.studentProject.deleteMany().catch(() => {});
  await prisma.studentInternship.deleteMany().catch(() => {});
  await prisma.studentCertification.deleteMany().catch(() => {});
  await prisma.studentDocument.deleteMany().catch(() => {});
  await prisma.studentResumeData.deleteMany().catch(() => {});
  await prisma.consentRecord.deleteMany().catch(() => {});
  await prisma.dataAccessLog.deleteMany().catch(() => {});
  await prisma.dataShareLog.deleteMany().catch(() => {});
  await prisma.dataRequest.deleteMany().catch(() => {});
  await prisma.datasetExportHistory.deleteMany().catch(() => {});
  await prisma.generatedPlacementDataset.deleteMany().catch(() => {});
  await prisma.placementDriveDataRequirement.deleteMany().catch(() => {});
  await prisma.companyDataRequirementTemplate.deleteMany().catch(() => {});
  await prisma.notificationSchedule.deleteMany().catch(() => {});
  await prisma.notificationCampaign.deleteMany().catch(() => {});
  await prisma.notificationRecipient.deleteMany().catch(() => {});
  await prisma.notification.deleteMany().catch(() => {});
  await prisma.studentAnswer.deleteMany().catch(() => {});
  await prisma.testAttempt.deleteMany().catch(() => {});
  await prisma.codingSubmission.deleteMany().catch(() => {});
  await prisma.mockTestQuestion.deleteMany().catch(() => {});
  await prisma.mockTest.deleteMany().catch(() => {});
  await prisma.codingTestCase.deleteMany().catch(() => {});
  await prisma.codingProblem.deleteMany().catch(() => {});
  await prisma.aptitudeQuestion.deleteMany().catch(() => {});
  await prisma.studentTargetCompany.deleteMany().catch(() => {});
  await prisma.companyTopic.deleteMany().catch(() => {});
  await prisma.companyEligibleBranch.deleteMany().catch(() => {});
  await prisma.company.deleteMany().catch(() => {});
  await prisma.resource.deleteMany().catch(() => {});
  await prisma.studentProfile.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  await prisma.topic.deleteMany().catch(() => {});
  await prisma.batch.deleteMany().catch(() => {});
  await prisma.branch.deleteMany().catch(() => {});
  console.log('  ✅ Tables cleared.');

  // ============ BRANCHES & BATCHES ============
  console.log('  Seeding branches...');
  const branches = [
    { name: 'Computer Science and Engineering', code: 'CS' },
    { name: 'Mechanical Engineering', code: 'ME' },
    { name: 'Civil Engineering', code: 'CE' },
    { name: 'Electronics and Communication Engineering', code: 'EC' },
    { name: 'Electrical and Electronics Engineering', code: 'EE' },
    { name: 'Information Technology', code: 'IT' },
    { name: 'Computer Science and Business Systems', code: 'CSBS' },
    { name: 'Artificial Intelligence and Data Science', code: 'CAID' },
  ];

  for (const b of branches) {
    await prisma.branch.create({ data: b });
  }
  const cseBranch = await prisma.branch.findFirst({ where: { code: 'CS' } });

  console.log('  Seeding batches...');
  const batch2027 = await prisma.batch.create({ data: { name: '2023-2027', graduationYear: 2027 } });

  // ============ TOPICS ============
  console.log('  Seeding topics...');
  await prisma.topic.create({ data: { name: 'Quantitative Aptitude', type: 'aptitude' } });
  await prisma.topic.create({ data: { name: 'Logical Reasoning', type: 'aptitude' } });
  await prisma.topic.create({ data: { name: 'Verbal Ability', type: 'aptitude' } });
  await prisma.topic.create({ data: { name: 'Arrays', type: 'coding' } });
  await prisma.topic.create({ data: { name: 'Strings', type: 'coding' } });

  // ============ STAFF USERS ============
  console.log('  Seeding staff users...');
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const poHash = await bcrypt.hash('Po@12345', 10);
  const trainerHash = await bcrypt.hash('Trainer@123', 10);

  await prisma.user.create({
    data: { name: 'System Admin', email: 'admin@intelliplace.edu', passwordHash: adminHash, role: 'admin' }
  });

  await prisma.user.create({
    data: { name: 'Placement & Training Officer', email: 'po@intelliplace.edu', passwordHash: poHash, role: 'po' }
  });

  await prisma.user.create({
    data: { name: 'Tutor Rahul', email: 'trainer1@intelliplace.edu', passwordHash: trainerHash, role: 'trainer' }
  });

  // ============ STUDENT DATA ============
  const studentData = [
    { "name": "ABHIJITH UNNIKRISHNAN", "ktuid": "KSD23CS003", "email": "abhijithunnikrishnan2004@gmail.com" },
    { "name": "ABHINAV K", "ktuid": "KSD23CS004", "email": "abhinavk8136@gmail.com" },
    { "name": "ABHINAV RAMESAN", "ktuid": "KSD23CS005", "email": "abhinavramesann@gmail.com" },
    { "name": "ABIN R P", "ktuid": "KSD23CS007", "email": "abinrp16@gmail.com" },
    { "name": "ADHI RAJ", "ktuid": "KSD23CS011", "email": "adhiraj53a@gmail.com" },
    { "name": "ADHISH R", "ktuid": "KSD23CS013", "email": "adhishrpublic@gmail.com" },
    { "name": "AHAMED INSHAD D E", "ktuid": "KSD23CS016", "email": "inshadinshu313@gmail.com" },
    { "name": "AKSHAYA V P", "ktuid": "KSD23CS019", "email": "vpakshaya2004@gmail.com" },
    { "name": "ALOK", "ktuid": "KSD23CS020", "email": "alokprakash2657@gmail.com" },
    { "name": "AMEEN AHAMMED S", "ktuid": "KSD23CS022", "email": "Ameenspro111@gmail.com" },
    { "name": "AMRUTHA P", "ktuid": "KSD23CS023", "email": "amruthaprakash30@gmail.com" },
    { "name": "ANAGHA A", "ktuid": "KSD23CS025", "email": "anagharaghavan0104@gmail.com" },
    { "name": "ANUSREE N", "ktuid": "KSD23CS026", "email": "anusree05n@gmail.com" },
    { "name": "ANVITH KUMAR M", "ktuid": "KSD23CS027", "email": "anvithkumarm818@gmail.com" },
    { "name": "APARNA T V", "ktuid": "KSD23CS028", "email": "aparnatv2@gmail.com" },
    { "name": "ARCHANA DAS A", "ktuid": "KSD23CS029", "email": "archanadas2102@gmail.com" },
    { "name": "ASHNA P", "ktuid": "KSD23CS033", "email": "ashnathanniyadi@gmail.com" },
    { "name": "ASHWANI M", "ktuid": "KSD23CS034", "email": "ashwanim612@gmail.com" },
    { "name": "ATHUL M V", "ktuid": "KSD23CS037", "email": "athul121404@gmail.com" },
    { "name": "AYSHATH NAFIA K M", "ktuid": "KSD23CS038", "email": "ayshathnafiakm03@gmail.com" },
    { "name": "DEVADATH P", "ktuid": "KSD23CS041", "email": "devaarjunp105@gmail.com" },
    { "name": "FAIZA T", "ktuid": "KSD23CS045", "email": "tfaiza2004@gmail.com" },
    { "name": "FARHAN P", "ktuid": "KSD23CS046", "email": "farhanpadathedath@gmail.com" },
    { "name": "FATHIMA BASHEER M T P", "ktuid": "KSD23CS048", "email": "fathimabasheermtp777@gmail.com" },
    { "name": "FATHIMA RIFA AJ", "ktuid": "KSD23CS049", "email": "rifaaj59@gmail.com" },
    { "name": "FATHIMA SHAMA", "ktuid": "KSD23CS051", "email": "fathimashama.271@gmail.com" },
    { "name": "FATHIMATH RIZA C M", "ktuid": "KSD23CS054", "email": "fathimathriza50@gmail.com" },
    { "name": "FUAD SANIN M", "ktuid": "KSD23CS055", "email": "saninfu03@gmail.com" },
    { "name": "HARITHASREE P", "ktuid": "KSD23CS059", "email": "harithasreep566@gmail.com" },
    { "name": "HAWWA RAFIYA", "ktuid": "KSD23CS060", "email": "hawwarafiya@gmail.com" },
    { "name": "H KESHAVA BHAKTHA", "ktuid": "KSD23CS062", "email": "vpbhaktha2006@gmail.com" },
    { "name": "KADEEJATH SIRAJA C A", "ktuid": "KSD23CS065", "email": "sirajaahmed99@gmail.com" },
    { "name": "KASHYAP T P", "ktuid": "KSD23CS066", "email": "kashyaptp21@gmail.com" },
    { "name": "MALAVIKA RAKESH", "ktuid": "KSD23CS075", "email": "malavikarakesh63@gmail.com" },
    { "name": "MARIYAM", "ktuid": "KSD23CS077", "email": "mariyamabrzak2005@gmail.com" },
    { "name": "MAYOOKHA P V", "ktuid": "KSD23CS079", "email": "mayookhapv2005@gmail.com" },
    { "name": "MEENU P P", "ktuid": "KSD23CS080", "email": "meenumohan784@gmail.com" },
    { "name": "MONIKA DEVI", "ktuid": "KSD23CS083", "email": "md6719204@gmail.com" },
    { "name": "MUHAMMADALI SHIHAB U", "ktuid": "KSD23CS084", "email": "muhammadalishihabu@gmail.com" },
    { "name": "MUHAMMED FAZIL P A", "ktuid": "KSD23CS085", "email": "fazilpa08@gmail.com" },
    { "name": "NANDANA RAJAN K", "ktuid": "KSD23CS088", "email": "nandanarajank05@gmail.com" },
    { "name": "NAVEENA A", "ktuid": "KSD23CS089", "email": "naveenamadikai8@gmail.com" },
    { "name": "NEHA N V", "ktuid": "KSD23CS091", "email": "nehanv2005@gmail.com" },
    { "name": "OMKAR S NATH", "ktuid": "KSD23CS094", "email": "omkar.sethunath@gmail.com" },
    { "name": "P ADITHYA K K NAIR", "ktuid": "KSD23CS096", "email": "padithyakknair@gmail.com" },
    { "name": "PRASHOB KUMAR M", "ktuid": "KSD23CS098", "email": "prashobkumar07@gmail.com" },
    { "name": "RASHA K P", "ktuid": "KSD23CS100", "email": "rasharasheed081@gmail.com" },
    { "name": "RESHMI RAJAN M", "ktuid": "KSD23CS101", "email": "mreshmirajan@gmail.com" },
    { "name": "SANGEETH M", "ktuid": "KSD23CS104", "email": "sangeethm457@gmail.com" },
    { "name": "SAYANTH K", "ktuid": "KSD23CS106", "email": "sayanthk410@gmail.com" },
    { "name": "SHAIMA ZUBAIDA", "ktuid": "KSD23CS108", "email": "shaimazubaida2005@gmail.com" },
    { "name": "SHANA NASREEN P", "ktuid": "KSD23CS109", "email": "shanawadi@gmail.com" },
    { "name": "SHISHIRA BALLULLAYA K", "ktuid": "KSD23CS110", "email": "shishiraballullayak@gmail.com" },
    { "name": "SHIVARAJ E", "ktuid": "KSD23CS111", "email": "shivaraje2005@gmail.com" },
    { "name": "SINAN", "ktuid": "KSD23CS112", "email": "sinaansalam70@gmail.com" },
    { "name": "SIVANAND S", "ktuid": "KSD23CS113", "email": "ssivanand52@gmail.com" },
    { "name": "SNEHA A", "ktuid": "KSD23CS115", "email": "sneha236425@gmail.com" },
    { "name": "SREENANDHA B", "ktuid": "KSD23CS118", "email": "sreenandhab2005@gmail.com" },
    { "name": "SREESHA S", "ktuid": "KSD23CS119", "email": "sreeshas167@gmail.com" },
    { "name": "SURYAKIRAN M K", "ktuid": "KSD23CS122", "email": "suryakiranmk20@gmail.com" },
    { "name": "SWETHA V N", "ktuid": "KSD23CS123", "email": "swethavn01@gmail.com" },
    { "name": "THEJAS KUMAR K M", "ktuid": "KSD23CS124", "email": "thejaskumar974@gmail.com" },
    { "name": "UMAR AL MUKHTAR IBRAHIMKUTTY", "ktuid": "KSD23CS125", "email": "umar1868807@gmail.com" },
    { "name": "VISHAL KODOTH", "ktuid": "KSD23CS129", "email": "vishnuvishalkodoth@gmail.com" },
    { "name": "VISHNUPRASAD P", "ktuid": "KSD23CS130", "email": "vishnuprasadp201@gmail.com" },
    { "name": "YADUMITHRA U N", "ktuid": "KSD23CS131", "email": "yadumithra1@gmail.com" },
    { "name": "ABHINAND M", "ktuid": "LKSD23CS133", "email": "abhinand2803@gmail.com" },
    { "name": "AKSHAY P", "ktuid": "LKSD23CS134", "email": "akshaypambady10@gmail.com" },
    { "name": "ALAN BENNY", "ktuid": "LKSD23CS135", "email": "alanb67821@gmail.com" },
    { "name": "ANEESH SUNNY", "ktuid": "LKSD23CS137", "email": "aneeshsunny2015@gmail.com" },
    { "name": "FATHIMATHUL SAHLA", "ktuid": "LKSD23CS140", "email": "sahlaashrafsahlaashraf@gmail.com" },
    { "name": "SUHANA NASAR B", "ktuid": "LKSD23CS144", "email": "suhananzr2003@gmail.com" }
  ];

  console.log(`  Seeding ${studentData.length} students...`);
  const studentHash = await bcrypt.hash('Student@123', 10);

  for (const s of studentData) {
    const ktuData = parseKTUID(s.ktuid);
    
    await prisma.user.create({
      data: {
        name: s.name,
        email: s.email.toLowerCase(),
        passwordHash: studentHash,
        role: 'student',
        studentProfile: {
          create: {
            ktuid: ktuData.fullKTUID,
            branchId: cseBranch!.id, // All provided students are CSE
            batchId: batch2027.id,
            entryType: ktuData.isLateral ? 'LATERAL' : 'REGULAR',
            admissionYear: ktuData.admissionYear,
            graduatingBatch: ktuData.graduatingBatch,
            academicScheme: 'APJKTU_2019',
            knowledgeLevel: 'beginner', // Default level
            cgpaVerified: false,
            academicStatus: 'pending',
            profileUpdatedAt: new Date(),
            academicUpdatedAt: new Date(),
          },
        },
        assessmentsAssigned: {
          create: {
            status: 'pending_scheduling',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          }
        }
      }
    });
  }

  console.log(`  ✅ ${studentData.length} students seeded successfully`);
  console.log('\n✅ Seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin:    admin@intelliplace.edu / Admin@123');
  console.log('  PO:       po@intelliplace.edu / Po@12345');
  console.log('  Trainer:  trainer1@intelliplace.edu / Trainer@123');
  console.log('  Students: <student_email> / Student@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
