import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { audit } from './audit.service.js';

const LINK_TIMEOUT_MS = 5000;
const BROKEN_AFTER_FAILURES = 3; // Ch 53: temporary failures never mark broken

// ============================================================
// LINK VALIDATION (Challenges 53, 63)
// ============================================================
export async function checkUrl(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINK_TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
    }
    return res.ok; // 2xx
  } catch {
    return false; // network error / timeout — could be temporary
  } finally {
    clearTimeout(timer);
  }
}

export async function checkResourceLink(resourceId: string) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) return null;
  const url = resource.sourceUrl;
  if (!url) return { skipped: true, reason: 'no_external_url' }; // uploaded files are local

  const ok = await checkUrl(url);
  const existing = await prisma.resourceLinkCheck.findUnique({
    where: { resourceId_url: { resourceId, url } },
  });

  const consecutiveFailures = ok ? 0 : (existing?.consecutiveFailures ?? 0) + 1;
  const status = ok ? 'ok' : consecutiveFailures >= BROKEN_AFTER_FAILURES ? 'broken' : 'unknown';

  const check = await prisma.resourceLinkCheck.upsert({
    where: { resourceId_url: { resourceId, url } },
    update: {
      status: status as any,
      consecutiveFailures,
      lastCheckedAt: new Date(),
      ...(ok && { lastOkAt: new Date() }),
    },
    create: {
      resourceId,
      url,
      status: status as any,
      consecutiveFailures,
      lastCheckedAt: new Date(),
      ...(ok && { lastOkAt: new Date() }),
    },
  });

  // Just became broken → alert the owning trainer (Ch 53/63)
  if (status === 'broken' && existing?.status !== 'broken') {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    const n = await prisma.notification.create({
      data: {
        title: `Broken Resource Link: ${resource.title}`,
        message: `The external link for "${resource.title}" has failed ${consecutiveFailures} consecutive checks. Replace it, add an alternative, or upload an internal copy (if licensed). ${resource.alternatives.length > 0 ? 'Alternative links are configured.' : ''}`,
        createdBy: admin?.id || resource.uploadedBy,
      },
    });
    await prisma.notificationRecipient.createMany({
      data: [{ notificationId: n.id, userId: resource.uploadedBy }],
    });
  }

  return { check, ok, status, consecutiveFailures };
}

export async function runAllLinkChecks() {
  const resources = await prisma.resource.findMany({
    where: { sourceUrl: { not: null } },
    select: { id: true },
  });
  const results = [];
  for (const r of resources) {
    results.push(await checkResourceLink(r.id));
    await new Promise((res) => setTimeout(res, 300)); // polite staggering
  }
  return results;
}

// ============================================================
// VERSIONING (Challenge 52)
// ============================================================
export async function createResourceVersion(
  resourceId: string,
  newData: {
    title?: string;
    description?: string | null;
    fileUrl: string;
    sourceUrl?: string | null;
    contentHash?: string | null;
  },
  actorId: string
) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new Error('Resource not found');

  // Archive the current state (Ch 52: previous versions retained)
  await prisma.resourceVersion.create({
    data: {
      resourceId,
      version: resource.version,
      title: resource.title,
      fileUrl: resource.fileUrl,
      description: resource.description,
      archivedBy: actorId,
    },
  });

  const updated = await prisma.resource.update({
    where: { id: resourceId },
    data: {
      version: { increment: 1 },
      previousVersionId: resourceId,
      title: newData.title ?? resource.title,
      description: newData.description ?? resource.description,
      fileUrl: newData.fileUrl,
      sourceUrl: newData.sourceUrl ?? resource.sourceUrl,
      contentHash: newData.contentHash ?? resource.contentHash,
      contentStatus: 'updated',
      lastReviewedAt: new Date(),
    },
  });

  // Notify learners mid-module on this resource (Ch 52)
  const learners = await prisma.moduleProgress.findMany({
    where: { module: { resourceId }, status: { in: ['not_started', 'in_progress'] } },
    select: { studentId: true },
  });
  if (learners.length > 0) {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    const n = await prisma.notification.create({
      data: {
        title: `Material Updated: ${updated.title} (v${updated.version})`,
        message: `The learning material "${updated.title}" was updated to version ${updated.version}. Review the new content.`,
        createdBy: actorId || admin?.id || resource.uploadedBy,
      },
    });
    await prisma.notificationRecipient.createMany({
      data: learners.map((l) => ({ notificationId: n.id, userId: l.studentId })),
    });
  }

  await audit(actorId, 'resource.new_version', 'resource', resourceId, 'success', {
    newVersion: updated.version,
  });
  return updated;
}

export async function getStaleResources() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'RESOURCE_REVIEW_PERIOD_DAYS' } });
  const days = parseInt(setting?.value || '180', 10);
  const cutoff = new Date(Date.now() - days * 86400000);
  return prisma.resource.findMany({
    where: { OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: cutoff } }] },
    include: { uploader: { select: { name: true } } },
    orderBy: { lastReviewedAt: 'asc' },
  });
}

// ============================================================
// DUPLICATE DETECTION (Challenge 60)
// ============================================================
const normalizeTitle = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');

export async function findDuplicateResources(input: {
  title: string;
  sourceUrl?: string | null;
  contentHash?: string | null;
}) {
  const OR: any[] = [{ title: { equals: normalizeTitle(input.title), mode: 'insensitive' } }];
  if (input.sourceUrl) OR.push({ sourceUrl: input.sourceUrl });
  if (input.contentHash) OR.push({ contentHash: input.contentHash });

  return prisma.resource.findMany({
    where: { OR },
    include: { uploader: { select: { name: true } }, topic: { select: { name: true } } },
  });
}

export const sha256Hex = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex');

// ============================================================
// ACCESS CONTROL (Challenge 64)
// ============================================================
export async function canAccessResource(
  user: { id: string; role: string },
  resourceId: string
): Promise<boolean> {
  if (['admin', 'po', 'trainer'].includes(user.role)) return true;

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { module: { select: { id: true } } },
  });
  if (!resource) return false;

  // Department scoping: content tied to another branch is never accessible to students
  if (resource.branchId !== null) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { branchId: true },
    });
    if (!profile || profile.branchId !== resource.branchId) return false;
  }

  switch (resource.visibility) {
    case 'public':
      return true; // any authenticated user
    case 'institution':
      return true; // any authenticated member
    case 'training_group': {
      // Assigned to a session of a module that uses this resource, OR enrolled in that module
      const [assigned, enrolled] = await Promise.all([
        prisma.trainingAssignment.findFirst({
          where: { studentId: user.id, session: { moduleId: resource.module?.id } },
          select: { id: true },
        }),
        resource.module
          ? prisma.moduleProgress.findFirst({
              where: { studentId: user.id, moduleId: resource.module.id },
              select: { id: true },
            })
          : null,
      ]);
      return !!(assigned || enrolled);
    }
    case 'restricted': {
      // Enrolled with prerequisites satisfied or exception — active progress required
      if (!resource.module) return false;
      const progress = await prisma.moduleProgress.findFirst({
        where: { studentId: user.id, moduleId: resource.module.id, status: { not: 'failed' } },
        select: { id: true },
      });
      return !!progress;
    }
    default:
      return false;
  }
}

