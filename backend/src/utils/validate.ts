import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

/**
 * Generic validation middleware.
 * Works with Zod v4 — uses `.issues` and z.ZodType.
 */
export const validate =
  (schema: z.ZodType) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: result.error.issues.map((issue: z.core.$ZodIssue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };