import { prisma } from '../config/prisma.js';

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
};

export async function getTrainingEffectiveness(filters?: { branchId?: number; batchId?: number }) {
  // Student scope (privacy: aggregates only; trainer dashboards filter to assigned students at controller level)
  const students = await prisma.studentProfile.findMany({
    where: {
      user: { role: 'student', isActive: true },
      ...(filters?.branchId && { branchId: filters.branchId }),
      ...(filters?.batchId && { batchId: filters.batchId }),
    },
    select: { userId: true, branchId: true, batchId: true },
  });
  const studentIds = students.map((s) => s.userId);

  // --- Module completion rates (Ch 65) ---
  const modules = await prisma.learningModule.findMany({
    include: { _count: { select: { progress: true } }, progress: true },
    orderBy: { orderIndex: 'asc' },
  });
  const moduleStats = modules.map((m) => {
    const scoped = m.progress.filter((p) => studentIds.includes(p.studentId));
    const completed = scoped.filter((p) => p.status === 'completed').length;
    const failed = scoped.filter((p) => p.status === 'failed').length;
    const active = scoped.filter((p) => p.status === 'in_progress').length;
    const enrolled = scoped.length;
    const scores = scoped.filter((p) => p.bestScore != null).map((p) => p.bestScore!);
    return {
      moduleId: m.id,
      title: m.title,
      level: m.level,
      enrolled,
      completed,
      failed,
      active,
      completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : null,
      avgBestScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      // High-dropout flag: enrolled ≥ 5 and completion < 30% (Ch 65)
      flagged: enrolled >= 5 && completed / enrolled < 0.3,
    };
  });

  // --- Before/after improvement: first vs best assessment attempt per module (Ch 65) ---
  const improvements = [];
  for (const m of modules.filter((x) => x.assessmentTestId)) {
    const rows = await prisma.testAttempt.findMany({
      where: { studentId: { in: studentIds }, testId: m.assessmentTestId!, status: 'submitted' },
      select: { studentId: true, score: true, totalMarks: true, endTime: true },
      orderBy: { endTime: 'asc' },
    });
    const perStudent = new Map<string, number[]>();
    for (const r of rows) {
      if (!r.totalMarks) continue;
      const pct = Math.round(((r.score || 0) / r.totalMarks) * 100);
      perStudent.set(r.studentId, [...(perStudent.get(r.studentId) || []), pct]);
    }
    const deltas = [...perStudent.values()]
      .filter((arr) => arr.length >= 2)
      .map((arr) => arr[arr.length - 1] - arr[0]); // best≈latest for reassessment trends
    if (deltas.length > 0) {
      improvements.push({
        moduleId: m.id,
        title: m.title,
        studentsWithMultipleAttempts: deltas.length,
        avgImprovementPct: Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length),
      });
    }
  }

  // --- Schedule adherence (Ch 51/65) ---
  const assignments = await prisma.trainingAssignment.findMany({
    where: { studentId: { in: studentIds }, session: { cancelledAt: null } },
    select: { status: true },
  });
  const done = assignments.filter((a) => a.status === 'completed').length;
  const lapsed = assignments.filter((a) => ['overdue', 'missed'].includes(a.status)).length;

  // --- Cross-branch comparison (Ch 65) ---
  const branchMap = new Map<number, { completed: number; total: number }>();
  for (const p of await prisma.moduleProgress.findMany({
    where: { studentId: { in: studentIds } },
    select: { studentId: true, status: true },
  })) {
    const sp = students.find((s) => s.userId === p.studentId);
    if (!sp?.branchId) continue;
    const entry = branchMap.get(sp.branchId) || { completed: 0, total: 0 };
    entry.total++;
    if (p.status === 'completed') entry.completed++;
    branchMap.set(sp.branchId, entry);
  }
  const branches = await prisma.branch.findMany();
  const byBranch = [...branchMap.entries()].map(([id, v]) => ({
    branchId: id,
    branch: branches.find((b) => b.id === id)?.name ?? String(id),
    completionRate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : null,
    students: v.total,
  }));

  return {
    moduleStats,
    improvements,
    scheduleAdherence: {
      totalAssignments: assignments.length,
      completed: done,
      lapsed,
      adherenceRate: done + lapsed > 0 ? Math.round((done / (done + lapsed)) * 100) : null,
    },
    byBranch,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Content relevance vs REAL recruitment data (Ch 56):
 * aggregates requiredSkills from live published/active drives and diffs
 * against module/resource skill coverage. No fabricated trends.
 */
export async function getContentRelevance() {
  const drives = await prisma.placementDrive.findMany({
    where: { status: { in: ['published', 'active'] } },
    select: { requiredSkills: true, title: true },
  });

  const demand = new Map<string, number>();
  for (const d of drives) {
    for (const s of d.requiredSkills || []) {
      const key = s.trim().toLowerCase();
      if (key) demand.set(key, (demand.get(key) || 0) + 1);
    }
  }

  const [modules, resources, competencies] = await Promise.all([
    prisma.learningModule.findMany({ select: { requiredSkills: true } }),
    prisma.resource.findMany({ select: { requiredSkills: true } }),
    prisma.competencyRecord.findMany({ select: { skill: true }, distinct: ['skill'] }),
  ]);
  const covered = new Set<string>(
    [
      ...modules.flatMap((m) => m.requiredSkills || []),
      ...resources.flatMap((r) => r.requiredSkills || []),
      ...competencies.map((c) => c.skill),
    ].map((s) => s.trim().toLowerCase())
  );

  const demandedSkills = [...demand.entries()]
    .map(([skill, driveCount]) => ({ skill, driveCount, covered: covered.has(skill) }))
    .sort((a, b) => b.driveCount - a.driveCount);

  const staleCount = await getStaleCount();

  return {
    liveDrivesAnalyzed: drives.length,
    demandedSkills,
    missingSkills: demandedSkills.filter((s) => !s.covered),
    staleResourceCount: staleCount,
    recommendation:
      demandedSkills.filter((s) => !s.covered).length > 0
        ? `Create training modules for: ${demandedSkills
            .filter((s) => !s.covered)
            .slice(0, 5)
            .map((s) => s.skill)
            .join(
              ', '
            )} — demanded by active drives but not covered by any module, resource, or verified competency.`
        : 'All skills demanded by active drives are covered by existing training content.',
  };
}

async function getStaleCount() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'RESOURCE_REVIEW_PERIOD_DAYS' } });
  const days = parseInt(setting?.value || '180', 10);
  const cutoff = new Date(Date.now() - days * 86400000);
  return prisma.resource.count({ where: { OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: cutoff } }] } });
}

export function toEffectivenessCsv(data: Awaited<ReturnType<typeof getTrainingEffectiveness>>): string {
  const rows: string[][] = [
    ['Module', 'Level', 'Enrolled', 'Completed', 'Completion %', 'Avg Best Score', 'Flagged'],
    ...data.moduleStats.map((m) => [
      csvCell(m.title),
      csvCell(m.level),
      String(m.enrolled),
      String(m.completed),
      csvCell(m.completionRate != null ? `${m.completionRate}%` : '—'),
      csvCell(m.avgBestScore != null ? String(m.avgBestScore) : '—'),
      m.flagged ? 'YES' : 'no',
    ]),
    [],
    ['Schedule Adherence', String(data.scheduleAdherence.adherenceRate ?? '—') + '%'],
    ['Assignments', String(data.scheduleAdherence.totalAssignments)],
    ['Completed', String(data.scheduleAdherence.completed)],
    ['Overdue+Missed', String(data.scheduleAdherence.lapsed)],
  ];
  return rows.map((r) => r.join(',')).join('\n');
}

