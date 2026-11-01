import { prisma, RecommendationPriority } from '../config/prisma.js';
import { getCareerGoal } from './careerAlignment.service.js';

export async function getRecommendations(studentId: string) {
  // Check if we need to regenerate recommendations
  const count = await prisma.studentRecommendation.count({
    where: { studentId, isDismissed: false },
  });

  if (count === 0) {
    await generateRecommendations(studentId);
  }

  const recos = await prisma.studentRecommendation.findMany({
    where: { studentId, isDismissed: false },
    include: {
      resource: {
        include: {
          topic: { select: { id: true, name: true } },
          module: { select: { id: true, title: true, level: true } },
        },
      },
    },
    orderBy: [
      { priority: 'asc' }, // high first (in enum order or mapped)
      { generatedAt: 'desc' },
    ],
  });

  // Sort: high > medium > low
  const priorityOrder: Record<string, number> = { high: 1, medium: 2, low: 3 };
  recos.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  return {
    recommendations: recos.map((r) => ({
      id: r.id,
      resourceId: r.resourceId,
      resource: {
        id: r.resource.id,
        title: r.resource.title,
        description: r.resource.description,
        difficulty: r.resource.difficulty || 'beginner',
        topic: r.resource.topic?.name || 'General',
        fileUrl: r.resource.fileUrl,
      },
      priority: r.priority,
      reason: r.reason,
      generatedAt: r.generatedAt,
    })),
  };
}

export async function generateRecommendations(studentId: string) {
  // 1. Gather student context: weak topics, career goal, active drives
  const [evidence, declared, career, profile] = await Promise.all([
    prisma.skillEvidence.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.declaredSkill.findMany({ where: { studentId } }),
    getCareerGoal(studentId),
    prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { knowledgeLevel: true },
    }),
  ]);

  const studentLevel = profile?.knowledgeLevel || 'beginner';

  // Identify weak skills (< 60% accuracy)
  const weakSkills = new Set<string>();
  const skillAccuracy = new Map<string, number>();
  for (const e of evidence) {
    const k = e.skill.trim().toLowerCase();
    if (e.accuracy != null && e.accuracy < 60) {
      weakSkills.add(k);
      skillAccuracy.set(k, e.accuracy);
    }
  }

  // Also include skills declared as beginner
  for (const d of declared) {
    if (d.declaredLevel === 'beginner') {
      weakSkills.add(d.skill.trim().toLowerCase());
    }
  }

  // Also include target career skills if no evidence of proficiency
  for (const cs of career.expectedSkills) {
    const k = cs.trim().toLowerCase();
    if (!evidence.some((e) => e.skill.trim().toLowerCase() === k && (e.accuracy || 0) >= 70)) {
      weakSkills.add(k);
    }
  }

  // 2. Check active placement drives closing soon
  const activeDrives = await prisma.placementDrive.findMany({
    where: {
      status: { in: ['published', 'active'] },
      registrationDeadline: { gte: new Date() },
    },
    select: { id: true, title: true, requiredSkills: true, registrationDeadline: true },
    orderBy: { registrationDeadline: 'asc' },
  });

  const nowMs = Date.now();
  const driveUrgentSkills = new Map<string, { driveTitle: string; daysLeft: number }>();
  for (const d of activeDrives) {
    if (!d.registrationDeadline) continue;
    const daysLeft = Math.max(1, Math.ceil((new Date(d.registrationDeadline).getTime() - nowMs) / 86400000));
    for (const s of d.requiredSkills || []) {
      const k = s.trim().toLowerCase();
      if (!driveUrgentSkills.has(k)) {
        driveUrgentSkills.set(k, { driveTitle: d.title, daysLeft });
      }
    }
  }

  // 3. Find candidates resources
  const resources = await prisma.resource.findMany({
    where: {
      contentStatus: 'updated',
      visibility: { in: ['public', 'institution'] },
    },
    include: { topic: { select: { id: true, name: true } } },
    take: 50,
  });

  // Clear non-dismissed old recommendations
  await prisma.studentRecommendation.deleteMany({
    where: { studentId, isDismissed: false },
  });

  const newRecos: Array<{
    studentId: string;
    resourceId: string;
    priority: RecommendationPriority;
    reason: any;
  }> = [];

  const topicCountMap = new Map<string, number>();

  for (const r of resources) {
    const topicKey = r.topic?.name?.trim().toLowerCase() || 'general';
    const isWeak = weakSkills.has(topicKey) || (r.requiredSkills || []).some((s) => weakSkills.has(s.toLowerCase()));
    const driveInfo = driveUrgentSkills.get(topicKey);
    const isCareerRelevant = career.expectedSkills.some((s) => s.toLowerCase() === topicKey);

    if (!isWeak && !driveInfo && !isCareerRelevant) continue;

    // Diversity cap: max 2 recommendations per topic/skill
    const countSoFar = topicCountMap.get(topicKey) || 0;
    if (countSoFar >= 2) continue;
    topicCountMap.set(topicKey, countSoFar + 1);

    let priority: RecommendationPriority = 'medium';
    let headline = `Recommended study material for ${r.topic?.name || r.title}`;
    let details = `Matched to your assessed level (${studentLevel}).`;

    if (driveInfo) {
      priority = 'high';
      headline = `Required for ${driveInfo.driveTitle} — registration closes in ${driveInfo.daysLeft} day(s)`;
      details = `Upcoming recruitment requirement. Target this area before registrations close.`;
    } else if (isWeak) {
      const acc = skillAccuracy.get(topicKey);
      priority = 'high';
      headline = acc != null ? `Target your ${topicKey} gap (${acc}% accuracy)` : `Strengthen your foundational knowledge in ${topicKey}`;
      details = `Difficulty matched to your ${studentLevel} level to build competency.`;
    } else if (isCareerRelevant && career.role) {
      priority = 'medium';
      headline = `Core competency for target role: ${career.role.replace(/_/g, ' ')}`;
      details = `Building proficiency aligned with your institutional career milestone.`;
    }

    newRecos.push({
      studentId,
      resourceId: r.id,
      priority,
      reason: {
        headline,
        details,
        topic: r.topic?.name,
        difficulty: r.difficulty || studentLevel,
      },
    });

    if (newRecos.length >= 10) break;
  }

  for (const r of newRecos) {
    await prisma.studentRecommendation.upsert({
      where: { studentId_resourceId: { studentId: r.studentId, resourceId: r.resourceId } },
      update: { priority: r.priority, reason: r.reason, isDismissed: false },
      create: r,
    });
  }

  return newRecos;
}

