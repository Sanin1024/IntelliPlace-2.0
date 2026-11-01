import { prisma } from '../src/config/prisma.js';
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
  
  return {
    fullKTUID: normalized,
    isLateral,
    admissionYear,
    departmentCode: deptCode,
    graduatingBatch: '2027' // Lateral or Regular 2023 batch graduates in 2027
  };
}

const students = [
  // Mechanical Engineering
  { name: "ABBAS AKNAS", ktuid: "KSD23ME001" }, { name: "ABDUL AFUW", ktuid: "KSD23ME002" },
  { name: "ABHINANDH E", ktuid: "KSD23ME003" }, { name: "ADARSH A K", ktuid: "KSD23ME004" },
  { name: "AKASH K", ktuid: "KSD23ME005" }, { name: "ASWIN RAJ R", ktuid: "KSD23ME006" },
  { name: "AYUSH Y S", ktuid: "KSD23ME007" }, { name: "DHYONA K V", ktuid: "KSD23ME009" },
  { name: "HATHIF SAEED T K", ktuid: "KSD23ME010" }, { name: "JITHU M", ktuid: "KSD23ME011" },
  { name: "KADEEJA M K", ktuid: "KSD23ME012" }, { name: "M HARIKRISHNAN", ktuid: "KSD23ME013" },
  { name: "MOHAMMED NABEEL", ktuid: "KSD23ME014" }, { name: "MOHAMMED RIZA", ktuid: "KSD23ME015" },
  { name: "MOHAMMED SAAD A S", ktuid: "KSD23ME016" }, { name: "MUHAMMED SAHL P H", ktuid: "KSD23ME018" },
  { name: "MUHAMMED SHAMMAZ", ktuid: "KSD23ME019" }, { name: "NIHAF ABDULLA I", ktuid: "KSD23ME020" },
  { name: "PRAJEESH J K", ktuid: "KSD23ME021" }, { name: "PRAJWAL KRISHNAN", ktuid: "KSD23ME022" },
  { name: "ROHAN V V", ktuid: "KSD23ME023" }, { name: "SREEHARI MANIKANDAN V V", ktuid: "KSD23ME024" },
  { name: "VISHNU E", ktuid: "KSD23ME025" }, { name: "YADHU KRISHNA M", ktuid: "KSD23ME026" },
  { name: "ABHINAV MANOJ", ktuid: "LKSD23ME027" }, { name: "ABHIRAM K", ktuid: "LKSD23ME028" },
  { name: "ABHIRAM K N NAIR", ktuid: "LKSD23ME029" }, { name: "AKHILRAJ M", ktuid: "LKSD23ME030" },
  { name: "AMANEW S KRISHNA", ktuid: "LKSD23ME031" }, { name: "ANANTHU V V", ktuid: "LKSD23ME032" },
  { name: "ARJUN T", ktuid: "LKSD23ME033" }, { name: "ASWAY KRISHNAN E R", ktuid: "LKSD23ME035" },
  { name: "DHANJAY KRISHNA P", ktuid: "LKSD23ME036" }, { name: "GOKUL JANARDHANAN", ktuid: "LKSD23ME037" },
  { name: "HARSHAL P", ktuid: "LKSD23ME038" }, { name: "JITHIN K P", ktuid: "LKSD23ME039" },
  { name: "MAHROOF TK", ktuid: "LKSD23ME040" }, { name: "MIDHUN BABU N", ktuid: "LKSD23ME041" },
  { name: "MOHAMED T P", ktuid: "LKSD23ME042" }, { name: "RIBU FAHMAN V", ktuid: "LKSD23ME043" },
  { name: "SACHIN SAJEEV", ktuid: "LKSD23ME044" }, { name: "SANKEERTH P V", ktuid: "LKSD23ME045" },
  { name: "SOURABH T K", ktuid: "LKSD23ME046" }, { name: "VISHNU N S", ktuid: "LKSD23ME047" },
  { name: "VISHNU PRASAD V", ktuid: "LKSD23ME048" },

  // Electrical and Electronics Engineering
  { name: "ABDUL KHADER AJMAL", ktuid: "KSD23EE001" }, { name: "ABHIJITH SURESH", ktuid: "KSD23EE002" },
  { name: "ABHINDEV R", ktuid: "KSD23EE003" }, { name: "ABOOBAKER NASEEM", ktuid: "KSD23EE004" },
  { name: "AKSHITH KARUN", ktuid: "KSD23EE005" }, { name: "ARJUN CHANDRAN P", ktuid: "KSD23EE006" },
  { name: "CHITHRESH C.P", ktuid: "KSD23EE007" }, { name: "FAYAS CK", ktuid: "KSD23EE008" },
  { name: "GOKUL HARIDAS", ktuid: "KSD23EE009" }, { name: "JABIR H K", ktuid: "KSD23EE010" },
  { name: "LAZIN MOHAMMED A", ktuid: "KSD23EE011" }, { name: "MARIYAMATH FAHIDA", ktuid: "KSD23EE012" },
  { name: "MOHAMMED RIZWAN", ktuid: "KSD23EE013" }, { name: "MOHAMMED ZAIN", ktuid: "KSD23EE014" },
  { name: "MUHAMMED AJNAS", ktuid: "KSD23EE015" }, { name: "MUHAMMED SHAMIL K.K", ktuid: "KSD23EE016" },
  { name: "NANDAKUMAR B", ktuid: "KSD23EE017" }, { name: "NIVED M", ktuid: "KSD23EE018" },
  { name: "PARTHIV PAVITHRAN", ktuid: "KSD23EE019" }, { name: "PARTHIV P NAIR", ktuid: "KSD23EE020" },
  { name: "P VISHNU KAMAL", ktuid: "KSD23EE021" }, { name: "RITHIK RAJ", ktuid: "KSD23EE022" },
  { name: "SHREE LEKHA", ktuid: "KSD23EE023" }, { name: "VAISHAKH M", ktuid: "KSD23EE024" },
  { name: "VAISHNAV ANILKUMAR", ktuid: "KSD23EE025" }, { name: "VISMAYA M", ktuid: "KSD23EE026" },
  { name: "ABDUL RAHIMAN JUMAIL P M", ktuid: "LKSD23EE027" }, { name: "ADITHYAN K V", ktuid: "LKSD23EE028" },
  { name: "AHAMED NABAVI A Z", ktuid: "LKSD23EE029" }, { name: "AJAY CHANDRAN K", ktuid: "LKSD23EE030" },
  { name: "ALBIN VINOY", ktuid: "LKSD23EE031" }, { name: "ANAGH SHAJI", ktuid: "LKSD23EE032" },
  { name: "ANUVIND RAJITH", ktuid: "LKSD23EE033" }, { name: "ARUN M A", ktuid: "LKSD23EE034" },
  { name: "ASWIN VIJAY", ktuid: "LKSD23EE035" }, { name: "FAIZAL ABBAS M", ktuid: "LKSD23EE036" },
  { name: "HARITH K", ktuid: "LKSD23EE037" }, { name: "JIMAMOL P S", ktuid: "LKSD23EE038" },
  { name: "JITHU MON P S", ktuid: "LKSD23EE039" }, { name: "JITHU V", ktuid: "LKSD23EE040" },
  { name: "JOBIN JOSEPH", ktuid: "LKSD23EE041" }, { name: "KARTHIK S", ktuid: "LKSD23EE042" },
  { name: "MARWA SAINAB ATHIYYA", ktuid: "LKSD23EE043" }, { name: "MOHAMMED AFSAL", ktuid: "LKSD23EE044" },
  { name: "MOHAMMED SUHAIL K", ktuid: "LKSD23EE045" }, { name: "NITHIN KUMAR S R", ktuid: "LKSD23EE046" },
  { name: "PRANAV P", ktuid: "LKSD23EE047" }, { name: "RAHUL HAREEDRAN", ktuid: "LKSD23EE048" },
  { name: "RAHUL RAJ M", ktuid: "LKSD23EE049" }, { name: "SHIBIL K K", ktuid: "LKSD23EE050" },
  { name: "THWALHATHUL ANSAR A K", ktuid: "LKSD23EE051" },

  // Electronics and Communication Engineering
  { name: "AAVANI A", ktuid: "KSD23EC001" }, { name: "ABDUL BASITH M", ktuid: "KSD23EC002" },
  { name: "ABHAY KRISHNA", ktuid: "KSD23EC003" }, { name: "ABHIJITH A K", ktuid: "KSD23EC004" },
  { name: "ABHISHEK CHANDRAN P U", ktuid: "KSD23EC005" }, { name: "ADITH CHANDRAN C", ktuid: "KSD23EC006" },
  { name: "AKSHAY K", ktuid: "KSD23EC007" }, { name: "AKSHAY KRISHNA K", ktuid: "KSD23EC008" },
  { name: "AKSHAY KRISHNAN B", ktuid: "KSD23EC009" }, { name: "AMEEN K P", ktuid: "KSD23EC010" },
  { name: "AMINATH RAHEEMA K K", ktuid: "KSD23EC011" }, { name: "ANAGHA T V", ktuid: "KSD23EC012" },
  { name: "A P MOHAMMED JASIM ABDULLA", ktuid: "KSD23EC013" }, { name: "ARJUN P", ktuid: "KSD23EC014" },
  { name: "ATHUL KRISHNA A", ktuid: "KSD23EC015" }, { name: "AYSHA MUSAINA", ktuid: "KSD23EC016" },
  { name: "AYSHATH LAMMATH NOOR", ktuid: "KSD23EC017" }, { name: "BHOOMIKA K", ktuid: "KSD23EC018" },
  { name: "BIVIN KRISHNAN P", ktuid: "KSD23EC019" }, { name: "FATHIMA A M", ktuid: "KSD23EC020" },
  { name: "FATHIMA N A", ktuid: "KSD23EC021" }, { name: "FATHIMATH AFRA B", ktuid: "KSD23EC022" },
  { name: "FATHIMATH AMNA RAJNAS", ktuid: "KSD23EC023" }, { name: "FATHIMATH MARJANA P M", ktuid: "KSD23EC024" },
  { name: "FATHIMATH SAFA B", ktuid: "KSD23EC025" }, { name: "FATHIMATH SHALIMA P", ktuid: "KSD23EC026" },
  { name: "FATIMA AZLINA ABDULLA", ktuid: "KSD23EC027" }, { name: "GAYATHRI P K", ktuid: "KSD23EC028" },
  { name: "GAZAL MOHAMMED P C", ktuid: "KSD23EC029" }, { name: "GOKUL GOPAL", ktuid: "KSD23EC030" },
  { name: "GOPIKA P V", ktuid: "KSD23EC031" }, { name: "HARIKRISHNAN PANAYAL", ktuid: "KSD23EC032" },
  { name: "HARSHA KURIAKOSE", ktuid: "KSD23EC033" }, { name: "HRIDYA V NITTOOR", ktuid: "KSD23EC034" },
  { name: "JISHNU P S", ktuid: "KSD23EC035" }, { name: "KADEEJATH MUZAMMILA M M", ktuid: "KSD23EC036" },
  { name: "KARTHIKA SURESH", ktuid: "KSD23EC037" }, { name: "KAVYA RAVI T", ktuid: "KSD23EC038" },
  { name: "MANNYA K", ktuid: "KSD23EC040" }, { name: "MOHAMMED MUBASHIR C", ktuid: "KSD23EC041" },
  { name: "MOHASINA E M", ktuid: "KSD23EC043" }, { name: "MUHAMMED SHANIB K", ktuid: "KSD23EC044" },
  { name: "NAFEESATH AMNA", ktuid: "KSD23EC045" }, { name: "NANDANA P R", ktuid: "KSD23EC046" },
  { name: "NIMAL P", ktuid: "KSD23EC047" }, { name: "PREETHI R", ktuid: "KSD23EC048" },
  { name: "RAJNA P", ktuid: "KSD23EC049" }, { name: "RINZIN M SHUAIB", ktuid: "KSD23EC050" },
  { name: "RISHIKA K", ktuid: "KSD23EC051" }, { name: "SARANG A", ktuid: "KSD23EC052" },
  { name: "SATHYADEV M", ktuid: "KSD23EC053" }, { name: "SHIBIN RAJ B K", ktuid: "KSD23EC054" },
  { name: "SHIYA SAJEESH M V", ktuid: "KSD23EC055" }, { name: "SOUGANDH SUDHEER", ktuid: "KSD23EC056" },
  { name: "SOUMYA BALAKRISHNAN", ktuid: "KSD23EC057" }, { name: "SREEDEV SASIDHARAN", ktuid: "KSD23EC058" },
  { name: "VISMAYA K V", ktuid: "KSD23EC060" }, { name: "VRINDA K P", ktuid: "KSD23EC061" },
  { name: "AKAHAY C K", ktuid: "LKSD23EC063" }, { name: "KIRAN KUMAR B K", ktuid: "LKSD23EC064" },
  { name: "RAHUL P R", ktuid: "LKSD23EC065" },

  // Civil Engineering
  { name: "ABDULLAH SALAMA ALKAUSAR", ktuid: "KSD23CE001" }, { name: "AJAS RAHIMAN CA", ktuid: "KSD23CE002" },
  { name: "AKSHAY A", ktuid: "KSD23CE003" }, { name: "AYSHA MUNA MK", ktuid: "KSD23CE004" },
  { name: "AYSHA NEHLA TH", ktuid: "KSD23CE005" }, { name: "AYSHA RIDHA", ktuid: "KSD23CE006" },
  { name: "AYSHATH NUSAIBA", ktuid: "KSD23CE007" }, { name: "DEVIKARAJ A", ktuid: "KSD23CE008" },
  { name: "DHANANJAY SASIDHARAN", ktuid: "KSD23CE009" }, { name: "FATHIMA AS", ktuid: "KSD23CE010" },
  { name: "FATHIMA MK", ktuid: "KSD23CE011" }, { name: "FATHIMATH ANSABA MUHSEENA", ktuid: "KSD23CE012" },
  { name: "FATHIMATH NAFLA AN", ktuid: "KSD23CE013" }, { name: "FATIMA AL ZAHRA HAMEED", ktuid: "KSD23CE014" },
  { name: "FIDHA KNAUFAL", ktuid: "KSD23CE015" }, { name: "HARIKRISHNAN K", ktuid: "KSD23CE016" },
  { name: "HIBAH IFFAT", ktuid: "KSD23CE017" }, { name: "JOEL JOSEPH PJ", ktuid: "KSD23CE018" },
  { name: "KHADEEJATH SANA S", ktuid: "KSD23CE019" }, { name: "LUBNA RAHIMAN", ktuid: "KSD23CE020" },
  { name: "MARIYAM FAHIMA BA", ktuid: "KSD23CE021" }, { name: "MARIYAM SHABANA KN", ktuid: "KSD23CE022" },
  { name: "MOHAMED JASEEM K", ktuid: "KSD23CE023" }, { name: "MOHAMMED AMEEN K", ktuid: "KSD23CE024" },
  { name: "MOHAMMED ANSAF", ktuid: "KSD23CE025" }, { name: "MOHAMMED D S", ktuid: "KSD23CE026" },
  { name: "MOHAMMED JASIM", ktuid: "KSD23CE027" }, { name: "MOHAMMED M K", ktuid: "KSD23CE028" },
  { name: "MUHAMMAD SINAN AK", ktuid: "KSD23CE029" }, { name: "NANDANAS RAJEEV", ktuid: "KSD23CE030" },
  { name: "NEHA MARIYAM K", ktuid: "KSD23CE031" }, { name: "PRAJWAL KRISHNA M", ktuid: "KSD23CE033" },
  { name: "RIDHA SHIRIN MM", ktuid: "KSD23CE034" }, { name: "SANJANA RAJESH CM", ktuid: "KSD23CE035" },
  { name: "SOURAV SUDHIR", ktuid: "KSD23CE037" }, { name: "VIGHNESH VIJAY", ktuid: "KSD23CE038" },
  { name: "VISWANADH M V", ktuid: "KSD23CE040" }, { name: "ZAINABA NAUFA R U", ktuid: "KSD23CE041" },
  { name: "ABHISHEK T A", ktuid: "LKSD23CE042" }, { name: "AMLAS K", ktuid: "LKSD23CE043" },
  { name: "ANAMIKA PV", ktuid: "LKSD23CE044" }, { name: "ANASWARA MOL A", ktuid: "LKSD23CE045" },
  { name: "ANFAL KP", ktuid: "LKSD23CE046" }, { name: "ASHWIN RAJ A", ktuid: "LKSD23CE047" },
  { name: "ASWIN A", ktuid: "LKSD23CE048" }, { name: "AYSHATH ANSOORA KH", ktuid: "LKSD23CE049" },
  { name: "KEERTHESH KV", ktuid: "LKSD23CE050" }, { name: "KHADEEJATH BAHEEJA", ktuid: "LKSD23CE051" },
  { name: "NANDANAPK", ktuid: "LKSD23CE052" }, { name: "NEETHU K", ktuid: "LKSD23CE053" },
  { name: "PREEJITH BHARATH", ktuid: "LKSD23CE054" }, { name: "SREEHARI K", ktuid: "LKSD23CE055" },
  { name: "SREELAKSHMI K", ktuid: "LKSD23CE056" }, { name: "VAISHNAV K", ktuid: "LKSD23CE057" }
];

