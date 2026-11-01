import { prisma } from '../config/prisma.js';

export interface SkillGapItem {
  skill: string;
  state: 'demonstrated' | 'declared_not_on_resume' | 'missing' | 'on_resume_unverified';
  drivesDemanding: number;
  driveTitles: string[];
  evidence?: any;
}

export interface DriveSkillMatch {
  driveId: string;
  driveTitle: string;
  companyName: string;
  requiredSkills: string[];
  matchedResumeSkills: string[];
  demonstratedSkills: string[];
  matchPercentage: number;
}

export interface SkillGapAnalysisResult {
  hasActiveResume: boolean;
  activeResumeVersionId?: string;
  activeResumeLabel?: string;
  resumeSkills: string[];
  declaredSkills: string[];
  demonstratedSkills: string[];
  categorizedSkills: SkillGapItem[];
  driveMatches: DriveSkillMatch[];
  recommendations: Array<{
    type: 'add_to_resume' | 'demonstrate_competency' | 'learn_skill';
    skill: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface ResumeFreshnessInfo {
  hasActiveResume: boolean;
  isStale: boolean;
  daysSinceUpload: number | null;
  thresholdDays: number;
  uploadedAt: Date | null;
  version?: number;
  label?: string;
  message?: string;
}

/**
 * Returns the configured freshness threshold in days (Challenge 104 / 115).
 * Defaults to 120 days.
 */
export async function getFreshnessThresholdDays(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'RESUME_FRESHNESS_DAYS' },
    });
    if (setting?.value) {
      const val = parseInt(setting.value, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    // Default fallback
  }
  return 120;
}

/**
 * Checks resume freshness for a student (Challenge 104 / 115).
 * Never auto-rejects; returns status for student banner and PO dashboard.
 */