export async function dismissRecommendation(studentId: string, resourceId: string) {
  return prisma.studentRecommendation.update({
    where: { studentId_resourceId: { studentId, resourceId } },
    data: { isDismissed: true, dismissedAt: new Date() },
  });
}

export async function regenerateRecommendations(studentId: string) {
  return generateRecommendations(studentId);
}

// Admin / PO coverage & balance diagnostic (Challenge 71, 75)
export async function getCoverageStats() {
  const allRecos = await prisma.studentRecommendation.findMany({
    where: { isDismissed: false },
    include: { resource: { include: { topic: { select: { name: true } } } } },
  });

  const skillCounts = new Map<string, number>();
  let total = 0;
  for (const r of allRecos) {
    const topic = r.resource.topic?.name || 'General';
    skillCounts.set(topic, (skillCounts.get(topic) || 0) + 1);
    total++;
  }

  let hasImbalance = false;
  let imbalancedSkill: string | null = null;
  const distribution = [...skillCounts.entries()].map(([skill, count]) => {
    const share = total > 0 ? Math.round((count / total) * 100) : 0;
    if (share > 40) {
      hasImbalance = true;
      imbalancedSkill = skill;
    }
    return { skill, count, share };
  });

  return {
    totalRecommendations: total,
    distribution,
    hasImbalance,
    imbalanceWarning: hasImbalance
      ? `Warning: "${imbalancedSkill}" represents >40% of all generated recommendations. Review resource catalog coverage.`
      : null,
  };
}