async function main() {
  console.log(`Processing ${students.length} student records...`);

  const batch2027 = await prisma.batch.findFirst({ where: { name: '2023-2027' } });
  if (!batch2027) throw new Error('Batch 2023-2027 not found. Please run the main seed first.');

  const passwordHash = await bcrypt.hash('Student@123', 10);
  let createdCount = 0;
  let skippedCount = 0;

  for (const s of students) {
    const ktuData = parseKTUID(s.ktuid);
    
    // Check if student already exists
    const existing = await prisma.studentProfile.findFirst({
      where: { ktuid: ktuData.fullKTUID }
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    const branch = await prisma.branch.findFirst({ 
      where: { code: ktuData.departmentCode } 
    });
    if (!branch) throw new Error(`Branch with code ${ktuData.departmentCode} not found.`);

    const email = `${ktuData.fullKTUID.toLowerCase()}@student.intelliplace.edu`;

    await prisma.user.create({
      data: {
        name: s.name,
        email,
        passwordHash,
        role: 'student',
        studentProfile: {
          create: {
            ktuid: ktuData.fullKTUID,
            branchId: branch.id,
            batchId: batch2027.id,
            section: 'NOT_APPLICABLE',
            entryType: ktuData.isLateral ? 'LATERAL' : 'REGULAR',
            admissionYear: ktuData.admissionYear,
            graduatingBatch: ktuData.graduatingBatch,
            academicScheme: 'APJKTU_2019',
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
  console.log('Import Complete!');
  console.log(`Students Created: ${createdCount}`);
  console.log(`Students Skipped (Already Existed): ${skippedCount}`);
  console.log('=========================================');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

