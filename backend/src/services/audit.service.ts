import { prisma } from '../config/prisma.js';

/**
 * Records an audit event. Never throws — audit failure
 * must not break the main operation.
 */
export async function audit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  outcome: 'success' | 'failure' = 'success',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        outcome,
        metadata: metadata || undefined,
      },
    });
  } catch (err) {
    // Log to stdout as fallback, but never throw
    console.error('AUDIT_WRITE_FAILED', { action, targetType, targetId, error: err });
  }
}