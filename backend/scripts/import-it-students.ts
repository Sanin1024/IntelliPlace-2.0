import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

function parseKTUID(ktuid: string) {
  const normalized = ktuid.toUpperCase().trim();
  const regex = /^(L?)(KSD)(\d{2})(CSBS|CAID|CS|ME|CE|EC|EE|IT)(\d{3,4})$/;
  const match = normalized.match(regex);
  if (!match) throw new Error(`Invalid KTUID format: ${ktuid}`);
  
  const [, lateralPrefix, , yearStr, deptCode] = match;
  const isLateral = lateralPrefix === 'L';
  const admissionYear = 2000 + parseInt(yearStr, 10);
  
  return {
    fullKTUID: normalized,
    isLateral,
    admissionYear,
    departmentCode: deptCode,
    graduatingBatch: '2027'
  };
}

// 33 IT Student Records (KSD23IT031 intentionally omitted)
const students = [
  { name: "ADITHYAN C", ktuid: "KSD23IT001" },
  { name: "ANAGHA M RAVI", ktuid: "KSD23IT002" },
  { name: "ANIRUDH P", ktuid: "KSD23IT003" },
  { name: "AYSHATH JUMANA HASSIN T.M", ktuid: "KSD23IT004" },
  { name: "AYSHATH NAFIDA M H", ktuid: "KSD23IT005" },
  { name: "FAHEEMA L B", ktuid: "KSD23IT006" },
  { name: "FATHIMA FARZANA", ktuid: "KSD23IT007" },
  { name: "FATHIMA HADIYA", ktuid: "KSD23IT008" },
  { name: "FATHIMA HAIFA", ktuid: "KSD23IT009" },
  { name: "FATHIMATH BUSTHANA KH", ktuid: "KSD23IT010" },
  { name: "FATHIMATH FAHEEMA", ktuid: "KSD23IT011" },
  { name: "FATHIMATH MAHSANA PB", ktuid: "KSD23IT012" },
  { name: "FATHIMATH MUSHFIQA T V", ktuid: "KSD23IT013" },
  { name: "FATHIMATH NAFLA ALI", ktuid: "KSD23IT014" },
  { name: "GURUKIRAN", ktuid: "KSD23IT015" },
  { name: "KADEEJATH FIDHA I", ktuid: "KSD23IT016" },
  { name: "KHADEEJATH SHAMNAS K.M", ktuid: "KSD23IT017" },
  { name: "MAYOOKHA PRADEEP", ktuid: "KSD23IT018" },
  { name: "MOHAMMED RAHEES C A", ktuid: "KSD23IT019" },
  { name: "MOHAMMED SHANIB", ktuid: "KSD23IT020" },
  { name: "NAFEESATH MISIRIYA IK", ktuid: "KSD23IT021" },
  { name: "NIHAL C A", ktuid: "KSD23IT022" },
  { name: "P ALIYA SANA", ktuid: "KSD23IT023" },
  { name: "PRATHUL PAVITHRAN K", ktuid: "KSD23IT024" },
  { name: "RAMZAN ABDUL JALEEL", ktuid: "KSD23IT025" },
  { name: "RUKIYA HIBHA B.K", ktuid: "KSD23IT026" },
  { name: "SAHANA SIDDEEQ", ktuid: "KSD23IT027" },
  { name: "SANVI B", ktuid: "KSD23IT028" },
  { name: "SARUN K NAMBIAR", ktuid: "KSD23IT029" },
  { name: "SHEIKHA DANA ABDULLA", ktuid: "KSD23IT030" },
  { name: "VAISHNAVI KRISHNAN T. K", ktuid: "KSD23IT032" },
  { name: "ZAHEEM MUHAMMED PH", ktuid: "KSD23IT033" },
  { name: "ZUHA MUHAMMED SALI", ktuid: "KSD23IT034" }
];

async function main() {
  console.log(`Processing ${students.length} IT student records...`);

  const batch2027 = await prisma.batch.findFirst({ where: { name: '2023-2027' } });
  if (!batch2027) throw new Error('Batch 2023-2027 not found. Please run the main seed first.');

  const passwordHash = await bcrypt.hash('Student@123', 10);
  let createdCount = 0;
  let skippedCount = 0;

  for (const s of students) {
    const ktuData = parseKTUID(s.ktuid);
    
    // Check if student already exists by KTUID
    const existing = await prisma.studentProfile.findFirst({
      where: { ktuid: ktuData.fullKTUID }
    });

    if (existing) {
      console.log(`[SKIPPED] KTUID ${ktuData.fullKTUID} already exists in the database.`);
      skippedCount++;
      continue;
    }

    const branch = await prisma.branch.findFirst({ 
      where: { code: ktuData.departmentCode } 
    });
    if (!branch) throw new Error(`Branch with code ${ktuData.departmentCode} not found.`);

    // Generate email from KTUID to ensure uniqueness
    const email = `${ktuData.fullKTUID.toLowerCase()}@student.intelliplace.edu`;

    await prisma.user.create({
      data: {
        name: s.name, // Preserving exact capitalization and spelling
        email,
        passwordHash,
        role: 'student',
        studentProfile: {
          create: {
            ktuid: ktuData.fullKTUID,
            branchId: branch.id,
            batchId: batch2027.id,
            entryType: ktuData.isLateral ? 'LATERAL' : 'REGULAR',
            admissionYear: ktuData.admissionYear,
            graduatingBatch: ktuData.graduatingBatch,
            academicScheme: 'APJKTU_2019',
            section: 'NOT_APPLICABLE', // Explicitly set as per instructions
            knowledgeLevel: 'beginner',
            cgpaVerified: false,
            academicStatus: 'pending',
            profileUpdatedAt: new Date(),
            academicUpdatedAt: new Date(),
          },
        },
        assessmentsAssigned: {
          create: {
            status: 'pending_scheduling',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      }
    });
    createdCount++;
  }

  console.log('=========================================');
  console.log('IT Import Complete!');
  console.log(`Students Created: ${createdCount}`);
  console.log(`Students Skipped (Already Existed): ${skippedCount}`);
  console.log('=========================================');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

