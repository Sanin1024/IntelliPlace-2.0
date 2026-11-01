import { prisma } from '../config/prisma.js';

export async function getSkillGrowth(studentId: string) {
  const evidence = await prisma.skillEvidence.findMany({
    where: { studentId },
    orderBy: { createdAt: 'asc' },
  });

  const skillHistory = new Map<string, Array<{ accuracy: number; createdAt: Date }>>();
  for (const e of evidence) {
    if (e.accuracy == null) continue;
    const key = e.skill.trim().toLowerCase();
    const list = skillHistory.get(key) || [];
    list.push({ accuracy: Math.round(e.accuracy), createdAt: e.createdAt });
    skillHistory.set(key, list);
  }

  const skills: Array<{
    skill: string;
    firstScore: number | null;
    lastScore: number | null;
    delta: number | null;
    trend: 'improving' | 'declining' | 'stable';
  }> = [];

  for (const [skill, history] of skillHistory.entries()) {
    if (history.length === 0) continue;
    const first = history[0].accuracy;
    const last = history[history.length - 1].accuracy;
    const delta = history.length > 1 ? last - first : null;
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (delta != null) {
      if (delta > 0) trend = 'improving';
      else if (delta < 0) trend = 'declining';
    }

    skills.push({
      skill,
      firstScore: first,
      lastScore: last,
      delta,
      trend,
    });
  }

  // Sort by delta desc
  skills.sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  return { skills };
}

