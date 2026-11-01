import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { audit } from '../services/audit.service.js';

// Default thresholds
const DEFAULT_SETTINGS: Record<string, string> = {
  PRELIM_BEGINNER_MAX: '40',
  PRELIM_INTERMEDIATE_MAX: '70',
};

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbSettings = await prisma.systemSetting.findMany();
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    dbSettings.forEach((s) => {
      settings[s.key] = s.value;
    });
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = (req.body.settings || {}) as Record<string, unknown>;
    if (req.body.key && req.body.value !== undefined) {
      settings[req.body.key] = req.body.value;
    }
    
    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value), updatedBy: req.user!.id },
        create: { key, value: String(value), updatedBy: req.user!.id },
      });
    }

    await audit(req.user!.id, 'settings.update', 'system_settings', null, 'success', { settings });

    res.json({ success: true, data: { message: 'Settings updated' } });
  } catch (err) { next(err); }
};
