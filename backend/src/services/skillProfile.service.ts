import { prisma, ConfidenceLevel, SkillLevel } from '../config/prisma.js';

export interface DeclaredSkillInput {
  skill: string;
  declaredLevel: SkillLevel;
}

const normalizeSkill = (s: string) => s.trim().toLowerCase();

export async function getMySkills(studentId: string) {
  const [declared, evidence] = await Promise.all([
    prisma.declaredSkill.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.skillEvidence.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Aggregate evidence by skill to compare with declared level
  const evidenceMap = new Map<string, { totalAcc: number; count: number; totalQuestions: number }>();
  for (const ev of evidence) {
    const key = normalizeSkill(ev.skill);
    const existing = evidenceMap.get(key) || { totalAcc: 0, count: 0, totalQuestions: 0 };
    existing.totalAcc += ev.accuracy ?? 0;
    existing.count += 1;
    existing.totalQuestions += ev.totalQuestions ?? 0;
    evidenceMap.set(key, existing);
  }

  const enrichedDeclared = declared.map((d) => {
    const ev = evidenceMap.get(normalizeSkill(d.skill));
    let feedback: string | null = null;

    if (ev && ev.count > 0) {
      const avgAcc = Math.round(ev.totalAcc / ev.count);
      if (d.declaredLevel === 'advanced' && avgAcc < 50) {
        feedback = `Assessments indicate ${avgAcc}% accuracy in ${d.skill}. You may be overestimating proficiency.`;
      } else if (d.declaredLevel === 'beginner' && avgAcc >= 80) {
        feedback = `You scored ${avgAcc}% in ${d.skill} — you are performing stronger than you think! Consider updating to intermediate.`;
      }
    }

    return {
      skill: d.skill,
      declaredLevel: d.declaredLevel,
      verifiedLevel: d.verifiedLevel,
      confidence: d.confidence,
      evidenceCount: ev ? ev.totalQuestions : 0,
      feedback,
    };
  });

  return {
    declared: enrichedDeclared,
    evidence: evidence.map((e) => ({
      skill: e.skill,
      source: e.source,
      accuracy: e.accuracy,
      confidence: e.confidence,
      totalQuestions: e.totalQuestions,
      createdAt: e.createdAt,
    })),
  };
}

export async function saveDeclaredSkills(studentId: string, skills: DeclaredSkillInput[]) {
  const results = [];
  for (const item of skills) {
    const skillNorm = normalizeSkill(item.skill);
    if (!skillNorm || skillNorm.length < 2) continue;

    // Check if evidence exists to set initial confidence or verified level
    const evs = await prisma.skillEvidence.findMany({
      where: { studentId, skill: { equals: skillNorm, mode: 'insensitive' } },
    });

    let verifiedLevel: SkillLevel | null = null;
    let confidence: ConfidenceLevel = 'insufficient';
    if (evs.length > 0) {
      const totalQ = evs.reduce((acc, x) => acc + (x.totalQuestions || 0), 0);
      const avgAcc = evs.reduce((acc, x) => acc + (x.accuracy || 0), 0) / evs.length;
      if (totalQ >= 10) confidence = 'high';
      else if (totalQ >= 6) confidence = 'moderate';
      else if (totalQ >= 3) confidence = 'low';

      if (avgAcc >= 75) verifiedLevel = 'advanced';
      else if (avgAcc >= 50) verifiedLevel = 'intermediate';
      else verifiedLevel = 'beginner';
    }

    const row = await prisma.declaredSkill.upsert({
      where: { studentId_skill: { studentId, skill: skillNorm } },
      update: {
        declaredLevel: item.declaredLevel,
        ...(verifiedLevel && { verifiedLevel, confidence }),
      },
      create: {
        studentId,
        skill: skillNorm,
        declaredLevel: item.declaredLevel,
        verifiedLevel,
        confidence,
      },
    });
    results.push(row);
  }
  return results;
}

export async function deleteDeclaredSkill(studentId: string, skill: string) {
  const norm = normalizeSkill(decodeURIComponent(skill));
  return prisma.declaredSkill.deleteMany({
    where: { studentId, skill: norm },
  });
}
