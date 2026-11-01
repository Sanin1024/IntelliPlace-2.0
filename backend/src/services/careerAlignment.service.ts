import { prisma } from '../config/prisma.js';

export const CAREER_SKILL_MAP: Record<string, string[]> = {
  software_engineer: [
    'data structures',
    'algorithms',
    'dbms',
    'operating systems',
    'sql',
    'system design',
  ],
  data_analyst: [
    'sql',
    'python',
    'statistics',
    'excel',
    'data visualization',
    'probability',
  ],
  devops_engineer: [
    'linux',
    'docker',
    'networking',
    'ci/cd',
    'scripting',
    'cloud',
  ],
  qa_engineer: [
    'software testing',
    'automation',
    'java',
    'sql',
    'test cases',
    'selenium',
  ],
};

export async function setCareerGoal(studentId: string, role: string) {
  const normalizedRole = role.trim().toLowerCase();
  const goal = await prisma.careerGoal.upsert({
    where: { studentId },
    update: { role: normalizedRole },
    create: { studentId, role: normalizedRole },
  });

  // Touch watermark so recommendations regenerate on next query
  await prisma.systemSetting.upsert({
    where: { key: 'RECO_DRIVE_WATERMARK' },
    update: { value: new Date().toISOString(), updatedBy: studentId },
    create: { key: 'RECO_DRIVE_WATERMARK', value: new Date().toISOString(), updatedBy: studentId },
  });

  return goal;
}

export async function getCareerGoal(studentId: string) {
  const goal = await prisma.careerGoal.findUnique({
    where: { studentId },
  });
  const role = goal?.role || 'software_engineer';
  const expectedSkills = CAREER_SKILL_MAP[role] || CAREER_SKILL_MAP.software_engineer;
  return {
    role: goal?.role || null,
    expectedSkills,
    availableRoles: Object.keys(CAREER_SKILL_MAP),
  };
}
