import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

const csbStudents = [
  { name: "ABDUL NAFIH T", ktuid: "KSD23CS001" }, { name: "ABDUL RAHIMAN MUHAZ", ktuid: "KSD23CS002" },
  { name: "ABINAV M N", ktuid: "KSD23CS006" }, { name: "ABOOBACKER RUVAIS", ktuid: "KSD23CS009" },
  { name: "ADARSH BHAKTHA K", ktuid: "KSD23CS010" }, { name: "ADHISH K", ktuid: "KSD23CS012" },
  { name: "ADITHYA A", ktuid: "KSD23CS014" }, { name: "ADITHYAN M V", ktuid: "KSD23CS015" },
  { name: "A K DIYA", ktuid: "KSD23CS017" }, { name: "AKHIL CHANDRAN", ktuid: "KSD23CS018" },
  { name: "AMALESH P V", ktuid: "KSD23CS021" }, { name: "AMRUTHESH P K", ktuid: "KSD23CS024" },
  { name: "ARCHANA S LAL", ktuid: "KSD23CS030" }, { name: "ARJUN CHANDRAN", ktuid: "KSD23CS031" },
  { name: "ASHITHA K", ktuid: "KSD23CS032" }, { name: "ASIYA SIDRATH M H", ktuid: "KSD23CS035" },
  { name: "ASWANI S H", ktuid: "KSD23CS036" }, { name: "BHAVANA M", ktuid: "KSD23CS039" },
  { name: "DEEPA S", ktuid: "KSD23CS040" }, { name: "DHANASHYAM E C", ktuid: "KSD23CS042" },
  { name: "DHEEKSHITHA K V", ktuid: "KSD23CS043" }, { name: "DHEERAJ K P", ktuid: "KSD23CS044" },
  { name: "FATHAH ALI M", ktuid: "KSD23CS047" }, { name: "FATHIMA RIFDA", ktuid: "KSD23CS050" },
  { name: "FATHIMATH RAIHANA", ktuid: "KSD23CS052" }, { name: "FATHIMATH RIZA", ktuid: "KSD23CS053" },
  { name: "HANA SHAMEER", ktuid: "KSD23CS056" }, { name: "HARI KRISHNA R", ktuid: "KSD23CS057" },
  { name: "HARITHA HAREESH", ktuid: "KSD23CS058" }, { name: "HIDHA RIYAS", ktuid: "KSD23CS061" },
  { name: "JAMSHADA SULTHANA A M", ktuid: "KSD23CS063" }, { name: "JYOTHIKA J", ktuid: "KSD23CS064" },
  { name: "KAVYA", ktuid: "KSD23CS067" }, { name: "KHADEEJATH MURSHEEDA K", ktuid: "KSD23CS068" },
  { name: "KRIPA P", ktuid: "KSD23CS069" }, { name: "KRISHNADEV M", ktuid: "KSD23CS070" },
  { name: "KRISHNAPRIYA M", ktuid: "KSD23CS071" }, { name: "LAMIYA RASHEED", ktuid: "KSD23CS072" },
  { name: "LULU MOL KUNNATH", ktuid: "KSD23CS073" }, { name: "MALAVIKA K", ktuid: "KSD23CS074" },
  { name: "MANVITHA P", ktuid: "KSD23CS076" }, { name: "MARYAM MOHAMMED KUNHI", ktuid: "KSD23CS078" },
  { name: "MINHA MARIYAM", ktuid: "KSD23CS081" }, { name: "MOHAMMED SHAWAIZ KB", ktuid: "KSD23CS082" },
  { name: "MUHAMMED SHAHEEM", ktuid: "KSD23CS086" }, { name: "NANDANA M K", ktuid: "KSD23CS087" },
  { name: "NEENU JOSEY", ktuid: "KSD23CS090" }, { name: "NESHWA S", ktuid: "KSD23CS092" },
  { name: "NIHAL NAUSHAD", ktuid: "KSD23CS093" }, { name: "ONEELA GOPI", ktuid: "KSD23CS095" },
  { name: "PAVAN KUMAR", ktuid: "KSD23CS097" }, { name: "RASHAD OMAR", ktuid: "KSD23CS099" },
  { name: "RIDHIKA K RAMAN P", ktuid: "KSD23CS102" }, { name: "SAMHA ZUBAIR", ktuid: "KSD23CS103" },
  { name: "SANJAY P", ktuid: "KSD23CS105" }, { name: "SHAAZ ABOOBACKER", ktuid: "KSD23CS107" },
  { name: "SIVAPRIYA P", ktuid: "KSD23CS114" }, { name: "SOORYA KIRAN POLA", ktuid: "KSD23CS116" },
  { name: "SREEJITH", ktuid: "KSD23CS117" }, { name: "SRIJITH K", ktuid: "KSD23CS120" },
  { name: "SRINIVAS", ktuid: "KSD23CS121" }, { name: "USMAN SHEHZAD KHAN", ktuid: "KSD23CS126" },
  { name: "VARSHITH V V", ktuid: "KSD23CS127" }, { name: "VIDHATH N SHETTY", ktuid: "KSD23CS128" },
  { name: "ZAINABATH ZULFA", ktuid: "KSD23CS132" }, { name: "DHANUSH K P", ktuid: "LKSD23CS138" },
  { name: "DRISYA K R", ktuid: "LKSD23CS139" }, { name: "PRIYA N", ktuid: "LKSD23CS141" },
  { name: "SAHANA K", ktuid: "LKSD23CS142" }, { name: "SUCHITHRA R", ktuid: "LKSD23CS143" }
];

