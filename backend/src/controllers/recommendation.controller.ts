import type { Request, Response, NextFunction } from 'express';
import { getMySkills, saveDeclaredSkills, deleteDeclaredSkill as removeSkill } from '../services/skillProfile.service.js';
import { setCareerGoal, getCareerGoal } from '../services/careerAlignment.service.js';
import {
  getRecommendations,
  dismissRecommendation,
  regenerateRecommendations,
  getCoverageStats,
} from '../services/recommendation.service.js';
import { getIntegrityFlags, reviewIntegrityFlag } from '../services/assessmentAnalysis.service.js';
import { getReadiness, getReadinessHistory } from '../services/readiness.service.js';
import { getSkillGrowth } from '../services/growthAnalytics.service.js';

export const getSkills = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getMySkills(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const upsertDeclaredSkills = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skills } = req.body;
    const data = await saveDeclaredSkills(req.user!.id, skills || []);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/reco/skills/declared/:skill — remove one declared skill (own only) */
export const deleteDeclaredSkill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const skill = req.params['skill'] as string;
    const result = await removeSkill(req.user!.id, skill);
    res.json({ success: true, data: { removed: result.count } });
  } catch (err) {
    next(err);
  }
};

export const getCareer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCareerGoal(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateCareerGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    const data = await setCareerGoal(req.user!.id, role);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const fetchRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getRecommendations(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const dismissReco = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceId = req.params['resourceId'] as string;
    const data = await dismissRecommendation(req.user!.id, resourceId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const regenerateReco = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await regenerateRecommendations(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const listIntegrityFlags = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getIntegrityFlags({ status: req.query.status as string });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateIntegrityFlag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { status, note } = req.body;
    const data = await reviewIntegrityFlag(id, req.user!.id, status, note);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const fetchReadiness = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getReadiness(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const fetchReadinessHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getReadinessHistory(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const fetchGrowth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getSkillGrowth(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const fetchCoverage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCoverageStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