export async function checkResumeFreshness(studentId: string): Promise<ResumeFreshnessInfo> {
  const thresholdDays = await getFreshnessThresholdDays();

  let active: any = null;
  try {
    active = await prisma.resumeVersion.findFirst({
      where: { studentId, isActive: true },
    });
  } catch {
    // Offline fallback
  }

  if (!active) {
    return {
      hasActiveResume: false,
      isStale: true,
      daysSinceUpload: null,
      thresholdDays,
      uploadedAt: null,
      message: 'No active resume uploaded. Upload a resume to apply to placement drives.',
    };
  }

  const daysSinceUpload = Math.floor(
    (Date.now() - new Date(active.uploadedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const isStale = daysSinceUpload > thresholdDays;
  const message = isStale
    ? `Your active resume was uploaded ${daysSinceUpload} days ago (exceeds ${thresholdDays} days recommendation). Consider updating your resume with recent projects and skills.`
    : undefined;

  return {
    hasActiveResume: true,
    isStale,
    daysSinceUpload,
    thresholdDays,
    uploadedAt: active.uploadedAt,
    version: active.version,
    label: active.label,
    message,
  };
}

/**
 * Correlates active resume skills, declared skills, verified evidence,
 * and live placement drive requirements into a 3-state gap categorization (Challenge 107).
 */
export async function getSkillGapAnalysis(studentId: string): Promise<SkillGapAnalysisResult> {
  // 1. Fetch active resume
  const activeResume = await prisma.resumeVersion.findFirst({
    where: { studentId, isActive: true },
  });

  let parsedResumeSkills: string[] = [];
  if (activeResume?.parsedData && typeof activeResume.parsedData === 'object') {
    const pd = activeResume.parsedData as any;
    if (Array.isArray(pd.skills)) {
      parsedResumeSkills = pd.skills;
    }
  }

  // 2. Fetch declared skills & resume builder skills
  const declaredRecords = await prisma.declaredSkill.findMany({
    where: { studentId },
  });
  const resumeData = await prisma.studentResumeData.findUnique({
    where: { userId: studentId },
  });

  const declaredSkills = Array.from(
    new Set([
      ...declaredRecords.map((d) => d.skill),
      ...(resumeData?.skills || []),
    ])
  );

  // 3. Fetch demonstrated competencies
  const competencyRecords = await prisma.competencyRecord.findMany({
    where: { studentId },
  });
  const demonstratedSkills = competencyRecords.map((c) => c.skill);

  // 4. Fetch active drives
  const activeDrives = await prisma.placementDrive.findMany({
    where: {
      status: { in: ['published', 'active'] },
    },
    include: {
      company: { select: { name: true } },
    },
  });

  // Build lookup index of drive demand per skill
  const skillDriveDemand: Record<string, { count: number; titles: string[] }> = {};
  for (const drive of activeDrives) {
    for (const reqSkill of drive.requiredSkills || []) {
      const lower = reqSkill.trim().toLowerCase();
      if (!skillDriveDemand[lower]) {
        skillDriveDemand[lower] = { count: 0, titles: [] };
      }
      skillDriveDemand[lower].count++;
      if (!skillDriveDemand[lower].titles.includes(drive.title)) {
        skillDriveDemand[lower].titles.push(drive.title);
      }
    }
  }

  // Sets for quick case-insensitive lookups
  const resumeSet = new Set(parsedResumeSkills.map((s) => s.toLowerCase()));
  const declaredSet = new Set(declaredSkills.map((s) => s.toLowerCase()));
  const demonstratedSet = new Set(demonstratedSkills.map((s) => s.toLowerCase()));

  // Collect all unique skill candidates
  const allCandidateSkills = new Set<string>([
    ...parsedResumeSkills,
    ...declaredSkills,
    ...demonstratedSkills,
    ...Object.keys(skillDriveDemand),
  ]);

  const categorizedSkills: SkillGapItem[] = [];

  for (const rawSkill of allCandidateSkills) {
    const lower = rawSkill.toLowerCase();
    const driveInfo = skillDriveDemand[lower] || { count: 0, titles: [] };

    let state: 'demonstrated' | 'declared_not_on_resume' | 'missing' | 'on_resume_unverified';

    if (demonstratedSet.has(lower)) {
      state = 'demonstrated';
    } else if (declaredSet.has(lower) && !resumeSet.has(lower)) {
      state = 'declared_not_on_resume';
    } else if (!resumeSet.has(lower) && !declaredSet.has(lower)) {
      state = 'missing';
    } else {
      state = 'on_resume_unverified';
    }

    categorizedSkills.push({
      skill: rawSkill,
      state,
      drivesDemanding: driveInfo.count,
      driveTitles: driveInfo.titles,
      evidence: competencyRecords.find((c) => c.skill.toLowerCase() === lower)?.evidence,
    });
  }

  // Sort: drives demanding descending, then demonstrated, declared_not_on_resume, missing
  categorizedSkills.sort((a, b) => b.drivesDemanding - a.drivesDemanding);

  // Compute per-drive match
  const driveMatches: DriveSkillMatch[] = activeDrives.map((d) => {
    const required = d.requiredSkills || [];
    const matched = required.filter((s) => resumeSet.has(s.toLowerCase()));
    const demonstrated = required.filter((s) => demonstratedSet.has(s.toLowerCase()));
    const matchPct = required.length > 0 ? Math.round((matched.length / required.length) * 100) : 100;

    return {
      driveId: d.id,
      driveTitle: d.title,
      companyName: d.company?.name || 'Company',
      requiredSkills: required,
      matchedResumeSkills: matched,
      demonstratedSkills: demonstrated,
      matchPercentage: matchPct,
    };
  });

  // Actionable recommendations
  const recommendations: SkillGapAnalysisResult['recommendations'] = [];

  // Recommendation 1: Skills declared/demonstrated but missing from active resume
  const missingFromResumeHighDemand = categorizedSkills.filter(
    (s) => s.state === 'declared_not_on_resume' && s.drivesDemanding > 0
  );
  for (const s of missingFromResumeHighDemand.slice(0, 3)) {
    recommendations.push({
      type: 'add_to_resume',
      skill: s.skill,
      priority: s.drivesDemanding >= 2 ? 'high' : 'medium',
      message: `You have declared "${s.skill}", but it does not appear on your active resume. It is required by ${s.drivesDemanding} active drive(s) (${s.driveTitles.slice(0, 2).join(', ')}). Add it to your resume to increase visibility.`,
    });
  }

  // Recommendation 2: Missing skills in high demand by placement drives
  const highDemandMissing = categorizedSkills.filter(
    (s) => s.state === 'missing' && s.drivesDemanding >= 2
  );
  for (const s of highDemandMissing.slice(0, 3)) {
    recommendations.push({
      type: 'learn_skill',
      skill: s.skill,
      priority: 'high',
      message: `"${s.skill}" is in high demand across ${s.drivesDemanding} placement drives, but is missing from your profile and resume. Explore training modules or coursework to build this skill.`,
    });
  }

  // Recommendation 3: Skills on resume that are not yet demonstrated
  const unverifiedOnResume = categorizedSkills.filter(
    (s) => s.state === 'on_resume_unverified' && s.drivesDemanding > 0
  );
  for (const s of unverifiedOnResume.slice(0, 2)) {
    recommendations.push({
      type: 'demonstrate_competency',
      skill: s.skill,
      priority: 'medium',
      message: `"${s.skill}" is listed on your resume and sought by ${s.drivesDemanding} drive(s). Complete an assessment or learning module to earn verified competency.`,
    });
  }

  return {
    hasActiveResume: !!activeResume,
    activeResumeVersionId: activeResume?.id,
    activeResumeLabel: activeResume?.label,
    resumeSkills: parsedResumeSkills,
    declaredSkills,
    demonstratedSkills,
    categorizedSkills,
    driveMatches,
    recommendations,
  };
}