async function main() {
  console.log('Processing CSB student integration...');

  const csBranch = await prisma.branch.findFirst({ where: { code: 'CS' } });
  const batch2027 = await prisma.batch.findFirst({ where: { name: '2023-2027' } });
  if (!csBranch || !batch2027) throw new Error('CSE Branch or 2023-2027 Batch not found. Please run the main seed first.');

  // 1. Fetch all existing 2023 CSE students
  const existingCSStudents = await prisma.studentProfile.findMany({
    where: { branchId: csBranch.id, batchId: batch2027.id },
    include: { user: true }
  });

  const csbKTUIDs = new Set(csbStudents.map(s => s.ktuid));
  let updatedToCSB = 0;
  let newCSBCreated = 0;
  let updatedToCSA = 0;

  const passwordHash = await bcrypt.hash('Student@123', 10);

  // 2. Process the 70 CSB records
  for (const csbStudent of csbStudents) {
    const existingProfile = existingCSStudents.find(p => p.ktuid === csbStudent.ktuid);
    
    if (existingProfile) {
      // Record exists: Update to CSB
      await prisma.studentProfile.update({
        where: { userId: existingProfile.userId },
        data: { section: 'CSB' }
      });
      updatedToCSB++;
    } else {
      // New record: Create as CSB
      const email = `${csbStudent.ktuid.toLowerCase()}@student.intelliplace.edu`;
      await prisma.user.create({
        data: {
          name: csbStudent.name,
          email,
          passwordHash,
          role: 'student',
          studentProfile: {
            create: {
              ktuid: csbStudent.ktuid,
              branchId: csBranch.id,
              batchId: batch2027.id,
              section: 'CSB',
              entryType: csbStudent.ktuid.startsWith('L') ? 'LATERAL' : 'REGULAR',
              admissionYear: 2023,
              graduatingBatch: '2027',
              academicScheme: 'APJKTU_2019',
              knowledgeLevel: 'beginner',
              cgpaVerified: false,
              academicStatus: 'pending',
            }
          }
        }
      });
      newCSBCreated++;
    }
  }

  // 3. Update remaining existing CSE students to CSA (if not in CSB list)
  for (const existing of existingCSStudents) {
    if (!csbKTUIDs.has(existing.ktuid!)) {
      await prisma.studentProfile.update({
        where: { userId: existing.userId },
        data: { section: 'CSA' }
      });
      updatedToCSA++;
    }
  }

  console.log('=========================================');
  console.log('CSB Integration Complete!');
  console.log(`Existing records updated to CSB: ${updatedToCSB}`);
  console.log(`New CSB records created: ${newCSBCreated}`);
  console.log(`Remaining existing records marked as CSA: ${updatedToCSA}`);
  console.log('=========================================');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

