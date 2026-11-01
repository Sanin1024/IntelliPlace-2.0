export type Role = 'student' | 'po' | 'trainer' | 'admin';
export type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
}

export interface StudentProfile {
  knowledgeLevel: KnowledgeLevel;
  cgpa: number | null;
  placementStatus: string;
  resumeUrl: string | null;
  targetRole: string | null;
  branch: { id: number; name: string } | null;
  batch: { id: number; name: string; graduationYear: number } | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Branch {
  id: number;
  name: string;
  _count?: { students: number };
}

export interface Batch {
  id: number;
  name: string;
  graduationYear: number;
  _count?: { students: number };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  studentProfile?: {
    ktuid?: string | null;
    branch?: { name: string; code?: string };
    batch?: { name: string };
    section?: string | null;
  } | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: { field: string; message: string }[];
}

export interface StudentDashboardData {
  profile: {
    name: string;
    email: string;
    knowledgeLevel: string;
    cgpa: number | null;
    placementStatus: string;
    targetRole: string | null;
    resumeUrl: string | null;
    branchName?: string;
    batchName?: string;
    missingProfileFields: string[];
  };
  readiness: {
    score: number;
    overallScore: number;
    level: string;
    breakdown: {
      aptitude: { points: number; maxPoints: number; testsCount: number };
      coding: { points: number; maxPoints: number; problemsCount: number };
      profile: { points: number; maxPoints: number };
    };
  };
  topicAccuracy: {
    topicId: number;
    topicName: string;
    totalAnswered: number;
    correctAnswers: number;
    accuracyPercentage: number;
  }[];
  weakTopics: {
    topicId: number;
    topicName: string;
    totalAnswered: number;
    accuracyPercentage: number;
  }[];
  strongTopics: {
    topicId: number;
    topicName: string;
    totalAnswered: number;
    accuracyPercentage: number;
  }[];
  progress: {
    attemptId: string;
    attemptNumber: number;
    testTitle: string;
    score: number;
    totalMarks: number;
    percentage: number;
    date: string | null;
  }[];
  mockTests: {
    id: string;
    title: string;
    durationMins: number;
    totalQuestions: number;
    batchName: string | null;
    availableFrom: string | null;
    availableUntil: string | null;
    maxAttempts: number;
    attemptsUsed: number;
    remainingAttempts: number;
    isAvailable: boolean;
    isBatchEligible: boolean;
    isWindowOpen: boolean;
  }[];
  drives: {
    id: string;
    name: string;
    jobRole: string;
    package: number | null;
    driveDate: string | null;
    daysUntilDrive: number | null;
    eligibilityCgpa: number | null;
    isEligible: boolean;
    reasons: string[];
    isTarget: boolean;
    eligibleBranches: string[];
  }[];
  upcomingDrives?: any[];
  notifications: {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
  }[];
  unreadNotificationsCount: number;
  hasAttempts: boolean;
}

export interface TrainerSummaryData {
  counts: {
    questions: number;
    problems: number;
    mockTests: number;
    resources: number;
  };
  recentTests: {
    id: string;
    title: string;
    durationMins: number;
    createdAt: string;
    attemptsCount: number;
    submittedCount: number;
    avgPercentage: number;
  }[];
  weakestTopics: {
    topicId: number;
    topicName: string;
    answeredCount: number;
    accuracyPercentage: number;
  }[];
}

export interface POSummaryData {
  totalStudents: number;
  counts: {
    totalStudents: number;
  };
  byPlacementStatus: {
    not_placed: number;
    in_process: number;
    placed: number;
  };
  byKnowledgeLevel: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  readinessBands: {
    notReady: number;
    almostReady: number;
    ready: number;
  };
  batchReadiness: {
    batchName: string;
    avgReadiness: number;
    studentCount: number;
  }[];
  branchReadiness: {
    branchName: string;
    avgReadiness: number;
    studentCount: number;
  }[];
  upcomingDrives: {
    id: string;
    name: string;
    jobRole: string;
    package: number | null;
    driveDate: string | null;
    daysUntilDrive: number | null;
    eligibilityCgpa: number | null;
    targetedCount: number;
    eligibleCount: number;
  }[];
  attentionStudents: {
    id: string;
    name: string;
    email: string;
    branch: string;
    batch: string;
    cgpa: number | null;
    placementStatus: string;
    knowledgeLevel: string;
    readinessScore: number;
    attemptsCount: number;
  }[];
}