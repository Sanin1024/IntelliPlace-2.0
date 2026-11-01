import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

const MIN_ANSWERS = 5;
const GAP_THRESHOLD = 60;

/**
 * GET /api/companies/:id/prep-plan
 * Student sees own accuracy per company-linked topic, gap flags, and suggested actions.
 */
export const getCompanyPrepPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.params.id as string;
    const studentId = req.user!.id;

    // Verify company exists and get linked topics
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        topics: { include: { topic: { select: { id: true, name: true } } } },
      },
    });
    if (!company) throw ApiError.notFound('Company not found');

    // If company has no linked topics, return empty plan
    if (company.topics.length === 0) {
      return res.json({
        success: true,
        data: { companyId, companyName: company.name, topics: [], message: 'No prep topics linked to this company.' },
      });
    }

    // Get student's answers grouped by topic (only for topics linked to this company)
    const linkedTopicIds = company.topics.map((t: any) => t.topic.id);

    const answers = await prisma.studentAnswer.findMany({
      where: {
        attempt: { studentId, status: 'submitted' },
        isCorrect: { not: null },
        question: { topicId: { in: linkedTopicIds } },
      },
      include: {
        question: { select: { topicId: true, topic: { select: { id: true, name: true } } } },
      },
    });

    // Aggregate per topic
    const topicMap = new Map<number, { topicId: number; topicName: string; total: number; correct: number }>();
    for (const answer of answers) {
      const tid = answer.question.topicId;
      if (!topicMap.has(tid)) {
        topicMap.set(tid, {
          topicId: tid,
          topicName: answer.question.topic.name,
          total: 0,
          correct: 0,
        });
      }
      const stat = topicMap.get(tid)!;
      stat.total++;
      if (answer.isCorrect) stat.correct++;
    }

    // Build per-topic result with gaps and actions
    const topicResults = await Promise.all(
      company.topics.map(async ({ topic }: any) => {
        const stat = topicMap.get(topic.id);

        if (!stat || stat.total < MIN_ANSWERS) {
          return {
            topicId: topic.id,
            topicName: topic.name,
            totalAnswered: stat?.total ?? 0,
            correct: stat?.correct ?? 0,
            accuracy: null,
            hasGap: null,
            status: 'not_enough_data' as const,
            message: `Need at least ${MIN_ANSWERS} answers (you have ${stat?.total ?? 0})`,
            actions: [{
              label: `Practice ${topic.name}`,
              link: `/practice?topic=${topic.id}`,
            }],
          };
        }

        const accuracy = Math.round((stat.correct / stat.total) * 100);
        const hasGap = accuracy < GAP_THRESHOLD;

        // Build suggested actions (max 3)
        const actions: Array<{ label: string; link: string }> = [];

        if (hasGap) {
          // Action 1: Practice this topic
          actions.push({
            label: `Practice ${topic.name}`,
            link: `/practice?topic=${topic.id}`,
          });

          // Action 2: A resource on this topic (if one exists)
          const resource = await prisma.resource.findFirst({
            where: { topicId: topic.id },
            select: { id: true, title: true },
          });
          if (resource) {
            actions.push({
              label: `Study: ${resource.title.substring(0, 40)}`,
              link: '/resources',
            });
          }

          // Action 3: An active mock test containing this topic
          const mockTest = await prisma.mockTest.findFirst({
            where: {
              isActive: true,
              questions: {
                some: {
                  question: { topicId: topic.id },
                },
              },
            },
            select: { id: true, title: true },
          });
          if (mockTest) {
            actions.push({
              label: `Take: ${mockTest.title.substring(0, 40)}`,
              link: `/tests`,
            });
          }
        } else {
          actions.push({
            label: `Challenge yourself in ${topic.name}`,
            link: `/practice?topic=${topic.id}&difficulty=hard`,
          });
        }

        return {
          topicId: topic.id,
          topicName: topic.name,
          totalAnswered: stat.total,
          correct: stat.correct,
          accuracy,
          hasGap,
          status: hasGap ? ('gap' as const) : ('strong' as const),
          actions: actions.slice(0, 3),
        };
      })
    );

    const gapCount = topicResults.filter((t: any) => t.hasGap === true).length;

    res.json({
      success: true,
      data: {
        companyId,
        companyName: company.name,
        gapCount,
        totalTopics: topicResults.length,
        topics: topicResults,
      },
    });
  } catch (err) {
    next(err);
  }
};