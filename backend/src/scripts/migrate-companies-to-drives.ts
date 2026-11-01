import { prisma } from '../config/prisma.js';

async function migrateCompaniesToDrives() {
  console.log('--- Migrating Legacy Companies to Placement Drives ---');

  const adminOrPo = await prisma.user.findFirst({
    where: { role: { in: ['po', 'admin'] } },
    select: { id: true },
  });

  if (!adminOrPo) {
    console.log('No Admin or PO user found to assign as creator. Aborting.');
    return;
  }

  const companies = await prisma.company.findMany({
    include: {
      eligibleBranches: true,
      drives: true,
    },
  });

  const allBatches = await prisma.batch.findMany({ select: { id: true } });
  let createdCount = 0;

  for (const company of companies) {
    if (company.drives.length > 0) {
      console.log(`Skipping "${company.name}": already has ${company.drives.length} drive(s).`);
      continue;
    }

    if (!company.jobRole) {
      console.log(`Skipping "${company.name}": no job role defined.`);
      continue;
    }

    const driveDate = company.driveDate ? new Date(company.driveDate) : null;
    const isPast = driveDate && driveDate.getTime() < Date.now();
    const status = isPast ? 'closed' : 'published';

    const drive = await prisma.placementDrive.create({
      data: {
        companyId: company.id,
        title: `${company.name} Campus Drive`,
        jobRole: company.jobRole,
        jobDescription: company.description,
        minCgpa: company.eligibilityCgpa,
        ctcMax: company.package,
        registrationDeadline: driveDate,
        selectionProcess: company.syllabusText,
        status,
        createdBy: adminOrPo.id,
        eligibleBranches: {
          create: company.eligibleBranches.map((eb) => ({ branchId: eb.branchId })),
        },
        eligibleBatches: {
          create: allBatches.map((b) => ({ batchId: b.id })),
        },
        rounds: company.syllabusText
          ? [{ name: 'Campus Recruitment Process', description: company.syllabusText }]
          : [],
      },
    });

    console.log(`Created drive "${drive.title}" (${drive.id}) for company "${company.name}" [${status}].`);
    createdCount++;
  }

  console.log(`--- Migration Complete: ${createdCount} drives created. ---`);
}

migrateCompaniesToDrives()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

